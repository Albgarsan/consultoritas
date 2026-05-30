from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DocumentViewSet, InvoiceDataViewSet, TaxCalendarViewSet

router = DefaultRouter()
# IMPORTANTE: tax-calendar arriba para que no lo pise el catch-all de Document
router.register(r"tax-calendar", TaxCalendarViewSet, basename="taxcalendar")
router.register(r"invoice-data", InvoiceDataViewSet, basename="invoicedata")
router.register(r"", DocumentViewSet, basename="document")

urlpatterns = [
    path("", include(router.urls)),
]
