"""
Custom authentication backends for Bolt Abacus.

CallSignBackend: authenticates students with display_name (call-sign) + PIN.
Used by CallSignLoginView — not registered as a default backend, called explicitly.
"""

from .models import Profile


class CallSignBackend:
    """
    Authenticate by Profile.display_name (call-sign) + password (PIN for students).
    Lookup is case-insensitive on display_name.
    """

    def authenticate(self, request, call_sign: str = "", pin: str = ""):
        if not call_sign or not pin:
            return None
        try:
            profile = (
                Profile.objects.select_related("user")
                .get(display_name__iexact=call_sign)
            )
        except Profile.DoesNotExist:
            # Constant-time dummy check to prevent call-sign enumeration via timing.
            from django.contrib.auth.hashers import check_password
            check_password(pin, "pbkdf2_sha256$dummy$dummy$dummy")
            return None

        user = profile.user
        if not user.is_active:
            return None
        if user.check_password(pin):
            return user
        return None

    def get_user(self, user_id):
        from .models import User
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
