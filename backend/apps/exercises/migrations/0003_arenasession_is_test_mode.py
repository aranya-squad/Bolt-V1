from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exercises", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="arenasession",
            name="is_test_mode",
            field=models.BooleanField(default=False),
        ),
    ]
