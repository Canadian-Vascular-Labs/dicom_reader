from django.contrib import admin

from certification_tracking.models import EmployeeRole, Certification, Lab, Employee, EmployeeLabs

# Register your models here.
admin.site.register([EmployeeRole, Certification, Lab, Employee, EmployeeLabs])
