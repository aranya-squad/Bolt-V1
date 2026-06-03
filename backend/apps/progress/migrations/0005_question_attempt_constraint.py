from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("progress", "0004_question_attempt_number"),
    ]

    operations = [
        # Remove single-attempt idempotency constraint
        migrations.AlterUniqueTogether(
            name="questionattempt",
            unique_together=set(),
        ),
        # Enforce one row per (session, question_index, attempt_number)
        migrations.AlterUniqueTogether(
            name="questionattempt",
            unique_together={("session", "question_index", "attempt_number")},
        ),
    ]
