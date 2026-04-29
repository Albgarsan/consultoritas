from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BusinessViewSet, UserBusinessViewSet

router = DefaultRouter()
router.register(r"businesses", BusinessViewSet)
router.register(r"user-businesses", UserBusinessViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
