from ninja_schema import ModelSchema
from cpso.models import Doctor, Specialty, Address
from typing import List
from ninja import Schema


# login schema
class SignInSchema(Schema):
    username: str
    password: str


# Schemas using ModelSchema for auto fields
class SpecialtySchema(ModelSchema):
    class Config:
        model = Specialty


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
