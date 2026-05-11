"""
URL configuration for core project.
"""

from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from django.views.decorators.csrf import ensure_csrf_cookie

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "api/csrf/", ensure_csrf_cookie(lambda request: HttpResponse("CSRF cookie set"))
    ),
    path("api/users/", include("apps.users.urls")),
    path("api/business/", include("apps.business.urls")),
    path("api/documents/", include("apps.documents.urls")),
    path("api/ai/", include("apps.ai_engine.urls")),
]
