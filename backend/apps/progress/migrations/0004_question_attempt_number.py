from django.db import migrations, models


def backfill_attempt_number(apps, schema_editor):
    QuestionAttempt = apps.get_model("progress", "QuestionAttempt")
    count_before = QuestionAttempt.objects.filter(attempt_number__isnull=True).count()
    QuestionAttempt.objects.filter(attempt_number__isnull=True).update(attempt_number=1)
    count_after = QuestionAttempt.objects.filter(attempt_number__isnull=True).count()
    assert count_after == 0, f"Backfill incomplete: {count_after} rows still null (started with {count_before})"


def reverse_backfill(apps, schema_editor):
    # Reversing sets all to null — acceptable since 0005 will drop the column
    QuestionAttempt = apps.get_model("progress", "QuestionAttempt")
    QuestionAttempt.objects.update(attempt_number=None)


class Migration(migrations.Migration):
    dependencies = [
        ("progress", "0003_lesson_completion"),
    ]

    operations = [
        migrations.AddField(
            model_name="questionattempt",
            name="attempt_number",
            field=models.PositiveSmallIntegerField(null=True),
        ),
        migrations.RunPython(backfill_attempt_number, reverse_backfill),
    ]
