from django.db import models


class Doctor(models.Model):
    # make cpso_number PK
    cpso_number = models.CharField(max_length=10, primary_key=True)
    name = models.CharField(max_length=100)
    is_on_mailing_list = models.BooleanField(default=False)

    specialties = models.ManyToManyField("Specialty", related_name="doctors")

    def __str__(self):
        return f"{self.name} -- ({self.cpso_number})"


# doctor specialties, many-to-many relationship
class Specialty(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Address(models.Model):
    street_1 = models.CharField(max_length=100)
    street_2 = models.CharField(max_length=100, blank=True, null=True)
    street_3 = models.CharField(max_length=100, blank=True, null=True)
    street_4 = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=50)
    province = models.CharField(max_length=50)
    postal_code = models.CharField(max_length=10)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    fax_number = models.CharField(max_length=15, blank=True, null=True)

    is_primary_address = models.BooleanField(default=False)

    # foreign key to doctor
    doctor = models.ForeignKey(
        Doctor, on_delete=models.CASCADE, related_name="addresses"
    )

    def __str__(self):
        return f"{self.street_1}, {self.city}, {self.province}, {self.postal_code}, {self.country} -- ({self.doctor.name})"
