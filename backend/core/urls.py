"""
URL configuration for core project.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/users/", include("apps.users.urls")),
    path("api/business/", include("apps.business.urls")),
    path("api/documents/", include("apps.documents.urls")),
    path("api/ai/", include("apps.ai_engine.urls")),
]
