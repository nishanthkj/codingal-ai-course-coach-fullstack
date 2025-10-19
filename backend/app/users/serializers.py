from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "student_id")

    def get_full_name(self, obj):
        return f"{getattr(obj, 'first_name', '')} {getattr(obj, 'last_name', '')}".strip()

    def get_student_id(self, obj):
        from core.models import Student
        student = Student.objects.filter(user_id=obj.id).only("id").first()
        return student.id if student else None


class RegisterResponseSerializer(serializers.Serializer):
    status = serializers.IntegerField()
    message = serializers.CharField()
    user = UserSerializer()
    token = serializers.CharField(allow_null=True, required=False)


class LoginResponseSerializer(serializers.Serializer):
    status = serializers.IntegerField()
    message = serializers.CharField()
    token = serializers.CharField(allow_null=True, required=False)
    user = UserSerializer(required=False, allow_null=True)


class TokenResponseSerializer(serializers.Serializer):
    status = serializers.IntegerField()
    token = serializers.CharField(allow_null=True, required=False)


class LogoutResponseSerializer(serializers.Serializer):
    status = serializers.IntegerField()
    message = serializers.CharField()


class MeResponseSerializer(serializers.Serializer):
    status = serializers.IntegerField()
    user = UserSerializer()


