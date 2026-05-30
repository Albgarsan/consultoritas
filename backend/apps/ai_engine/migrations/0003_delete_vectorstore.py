from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("ai_engine", "0002_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS vector_store;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
