import json
from django.core.management.base import BaseCommand, CommandError
from certification_tracking.models import EmployeeRole, Certification


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
        Certification.objects.all().delete()
        EmployeeRole.objects.all().delete()

        self.stdout.write("Creating roles, certifications, and role requirements…")

        for role_name, cert_list in data.items():
            # 2) Create or get the EmployeeRole
            role_obj, _ = EmployeeRole.objects.get_or_create(name=role_name)

            for index, cert_data in enumerate(cert_list, start=1):
                # Extract fields from the JSON
                cert_name = cert_data["name"]
                description = cert_data.get("description", "")
                url = cert_data.get("url", None)
                valid_period = cert_data.get("valid_period", None)
                doc_type = cert_data.get("type", None)

                # 3) Create or get the Certification row
                #    - If a URL is a list, pick the first one (or join them); adapt as needed.
                if isinstance(url, list):
                    url_to_store = url[0]
                else:
                    url_to_store = url

                cert_obj, created = Certification.objects.get_or_create(
                    name=cert_name,
                    defaults={
                        "description": description,
                        "url": url_to_store,
                        "document_type": doc_type,
                        "default_validity_days": valid_period or 0,
                    },
                )
                if not created:
                    # If it already existed but some fields differ, you can update them:
                    updated = False
                    if cert_obj.description != description:
                        cert_obj.description = description
                        updated = True
                    if url_to_store and cert_obj.url != url_to_store:
                        cert_obj.url = url_to_store
                        updated = True
                    if doc_type and cert_obj.document_type != doc_type:
                        cert_obj.document_type = doc_type
                        updated = True
                    if valid_period and cert_obj.default_validity_days != valid_period:
                        cert_obj.default_validity_days = valid_period
                        updated = True
                    if updated:
                        cert_obj.save()

            self.stdout.write(
                self.style.SUCCESS(f"Loaded requirements for role: {role_name}")
            )

        self.stdout.write(self.style.SUCCESS("Finished loading all data."))
