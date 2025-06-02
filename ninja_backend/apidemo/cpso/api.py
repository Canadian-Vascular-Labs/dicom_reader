from django.db.models import Q
from ninja import NinjaAPI, Query
from ninja.pagination import paginate, LimitOffsetPagination
from ninja.errors import HttpError

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
import jwt

from datetime import datetime, timedelta, timezone
from typing import List, Optional


from cpso.models import Doctor, Specialty, Address
from cpso.schemas import TokenSchema
import cpso.schemas as schemas
from cpso.auth import GlobalAuth
import re

api = NinjaAPI(auth=GlobalAuth())


@api.post("/login", auth=None, response=TokenSchema)
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


@api.get("/doctors", response=List[schemas.DoctorSchema])
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
    name: Optional[str] = Query(None, description="Filter by name"),
    cpso: Optional[str] = Query(None, description="Filter by CPSO number"),
):
    print(
        f"request: {request}, include_FSAs: {include_FSAs}, "
        f"include_specialties: {include_specialties}, "
        f"include_mailing_list: {include_mailing_list}, "
        f"name: {name}, cpso: {cpso}"
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
    if name:
        qs = qs.filter(name__icontains=name)
    if cpso:
        print(f"Filtering by CPSO number: {cpso}")
        qs = qs.filter(cpso_number=cpso)

    qs = qs.prefetch_related("specialties", "addresses")

    # return paginated results
    # make sure distinct is used to avoid duplicates
    qs = qs.distinct()
    return qs


# example detail endpoint
@api.get("/doctors/{cpso}", response=schemas.DoctorSchema)
def get_doctor(request, cpso: str):
    return Doctor.objects.prefetch_related("specialties", "addresses").get(
        cpso_number=cpso
    )


# endpoint to get all specialties
@api.get("/specialties", response=List[schemas.SpecialtySchema])
def list_specialties(request):
    return Specialty.objects.all()
