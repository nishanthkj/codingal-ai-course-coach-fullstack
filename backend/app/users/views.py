from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.authentication import JWTAuthentication

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
)
from .services.auth import AuthService


class RegisterView(GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        full_name = serializer.validated_data["full_name"].strip()
        email = serializer.validated_data["email"].lower().strip()
        password = serializer.validated_data["password"]

        try:
            user = AuthService.register_user(full_name=full_name, email=email, password=password)
        except ValidationError as e:
            return Response({"status": 0, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        tokens = AuthService.generate_jwt_tokens(user)

        resp_payload = {
            "status": 1,
            "message": "User registered successfully",
            "user": UserSerializer(user).data,
            "token": tokens.get("access"),
        }
        resp = Response(resp_payload, status=status.HTTP_201_CREATED)
        if tokens.get("refresh"):
            AuthService.set_refresh_cookie_on_response(resp, tokens["refresh"])
        return resp


class LoginView(GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = AuthService.authenticate_user(
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
            )
        except ValidationError:
            return Response({"status": 0, "error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        tokens = AuthService.generate_jwt_tokens(user)

        resp = Response(
            {
                "status": 1,
                "message": "Login successful",
                "token": tokens.get("access"),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
        if tokens.get("refresh"):
            AuthService.set_refresh_cookie_on_response(resp, tokens["refresh"])
        return resp


class MeView(GenericAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get(self, request, *args, **kwargs):
        return Response({"status": 1, "user": UserSerializer(request.user).data}, status=status.HTTP_200_OK)


class RefreshView(GenericAPIView):
    permission_classes = (AllowAny,)  # cookie-based auth handled in AuthService

    def post(self, request, *args, **kwargs):
        refresh_token = AuthService.get_refresh_token_from_request(request)
        if not refresh_token:
            return Response({"status": 0, "error": "No refresh token provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_access, new_refresh = AuthService.refresh_access_from_refresh_token(refresh_token)
        except TokenError:
            return Response({"status": 0, "error": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)
        except ValidationError as e:
            return Response({"status": 0, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"status": 0, "error": "Refresh failed", "detail": str(e)},
                            status=status.HTTP_400_BAD_REQUEST)

        resp = Response({"status": 1, "token": new_access}, status=status.HTTP_200_OK)
        if new_refresh:
            AuthService.set_refresh_cookie_on_response(resp, new_refresh)
        return resp


class LogoutView(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        refresh_token = AuthService.get_refresh_token_from_request(request)
        if refresh_token:
            try:
                AuthService.blacklist_refresh_token(refresh_token)
            except Exception:
                pass
        resp = Response({"status": 1, "message": "Logged out"}, status=status.HTTP_200_OK)
        AuthService.clear_refresh_cookie_on_response(resp)
        return resp


class VerifyTokenView(GenericAPIView):
    """
    GET /api/auth/verify/
    Validates JWT using DRF's JWTAuthentication.
    Requires Authorization: Bearer <token>.
    Returns {"valid": true} if token authenticates,
    {"valid": false} otherwise.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return Response({"valid": False}, status=status.HTTP_200_OK)

        try:
            AccessToken(token)  # explicit validation
            return Response({"valid": True}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"valid": False}, status=status.HTTP_200_OK)


class Profile(GenericAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self):
        pass