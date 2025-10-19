# core/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from core.models import Student

User = get_user_model()


# @receiver(post_save, sender=User)
# def create_student_profile(sender, instance, created, **kwargs):
#     if created and not hasattr(instance, "student"):
#         Student.objects.create(
#             user=instance,
#             name=f"{instance.first_name} {instance.last_name}".strip() or instance.username,
#             email=instance.email,
#         )
