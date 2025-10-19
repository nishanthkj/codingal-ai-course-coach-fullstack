from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularSwaggerView, SpectacularRedocView
from .views import SchemaGroupedByNamespaceView,WelcomeBackend

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", WelcomeBackend.as_view(), name="HomePage"),

    # app includes
    path("api/", include(("core.urls", "core"), namespace="core")),
    path("api/user/", include(("users.urls", "users"), namespace="user")),

    # schema + docs
    path("api/schema/", SchemaGroupedByNamespaceView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
