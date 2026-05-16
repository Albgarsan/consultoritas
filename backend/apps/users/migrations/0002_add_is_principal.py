# Generated migration for is_principal field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_principal",
            field=models.BooleanField(
                default=False,
                help_text="Indica si es un Asesor Principal con permisos de gestión y citas generales.",
            ),
        ),
    ]
