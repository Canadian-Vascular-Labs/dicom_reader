from django.contrib import admin
from django.urls import path
from django.http import HttpResponse    

from ninja import NinjaAPI
from cpso.api import router as cpso_router
from certification_tracking.api import router as certification_tracking_router

from cpso.auth import GlobalAuth

api = NinjaAPI(
    title="CVL API",
    version="1.0.0",
    description="API for accessing CVL data",
    auth=GlobalAuth(),
)

api.add_router("/cpso/", cpso_router)
# api.add_router("/certification_tracking/", certification_tracking_router)

def index(request):
    return HttpResponse("Backend API is running.")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),
    path("", index),
]
