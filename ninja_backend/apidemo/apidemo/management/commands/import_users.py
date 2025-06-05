# ninja_backend/apidemo/management/commands/create_users.py
import json
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Reads a JSON file of user‐definitions and creates or updates User objects.\n"
        "If an entry has \"is_superuser\": true, it will call create_superuser().\n"
        "Example JSON format:\n"
        "[\n"
        "  { \"username\": \"alice\", \"email\": \"alice@example.com\",  \n"
        "    \"password\": \"p@ssw0rd\", \"role\": \"HR\" },\n"
        "  { \"username\": \"carol\", \"email\": \"carol@site.com\",  \n"
        "    \"password\": \"Admin@2025\", \"role\": \"ADMIN\", \"is_superuser\": true }\n"
        "]\n"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "json_file",
            type=str,
            help="Path to the JSON file containing an array of user‐objects",
        )

    def handle(self, *args, **options):
        json_path = options["json_file"]
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                users_data = json.load(f)
        except FileNotFoundError:
            raise CommandError(f"File not found: {json_path}")
        except json.JSONDecodeError as e:
            raise CommandError(f"Invalid JSON in {json_path}: {e}")

        created_count = 0
        updated_count = 0

        # Wrap everything in a single transaction
        with transaction.atomic():
            for entry in users_data:
                username = entry.get("username")
                email = entry.get("email", "")
                password = entry.get("password")
                role = entry.get("role")
                is_superuser = entry.get("is_superuser", False)

                # Minimal validation
                if not username or not password or not role:
                    self.stderr.write(
                        self.style.ERROR(
                            f"Skipping entry {entry!r}: "
                            "'username', 'password', and 'role' are required."
                        )
                    )
                    continue

                if is_superuser:
                    # If the superuser already exists, skip creation
                    if User.objects.filter(username=username, is_superuser=True).exists():
                        self.stdout.write(
                            self.style.WARNING(
                                f"Superuser '{username}' already exists; skipping."
                            )
                        )
                        continue

                    # Create a new superuser (this automatically sets is_staff=True, is_superuser=True)
                    User.objects.create_superuser(
                        username=username,
                        email=email,
                        password=password,
                        role=role,
                    )
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"Created superuser: {username}")
                    )

                else:
                    # Normal (non-superuser) path: update_or_create, then set password
                    defaults = {
                        "email": email,
                        "role": role,
                    }
                    user_obj, was_created = User.objects.update_or_create(
                        username=username,
                        defaults=defaults,
                    )
                    # Always reset their password (in case we’re updating an existing user)
                    user_obj.set_password(password)
                    user_obj.save()

                    if was_created:
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Created user: {username} (role={role})"
                            )
                        )
                    else:
                        updated_count += 1
                        self.stdout.write(
                            self.style.WARNING(
                                f"Updated user: {username} (role={role})"
                            )
                        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Finished!  {created_count} created, {updated_count} updated."
            )
        )
        if created_count == 0 and updated_count == 0:
            self.stdout.write(self.style.WARNING("No users were created or updated."))