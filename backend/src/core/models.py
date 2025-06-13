from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom user model that extends the default Django user model.
    This allows for additional fields or methods in the future if needed.
    """

    class Roles(models.TextChoices):
        ADMIN = "admin", "Admin"
        HR = "hr", "HR"
        EMPLOYEE = "employee", "Employee"

    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.EMPLOYEE,
        help_text="Role of the user in the system",
    )

    def __str__(self):
        return f"{self.username} ({self.role})"