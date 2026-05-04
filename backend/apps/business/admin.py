from django.contrib import admin

from .models import Business, UserBusiness


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "tax_id")
    search_fields = ("name", "tax_id")


@admin.register(UserBusiness)
class UserBusinessAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "business", "role_in_business")
