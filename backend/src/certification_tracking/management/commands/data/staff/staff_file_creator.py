import os
import re
import json

# Global store for deduplicated employees
all_employees = {}  # key: normalized name -> value: employee dict
duplicates = set()

def read_file(location):
    filename = os.path.join(os.path.dirname(__file__), f"{location}.txt")
    with open(filename, "r") as file:
        data = file.read()
    lines = [line.strip() for line in data.splitlines() if line.strip() and not line.startswith("#")]
    return lines

def extract_employees(location):
    lines = read_file(location)

    for line in lines:
        # Clean line
        line = re.sub(r' - Shortcut\.lnk$', '', line)
        line = line.replace("_", " ")
        parts = line.split()

        credential_pattern = re.compile(r'^(DMS\(\w\)|MRT\(R\)|MRT\(N\)|RCVT|ADC_CVL|Admin)$', re.IGNORECASE)
        credential_idx = next((i for i, part in enumerate(parts[1:], 1) if credential_pattern.match(part)), None)
        if credential_idx is None:
            continue

        first_name = parts[0]
        last_name = " ".join(parts[1:credential_idx])
        name = f"{first_name} {last_name}".strip()
        normalized_name = name.lower()

        credentials = parts[credential_idx]
        # site = " ".join(parts[credential_idx + 1:]) if credential_idx + 1 < len(parts) else ""

        if normalized_name in all_employees:
            all_employees[normalized_name]["locations"].add(location)
            duplicates.add(normalized_name)
        else:
            all_employees[normalized_name] = {
                "name": name,
                "credentials": credentials,
                "locations": {location}
            }

def save_json():
    # Convert sets to sorted lists for JSON
    cleaned = [
        {
            "name": emp["name"],
            "credentials": emp["credentials"],
            # make sure locations are sorted and capitalized
            "locations": sorted([loc.capitalize() for loc in emp["locations"]])
        }
        for emp in all_employees.values()
    ]

    with open("staff.json", "w") as f:
        json.dump(cleaned, f, indent=2)

    print(f"Saved {len(cleaned)} unique employees to staff.json.")

if __name__ == "__main__":
    locations = [
        "alliston",
        "markham",
        "newmarket",
        "thornhill"
    ]

    for location in locations:
        extract_employees(location)

    save_json()

    print(f"Extracted {len(all_employees)} unique employees. Found {len(duplicates)} duplicates.")
    print("Duplicates:", sorted(duplicates)) if duplicates else print("No duplicates found.")
