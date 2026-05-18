from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AuditEvent, Guardianship, Profile, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "role", "is_active", "created_at"]
    list_filter = ["role", "is_active"]
    search_fields = ["email"]
    ordering = ["-created_at"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Info", {"fields": ("role", "date_of_birth")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "role", "password1", "password2")}),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "display_name", "locale"]
    search_fields = ["user__email", "display_name"]


@admin.register(Guardianship)
class GuardianshipAdmin(admin.ModelAdmin):
    list_display = ["guardian", "student", "relationship", "is_primary", "created_at"]
    list_filter = ["relationship"]
    raw_id_fields = ["guardian", "student"]


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ["actor", "subject", "action", "created_at"]
    list_filter = ["action"]
    raw_id_fields = ["actor", "subject"]

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
