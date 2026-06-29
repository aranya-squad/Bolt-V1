from django.db import migrations


def backfill_call_sign(apps, schema_editor):
    """
    Populate Profile.call_sign for existing STUDENT profiles (= display_name).
    No live users (Q6), so this is defensive; it skips any value that would collide
    case-insensitively with an already-set call_sign rather than crash the migration.
    """
    Profile = apps.get_model("users", "Profile")
    seen = set()
    qs = Profile.objects.select_related("user").filter(
        call_sign__isnull=True, user__role="STUDENT"
    )
    for profile in qs:
        key = profile.display_name.lower()
        if key in seen or Profile.objects.filter(call_sign__iexact=profile.display_name).exists():
            continue
        profile.call_sign = profile.display_name
        profile.save(update_fields=["call_sign"])
        seen.add(key)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("users", "0002_add_profile_call_sign")]
    operations = [migrations.RunPython(backfill_call_sign, noop_reverse)]
