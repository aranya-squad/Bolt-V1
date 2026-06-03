import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0002_alter_contentblock_unique_together"),
        ("progress", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LessonCompletion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(choices=[("CLASSWORK", "Classwork"), ("HOMEWORK", "Homework")], max_length=16)),
                ("first_completed_at", models.DateTimeField(auto_now_add=True)),
                ("best_accuracy_pct", models.DecimalField(decimal_places=2, max_digits=5)),
                (
                    "lesson",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="completions",
                        to="courses.lesson",
                    ),
                ),
                (
                    "best_progress_record",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="lesson_completions",
                        to="progress.progressrecord",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lesson_completions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"db_table": "progress_lesson_completion"},
        ),
        migrations.AlterUniqueTogether(
            name="lessoncompletion",
            unique_together={("user", "lesson", "kind")},
        ),
    ]
