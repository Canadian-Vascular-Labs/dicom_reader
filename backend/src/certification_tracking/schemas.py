from typing import Optional, List
from certification_tracking.models import Lab, EmployeeLabs, Employee
from ninja_schema import ModelSchema

class CertificationSchema(ModelSchema):
    id: int
    name: str
    description: str
    document_type: str
    default_validity_days: int

class LabSchema(ModelSchema):
    class Config:
        model = Lab

class EmployeeSchema(ModelSchema):
    role: str
    labs: List[str]  # Or use List[LabSchema] if you want full lab info
    email: Optional[str]
    certifications: List[CertificationSchema] = []

    class Config:
        model = Employee
        model_fields = ['id', 'first_name', 'last_name', 'email']
        model_config = {'from_attributes': True}

    @classmethod
    def from_orm(cls, obj):
        lab_names = [
            rel.lab.name for rel in EmployeeLabs.objects.select_related('lab').filter(employee=obj)
        ]
        return cls(
            id=obj.id,
            first_name=obj.first_name,
            last_name=obj.last_name,
            email=obj.email if obj.email else None,
            role=obj.role.name if obj.role else "",
            labs=lab_names,
        )
