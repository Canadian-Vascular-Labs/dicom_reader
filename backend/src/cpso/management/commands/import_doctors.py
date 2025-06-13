import json
import os
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from cpso.models import Doctor, Specialty, Address


class Command(BaseCommand):
    created = 0
    updated = 0
    help = "Import CPSO doctor records from a JSON file"

    def add_arguments(self, parser):
        parser.add_argument(
            "json_files",
            nargs="+",
            type=str,
            help="Path to the JSON file containing doctor data",
        )

    def import_data(self, data):
        with transaction.atomic():
            for cpsonumber, info in data.items():
                # Normalize fields safely
                name = (info.get("name") or "").strip()
                # total_addresses = (
                #     info.get("additionaladdresscount", 0) + 1
                # )  # +1 for primary address
                # specialties = info.get("specialties") or []
                # total_specialties = len(specialties.split("|")) if specialties else 0
                # print(f"Specialties: {specialties}, len: {total_specialties}")

                # Create or update Doctor
                doctor, was_created = Doctor.objects.update_or_create(
                    cpso_number=cpsonumber,
                    defaults={
                        "name": name,
                        # "total_addresses": total_addresses,
                        # "specialties_count": total_specialties,
                    },
                )

                if was_created:
                    self.created += 1
                else:
                    self.updated += 1

                # Specialties
                doctor.specialties.clear()
                specs_raw = info.get("specialties") or ""
                for spec_name in [s.strip() for s in specs_raw.split("|") if s.strip()]:
                    specialty, _ = Specialty.objects.get_or_create(name=spec_name)
                    doctor.specialties.add(specialty)

                # Primary address
                street1 = (info.get("street1") or "").strip()
                city = (info.get("city") or "").strip()
                province = (info.get("province") or "").strip()
                postal_code = (info.get("postalcode") or "").strip()

                Address.objects.update_or_create(
                    doctor=doctor,
                    street_1=street1,
                    city=city,
                    province=province,
                    postal_code=postal_code,
                    defaults={
                        "street_2": (info.get("street2") or "").strip() or None,
                        "street_3": (info.get("street3") or "").strip() or None,
                        "street_4": (info.get("street4") or "").strip() or None,
                        "phone_number": (info.get("phonenumber") or "").strip() or None,
                        "fax_number": (info.get("fax") or "").strip() or None,
                    },
                )

                # Additional addresses
                for addr in info.get("additionalAddresses") or []:
                    a_street1 = (addr.get("street1") or "").strip()
                    a_city = (addr.get("city") or "").strip()
                    a_province = (addr.get("province") or "").strip()
                    a_postal = (addr.get("postalcode") or "").strip()

                    Address.objects.update_or_create(
                        doctor=doctor,
                        street_1=a_street1,
                        city=a_city,
                        province=a_province,
                        postal_code=a_postal,
                        defaults={
                            "street_2": (addr.get("street2") or "").strip() or None,
                            "street_3": (addr.get("street3") or "").strip() or None,
                            "street_4": (addr.get("street4") or "").strip() or None,
                            "phone_number": (addr.get("phonenumber") or "").strip()
                            or None,
                            "fax_number": (addr.get("fax") or "").strip() or None,
                        },
                    )

    def handle(self, *args, **options):
        json_paths = options["json_files"]
        for json_path in json_paths:
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    print(f"Importing from {json_path}...")
                    self.import_data(data)
            except FileNotFoundError:
                self.stderr.write(self.style.ERROR(f"File not found: {json_path}"))
                continue
            except json.JSONDecodeError as e:
                self.stderr.write(self.style.ERROR(f"Invalid JSON in {json_path}: {e}"))
                continue
        self.stdout.write(
            self.style.SUCCESS(
                f"Import complete: {self.created} created, {self.updated} updated."
            )
        )
