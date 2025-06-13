import asyncio
import os
import re
import json
import random
from typing import Dict, List, Optional

import httpx
from bs4 import BeautifulSoup
from itertools import zip_longest
import demjson3


from rich.logging import RichHandler

import logging

import uvloop

asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())


logging.basicConfig(
    level="INFO",
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler()],
)
logger = logging.getLogger("rich")


class AddressScraper:
    tasks_in_progress = 0
    BASE_URL = "https://register.cpso.on.ca/physician-info/"

    _PROVINCES = {
        "AB": "Alberta",
        "BC": "British Columbia",
        "MB": "Manitoba",
        "NB": "New Brunswick",
        "NL": "Newfoundland and Labrador",
        "NS": "Nova Scotia",
        "NT": "Northwest Territories",
        "NU": "Nunavut",
        "ON": "Ontario",
        "PE": "Prince Edward Island",
        "QC": "Québec",
        "SK": "Saskatchewan",
        "YT": "Yukon",
    }

    # dict of dict additional addresses
    # FSA -> {CPSO number -> address}
    additional_addresses_dict = {}

    # Also map full names to themselves
    _PROVINCES.update({v: v for v in _PROVINCES.values()})

    _prov_pattern = "|".join(re.escape(k) for k in _PROVINCES.keys())
    _addr_re = re.compile(
        rf"^(?P<city>.+?)\s+(?P<prov>{_prov_pattern})\s+(?P<postal>[A-Za-z]\d[A-Za-z]\s*\d[A-Za-z]\d)$"
    )

    def __init__(
        self,
        concurrency: int = 1,
        timeout: httpx.Timeout = None,
        # data_file: str = "tmp_import_cpso_results_array.json",
        data_file: str = None,
    ):
        self.data_file = data_file
        # check if additional_addresses.json exists
        if not os.path.exists("additional_addresses.json"):
            total = 0
        else:
            data = json.load(
                open("additional_addresses.json")
            )  # read CPSO numbers from a file (dict with FSA as key)
            total = sum(len(cpsonums) for cpsonums in data.values())

        concurrency = max(concurrency, total)
        self.concurrency = concurrency
        logger.info(f"[yellow] ADDITIONAL ADDR Concurrency: {concurrency}")

        self.sem = asyncio.Semaphore(concurrency)
        self.timeout = timeout or httpx.Timeout(2.0, read=15.0, write=5.0, pool=5.0)
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/114.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": "https://register.cpso.on.ca/",
        }
        # Enable HTTP/2 multiplexing
        self.client = httpx.AsyncClient(
            http2=True,
            timeout=self.timeout,
            headers=headers,
            follow_redirects=True,
            limits=httpx.Limits(
                max_connections=concurrency,
                max_keepalive_connections=concurrency,
            ),
        )

        self.doctor_data = self.load_doctor_data()

    def load_doctor_data(self):
        # Load the doctor data from the data_file
        if not os.path.exists(self.data_file):
            logger.info(f"[red]Data file {self.data_file} not found, creating new one.")
            return {}

        try:
            with open(self.data_file, "r") as f:
                data = json.load(f)
            return data
        except json.JSONDecodeError:
            logger.info(f"[red]Data file {self.data_file} is empty or corrupted, creating new one.")
            return {}
        except Exception as e:
            logger.info(f"[red]Error loading data file {self.data_file}: {e}")
            return {}

    @staticmethod
    def clean_number(raw: str) -> str:
        digits = re.sub(r"\D", "", raw)
        return digits[-10:] if len(digits) >= 10 else digits


    async def fetch_data(self, cpso_num: int) -> tuple[int, dict]:
        async with self.sem:
            backoff = 1.0
            for attempt in range(1, 9):
                try:
                    # logger.info(f"[yellow]Fetching {cpso_num} (attempt {attempt})")
                    resp = await self.client.get(
                        self.BASE_URL, params={"cpsonum": cpso_num}
                    )
                    resp.raise_for_status()
                    soup = BeautifulSoup(resp.text, "lxml")
                    return 1, soup

                except httpx.HTTPStatusError as he:
                    logger.info(
                        f"[yellow]{cpso_num} → HTTP {he.response.status_code}"
                    )
                except httpx.HTTPError as e:
                    logger.info(f"[yellow]{cpso_num} → Network error: {e}")
                await asyncio.sleep(backoff + random.random() * 0.5)
                backoff = min(backoff * 2, 10.0)
        return 0, {}



    def parse_address(
        self, raw_html: str, raw_phone: str, raw_fax: str
    ) -> Optional[Dict]:
        lines = [ln.strip() for ln in re.split(r"<br\s*/?>", raw_html) if ln.strip()]
        if not lines:
            return None

        last = lines[-1]
        m = self._addr_re.match(last)
        if m:
            city = m.group("city")
            prov = self._PROVINCES[m.group("prov")]
            postal = m.group("postal")
            streets = lines[:-1]
            entry = {
                "street1": streets[0] if streets else "",
                "street2": streets[1] if len(streets) > 1 else "",
                "street3": streets[2] if len(streets) > 2 else "",
                "street4": streets[3] if len(streets) > 3 else "",
                "city": city,
                "province": prov,
                "postalcode": postal,
                "phonenumber": raw_phone,
                "fax": raw_fax,
            }
        else:
            entry = {
                "raw": raw_html,
                "city": None,
                "province": None,
                "postalcode": None,
            }

        return entry

    async def scrape(self, cpsonum: int) -> List[Dict]:
        status, soup = await self.fetch_data(cpsonum)
        if status != 1:
            logger.info(f"[red]Failed to fetch data for {cpsonum}")
            return []
        # logger.info(f"returned data: {soup}")

        practice_info = soup.find("div", class_="list-content scrp-additionalinfo")

        # logger.info(f"[green]Fetched data for {cpsonum} -- info: {practice_info}")

        # extract address, phone, and fax
        addresses = []
        phones = []
        faxes = []

        for row in practice_info.find_all("div", class_="scrp-additionalinfo-row"):
            addr = row.find("span", class_="scrp-practiceaddress-value")
            if addr:
                addresses.append(addr.decode_contents())
            else:
                addresses.append("")

            phone = row.find("span", class_="scrp-phone-value")
            if phone:
                phones.append(self.clean_number(phone.decode_contents()))
            else:
                phones.append("")

            fax = row.find("span", class_="scrp-fax-value")
            if fax:
                faxes.append(self.clean_number(fax.decode_contents()))
            else:
                faxes.append("")

        additionalAddresses = []
        for addr, phone, fax in zip_longest(addresses, phones, faxes, fillvalue=""):
            if not addr:
                continue
            parsed = self.parse_address(addr, phone, fax)
            if parsed:
                additionalAddresses.append(parsed)

        return additionalAddresses

    async def _worker(self, queue: asyncio.Queue):
        while True:
            cpso_num = await queue.get()
            # logger.info(f"Processing {cpso_num}")
            try:
                # extract array of addresses
                addresses = await self.scrape(cpso_num)

                if addresses:
                    self.doctor_data[str(cpso_num)]["additionalAddresses"] = addresses
                    logger.info(
                        f"[green]Added {len(addresses)} additional addresses for {cpso_num}"
                    )
            finally:
                queue.task_done()
                self.tasks_in_progress -= 1


    async def run(self, cpso_numbers: List[str]):
        logging.info(f"Scraping for CPSO numbers: {cpso_numbers}")
        queue = asyncio.Queue()
        for cpso_number in cpso_numbers:
            if not cpso_number.isdigit():
                logger.info(f"[red]Invalid CPSO number: {cpso_number}")
                continue
            cpso_number = int(cpso_number)
            FSA = str(cpso_number)[:3].upper()
            queue.put_nowait((cpso_number))  # Add the single CPSO number to the queue
            self.tasks_in_progress += 1

        # print the total number of tasks
        logger.info(f"Total tasks to process: {queue.qsize()}")

        workers = [asyncio.create_task(self._worker(queue)) for _ in range(self.concurrency)]

        while True:
            await queue.join()
            if queue.empty() and self.tasks_in_progress == 0:
                break

        for w in workers:
            w.cancel()

        await self.client.aclose()
        # write the data back to the file
        # print how many bytes of memory were used for the DICT
        logger.info(f"[green]TOTAL MB USED: {round(os.sys.getsizeof(self.doctor_data) / (1024 * 1024), 2)} MB")
        
        
        # write the data to the file
        with open(self.data_file, "w") as f:
            json.dump(self.doctor_data, f, indent=2)


        # self.update_addresses()
        logger.info("All tasks completed.")



