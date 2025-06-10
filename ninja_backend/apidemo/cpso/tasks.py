import json
import tempfile
import asyncio
from django.db import transaction
from celery import shared_task
from celery.utils.log import get_task_logger

# import CPSOScraper class 
from cpso.scripts.extract_postal import CPSOScraper
from cpso.scripts.extract_cpso import AddressScraper
from cpso.models import Doctor, Specialty, Address

logger = get_task_logger(__name__)


@shared_task(name="cpso.tasks.import_cpso_data")
def import_cpso_data(cpso_number, postal_code=None):
    

    async def run_scraper():
        if postal_code or cpso_number:
            logger.info(f"CELERY TASK::Running scraper with postal code: {postal_code}")
            scraper = CPSOScraper()
            await scraper.run(postals=[postal_code], cpso_numbers=[cpso_number])
        else:
            logger.info("No postal code or CPSO number provided -- terminating task")
    
        # now assume the scraper has stored the dict containing the data in a temporary file
        # need to update/create the database entries
        # right now, data stored in tmp_import_cpso_results.json


    asyncio.run(run_scraper())   
    update_db()

    return "done"


# helper functions for the task
def load_data_from_temp_file():
    """
    Load data from the temporary file created by the CPSOScraper.
    """
    temp_file = "tmp_import_cpso_results.json"
    try:
        with open(temp_file, "r") as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        logger.error("Temporary file not found.")
        return {}
    except json.JSONDecodeError:
        logger.error("Error decoding JSON from temporary file.")
        return {}
    
def update_db():
    data = load_data_from_temp_file()
    if not data:
        logger.error("No data to update in the database.")
        return
    logger.info(f"Updating database with {len(data)} entries.")

    created, updated = 0, 0
    with transaction.atomic():
        for cpso_num, info in data.items():
            # Assuming you have a function to update or create doctor records
            # This is a placeholder for your actual database update logic
            logger.info(f"Processing CPSO number: {cpso_num}, Info: {info}")
            doctor, was_created = Doctor.objects.update_or_create(
                cpso_number=cpso_num,
                defaults={
                    "name": info.get("name", "").strip(),
                    },
            )

            if was_created:
                created += 1
            else:
                updated += 1

            doctor.specialties.clear()
            specialties = info.get("specialties", "")

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
        # Example: update_or_create_doctor(cpso_num, info)
    logger.info(f"Database update complete. Created: {created}, Updated: {updated}")


