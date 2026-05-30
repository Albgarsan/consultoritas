from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="document",
            name="status",
            field=models.CharField(
                choices=[
                    ("Pendiente", "Pendiente"),
                    ("Procesado", "Procesado"),
                    ("Error", "Error"),
                ],
                default="Pendiente",
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name="taxcalendar",
            name="tax_type",
            field=models.CharField(
                choices=[
                    ("111", "111"),
                    ("115", "115"),
                    ("123", "123"),
                    ("130", "130"),
                    ("202", "202"),
                    ("303", "303"),
                ],
                max_length=50,
            ),
        ),
    ]
