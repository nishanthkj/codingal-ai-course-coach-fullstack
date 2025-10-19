# core/auth/urls.py
from django.urls import path
from .views import RegisterView, LoginView, RefreshView, MeView, LogoutView, VerifyTokenView, Profile

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("verify/", VerifyTokenView.as_view(), name="auth-verify"),
    path("profile/", Profile.as_view(), name="profile")
]
