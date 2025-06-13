import json
import tempfile
import asyncio
from django.db import transaction
from celery import shared_task
from celery.utils.log import get_task_logger
from bs4 import BeautifulSoup

# import CPSOScraper class
from cpso.scripts.extract_postal import CPSOScraper
from cpso.models import Doctor, Specialty, Address, ImportLog
import os

logger = get_task_logger(__name__)


@shared_task(name="cpso.tasks.import_cpso_data", bind=True)
def import_cpso_data(self, cpso_number=None, postal_code=None):
    task_id = self.request.id
    logger.info(
        f"CELERY TASK::import_cpso_data called with task_id: {task_id}, cpso_number: {cpso_number}, postal_code: {postal_code}"
    )

    should_run_scraper = postal_code is not None or cpso_number is not None
    temp_file_path = None

    async def run_scraper():
        if should_run_scraper:
            logger.info(f"CELERY TASK::Running scraper with postal code: {postal_code}, cpso number: {cpso_number} -- invoking sync-run")
            scraper = CPSOScraper()
            temp_file_path = await scraper.run(postals=[postal_code], cpso_numbers=[cpso_number])
            logger.info("CELERY TASK::Scraper run completed")
            return temp_file_path
        else:
            logger.info("No postal code or CPSO number provided -- terminating task")

        # now assume the scraper has stored the dict containing the data in a temporary file
        # need to update/create the database entries
        # right now, data stored in tmp_import_cpso_results.json

    temp_file_path = asyncio.run(run_scraper())
    if should_run_scraper:
        print(f"CELERY TASK::Temporary file created at: {temp_file_path}")
        update_db(task_id=task_id, temp_file_path=temp_file_path)
        os.remove(temp_file_path)  # clean up the temp file

    # update model with the task id

    return "done"


# helper functions for the task
def load_data_from_temp_file(temp_file_path=None):
    """
    Load data from the temporary file created by the CPSOScraper.
    """
    try:
        with open(temp_file_path, "r") as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        logger.error("Temporary file not found.")
        return {}
    except json.JSONDecodeError:
        logger.error("Error decoding JSON from temporary file.")
        return {}


def update_db(task_id=None, temp_file_path=None):
    data = load_data_from_temp_file(temp_file_path=temp_file_path)
    if not data:
        logger.error("No data to update in the database.")
        return
    logger.info(f"Updating database with {len(data)} entries.")

    created, updated = 0, 0
    with transaction.atomic():
        for cpso_num, info in data.items():
            logger.info(f"Processing CPSO number: {cpso_num}")
            doctor, was_created = Doctor.objects.update_or_create(
                cpso_number=cpso_num,
                defaults={
                    "name": clean_and_truncate(info.get("name")),
                },
            )

            if was_created:
                created += 1
            else:
                updated += 1

            doctor.specialties.clear()
            for spec_name in [
                s.strip() for s in info.get("specialties", "").split("|") if s.strip()
            ]:
                specialty, _ = Specialty.objects.get_or_create(name=spec_name)
                doctor.specialties.add(specialty)

            # Primary address
            street1 = clean_and_truncate(info.get("street1"))
            city = clean_and_truncate(info.get("city"))
            province = clean_and_truncate(info.get("province"))
            postal_code = clean_and_truncate(info.get("postalcode"))

            Address.objects.update_or_create(
                doctor=doctor,
                street_1=street1,
                city=city,
                province=province,
                postal_code=postal_code,
                defaults={
                    "street_2": clean_and_truncate(info.get("street2")),
                    "street_3": clean_and_truncate(info.get("street3")),
                    "street_4": clean_and_truncate(info.get("street4")),
                    "phone_number": clean_and_truncate(info.get("phonenumber"), 20),
                    "fax_number": clean_and_truncate(info.get("fax"), 20),
                },
            )

            # Additional addresses
            for addr in info.get("additionalAddresses") or []:
                street1_raw = addr.get("street1")
                if not street1_raw and addr.get("raw"):
                    street1_raw = addr.get("raw")  # fallback to raw if needed

                a_street1 = clean_and_truncate(street1_raw)
                a_city = clean_and_truncate(addr.get("city"))
                a_province = clean_and_truncate(addr.get("province"))
                a_postal = clean_and_truncate(addr.get("postalcode"))

                # REQUIRED FIELDS CHECK:
                if not (a_street1 and a_city and a_province and a_postal):
                    logger.warning(
                        f"Skipping additional address with missing required fields for CPSO {cpso_num}: "
                        f"street_1={a_street1}, city={a_city}, province={a_province}, postal_code={a_postal}"
                    )
                    continue  # skip this invalid address

                Address.objects.update_or_create(
                    doctor=doctor,
                    street_1=a_street1,
                    city=a_city,
                    province=a_province,
                    postal_code=a_postal,
                    defaults={
                        "street_2": clean_and_truncate(addr.get("street2")),
                        "street_3": clean_and_truncate(addr.get("street3")),
                        "street_4": clean_and_truncate(addr.get("street4")),
                        "phone_number": clean_and_truncate(addr.get("phonenumber"), 20),
                        "fax_number": clean_and_truncate(addr.get("fax"), 20),
                    },
                )

            # Log the import operation
            ImportLog.objects.update_or_create(
                doctor=doctor,
                defaults={
                    "task_id": task_id,
                    # timestamp will auto-set with auto_now_add=True
                },
            )

    logger.info(f"Database update complete. Created: {created}, Updated: {updated}")


def clean_and_truncate(val, max_len=100):
    if not val:
        return None
    # If HTML → strip it
    val = BeautifulSoup(val, "html.parser").get_text()
    # Truncate
    return val[:max_len]
