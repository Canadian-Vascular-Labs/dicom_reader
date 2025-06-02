from django.contrib import admin
from django.urls import path

from cpso.api import api


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/cpso/", api.urls),
]
