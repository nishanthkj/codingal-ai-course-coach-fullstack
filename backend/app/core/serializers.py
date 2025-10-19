from rest_framework import serializers
from .models import Student, Course, Lesson, Attempt

class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model=Lesson
        fields=['id','title','tags','order_index']

class CourseSerializer(serializers.ModelSerializer):
    lessons=LessonSerializer(many=True, read_only=True)
    class Meta:
        model=Course
        fields=['id','name','description','difficulty','lessons']

class AttemptCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model=Attempt
        fields=['id','student','lesson','timestamp','correctness','hints_used','duration_sec']
    def validate_correctness(self, v):
        if not (0.0 <= v <= 1.0):
            raise serializers.ValidationError('Correctness must be between 0 and 1.')
        return v
