from django.db.models import Q
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

# from celery import current_app

# api = NinjaAPI(auth=GlobalAuth())

router = Router(tags=["cpso"])


@router.post("/login", auth=None, response=TokenSchema)
def login_view(request, payload: schemas.SignInSchema):
    # print if we are using postgres image (docker) for db or external db
    # if settings.DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql":
    #     print("Using PostgreSQL database (docker image)", file=sys.stderr)
    # else:
    #     print("Using external database")

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


@router.get("/doctors", response=List[schemas.DoctorSchema])
@paginate(LimitOffsetPagination)
def list_doctors(
    request,
    include_FSAs: Optional[List[str]] = Query(None, description="Filter by FSAs"),
    include_specialties: Optional[List[str]] = Query(
        None, description="Filter by doctor specialties"
    ),
    include_mailing_list: Optional[bool] = Query(
        None, description="Filter by if the doctor is already on the mailing list"
    ),
    include_names: Optional[List[str]] = Query(None, description="Filter by name"),
    include_CPSOs: Optional[List[str]] = Query(
        None, description="Filter by CPSO number"
    ),
):
    print(
        f"request: {request}, include_FSAs: {include_FSAs}, "
        f"include_specialties: {include_specialties}, "
        f"include_mailing_list: {include_mailing_list}, "
        f"include_names: {include_names}, include_CPSOs: {include_CPSOs}"
    )
    qs = Doctor.objects.all()

    # prefetch related fields to optimize queries
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
        name_q = Q()
        for n in include_names:
            name_q |= Q(name__icontains=n.strip())
        qs = qs.filter(name_q)
    if include_CPSOs:
        cpso_q = Q()
        for cpso in include_CPSOs:
            cpso_q |= Q(cpso_number=cpso)
        qs = qs.filter(cpso_q)

    qs = qs.prefetch_related("specialties", "addresses")

    # return paginated results
    # make sure distinct is used to avoid duplicates
    qs = qs.distinct()
    return qs


# fetch doctors names by prefix
@router.get("/doctors/name-{prefix}", response=List[str])
def list_doctors_by_name_prefix(request, prefix: str):
    return list(
        Doctor.objects.filter(name__icontains=prefix).values_list("name", flat=True)
    )


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
