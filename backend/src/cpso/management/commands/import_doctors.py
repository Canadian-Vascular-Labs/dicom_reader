import json
import os
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from cpso.models import Doctor, Specialty, Address
import glob


class Command(BaseCommand):
    created = 0
    updated = 0
    help = "Import CPSO doctor records from a JSON file"

    def safe_trim(self, value, max_length=100):
        if value is None:
            return ""
            
        return (value or "").strip()[:max_length]

    # Example usage
    # "street_3": safe_trim(info.get("street3"))


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
                street1 = self.safe_trim(info.get("street1"))
                city = self.safe_trim(info.get("city"))
                province = self.safe_trim(info.get("province"))
                postal_code = self.safe_trim(info.get("postalcode"))

                Address.objects.update_or_create(
                    doctor=doctor,
                    street_1=street1,
                    city=city,
                    province=province,
                    postal_code=postal_code,
                    defaults={
                        "street_2": self.safe_trim(info.get("street2")),
                        "street_3": self.safe_trim(info.get("street3")),
                        "street_4": self.safe_trim(info.get("street4")),
                        "phone_number": self.safe_trim(info.get("phonenumber")),
                        "fax_number": self.safe_trim(info.get("fax")),
                    },
                )

                # Additional addresses
                for addr in info.get("additionalAddresses") or []:
                    a_street1 = self.safe_trim(addr.get("street1")) 
                    a_city = self.safe_trim(addr.get("city")) 
                    a_province = self.safe_trim(addr.get("province")) 
                    a_postal = self.safe_trim(addr.get("postalcode")) 

                    Address.objects.update_or_create(
                        doctor=doctor,
                        street_1=a_street1,
                        city=a_city,
                        province=a_province,
                        postal_code=a_postal,
                        defaults={
                            "street_2": self.safe_trim(addr.get("street2")),
                            "street_3": self.safe_trim(addr.get("street3")),
                            "street_4": self.safe_trim(addr.get("street4")),
                            "phone_number": self.safe_trim(addr.get("phonenumber")),
                            "fax_number": self.safe_trim(addr.get("fax")),
                        },
                    )

    def handle(self, *args, **options):
        json_inputs = options["json_files"]
        json_paths = []

        for path in json_inputs:
            if os.path.isdir(path):
                # Add all .json files in the directory
                json_paths.extend(glob.glob(os.path.join(path, "*.json")))
            else:
                json_paths.append(path)


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
