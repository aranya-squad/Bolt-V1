from django.contrib import admin

from .models import ContentBlock, Lesson, Level, Material


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0
    fields = ["order", "name", "description"]


class MaterialInline(admin.TabularInline):
    model = Material
    extra = 0
    fields = ["kind", "file", "version"]


@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ["order", "name", "xp_threshold", "is_advanced"]
    ordering = ["order"]
    inlines = [LessonInline, MaterialInline]


@admin.register(ContentBlock)
class ContentBlockAdmin(admin.ModelAdmin):
    list_display = ["lesson", "kind", "order"]
    list_filter = ["kind"]
