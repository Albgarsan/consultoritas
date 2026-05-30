from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AppointmentViewSet, BusinessViewSet, UserBusinessViewSet

router = DefaultRouter()
router.register(r"companies", BusinessViewSet, basename="business")
router.register(r"appointments", AppointmentViewSet, basename="appointment")
router.register(r"user-businesses", UserBusinessViewSet, basename="userbusiness")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "appointments/", AppointmentViewSet.as_view({"get": "list", "post": "create"})
    ),
    path("my_business/", BusinessViewSet.as_view({"get": "retrieve_my_business"})),
    path("tax-calendar/", BusinessViewSet.as_view({"get": "tax_calendar"})),
    path("client-business/", BusinessViewSet.as_view({"post": "client_business"})),
]
