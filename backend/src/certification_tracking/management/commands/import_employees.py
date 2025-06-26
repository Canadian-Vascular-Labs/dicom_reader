import json
from django.core.management.base import BaseCommand, CommandError
from certification_tracking.models import Employee, Lab, EmployeeRole, EmployeeLabs


class Command(BaseCommand):
    help = "Loads role‐based certification requirements from a JSON file"

    def parse_role(self, role_name):
        """
        Parses the role name to match the EmployeeRole model.
        Handles special cases like 'MRT(R)' to 'MRT_R'.
        """
        if role_name == "MRT(R)":
            return "MRT_R"
        elif role_name == "MRT(N)":
            return "MRT_N"
        elif "DMS" in role_name:
            return "DMS Staff"
        elif role_name is not None:
            return "All Employees"
        return "Other"

    def add_arguments(self, parser):
        parser.add_argument(
            "json_file",
            type=str,
            help="Path to JSON file containing Role → Certification arrays",
        )

    def handle(self, *args, **options):
        path = options["json_file"]
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            raise CommandError(f"File not found: {path}")
        except json.JSONDecodeError as e:
            raise CommandError(f"Invalid JSON: {e}")
        
        # clear all employees:
        Employee.objects.all().delete()

        created_employees = 0
        for employee in data:
            print(employee)
            extracted_role = self.parse_role(employee.get("credentials", ""))
            role = EmployeeRole.objects.get(name="All Employees")  # default role
            # check if the role exists in the EmployeeRole model
            try:
                role = EmployeeRole.objects.get(name=extracted_role)
                print(f"Role found: {role.name}")
            except EmployeeRole.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Role '{extracted_role}' does not exist. Skipping employee: {employee.get('name', 'Unknown')}"))
                continue
            
            # 2) Create the employee object
            extracted_name = employee.get("name", "")
            first_name, last_name = extracted_name.split(" ", 1) if " " in extracted_name else (extracted_name, "")
            email = employee.get("email", "").strip()
            phone_number = employee.get("phone_number", "").strip()
            
            employee_obj, created = Employee.objects.get_or_create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone_number=phone_number,
                role=role,
            )
            employee_obj.save()


            labs = employee.get("locations", [])
            print(f"Employee {employee_obj} has labs: {labs}")
            lab_objects = []
            for lab_name in labs:
                lab_name = lab_name.strip()
                lab = Lab.objects.get(name=lab_name)
                lab_objects.append(lab)
            print(f"Found labs: {[lab.name for lab in lab_objects]} for employee: {employee_obj}")

            for lab in lab_objects:
                EmployeeLabs.objects.get_or_create(employee=employee_obj, lab=lab)
                print(f"Assigned lab: {lab.name} to employee: {employee_obj}")



            if created:
                created_employees += 1
                self.stdout.write(self.style.SUCCESS(f"Created employee: {employee_obj}"))

        self.stdout.write(self.style.SUCCESS(f"Finished loading all data. {created_employees} employees created."))


# python manage.py import_employees certification_tracking/management/commands/data/staff/staff.json