from django.db import migrations

# Levels 1–10 in order. Level 1 threshold is 0 (always accessible).
XP_THRESHOLDS = [0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5500]


def set_xp_thresholds(apps, schema_editor):
    Level = apps.get_model("courses", "Level")
    for order, threshold in enumerate(XP_THRESHOLDS, start=1):
        Level.objects.filter(order=order).update(xp_threshold=threshold)


def revert_xp_thresholds(apps, schema_editor):
    Level = apps.get_model("courses", "Level")
    Level.objects.filter(order__in=range(1, 11)).update(xp_threshold=0)


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0002_alter_contentblock_unique_together"),
    ]

    operations = [
        migrations.RunPython(set_xp_thresholds, revert_xp_thresholds),
    ]
