from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from django.db.models import Avg
from .models import Student, Course, Lesson, Attempt
from .serializers import CourseSerializer, AttemptCreateSerializer, LessonSerializer
from .services.recommender import score_candidate, to_confidence
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
import ast
from django.shortcuts import get_object_or_404
from rest_framework.generics import GenericAPIView



class WriteThrottle(UserRateThrottle):
    rate = '30/min'


class StudentOverviewView(GenericAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'detail': 'Student record not found'}, status=status.HTTP_404_NOT_FOUND)

        courses = Course.objects.prefetch_related('lessons').all()
        data = []

        for course in courses:
            attempts = Attempt.objects.filter(student=student, lesson__course=course).order_by('-timestamp')
            progress = min(100, attempts.count() * 10)
            last_activity = attempts.first().timestamp.isoformat() if attempts.exists() else None
            next_up = course.lessons.first().title if course.lessons.exists() else None

            data.append({
                'id': course.id,
                'name': course.name,
                'description': course.description,
                'difficulty': course.difficulty,
                'progress': progress,
                'last_activity': last_activity,
                'next_up': next_up,
            })

        return Response({
            'student': {
                'id': student.id,
                'name': student.name,
                'email': student.email,
            },
            'courses': data,
        }, status=status.HTTP_200_OK)


class StudentRecommendationView(GenericAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'detail': 'Student record not found'}, status=status.HTTP_404_NOT_FOUND)

        courses = Course.objects.all()
        items = []

        for course in courses:
            attempts = Attempt.objects.filter(student=student, lesson__course=course).order_by('-timestamp')
            progress = min(100, attempts.count() * 10)
            recency_gap_days = 5.0
            tag_gap = 0.3
            hint_rate = (attempts.aggregate(avg=Avg('hints_used'))['avg'] or 0) / 3.0
            score, features = score_candidate(progress, recency_gap_days, tag_gap, hint_rate)

            items.append({
                'id': str(course.id),
                'title': f'Continue "{course.name}" — next lesson',
                'score': score,
                'features': features
            })

        if not items:
            return Response({'detail': 'No recommendations available'}, status=status.HTTP_200_OK)

        items.sort(key=lambda x: x['score'], reverse=True)
        top = items[0]
        alts = items[1:3]

        return Response({
            'recommendation': {'id': top['id'], 'title': top['title']},
            'confidence': to_confidence(top['score']),
            'reason_features': top['features'],
            'alternatives': [{'id': a['id'], 'title': a['title']} for a in alts],
        }, status=status.HTTP_200_OK)


class AttemptCreateView(GenericAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    throttle_classes = [WriteThrottle]

    def get(self, request):
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({"detail": "Student record not found"}, status=status.HTTP_404_NOT_FOUND)

        attempts_qs = Attempt.objects.filter(student=student).order_by("-timestamp")
        serializer = AttemptCreateSerializer(attempts_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        # extract authenticated student from token
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({"detail": "Student record not found"}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data["student"] = student.id

        serializer = AttemptCreateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        lesson_id = data.get("lesson")
        if not lesson_id:
            return Response({"detail": "Lesson ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        existing = Attempt.objects.filter(student=student, lesson_id=lesson_id).first()

        if existing:
            serializer = AttemptCreateSerializer(existing, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        attempt = serializer.save()
        return Response({"id": attempt.id}, status=status.HTTP_201_CREATED)


class AnalyzeCodeView(GenericAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get("code", "")
        issues = []

        try:
            tree = ast.parse(code)

            class ArgVisitor(ast.NodeVisitor):
                def visit_FunctionDef(self, node):
                    arg_names = [a.arg for a in node.args.args]
                    used = set()

                    class UseVisitor(ast.NodeVisitor):
                        def visit_Name(self, n):
                            if isinstance(n.ctx, ast.Load):
                                used.add(n.id)

                    UseVisitor().visit(node)
                    for a in arg_names:
                        if a not in used:
                            issues.append({
                                "rule": "unused-arg",
                                "message": f'Function arg "{a}" appears unused.',
                                "severity": "info",
                            })

            ArgVisitor().visit(tree)

            class ExceptVisitor(ast.NodeVisitor):
                def visit_ExceptHandler(self, node):
                    if node.type is None:
                        issues.append({
                            "rule": "bare-except",
                            "message": "Avoid bare except; catch specific exceptions.",
                            "severity": "warn",
                        })

            ExceptVisitor().visit(tree)

            class PrintVisitor(ast.NodeVisitor):
                def visit_Call(self, node):
                    if getattr(getattr(node, "func", None), "id", None) == "print":
                        issues.append({
                            "rule": "print-call",
                            "message": "Avoid print statements; use logging instead.",
                            "severity": "info",
                        })

            PrintVisitor().visit(tree)

        except SyntaxError as e:
            issues.append({
                "rule": "syntax-error",
                "message": str(e),
                "severity": "error",
            })

        return Response({"issues": issues}, status=status.HTTP_200_OK)


class CourseListView(GenericAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # fetch student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({"detail": "Student record not found"}, status=status.HTTP_404_NOT_FOUND)

        # fetch courses + lessons once to avoid N+1
        courses = Course.objects.prefetch_related("lessons").all()

        # fetch all attempts for this student once and pick latest per lesson
        attempts_qs = (
            Attempt.objects
            .filter(student=student)
            .select_related("lesson")
            .order_by("-timestamp")
        )
        latest_attempt_by_lesson = {}
        for a in attempts_qs:
            if a.lesson_id not in latest_attempt_by_lesson:
                latest_attempt_by_lesson[a.lesson_id] = a

        payload = []
        for c in courses:
            lessons = list(c.lessons.all().order_by("order_index"))
            lesson_list = []
            for l in lessons:
                last = latest_attempt_by_lesson.get(l.id)
                last_attempt = None
                if last:
                    last_attempt = {
                        "id": last.id,
                        "timestamp": last.timestamp.isoformat(),
                        "correctness": last.correctness,
                        "hints_used": last.hints_used,
                        "duration_sec": last.duration_sec,
                        "progress": getattr(last, "progress", None),
                    }

                lesson_list.append({
                    "id": l.id,
                    "title": l.title,
                    "order_index": l.order_index,
                    "tags": l.tags,
                    "latest_attempt": last_attempt,
                })

            # compute course-level progress as average of latest correctness per lesson (0..100)
            total_lessons = len(lessons)
            if total_lessons == 0:
                progress = 0
            else:
                sum_correctness = 0.0
                for l in lessons:
                    a = latest_attempt_by_lesson.get(l.id)
                    if a and a.correctness is not None:
                        try:
                            val = float(a.correctness)
                        except (TypeError, ValueError):
                            val = 0.0
                        val = max(0.0, min(1.0, val))
                        sum_correctness += val
                    else:
                        sum_correctness += 0.0
                progress = int((sum_correctness / total_lessons) * 100)

            # last activity for the course is the most recent attempt timestamp among its lessons
            timestamps = [
                latest_attempt_by_lesson[l.id].timestamp
                for l in lessons
                if l.id in latest_attempt_by_lesson
            ]
            course_last_activity = max(timestamps).isoformat() if timestamps else None

            payload.append({
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "difficulty": c.difficulty,
                "progress": progress,
                "last_activity": course_last_activity,
                "lessons": lesson_list,
            })

        return Response(payload, status=status.HTTP_200_OK)


class CourseDetailView(GenericAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, id: str):
        # include lessons with tags and order
        course = get_object_or_404(Course.objects.prefetch_related("lessons"), pk=id)
        lessons = list(course.lessons.all().order_by("order_index").values(
            "id", "title", "tags", "order_index"
        ))
        payload = {
            "id": course.id,
            "name": course.name,
            "description": course.description,
            "difficulty": course.difficulty,
            "lessons": lessons,
        }
        return Response(payload, status=status.HTTP_200_OK)


class LessonListView(GenericAPIView):
    '''
    Request : course_id
    Response : lessons
    '''
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id: str):
        try:
            # Get all lessons for a specific course
            lessons = Lesson.objects.filter(course_id=course_id).order_by("order_index")

            serializer = LessonSerializer(lessons, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Lesson.DoesNotExist:
            return Response(
                {"detail": "No lessons found for this course."},
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            return Response(
                {"detail": f"Error retrieving lessons: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
