from ninja_schema import ModelSchema
from cpso.models import Doctor, Specialty, Address
from typing import Dict, List
from ninja import Schema
from typing import Optional
from pydantic import BaseModel


# login schema
class SignInSchema(Schema):
    username: str
    password: str


# Schemas using ModelSchema for auto fields
class SpecialtySchema(ModelSchema):
    class Config:
        model = Specialty


class LocationSchema(BaseModel):
    id: int
    FSA: str


class AddressSchema(ModelSchema):
    class Config:
        model = Address


class DoctorSchema(ModelSchema):
    specialties: List[SpecialtySchema]
    addresses: List[AddressSchema]

    class Config:
        model = Doctor


class TokenSchema(Schema):
    token: str


class ImportSchema(BaseModel):
    cpso_number: Optional[str] = None
    postal_code: Optional[str] = None


class ExtractorStatusSchema(Schema):
    task_id: str
    status: str
    result: Optional[str] = None
    import_logs: Optional[List[Dict]] = None

class DoctorFilterSchema(BaseModel):
    include_FSAs: Optional[List[str]] = None
    include_specialties: Optional[List[str]] = None
    include_mailing_list: Optional[bool] = None
    include_names: Optional[List[str]] = None
    include_CPSOs: Optional[List[str]] = None
