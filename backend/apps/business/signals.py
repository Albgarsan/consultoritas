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


WINDOW_MONTHS = {1, 4, 7, 10}


def _quarter_index_for_month(month: int) -> int:
    if month <= 3:
        return 1
    if month <= 6:
        return 2
    if month <= 9:
        return 3
    return 4


def _calendar_generation_anchor(today: date) -> tuple[int, int]:
    if today.month == 1 and 1 <= today.day <= 20:
        return today.year - 1, 4
    if today.month == 4 and 1 <= today.day <= 20:
        return today.year, 1
    if today.month == 7 and 1 <= today.day <= 20:
        return today.year, 2
    if today.month == 10 and 1 <= today.day <= 20:
        return today.year, 3
    return today.year, _quarter_index_for_month(today.month)


def _quarter_period(year: int, quarter_index: int):
    if quarter_index == 1:
        return date(year, 1, 1), date(year, 3, 31), date(year, 4, 20), "1T"
    if quarter_index == 2:
        return date(year, 4, 1), date(year, 6, 30), date(year, 7, 20), "2T"
    if quarter_index == 3:
        return date(year, 7, 1), date(year, 9, 30), date(year, 10, 20), "3T"
    return date(year, 10, 1), date(year, 12, 31), date(year + 1, 1, 30), "4T"


def _is_submission_window(today: date):
    return today.month in WINDOW_MONTHS and 1 <= today.day <= 20


def _required_models_for_business(business, owner_role: str | None):
    required = {"303"}
    if getattr(business, "has_employees", False):
        required.add("111")
    if getattr(business, "has_office_rent", False):
        required.add("115")
    if owner_role == "Autónomo":
        required.add("130")
    if owner_role == "Sociedad":
        required.update({"202", "123"})
    return required


def update_business_tax_cache(business):
    """NUEVA LÓGICA: Actualiza los campos de carga rápida en el modelo Business"""
    if not business:
        return

    now = timezone.now().date()
    in_window = _is_submission_window(now)
    pending_required = TaxCalendar.objects.filter(
        business=business,
        is_presented=False,
        deadline__year=now.year,
        deadline__month=now.month,
        deadline__gte=now.replace(day=1),
        deadline__lte=now.replace(day=20),
    ).count()
    overdue_count = TaxCalendar.objects.filter(
        business=business,
        is_presented=False,
        deadline__lt=now,
    ).count()

    Business.objects.filter(pk=business.pk).update(
        pending_incidents=overdue_count if not in_window else pending_required,
        tax_status="INCIDENCIA" if (in_window and pending_required > 0) else "AL DÍA",
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

    if owner_role not in ["Autónomo", "Sociedad"]:
        return

    previous_has_employees = getattr(business, "_previous_has_employees", None)
    previous_has_office_rent = getattr(business, "_previous_has_office_rent", None)

    if previous_has_employees is True and not business.has_employees:
        _delete_unpresented_tax_items(business, "111")
    if previous_has_office_rent is True and not business.has_office_rent:
        _delete_unpresented_tax_items(business, "115")

    today = timezone.now().date()
    start_year, start_quarter = _calendar_generation_anchor(today)
    required_models = _required_models_for_business(business, owner_role)

    period_definitions = []
    for year in (start_year, start_year + 1):
        quarter_start = start_quarter if year == start_year else 1
        for quarter_index in range(quarter_start, 5):
            period_definitions.append(
                (year, quarter_index, *_quarter_period(year, quarter_index))
            )

    # Remove future, not-presented models that are no longer applicable.
    TaxCalendar.objects.filter(
        business=business,
        is_presented=False,
        deadline__gte=today,
    ).filter(
        models.Q(notes="")
        | models.Q(notes__isnull=True)
        | models.Q(notes__startswith="Modelo"),
    ).exclude(
        tax_type__in=required_models
    ).delete()

    if not period_definitions:
        return

    period_starts = [definition[2] for definition in period_definitions]
    period_ends = [definition[3] for definition in period_definitions]
    existing_keys = set(
        TaxCalendar.objects.filter(
            business=business,
            tax_type__in=required_models,
            period_start__gte=min(period_starts),
            period_start__lte=max(period_starts),
            period_end__gte=min(period_ends),
            period_end__lte=max(period_ends),
        ).values_list("tax_type", "period_start", "period_end")
    )

    new_items = []
    for year, quarter_index, start, end, deadline, label in period_definitions:
        if deadline < today:
            continue

        for model_code in sorted(required_models):
            key = (model_code, start, end)
            if key in existing_keys:
                continue

            new_items.append(
                TaxCalendar(
                    business=business,
                    tax_type=model_code,
                    period_start=start,
                    period_end=end,
                    deadline=deadline,
                    notes=f"Modelo {model_code} - {label} {year}",
                    period="Trimestral",
                )
            )

    if new_items:
        TaxCalendar.objects.bulk_create(new_items, batch_size=200)

    update_business_tax_cache(business)


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
