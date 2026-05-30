from django.apps import AppConfig


class BusinessConfig(AppConfig):
    name = "apps.business"

    def ready(self):
        from . import signals  # noqa: F401
