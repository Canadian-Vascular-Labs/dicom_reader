import os
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from cpso.models import Doctor, Specialty, Address


class Command(BaseCommand):
    created = 0
    updated = 0
    help = "Import CPSO doctor records from a XLSX file."

    def add_arguments(self, parser):
        parser.add_argument(
            # xlsx file path
            "xlsx_file",
            nargs="+",
            type=str,
            help="Path to the EXCEL file containing doctor data",
        )

    def query_doctor(self, first_name=None, last_name=None, FSA=None):
        """
        Query the Doctor model based on first name, last name, and FSA.
        Returns a Doctor instance if found, otherwise None.
        """
        try:
            return Doctor.objects.get(
                first_name=first_name.strip(),
                last_name=last_name.strip(),
            )
        except Doctor.DoesNotExist:
            return None

    def import_data(self, data):
        for idx, row in data.iterrows():
            # Extract fields from the row
            first_name = row.get("FName", "").strip()
            last_name = row.get("LName", "").strip()
            FSA = row.get("FSA", "").strip()

            print(f"Processing doctor: {first_name} {last_name}, FSA: {FSA}")
            doctor = self.query_doctor(first_name=first_name, last_name=last_name, FSA=FSA)
            if doctor:
                self.stdout.write(self.style.SUCCESS(f"Found doctor: {doctor}"))
                # update doctor by setting `is_on_mailing_list` to True
                doctor.is_on_mailing_list = True
                doctor.save()

            else:
                self.stdout.write(self.style.WARNING(f"Doctor not found: {first_name} {last_name}"))
                # Create a new doctor record if not found
            # exit()

    def handle(self, *args, **options):
        # read .xlsx file:
        xlsx_file = options["xlsx_file"]
        if not xlsx_file:
            self.stdout.write(self.style.ERROR("No XLSX file provided"))
            return
        
        # load the data from the XLSX file into numpy array
        import pandas as pd
        try:
            data = pd.read_excel(xlsx_file[0])  
            self.import_data(data)
        except Exception as e:
            raise CommandError(f"Error reading XLSX file: {e}")



# python manage.py import_mailing_list cpso/management/commands/data/mailingList.xlsx
