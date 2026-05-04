from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BusinessViewSet, UserBusinessViewSet

router = DefaultRouter()
router.register(r"businesses", BusinessViewSet, basename="business")
router.register(r"user-businesses", UserBusinessViewSet, basename="userbusiness")

urlpatterns = [
    path("", include(router.urls)),
]
