from django.db.models import Q, Value, CharField
from django.db.models.functions import Concat
from ninja import NinjaAPI, Query, Router
from ninja.pagination import paginate, LimitOffsetPagination
from ninja.errors import HttpError

from django.conf import settings
from django.contrib.auth import authenticate
import jwt

from datetime import datetime, timedelta, timezone
from typing import List, Optional


from cpso.models import Doctor, Specialty, Address, ImportLog
from cpso.schemas import TokenSchema
import cpso.schemas as schemas
from cpso.auth import GlobalAuth
import sys

from cpso.tasks import import_cpso_data
from django.core.files import File
from openpyxl.styles import Alignment
from django.http import FileResponse
from tempfile import NamedTemporaryFile
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from io import BytesIO
from openpyxl.cell.cell import Cell



# from celery import current_app

# api = NinjaAPI(auth=GlobalAuth())

router = Router(tags=["cpso"])


@router.post("/login", auth=None, response=TokenSchema)
def login_view(request, payload: schemas.SignInSchema):
    print(f"Login attempt with user: {payload.username}")
    user = authenticate(request, username=payload.username, password=payload.password)
    if not user:
        raise HttpError(
            403, "Invalid credentials. Please check your email and password."
        )

    token_expires_in = datetime.now(timezone.utc) + timedelta(hours=1)
    print(
        f"Token expires at: {token_expires_in} -- (now: {datetime.now(timezone.utc)})"
    )
    token = jwt.encode(
        {
            "user_id": user.id,
            "exp": token_expires_in,
        },
        settings.SECRET_KEY,
        algorithm="HS256",
    )
    print(f"Generated token: {token}")

    return 200, TokenSchema(token=token)


def create_qs(include_FSAs, include_specialties, include_mailing_list, include_names, include_CPSOs):
    qs = Doctor.objects.all()

    if include_FSAs:
        fsa_q = Q()
        for fsa in include_FSAs:
            fsa_q |= Q(addresses__postal_code__startswith=fsa)
        qs = qs.filter(fsa_q)

    if include_specialties:
        specialty_q = Q()
        for specialty in include_specialties:
            specialty_q |= Q(specialties__name__icontains=specialty.strip())
        qs = qs.filter(specialty_q)

    if include_mailing_list is not None:
        qs = qs.filter(is_on_mailing_list=include_mailing_list)

    if include_names:
        qs = qs.annotate(
            full_name=Concat("first_name", Value(" "), "last_name")
        )

        name_q = Q()
        for n in include_names:
            tokens = n.strip().split()
            token_q = Q()
            for token in tokens:
                token_q &= Q(full_name__icontains=token)
            name_q |= token_q

        qs = qs.filter(name_q)


    if include_CPSOs:
        cpso_q = Q()
        for cpso in include_CPSOs:
            cpso_q |= Q(cpso_number=cpso)
        qs = qs.filter(cpso_q)

    return qs.prefetch_related("specialties", "addresses").distinct()

@router.post("/doctors", response=List[schemas.DoctorSchema])
@paginate(LimitOffsetPagination)
def list_doctors(
    request,
    payload: schemas.DoctorFilterSchema
):
    print(f"include names: {payload.include_names}", flush=True)

    start_time = datetime.now(timezone.utc)

    qs = create_qs(
        payload.include_FSAs,
        payload.include_specialties,
        payload.include_mailing_list,
        payload.include_names,
        payload.include_CPSOs
    )

    end_time = datetime.now(timezone.utc)
    elapsed_time = (end_time - start_time).total_seconds()
    print(f"Query executed in {elapsed_time:.2f} seconds. Total results: {qs.count()}", flush=True)

    qs = qs.order_by("last_name", "first_name")
    return qs

@router.get("/doctors/export", auth=None)
def export_excel_view(
    request,
    include_FSAs: Optional[List[str]] = Query(None, alias="include_FSAs[]"),
    include_specialties: Optional[List[str]] = Query(None, alias="include_specialties[]"),
    include_mailing_list: Optional[bool] = Query(None),
    include_names: Optional[List[str]] = Query(None, alias="include_names[]"),
    include_CPSOs: Optional[List[str]] = Query(None, alias="include_CPSOs[]"),
):
    start_time = datetime.now(timezone.utc)
    qs = create_qs(
        include_FSAs,
        include_specialties,
        include_mailing_list,   
        include_names,
        include_CPSOs
    ).only(
        "cpso_number", "first_name", "last_name",
    )  

    # qs = Doctor.objects.only("cpso_number", "name").prefetch_related("specialties", "addresses")
    # print(
    #     f"request: {request}, include_FSAs: {include_FSAs}, ")
    return generate_excel_file(qs, start_time=start_time)


# helper method to generate excel file
def generate_excel_file(doctors, start_time=None):
    """
    This function should generate an Excel file from the list of doctors.
    """
    wb = Workbook()
    ws = wb.active

    def styled_cell(value, wrap=False):
        cell = Cell(ws, value=value)
        if wrap:
            cell.alignment = Alignment(wrap_text=True)
        return cell


    # CPSO Number	LName	FName	Specialties	Address	City	FSA	Address2	Address3	Address4	Postal Code	Primary Phone Number	Primary Fax Number
    ws.append([
        "CPSO Number",  
        "Last Name",
        "First Name",
        "Specialties",
        "Address",
        "City",
        "FSA",
        "Address2",
        "Address3",
        "Address4",
        "Postal Code",
        "Primary Phone Number",
        "Primary Fax Number"
    ])

    # Apply header styles
    header_fill = PatternFill("solid", fgColor="D9E1F2")  # light blue
    header_font = Font(bold=True)
    header_alignment = Alignment(horizontal="center", vertical="center")
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin")
    )

    for col_idx, cell in enumerate(ws[1], start=1):
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    ws.freeze_panes = ws["A1"]


    # Populate the Excel sheet with doctor data
    total_processed = 0
    for doctor in doctors.iterator(chunk_size=1000):        
        first_name = doctor.first_name or ""
        last_name = doctor.last_name or ""

        addresses = list(doctor.addresses.all())
        specialty_text = "\n".join([spec.name for spec in doctor.specialties.all()])
        # for address lines (address_1, etc.)
        address_texts = [
            "\n".join(filter(None, [
                address.street_1,
                address.street_2,
                address.street_3,
                address.street_4,
                address.city,
                address.province,
                address.postal_code
            ])) if address else "Address not found"
            for address in list(doctor.addresses.all())
        ]        


        row = [
            doctor.cpso_number,
            last_name,
            first_name,
            styled_cell(specialty_text if specialty_text else "No specialties", wrap=True),
            styled_cell(address_texts[0] if address_texts else "Address not found", wrap=True),
            addresses[0].city if addresses else "City not found",
            addresses[0].postal_code[:3].upper() if addresses else "Address not found",
            styled_cell(address_texts[1] if len(address_texts) > 1 else "Address not found", wrap=True),
            styled_cell(address_texts[2] if len(address_texts) > 2 else "Address not found", wrap=True),
            styled_cell(address_texts[3] if len(address_texts) > 3 else "Address not found", wrap=True),
            addresses[0].postal_code if addresses else "",
            addresses[0].phone_number if addresses else "",
            addresses[0].fax_number if addresses else "",
        ]

        ws.append(row)

        total_processed += 1
        
        # makes download go from 3 seconds to 50 seconds
        # last_row = ws.max_row
        # for col in [4, 5, 8, 9, 10]:
        #     ws.cell(row=last_row, column=col).alignment = Alignment(wrap_text=True)

    for col in ws.columns:
        max_length = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(10, min(max_length + 2, 50))  # cap to avoid huge widths


    output = BytesIO()
    wb.save(output)
    output.seek(0)

    end_time = datetime.now(timezone.utc)
    elapsed_time = (end_time - start_time).total_seconds() if start_time else 0
    print(
        f"Excel file generated in {elapsed_time:.2f} seconds. ")

    print(f"Total doctors processed: {total_processed}", flush=True)

    return FileResponse(
        output,
        as_attachment=True,
        filename="doctors_export.xlsx",
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )



# fetch doctors names by prefix
@router.get("/doctors/names", response=List[str])
def list_doctors_by_name_prefix(request, query: str, is_first_name: bool):
    prefix = query.strip().lower()
    if (is_first_name):
        qs = Doctor.objects.filter(first_name__istartswith=prefix)
    else:
        qs = Doctor.objects.filter(last_name__istartswith=prefix)

    return sorted([f"{doc.first_name} {doc.last_name}" for doc in qs])


# endpoint for returning array of cpso numbers
@router.get("/doctors/fetch-{prefix}", response=List[str])
def list_doctor_cpso_numbers(request, prefix: str):
    return list(
        Doctor.objects.filter(cpso_number__startswith=prefix).values_list(
            "cpso_number", flat=True
        )
    )


# endpoint to get all specialties
@router.get("/specialties", response=List[schemas.SpecialtySchema])
def list_specialties(request):
    return Specialty.objects.all()


@router.get("/locations", response=List[schemas.LocationSchema])
def list_locations(request):
    """
    Endpoint to list all unique locations (postal codes) of doctors.
    Returns a list of unique postal codes where doctors are located.
    """
    locations = Address.objects.values_list("postal_code", flat=True).distinct()
    # extract the FSA (first three characters of the postal code)
    fsa_locations = [
        loc[:3].upper()
        for loc in locations
        if loc and loc[0].isalpha() and loc[1].isdigit() and loc[2].isalpha()
    ]

    print(f"Unique FSAs found: {fsa_locations}", flush=True)

    # return it as an array of dicts [{id: 1, FSA: "M5A"},...]
    unique_FSAs = sorted(set(fsa_locations))
    return [{"id": i + 1, "FSA": fsa} for i, fsa in enumerate(unique_FSAs)]


# import endpoint for importing doctors from CPSO
# just needs to return status 200 OK
@router.post("/doctors/import")
def import_view(request, data: schemas.ImportSchema):
    print("ENPOINT REACHED", flush=True)
    print("raw body:", request.body, flush=True)
    print("parsed data:", data, flush=True)
    print("cpso_number:", data.cpso_number, flush=True)
    print("postal_code:", data.postal_code, flush=True)

    # current_app.send_task("import_cpso_data", args=[data.cpso_number, data.postal_code])
    task = import_cpso_data.delay(data.cpso_number, data.postal_code)
    return {"message": "Import task queued.", "task_id": task.id}


# endpoint to check the status of the import task
@router.get("/doctors/import/status/{task_id}", response=schemas.ExtractorStatusSchema)
def check_import_status(request, task_id: str):
    print(f"Checking status for task ID: {task_id}", flush=True)
    task = import_cpso_data.AsyncResult(task_id)
    print(f"Task res: {task}", flush=True)
    print(f"Task res: {task.status}", flush=True)
    print(f"Task res: {task.result}", flush=True)

    # get the import log strings!
    import_logs_qs = ImportLog.objects.filter(task_id=task_id)
    import_logs = [
        {
            "doctor_name": log.doctor.name,
            "cpso_number": log.doctor.cpso_number,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in import_logs_qs
    ]
    print(f"Import logs: {import_logs}", flush=True)

    return {
        "task_id": task.id,
        "status": task.status,
        "result": task.result if task.ready() else None,
        "import_logs": import_logs,
    }
