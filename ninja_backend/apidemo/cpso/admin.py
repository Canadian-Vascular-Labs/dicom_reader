from django.contrib import admin

from cpso.models import Doctor, Specialty, Address
from apidemo.models import User

# Register your models here.
admin.site.register([Doctor, Specialty, Address])
admin.site.register(User)