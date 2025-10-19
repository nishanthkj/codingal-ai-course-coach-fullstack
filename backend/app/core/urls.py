from django.urls import path
from .views import ( StudentOverviewView, StudentRecommendationView, AttemptCreateView, AnalyzeCodeView, CourseListView, CourseDetailView ,\
 LessonListView )

urlpatterns = [
    path("students/overview/", StudentOverviewView.as_view(), name="student-overview"),
    path("students/recommendation/", StudentRecommendationView.as_view(), name="student-recommendation"),
    path("attempts/", AttemptCreateView.as_view(), name="create-attempt"),
    path("analyze-code/", AnalyzeCodeView.as_view(), name="analyze-code"),
    path("courses/", CourseListView.as_view(), name="course-list"),
    path("courses/<str:id>/", CourseDetailView.as_view(), name="course-detail"),
    path("lesson/<str:course_id>", LessonListView.as_view(), name="lesson-list"),
]
