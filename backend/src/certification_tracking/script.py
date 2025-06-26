import os
import django

# Set Django settings module (adjust path if needed)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")  # adjust to your settings module

# Setup Django
django.setup()

from certification_tracking.models import Employee

e = Employee.objects.get(first_name="Akima")
print(e.labs.all())  # should not be an empty queryset
