from datetime import date

from apps.documents.models import TaxCalendar
from django.db import models, transaction
from django.db.models import Q
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Business, UserBusiness

# --- LÓGICA DE APOYO (Auxiliares) ---


def _quarter_dates(year: int):
    """Tu lógica original de fechas de trimestres"""
    return [
        (date(year, 1, 1), date(year, 3, 31), date(year, 4, 20), "1T"),
        (date(year, 4, 1), date(year, 6, 30), date(year, 7, 20), "2T"),
        (date(year, 7, 1), date(year, 9, 30), date(year, 10, 20), "3T"),
        (date(year, 10, 1), date(year, 12, 31), date(year + 1, 1, 30), "4T"),
    ]


def update_business_tax_cache(business):
    """NUEVA LÓGICA: Actualiza los campos de carga rápida en el modelo Business"""
    if not business:
        return

    now = timezone.now().date()
    overdue_count = TaxCalendar.objects.filter(
        business=business, is_presented=False, deadline__lt=now
    ).count()

    Business.objects.filter(pk=business.pk).update(
        pending_incidents=overdue_count,
        tax_status="INCIDENCIA" if overdue_count > 0 else "AL DÍA",
    )


def _delete_unpresented_tax_items(business, tax_type):
    # Only delete unpresented items that are for future periods/deadlines
    today = timezone.now().date()
    TaxCalendar.objects.filter(
        business=business,
        tax_type=tax_type,
        is_presented=False,
    ).filter(
        Q(deadline__gt=today) | Q(period_end__gte=today),
        models.Q(notes="")
        | models.Q(notes__isnull=True)
        | models.Q(notes__startswith="Modelo"),
    ).delete()


# --- RECEPTORES DE SEÑALES ---


@receiver(post_save, sender=Business)
def business_post_save(sender, instance, created, **kwargs):
    def process():
        ensure_business_tax_calendar(instance)
        update_business_tax_cache(instance)

    # Usamos on_commit para asegurar que la DB ya tiene los datos guardados
    transaction.on_commit(process)


@receiver(post_save, sender=TaxCalendar)
def on_tax_calendar_change(sender, instance, **kwargs):
    update_business_tax_cache(instance.business)


@receiver(post_delete, sender=TaxCalendar)
def on_tax_calendar_delete(sender, instance, **kwargs):
    update_business_tax_cache(instance.business)


@receiver(pre_save, sender=Business)
def business_pre_save(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_has_employees = None
        instance._previous_has_office_rent = None
        return

    previous = (
        Business.objects.filter(pk=instance.pk)
        .only("has_employees", "has_office_rent")
        .first()
    )
    instance._previous_has_employees = previous.has_employees if previous else None
    instance._previous_has_office_rent = previous.has_office_rent if previous else None


def ensure_business_tax_calendar(business, owner_user=None):
    if owner_user:
        owner_role = owner_user.role
    else:
        link = (
            business.users.filter(role_in_business="Admin")
            .select_related("user")
            .first()
        )
        owner_role = link.user.role if link else None

    # If owner_role is unknown, do not assume a default – abort calendar creation.
    if owner_role not in ["Autónomo", "Sociedad"]:
        return

    previous_has_employees = getattr(business, "_previous_has_employees", None)
    previous_has_office_rent = getattr(business, "_previous_has_office_rent", None)

    if previous_has_employees is True and not business.has_employees:
        _delete_unpresented_tax_items(business, "Retenciones")
    if previous_has_office_rent is True and not business.has_office_rent:
        _delete_unpresented_tax_items(business, "Pagos a Cuenta")

    creation_year = getattr(business.created_at, "year", date.today().year)
    current_year = date.today().year
    years = list(range(creation_year, current_year + 1))

    for year in years:
        for start, end, deadline, label in _quarter_dates(year):
            TaxCalendar.objects.get_or_create(
                business=business,
                tax_type="IVA",
                period_start=start,
                period_end=end,
                defaults={
                    "deadline": deadline,
                    "notes": f"Modelo 303 - {label} {year}",
                    "period": "Trimestral",
                },
            )
            if owner_role == "Autónomo":
                TaxCalendar.objects.get_or_create(
                    business=business,
                    tax_type="IRPF",
                    period_start=start,
                    period_end=end,
                    defaults={
                        "deadline": deadline,
                        "notes": f"Modelo 130 - {label} {year}",
                        "period": "Trimestral",
                    },
                )
            if business.has_employees:
                TaxCalendar.objects.get_or_create(
                    business=business,
                    tax_type="Retenciones",
                    period_start=start,
                    period_end=end,
                    defaults={
                        "deadline": deadline,
                        "notes": f"Modelo 111 - {label} {year}",
                        "period": "Trimestral",
                    },
                )
            if business.has_office_rent:
                TaxCalendar.objects.get_or_create(
                    business=business,
                    tax_type="Pagos a Cuenta",
                    period_start=start,
                    period_end=end,
                    defaults={
                        "deadline": deadline,
                        "notes": f"Modelo 115 - {label} {year}",
                        "period": "Trimestral",
                    },
                )


@receiver(post_save, sender=UserBusiness)
def userbusiness_post_save(sender, instance, created, **kwargs):
    # When an Admin link is created, ensure the business calendar exists
    def _process():
        try:
            if instance.role_in_business == "Admin":
                ensure_business_tax_calendar(
                    instance.business,
                    owner_user=instance.user,
                )
            update_business_tax_cache(instance.business)
        except Exception:
            # Best-effort: log and continue
            import logging

            logging.getLogger(__name__).exception(
                "Error processing UserBusiness post_save for %s", instance.pk
            )

    transaction.on_commit(_process)
