from ninja import Query, Router

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from certification_tracking.models import Certification

router = Router(tags=["certifications"])


@router.get("/certifications", response=List[str])
def list_certifications(request):
    return [cert.name for cert in Certification.objects.all()]
