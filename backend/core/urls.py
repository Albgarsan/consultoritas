"""
URL configuration for core project.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.users.urls")),
    path("api/", include("apps.business.urls")),
    path("api/", include("apps.documents.urls")),
    path("api/", include("apps.ai_engine.urls")),
]
