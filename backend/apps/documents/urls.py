from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DocumentViewSet, InvoiceDataViewSet

router = DefaultRouter()
router.register(r"documents", DocumentViewSet)
router.register(r"invoice-data", InvoiceDataViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
