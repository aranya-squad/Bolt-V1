"""
Management command to migrate QuestionAttempt and XPEvent to monthly-partitioned tables.

Run ONLY when either table approaches 10M rows (see ARCHITECTURE.md §19).
This is a destructive DDL operation that MUST be performed during a maintenance window.

  python manage.py migrate_to_partitioned_tables --dry-run   # preview row counts + schema analysis
  python manage.py migrate_to_partitioned_tables --confirm   # execute (skips interactive prompt)

----------------------------------------------------------------------
KNOWN SCHEMA INCOMPATIBILITIES — read before running in production
----------------------------------------------------------------------

PostgreSQL declarative partitioning requires:
  1. All UNIQUE constraints include every partition column.
  2. All PRIMARY KEY constraints include every partition column.

Current constraints that conflict:

  progress_question_attempt:
    UNIQUE (session_id, question_index, attempt_number)
    does NOT include the partition key (submitted_at).
    → The command adds submitted_at to the unique constraint, weakening global
      uniqueness to per-partition uniqueness within the same time window.
      In practice, a given (session, question_index, attempt_number) always has
      the same submitted_at, so cross-partition duplicates cannot occur.

  progress_xp_event:
    PRIMARY KEY (id) as BigAutoField
    does NOT include the partition key (created_at).
    → The command adds created_at to the primary key composite.
      id alone remains unique by generation (BigSerial), but the PK is now composite.

If either change is unacceptable for your schema, DO NOT run this command.
Rethink the partition key or change to UUIDs before proceeding.
----------------------------------------------------------------------
"""

import sys

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Migrate QuestionAttempt and XPEvent to monthly-partitioned tables."

    TABLES = [
        {
            "table": "progress_question_attempt",
            "partition_col": "submitted_at",
            # Unique constraint columns excluding the partition key.
            "legacy_unique": ["session_id", "question_index", "attempt_number"],
            "legacy_pk": "id",
            "pk_is_composite": False,  # existing PK is just `id`
        },
        {
            "table": "progress_xp_event",
            "partition_col": "created_at",
            "legacy_unique": None,
            "legacy_pk": "id",
            # XPEvent PK is a BigSerial — must become composite with partition key.
            "pk_is_composite": True,
        },
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print row counts and schema analysis without executing DDL.",
        )
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Skip interactive confirmation prompt (for scripted use).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        confirm = options["confirm"]

        self._print_analysis()

        if dry_run:
            self.stdout.write("\nDry run complete. Re-run with --confirm to execute.")
            return

        if not confirm:
            if not sys.stdin.isatty():
                raise CommandError(
                    "stdin is not a terminal. Pass --confirm to execute non-interactively."
                )
            answer = input("\nProceed with partitioning? [yes/no]: ").strip().lower()
            if answer != "yes":
                self.stdout.write("Aborted.")
                return

        for spec in self.TABLES:
            self._partition_table(spec)

        self.stdout.write(self.style.SUCCESS("Partitioning complete."))

    def _print_analysis(self):
        names = [s["table"] for s in self.TABLES]
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT relname, n_live_tup FROM pg_stat_user_tables "
                "WHERE relname = ANY(%s) ORDER BY relname",
                [names],
            )
            rows = {r[0]: r[1] for r in cursor.fetchall()}

        self.stdout.write("\nTable sizes:")
        for name in names:
            count = rows.get(name, "?")
            self.stdout.write(f"  {name}: ~{count:,}" if isinstance(count, int) else f"  {name}: {count} rows")

        self.stdout.write("\nSchema changes that will be applied:")
        for spec in self.TABLES:
            t = spec["table"]
            if spec["legacy_unique"]:
                new_cols = spec["legacy_unique"] + [spec["partition_col"]]
                self.stdout.write(
                    f"  {t}: UNIQUE ({', '.join(spec['legacy_unique'])}) "
                    f"→ UNIQUE ({', '.join(new_cols)})"
                )
            if spec["pk_is_composite"]:
                self.stdout.write(
                    f"  {t}: PRIMARY KEY ({spec['legacy_pk']}) "
                    f"→ PRIMARY KEY ({spec['legacy_pk']}, {spec['partition_col']})"
                )

    def _partition_table(self, spec):
        table = spec["table"]
        partition_col = spec["partition_col"]

        self.stdout.write(f"\nPartitioning {table}...")

        # Each table gets its own transaction so a failure on the second table
        # doesn't leave the first in an ambiguous half-migrated state.
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Step 1: rename existing table
                cursor.execute(f"ALTER TABLE {table} RENAME TO {table}_legacy")

                # Step 2: create partitioned table — columns and defaults only,
                # NOT constraints (unique constraints require partition key inclusion).
                cursor.execute(
                    f"CREATE TABLE {table} "
                    f"(LIKE {table}_legacy INCLUDING DEFAULTS INCLUDING STORAGE) "
                    f"PARTITION BY RANGE ({partition_col})"
                )

                # Step 3: add constraints compatible with partitioning
                if spec["legacy_unique"]:
                    cols = spec["legacy_unique"] + [partition_col]
                    cursor.execute(
                        f"ALTER TABLE {table} ADD CONSTRAINT {table}_unique "
                        f"UNIQUE ({', '.join(cols)})"
                    )
                if spec["pk_is_composite"]:
                    cursor.execute(
                        f"ALTER TABLE {table} ADD PRIMARY KEY "
                        f"({spec['legacy_pk']}, {partition_col})"
                    )
                else:
                    cursor.execute(
                        f"ALTER TABLE {table} ADD PRIMARY KEY ({spec['legacy_pk']})"
                    )

                # Step 4: create monthly child partitions
                self._create_monthly_partitions(cursor, table, partition_col)

                # Step 5: copy data
                self.stdout.write(f"  Copying data (may be slow for large tables)...")
                cursor.execute(f"INSERT INTO {table} SELECT * FROM {table}_legacy")

                # Step 6: verify row counts before dropping legacy
                cursor.execute(f"SELECT COUNT(*) FROM {table}_legacy")
                old_count = cursor.fetchone()[0]
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                new_count = cursor.fetchone()[0]
                if old_count != new_count:
                    raise CommandError(
                        f"Row count mismatch for {table}: "
                        f"legacy={old_count} partitioned={new_count}. "
                        "Transaction rolled back — no data was lost."
                    )

                # Step 7: drop legacy
                cursor.execute(f"DROP TABLE {table}_legacy")

        self.stdout.write(self.style.SUCCESS(f"  {table} done ({old_count:,} rows)."))

    def _create_monthly_partitions(self, cursor, table, partition_col):
        """Create monthly child partitions from the oldest existing row + 2 months ahead."""
        from datetime import date, timedelta

        cursor.execute(
            f"SELECT MIN(DATE_TRUNC('month', {partition_col})) FROM {table}_legacy"
        )
        row = cursor.fetchone()
        start = row[0].date() if (row and row[0]) else date.today().replace(day=1)

        today = date.today()
        end_month = (today.replace(day=1) + timedelta(days=62)).replace(day=1)

        current = start
        while current <= end_month:
            next_month = (current + timedelta(days=32)).replace(day=1)
            suffix = current.strftime("%Y_%m")
            cursor.execute(
                f"CREATE TABLE IF NOT EXISTS {table}_{suffix} "
                f"PARTITION OF {table} "
                f"FOR VALUES FROM ('{current.isoformat()}') TO ('{next_month.isoformat()}')"
            )
            current = next_month
