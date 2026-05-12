import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

import requests
from apps.business.models import Appointment, Business, UserBusiness
from apps.documents.models import Document, InvoiceData, TaxCalendar
from apps.users.models import User
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Deploy full advisor test system with realistic users, businesses, files and tax calendar"

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.WARNING("Cleaning existing users, businesses and documents...")
        )
        Appointment.objects.all().delete()
        TaxCalendar.objects.all().delete()
        InvoiceData.objects.all().delete()
        Document.objects.all().delete()
        UserBusiness.objects.all().delete()
        Business.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write(self.style.SUCCESS("Creating advisors..."))
        advisors = [
            User.objects.create_user(
                email="asesor1@demo.com",
                password="password123",
                first_name="Asesor",
                last_name="Uno",
                role="Asesor",
                specialties=["Fiscal", "Contable"],
                is_staff=True,
                is_active=True,
            ),
            User.objects.create_user(
                email="asesor2@demo.com",
                password="password123",
                first_name="Asesor",
                last_name="Dos",
                role="Asesor",
                specialties=["Laboral"],
                is_staff=True,
                is_active=True,
            ),
            User.objects.create_user(
                email="asesor3@demo.com",
                password="password123",
                first_name="Asesor",
                last_name="Tres",
                role="Asesor",
                specialties=["Judicial"],
                is_staff=True,
                is_active=True,
            ),
        ]

        self.stdout.write(self.style.SUCCESS("Creating client matrix profiles..."))
        profiles = [
            {
                "business": {
                    "name": "Cliente 1 S.L.",
                    "tax_id": "A4155543L",
                    "has_employees": True,
                    "has_office_rent": True,
                },
                "user": {
                    "email": "cliente1@demo.com",
                    "first_name": "Cliente",
                    "last_name": "Uno",
                    "role": "Sociedad",
                },
                "invoice": {
                    "file_name": "factura_cliente1_7557.pdf",
                    "url": "https://raw.githubusercontent.com/everis/facturae-php/master/tests/mats/facturae_321.pdf",
                    "doc_type": "Factura",
                    "supplier_name": "Sociedad Anonima S. A.",
                    "supplier_tax_id": "A2800056F",
                    "issue_date": date(2009, 3, 2),
                    "base_imponible": Decimal("6678.00"),
                    "total_factura": Decimal("7557.48"),
                    "nif_identificacion": "A4155543L",
                },
            },
            {
                "business": {
                    "name": "Cliente 2 Autónomo",
                    "tax_id": "12345678A",
                    "has_employees": False,
                    "has_office_rent": False,
                },
                "user": {
                    "email": "cliente2@demo.com",
                    "first_name": "Cliente",
                    "last_name": "Dos",
                    "role": "Autónomo",
                },
                "invoice": {
                    "file_name": "factura_cliente2.pdf",
                    "url": "https://raw.githubusercontent.com/everis/facturae-php/master/tests/mats/facturae_321.pdf",
                    "doc_type": "Factura",
                    "supplier_name": "Proveedor Juan",
                    "supplier_tax_id": "B12345678",
                    "issue_date": date.today(),
                    "base_imponible": Decimal("850.00"),
                    "total_factura": Decimal("1028.50"),
                    "nif_identificacion": "12345678A",
                },
            },
            {
                "business": {
                    "name": "Cliente 3 S.L.",
                    "tax_id": "B87456321",
                    "has_employees": False,
                    "has_office_rent": True,
                },
                "user": {
                    "email": "cliente3@demo.com",
                    "first_name": "Cliente",
                    "last_name": "Tres",
                    "role": "Sociedad",
                },
                "invoice": {
                    "file_name": "factura_cliente3.pdf",
                    "url": "https://raw.githubusercontent.com/everis/facturae-php/master/tests/mats/facturae_321.pdf",
                    "doc_type": "Factura",
                    "supplier_name": "Cliente Tech",
                    "supplier_tax_id": "A99887766",
                    "issue_date": date.today(),
                    "base_imponible": Decimal("2200.00"),
                    "total_factura": Decimal("2662.00"),
                    "nif_identificacion": "B87456321",
                },
            },
            {
                "business": {
                    "name": "Cliente 4 Autónomo",
                    "tax_id": "12345678B",
                    "has_employees": True,
                    "has_office_rent": False,
                },
                "user": {
                    "email": "cliente4@demo.com",
                    "first_name": "Cliente",
                    "last_name": "Cuatro",
                    "role": "Autónomo",
                },
                "invoice": {
                    "file_name": "factura_cliente4.pdf",
                    "url": "https://raw.githubusercontent.com/everis/facturae-php/master/tests/mats/facturae_321.pdf",
                    "doc_type": "Factura",
                    "supplier_name": "Proveedor C4",
                    "supplier_tax_id": "B12345000",
                    "issue_date": date.today(),
                    "base_imponible": Decimal("1300.00"),
                    "total_factura": Decimal("1573.00"),
                    "nif_identificacion": "12345678B",
                },
            },
            {
                "business": {
                    "name": "Cliente 5 S.L.",
                    "tax_id": "B55544333",
                    "has_employees": False,
                    "has_office_rent": False,
                },
                "user": {
                    "email": "cliente5@demo.com",
                    "first_name": "Cliente",
                    "last_name": "Cinco",
                    "role": "Sociedad",
                },
                "invoice": {
                    "file_name": "factura_cliente5.pdf",
                    "url": "https://raw.githubusercontent.com/everis/facturae-php/master/tests/mats/facturae_321.pdf",
                    "doc_type": "Factura",
                    "supplier_name": "Proveedor C5",
                    "supplier_tax_id": "B33322111",
                    "issue_date": date.today(),
                    "base_imponible": Decimal("990.00"),
                    "total_factura": Decimal("1197.90"),
                    "nif_identificacion": "B55544333",
                },
            },
        ]

        created_businesses = []
        created_clients = []
        for profile in profiles:
            business = Business.objects.create(**profile["business"])
            user = User.objects.create_user(
                password="password123",
                is_active=True,
                **profile["user"],
            )
            UserBusiness.objects.create(
                user=user, business=business, role_in_business="Admin"
            )
            created_businesses.append(business)
            created_clients.append(user)

            for advisor in advisors:
                UserBusiness.objects.get_or_create(
                    user=advisor, business=business, role_in_business="Viewer"
                )

            invoice = profile["invoice"]
            file_bytes = self._download_pdf(invoice["url"], invoice["file_name"])
            storage_path = default_storage.save(
                f"documents/{invoice['file_name']}", ContentFile(file_bytes)
            )

            document = Document.objects.create(
                business=business,
                uploaded_by=user,
                file_name=invoice["file_name"],
                storage_path=storage_path,
                status="Pendiente",
                doc_type=invoice["doc_type"],
            )

            InvoiceData.objects.create(
                document=document,
                supplier_name=invoice["supplier_name"],
                supplier_tax_id=invoice["supplier_tax_id"],
                issue_date=invoice["issue_date"],
                tax_base=invoice["base_imponible"],
                total_amount=invoice["total_factura"],
                nif_identificacion=invoice["nif_identificacion"],
            )

        self.stdout.write(self.style.SUCCESS("Creating 5 random appointments..."))
        appointment_types = [
            "Revisión IVA",
            "Cierre trimestral",
            "Planificación fiscal",
            "Consulta laboral",
            "Seguimiento contable",
        ]
        for idx in range(5):
            business = random.choice(created_businesses)
            advisor = random.choice(advisors)
            client_link = (
                UserBusiness.objects.filter(business=business, role_in_business="Admin")
                .select_related("user")
                .first()
            )
            client = client_link.user if client_link else random.choice(created_clients)
            Appointment.objects.create(
                business=business,
                advisor=advisor,
                client_name=f"{client.first_name} {client.last_name}".strip(),
                client_email=client.email,
                appointment_type=random.choice(appointment_types),
                scheduled_at=timezone.make_aware(
                    datetime.combine(
                        date.today() + timedelta(days=idx + 1), time(hour=10 + idx)
                    )
                ),
                status="pending",
                notes="Cita generada por seed_system",
            )

        self.stdout.write(self.style.SUCCESS("Populating fiscal calendars..."))
        call_command("populate_calendars", clear=True)
        # Ensure Cliente 1 has fixed Q1 2026 overdue entries for immediate INCIDENCIA tests.
        period_start = date(2026, 1, 1)
        period_end = date(2026, 3, 31)
        overdue_date = date(2026, 4, 20)
        first_business = created_businesses[0]

        TaxCalendar.objects.create(
            business=first_business,
            tax_type="IVA",
            period="Trimestral",
            period_start=period_start,
            period_end=period_end,
            deadline=overdue_date,
            is_presented=False,
            notes="Seed stress case: overdue IVA",
        )
        TaxCalendar.objects.create(
            business=first_business,
            tax_type="IRPF",
            period="Trimestral",
            period_start=period_start,
            period_end=period_end,
            deadline=overdue_date,
            is_presented=False,
            notes="Seed stress case: overdue IRPF",
        )
        TaxCalendar.objects.create(
            business=first_business,
            tax_type="Retenciones",
            period="Trimestral",
            period_start=period_start,
            period_end=period_end,
            deadline=overdue_date,
            is_presented=False,
            notes="Seed stress case: overdue Retenciones",
        )
        TaxCalendar.objects.create(
            business=first_business,
            tax_type="Pagos a Cuenta",
            period="Trimestral",
            period_start=period_start,
            period_end=period_end,
            deadline=overdue_date,
            is_presented=False,
            notes="Seed stress case: overdue Pagos a Cuenta",
        )
        self.stdout.write(
            self.style.SUCCESS("Injected 4 overdue tax calendar entries for Cliente 1")
        )

        self.stdout.write(self.style.SUCCESS("seed_system completed successfully"))

    def _download_pdf(self, url: str, file_name: str) -> bytes:
        try:
            resp = requests.get(url, timeout=20)
            if resp.ok and resp.content.startswith(b"%PDF"):
                return resp.content
        except Exception:
            pass

        # Fallback minimal PDF if download fails
        stream = f"BT\n/F1 12 Tf\n50 700 Td\n({file_name}) Tj\nET"
        return (
            b"%PDF-1.4\n"
            b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"
            b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"
            b"3 0 obj<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>endobj\n"
            b"4 0 obj<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>endobj\n"
            + f"5 0 obj<< /Length {len(stream)} >>stream\n{stream}\nendstream\nendobj\n".encode()
            + b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n "
            b"\n0000000222 00000 n \n0000000334 00000 n \ntrailer<< /Size 6 /Root 1 0 R >>\nstartxref\n533\n%%EOF\n"
        )
