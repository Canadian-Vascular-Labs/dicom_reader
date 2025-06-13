import asyncio
import uvloop
import random
import json
import re
from collections import deque
from string import ascii_uppercase

import httpx
import demjson3
from rich.logging import RichHandler
import logging

import os
from cpso.scripts.extract_cpso import AddressScraper
import tempfile

tmp_dir = tempfile.gettempdir()
temp_file_path = os.path.join(tmp_dir, "tmp_import_cpso_results.json")

# Global logging config
logging.basicConfig(
    level="INFO",
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler()],
)
logger = logging.getLogger("rich")

# Set uvloop globally (recommended)
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

class CPSOScraper:
    
    BASE_URL = "https://register.cpso.on.ca/Get-Search-Results/"
    specialties = [
        "Family Medicine", "Internal Medicine", "Cardiology",
        "Obstetrics and Gynecology", "Ophthalmology", "Orthopedic Surgery",
        "Neurology", "Endocrinology and Metabolism", "Emergency Medicine",
        "Dermatology", "Otolaryngology - Head and Neck Surgery", "Urology",
        "Plastic Surgery", "Physical Medicine and Rehabilitation",
        "Geriatric Medicine", "Hematology", "Infectious Diseases",
        "General Internal Medicine", "Community Medicine",
        "Cardiovascular and Thoracic Surgery", "Occupational Medicine",
        "Cardiac Surgery", "Cardiothoracic Surgery", "Elder Care Centre",
        "Family Medicine (Addiction Medicine)",
        "Family Medicine (Emergency Medicine)",
        "Family Medicine (Sport and Exercise Medicine)",
        "Nephrology", "Pain Medicine", "Rheumatology",
        "Radiation Oncology", "Unknown",
    ]

    def __init__(self, concurrency: int = 100, timeout: httpx.Timeout = None):
        self.concurrency = max(concurrency, 1)
        self.timeout = timeout or httpx.Timeout(2.0, read=15.0, write=5.0, pool=5.0)
        self.doctor_dict = {}

        self.sem = asyncio.Semaphore(self.concurrency)
        self.extracted = set()
        self.written = set()
        self.failed_postals = set()
        self.phys_with_additional_addrs = dict()
        self.total_query_count = 0
        self.tasks_in_progress = 0

        self.address_scraper = None

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/114.0.0.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": "https://register.cpso.on.ca/",
        }

        self.client = httpx.AsyncClient(
            http2=True,
            timeout=self.timeout,
            headers=headers,
            follow_redirects=True,
            limits=httpx.Limits(
                max_connections=self.concurrency,
                max_keepalive_connections=self.concurrency,
            ),
        )

    @staticmethod
    def clean_number(raw: str) -> str:
        digits = re.sub(r"\D", "", raw)
        return digits[-10:] if len(digits) >= 10 else digits

    @staticmethod
    def repair_broken_json(raw: str) -> str:
        raw = re.sub(r"[\x00-\x1F\x7F]", "", raw)
        raw = raw.replace('\\"', '"')
        raw = re.sub(r'(?<!\\)\\(?![\\nt"r/])', r"\\\\", raw)
        raw = re.sub(r'(" : [^,}\]]+)(\s*)"(\w+)":', r'\1,\2"\3":', raw)
        raw = re.sub(r",\s*,+", ",", raw)
        raw = re.sub(r"{\s*,", "{", raw)
        raw = re.sub(r"\[\s*,", "[", raw)
        raw = re.sub(r",\s*]", "]", raw)
        return raw

    def build_param_sets(self, postal: str):
        yield {"cbx-includeinactive": "on", "postalCode": postal, "doctorType": "Family Doctor", "firstName": ""}
        for spec in self.specialties:
            yield {
                "cbx-includeinactive": "on",
                "postalCode": postal,
                "doctorType": "Specialist",
                "SpecialistType": spec,
                "firstName": "",
            }

    async def fetch_data(self, params: dict) -> tuple[int, dict]:
        self.total_query_count += 1
        async with self.sem:
            backoff = 1.0
            for attempt in range(1, 9):
                try:
                    resp = await self.client.get(self.BASE_URL, params=params)
                    resp.raise_for_status()
                    try:
                        return 1, json.loads(resp.text)
                    except json.JSONDecodeError:
                        repaired = self.repair_broken_json(resp.text)
                        return 1, demjson3.decode(repaired)
                except Exception as e:
                    logger.info(f"[yellow]Fetch error: {e}")
                    await asyncio.sleep(backoff + random.random() * 0.5)
                    backoff = min(backoff * 2, 10.0)
        return 0, {}

    def _process_result(self, res: dict, results: list, FSA: str):
        cpsonum = res.get("cpsonumber")
        if not cpsonum or cpsonum in self.extracted:
            return

        res["phonenumber"] = self.clean_number(res.get("phonenumber", ""))
        res["fax"] = self.clean_number(res.get("fax", ""))
        res["postalcode"] = res.get("postalcode", "").strip().upper()
            
        if res.get("additionaladdresscount", 0) > 0 and FSA is not None:
            self.phys_with_additional_addrs.setdefault(FSA, []).append(cpsonum)
        else:
            res["additionaladdresses"] = []

        self.extracted.add(cpsonum)
        results.append(res)

    def handle_too_many_results(self, postal: str, params: dict, queue: asyncio.Queue):
        logger.info(f"[yellow]Too many results for {postal} → expanding search")
        fan = []
        if not params.get("doctorType"):
            fan = list(self.build_param_sets(postal))
        else:
            for letter in ascii_uppercase:
                p = params.copy()
                p["firstName"] += letter
                fan.append(p)

        for newp in fan:
            queue.put_nowait((postal, newp))
            self.tasks_in_progress += 1

    async def process_postal(self, queue: asyncio.Queue, postal: str, params: dict):
        results = []
        status, data = await self.fetch_data(params)
        if status != 1:
            self.failed_postals.add(postal)
            return postal, []

        total = data.get("totalcount", 0)
        # logger.info(f"[cyan]Fetched {postal} {params} → total={total}")
        # logger.info(f"[cyan]Results: {data}")

        if total == -1:
            self.handle_too_many_results(postal, params, queue)

        # logger.info(f"Data: {data}")
        for res in data.get("results", []):
            if postal is None:
                postal = res.get("postalcode", "").strip().upper()
            FSA = postal[:3].upper()
            # logger.info(f"[green]Processing result for {postal} {FSA} {res.get('cpsonumber')}")
            self._process_result(res, results, FSA)

        # logger.info(f"[green]Processed {len(results)} results for {postal} {params}")
        return postal, results

    async def _worker(self, queue: asyncio.Queue):
        while True:
            postal, params = await queue.get()
            try:
                # logger.info(f"Processing {postal} {params}")
                _, results = await self.process_postal(queue, postal, params)
                # logger.info(f"Done {postal} → {len(results)} results")
            finally:
                self.tasks_in_progress -= 1
                self.update_dict(results)
                queue.task_done()

    def update_dict(self, results: list):
        for res in results:
            cpsonum = res.get("cpsonumber")
            # save as dict with cpsonum as key
            if cpsonum is None:
                logger.info(f"[red]No CPSO number found in result: {res}")
                continue
            # write the result as a JSON object
            if cpsonum and cpsonum not in self.written:
                self.doctor_dict[cpsonum] = res
                self.written.add(cpsonum)

    def save_as_json(self):
        logger.info(f"[yellow]DOCTOR DICT: {self.doctor_dict}")
        # Write as valid JSON array
        with open(temp_file_path, 'w') as f:
            json.dump(self.doctor_dict, f, indent=2)

    async def run(self, postals: list[str], cpso_numbers: list[str] = None):
        # clean up old logs
        queue = asyncio.Queue()

        logger.info(f"[blue]Adding CPSO numbers and postals to queue")
        # for cpsonum in (cpsonum for cpsonum in (cpso_numbers or []) if cpsonum):
        #     queue.put_nowait((cpsonum, {"cbx-includeinactive": "on", "cpsonumber": cpsonum}))
        #     self.tasks_in_progress += 1
        #     # logger.info(f"[green]Added CPSO number {cpsonum} to queue")

        for p in (p for p in (postals or []) if p):
            queue.put_nowait((p, {"cbx-includeinactive": "on", "postalCode": p, "firstName": ""}))
            self.tasks_in_progress += 1
            # logger.info(f"[green]Added postal {p} to queue")

        for cpso_number in (cpso_number for cpso_number in (cpso_numbers or []) if cpso_number):
            if not cpso_number.isdigit():
                # logger.info(f"[red]Invalid CPSO number: {cpso_number}")
                continue
            cpso_number = int(cpso_number)
            queue.put_nowait((None, {"cbx-includeinactive": "on", "cpsonumber": cpso_number}))
            self.tasks_in_progress += 1
            # logger.info(f"[green]Added CPSO number {cpso_number} to queue")

        workers = [asyncio.create_task(self._worker(queue)) for _ in range(self.concurrency)]

        while True:
            await queue.join()
            logger.info(f"[blue]Progress: {len(self.extracted)} extracted, {self.total_query_count} queries, {self.tasks_in_progress} remaining")
            if queue.empty() and self.tasks_in_progress == 0:
                break

        for w in workers:
            w.cancel()

        await self.client.aclose()
        logger.info(f"[green]Done. Extracted {len(self.extracted)} CPSONumbers. Total queries: {self.total_query_count}")
        self.save_as_json()
        # log the doctors with additional addresses
        if self.phys_with_additional_addrs:
            logger.info("[yellow]Doctors with additional addresses:")
            cpso_nums = []
            for fsa, cpsonums in self.phys_with_additional_addrs.items():
                logger.info(f"{fsa}: {', '.join(cpsonums)}")
                cpso_nums.extend(cpsonums)

            print(f"[yellow]Total doctors with additional addresses: {len(cpso_nums)}")
            self.address_scraper = AddressScraper(concurrency=len(cpso_nums), timeout=self.timeout, data_file=temp_file_path)
            await self.address_scraper.run(cpso_numbers=cpso_nums)

        else:
            logger.info("[green]No doctors with additional addresses found.")

        # turn the results into a valid JSON array
        logger.info(f"[green]Results saved to {temp_file_path}")
        # return the temporary file path so the caller can access it
        return temp_file_path
