from datetime import date

from apps.business.models import Business
from apps.business.signals import ensure_business_tax_calendar
from apps.documents.models import TaxCalendar
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Populate tax calendars retroactively for all existing businesses"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing tax calendars before populating",
        )

    def handle(self, *args, **options):
        clear = options.get("clear", False)

        if clear:
            count = TaxCalendar.objects.count()
            TaxCalendar.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f"Deleted {count} existing tax calendar entries")
            )

        businesses = Business.objects.all()
        total = businesses.count()
        created = 0
        skipped = 0

        self.stdout.write(self.style.SUCCESS(f"Processing {total} businesses..."))

        with transaction.atomic():
            for i, business in enumerate(businesses, 1):
                try:
                    owner_link = (
                        business.users.select_related("user")
                        .filter(role_in_business="Admin")
                        .order_by("user__created_at")
                        .first()
                    )

                    owner_role = owner_link.user.role if owner_link else None

                    if owner_role not in {"Autónomo", "Sociedad"}:
                        # Legacy businesses can be missing a clean owner role.
                        # Repopulation should still succeed, so fall back to Sociedad.
                        owner_role = "Sociedad"

                    ensure_business_tax_calendar(
                        business, owner_user=owner_link.user if owner_link else None
                    )
                    created += 1
                    self.stdout.write(
                        f"[{i}/{total}] ✓ {business.name} (role: {owner_role})"
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"[{i}/{total}] ✗ {business.name} (ID: {business.id}): {str(e)}"
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nCompleted! Created {created}/{total} calendars, {skipped} skipped."
            )
        )
