from django.contrib import admin

from .models import Class, Enrollment


class EnrollmentInline(admin.TabularInline):
    model = Enrollment
    extra = 0
    raw_id_fields = ["student"]


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ["name", "teacher", "is_active", "created_at"]
    list_filter = ["is_active"]
    raw_id_fields = ["teacher"]
    filter_horizontal = ["assigned_levels"]
    inlines = [EnrollmentInline]
