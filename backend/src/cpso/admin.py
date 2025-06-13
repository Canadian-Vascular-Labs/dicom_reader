from django.contrib import admin

from cpso.models import Doctor, Specialty, Address, ImportLog
from core.models import User

# Register your models here.
admin.site.register([Doctor, Specialty, Address, ImportLog])
admin.site.register(User)