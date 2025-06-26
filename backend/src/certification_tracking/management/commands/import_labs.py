import json
from django.core.management.base import BaseCommand, CommandError
from certification_tracking.models import Lab


class Command(BaseCommand):
    help = "Loads role‐based certification requirements from a JSON file"

    def add_arguments(self, parser):
        parser.add_argument(
            "json_file",
            type=str,
            help="Path to JSON file containing Role → Certification arrays",
        )

    def handle(self, *args, **options):
        path = options["json_file"]
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            raise CommandError(f"File not found: {path}")
        except json.JSONDecodeError as e:
            raise CommandError(f"Invalid JSON: {e}")

        # 1) Clear out existing data (optional, if you want to overwrite)
        Lab.objects.all().delete()
        self.stdout.write("Creating labs…")
        created_labs = 0

        for lab_data in data:
            # Extract fields from the JSON
            lab_name = lab_data.get("name", "")
            lab_location = lab_data.get("address", "")
            lab_phone = lab_data.get("phone", "")

            # 3) Create or get the Lab row
            lab_obj, created = Lab.objects.get_or_create(
                name=lab_name,
                defaults={
                    "address": lab_location,
                    "contact_number": lab_phone,
                },
            )
            self.stdout.write(
                self.style.SUCCESS(f"Loaded requirements for lab: {lab_name}")
                )
            if created:
                created_labs += 1

        self.stdout.write(self.style.SUCCESS(f"Finished loading all data. {created_labs} labs created."))
