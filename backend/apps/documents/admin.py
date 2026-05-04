from django.contrib import admin

from .models import Document, InvoiceData


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "filename", "document_type", "status", "business")
    list_filter = ("status", "document_type")
    search_fields = ("filename",)


@admin.register(InvoiceData)
class InvoiceDataAdmin(admin.ModelAdmin):
    list_display = ("id", "document", "supplier_name", "total_amount")
    search_fields = ("supplier_name",)
