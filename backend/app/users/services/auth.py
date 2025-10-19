from typing import Dict, Optional, Tuple
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings

from core.models import Student

User = get_user_model()

COOKIE_NAME = getattr(settings, "AUTH_REFRESH_COOKIE_NAME", "refresh_token")
COOKIE_PATH = getattr(settings, "AUTH_REFRESH_COOKIE_PATH", "/api/")
COOKIE_SECURE = getattr(settings, "AUTH_REFRESH_COOKIE_SECURE", False)
COOKIE_SAMESITE = getattr(settings, "AUTH_REFRESH_COOKIE_SAMESITE", None)
COOKIE_MAX_AGE = getattr(settings, "AUTH_REFRESH_COOKIE_AGE", 30 * 24 * 60 * 60)


class AuthService:
    @staticmethod
    def register_user(full_name: str, email: str, password: str):
        email = (email or "").strip().lower()
        if not email:
            raise ValidationError("Email required.")

        parts = (full_name or "").strip().split(" ", 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""

        with transaction.atomic():
            user = User.objects.filter(email=email).first()
            student = Student.objects.filter(email=email).first()

            # both exist and connected → reject
            if user and student and student.user_id == user.id:
                raise ValidationError("User already exists.")

            # only user exists → create or update student
            elif user and not student:
                student, _ = Student.objects.update_or_create(
                    email=email,
                    defaults={
                        "user": user,
                        "name": full_name.strip(),
                    },
                )

            # only student exists → create user, link, update student
            elif student and not user:
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=password,
                )
                student.user = user
                student.name = full_name.strip()
                student.save(update_fields=["user", "name"])

            # neither exist → create both safely
            elif not user and not student:
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=password,
                )
                student, _ = Student.objects.update_or_create(
                    email=email,
                    defaults={
                        "user": user,
                        "name": full_name.strip(),
                    },
                )

            # both exist but not linked → link and update student
            elif user and student and not student.user:
                student.user = user
                student.name = full_name.strip()
                student.save(update_fields=["user", "name"])

        #  Return the User instance (not a dict)
        return user

    @staticmethod
    def authenticate_user(email: str, password: str):
        email = (email or "").strip().lower()
        user = User.objects.filter(username=email).first()

        if not user or not user.check_password(password):
            raise ValidationError("Invalid credentials")

        student = Student.objects.filter(user=user).first()

        return user

    @staticmethod
    def generate_jwt_tokens(user: User) -> Dict[str, str]:
        refresh = RefreshToken.for_user(user)
        return {"access": str(refresh.access_token), "refresh": str(refresh)}

    @staticmethod
    def validate_access_token(token: str) -> bool:
        try:
            AccessToken(token)
            return True
        except TokenError:
            return False

    @staticmethod
    def validate_refresh_token(token: str) -> bool:
        try:
            RefreshToken(token)
            return True
        except TokenError:
            return False

    @staticmethod
    def refresh_access_from_refresh_token(refresh_token: str) -> Tuple[str, Optional[str]]:
        # will raise TokenError if token is invalid/expired
        refresh_obj = RefreshToken(refresh_token)
        new_access = str(refresh_obj.access_token)
        new_refresh_str = None

        rotate = getattr(jwt_settings, "ROTATE_REFRESH_TOKENS", False)
        blacklist_after = getattr(jwt_settings, "BLACKLIST_AFTER_ROTATION", False)

        if rotate:
            user_id = refresh_obj.get("user_id")
            user = User.objects.filter(pk=user_id).first()
            if not user:
                raise TokenError("User not found for refresh token rotation.")
            new_refresh = RefreshToken.for_user(user)
            new_refresh_str = str(new_refresh)
            if blacklist_after:
                try:
                    refresh_obj.blacklist()
                except Exception:
                    pass

        return new_access, new_refresh_str

    @staticmethod
    def blacklist_refresh_token(refresh_token: str) -> None:
        try:
            rt = RefreshToken(refresh_token)
            rt.blacklist()
        except Exception:
            pass

    @staticmethod
    def set_refresh_cookie_on_response(response, refresh_token: str) -> None:
        response.set_cookie(
            COOKIE_NAME,
            refresh_token,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
            path=COOKIE_PATH,
            max_age=COOKIE_MAX_AGE,
        )

    @staticmethod
    def clear_refresh_cookie_on_response(response) -> None:
        response.delete_cookie(COOKIE_NAME, path=COOKIE_PATH)

    @staticmethod
    def get_refresh_token_from_request(request) -> Optional[str]:
        # prefer cookie, fallback to request.data (for non-cookie clients)
        token = request.COOKIES.get(COOKIE_NAME)
        if token:
            return token
        if hasattr(request, "data") and request.data:
            return request.data.get("refresh")
        return None

    @staticmethod
    def send_password_reset_email(user: User) -> str:
        token = default_token_generator.make_token(user)
        frontend = getattr(settings, "FRONTEND_URL", "").rstrip("/")
        reset_url = f"{frontend}/reset-password/{user.email}/{token}/"
        send_mail(
            subject="Password Reset",
            message=f"Reset your password: {reset_url}",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@localhost"),
            recipient_list=[user.email],
        )
        return "Password reset link sent."

    @staticmethod
    def reset_password(user: User, token: str, new_password: str) -> str:
        if not default_token_generator.check_token(user, token):
            raise ValidationError("Invalid token.")
        user.set_password(new_password)
        user.save()
        return "Password reset successful."
