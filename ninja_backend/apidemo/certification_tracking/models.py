# ninja_backend/apidemo/cpso/models.py

from datetime import date
from django.db import models
from django.core.exceptions import ValidationError


class Lab(models.Model):
    """
    An Employee can work at multiple Labs, and a Lab can have many Employees.
    """

    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Name of the lab (must be unique)",
    )
    address = models.TextField(help_text="Street address of the lab")
    contact_number = models.CharField(
        max_length=15,
        help_text="Contact phone number for the lab",
    )

    def __str__(self):
        return self.name


class EmployeeRole(models.Model):
    """
    Represents a specific role that an Employee can have within a Lab.
    An Employee can have multiple roles across different Labs.
    """

    class Roles(models.TextChoices):
        DIAGNOTIC_MEDICAL_SONOGRAPHER = "DMS", "Diagnostic Medical Sonographer"
        MEDICAL_RADIATION_TECHNOLOGIST_R = "MRT_R", "Medical Radiation Technologist (R)"
        MEDICAL_RADIATION_TECHNOLOGIST_N = "MRT_N", "Medical Radiation Technologist (N)"
        MEDICAL_ADMINISTRATOR = "MA", "Medical Administrator"
        REGISTERED_CARDIO_VASCULAR_TECHNOLOGIST = (
            "RCVT",
            "Registered Cardio-Vascular Technologist",
        )
        TEAM_LEAD = "TL", "Team Lead"
        PRACTICAL_NURSE = "PN", "Practical Nurse"
        NURSE_PRACTITIONER = "NP", "Nurse Practitioner"
        CLINIC_MANAGER = "CM", "Clinic Manager"
        OTHER = "OT", "Other"

    name = models.CharField(
        max_length=50,
        choices=Roles.choices,
        default=Roles.OTHER,
        help_text="Role name (e.g. ‘Diagnostic Medical Sonographer’)",
    )

    description = models.TextField(
        help_text="A short description of what this role entails",
        default="",
    )

    def __str__(self):
        return self.name


class Certification(models.Model):
    """
    Master list of all possible certifications that an Employee can earn.
    This does NOT track individual employees earning it—that is handled by EmployeeCertification.
    """

    DOCUMENT_TYPE_CHOICES = [
        ("IQ", "Internal Quiz (internally created)"),
        ("IM", "Internal Management (management filed)"),
        ("EQ", "External Quiz (employee uses external link)"),
        ("RC", "Requested from Employee (we collect)"),
        ("DF", "Distributed Form (employee returns)"),
        ("AT", "Employee Attestation"),
        ("OT", "Other (unkown type)"),
    ]

    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Unique name of the certification (e.g. “Basic Life Support”)",
    )
    description = models.TextField(
        help_text="A short description of what this certification covers"
    )
    url = models.URLField(
        blank=True,
        null=True,
        help_text="(Optional) URL to the certification details or external resource",
    )
    document_type = models.CharField(
        max_length=2,
        choices=DOCUMENT_TYPE_CHOICES,
        default="OT",
        help_text="Type of document or certification (e.g. ‘Internal Quiz’, ‘External Quiz’)",
    )
    # It is often useful to have a “default validity period” at the master level,
    # but in many real‐world cases each employee’s expiry depends on when they took it.
    # If you want a fixed validity (e.g. 2 years after issue), you could store that here:
    default_validity_days = models.PositiveIntegerField(
        default=365,
        help_text="Default number of days this certification is valid for after being awarded",
    )

    def __str__(self):
        return self.name


class Employee(models.Model):
    """
    A single Employee (someone who can hold multiple Certifications and can work at multiple Labs).
    """

    # foreign key to EmployeeRole
    role = models.ForeignKey(
        EmployeeRole,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        help_text="Role of the employee (e.g. ‘Diagnostic Medical Sonographer’)",
    )

    first_name = models.CharField(
        max_length=100,
        help_text="Employee’s given (first) name",
    )
    last_name = models.CharField(
        max_length=100,
        help_text="Employee’s family (last) name",
    )
    email = models.EmailField(
        unique=True,
        help_text="Unique email address of the employee",
    )
    phone_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        help_text="Contact phone number (optional)",
    )

    # “Employee works at many Labs, Lab has many Employees”
    labs = models.ManyToManyField(
        Lab,
        related_name="employees",
        blank=True,
        help_text="Which labs this employee is currently associated with",
    )

    # “Employee has many Certifications” through the intermediate model
    certifications = models.ManyToManyField(
        Certification,
        through="EmployeeCertification",
        related_name="holders",
        help_text="Certifications that this employee has completed",
    )

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    def completed_certifications(self):
        """
        Returns a QuerySet of all Certification objects that this Employee currently holds
        (regardless of whether they are expired or not).
        """
        return Certification.objects.filter(
            pk__in=self.employeecertification_set.values_list(
                "certification_id", flat=True
            )
        )

    def missing_certifications(self):
        """
        Returns a QuerySet of all Certification objects that exist in the system
        but this employee has never completed (no EmployeeCertification record at all).
        """
        return Certification.objects.exclude(
            pk__in=self.employeecertification_set.values_list(
                "certification_id", flat=True
            )
        )

    def certifications_to_renew(self):
        """
        Returns a QuerySet of all Certification objects that this employee
        has but whose expiration_date is in the past (i.e. needs renewal).
        """
        return Certification.objects.filter(
            pk__in=self.employeecertification_set.filter(
                expiration_date__lt=date.today()
            ).values_list("certification_id", flat=True)
        )


class EmployeeCertification(models.Model):
    """
    The “through” table that links Employee <–> Certification. Every time an employee
    completes (earns) a certification, you create one of these records, storing
    issue_date, expiration_date, etc.
    """

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="employeecertification_set",
    )
    certification = models.ForeignKey(
        Certification,
        on_delete=models.CASCADE,
        related_name="employeecertification_set",
    )
    date_awarded = models.DateField(
        help_text="Date on which the employee earned the certification",
    )
    expiration_date = models.DateField(
        help_text="Date on which this certification will expire for this employee",
    )
    # (Optionally) store a file, a certificate number, or other metadata:
    # certificate_file = models.FileField(
    #     upload_to="employee_certificates/",
    #     blank=True,
    #     null=True,
    #     help_text="(Optional) a scanned copy or PDF of the actual certificate",
    # )

    class Meta:
        unique_together = (("employee", "certification"),)
        ordering = ["employee", "certification"]

    def __str__(self):
        return (
            f"{self.employee} – {self.certification} "
            f"(Awarded: {self.date_awarded}, Expires: {self.expiration_date})"
        )

    def clean(self):
        """
        Ensure that expiration_date is not earlier than date_awarded.
        """
        if self.expiration_date < self.date_awarded:
            raise ValidationError(
                {
                    "expiration_date": "Expiration date cannot be before the date awarded."
                }
            )

    @property
    def is_expired(self):
        """Returns True if today is strictly after expiration_date."""
        return date.today() > self.expiration_date

    @property
    def days_until_expiry(self):
        """Integer number of days until expiration (negative if already expired)."""
        return (self.expiration_date - date.today()).days
