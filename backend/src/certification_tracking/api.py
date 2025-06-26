from ninja import Query, Router

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from certification_tracking.models import Certification, Employee, EmployeeLabs
import certification_tracking.schemas as schemas
from django.db.models import Q

router = Router(tags=["certifications"])

@router.get("/certifications", response=List[schemas.CertificationSchema])
def list_certifications(request):
    """
    List all certifications available in the system.
    """
    qs = Certification.objects.all()

    # we only want the name and description fields
    qs = qs.values("id", "name", "description", "document_type", "default_validity_days")
    return qs

@router.get("/employees", response=List[schemas.EmployeeSchema])
def list_employees(request):
    employees = Employee.objects.select_related("role").all()
    return [schemas.EmployeeSchema.from_orm(emp) for emp in employees]


@router.get("/employees/name-{prefix}", response=List[str])
def list_employees_by_name_prefix(request, prefix: str):
    # check if first or last name starts with the prefix
    employees = Employee.objects.filter(
        Q(first_name__istartswith=prefix) | Q(last_name__istartswith=prefix)
    ).values_list("first_name", "last_name")
    return [f"{first} {last}" for first, last in employees] 