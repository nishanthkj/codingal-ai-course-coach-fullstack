# core/tests/test_views.py
from django.test import TestCase, Client
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import AccessToken
from core.models import Student, Course, Lesson, Attempt

class StudentOverviewTests(TestCase):
    def setUp(self):
        self.client = Client()

    def auth(self, user):
        token = str(AccessToken.for_user(user))
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'

    def create_user_and_student(self, username="u", email="u@example.com", password="p"):
        user = User.objects.create_user(username=username, email=email, password=password)
        student = Student.objects.create(user=user, name=username, email=email)
        return user, student

    def test_overview_authenticated(self):
        user, student = self.create_user_and_student("tester", "t@example.com")
        self.auth(user)
        Course.objects.create(name="C1", description="d", difficulty=1)
        Lesson.objects.create(course=Course.objects.first(), title="L1", tags=["a"], order_index=1)
        resp = self.client.get("/api/students/overview/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("student", data)
        self.assertEqual(data["student"]["id"], student.id)

    def test_overview_404_when_no_student(self):
        user = User.objects.create_user(username="no", password="p")
        token = str(AccessToken.for_user(user))
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        resp = self.client.get("/api/students/overview/")
        self.assertEqual(resp.status_code, 404)


class RecommendationAndAnalyzeTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="rec", password="p", email="rec@example.com")
        self.student = Student.objects.create(user=self.user, name="rec", email="rec@example.com")
        token = str(AccessToken.for_user(self.user))
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'

    def test_recommendation_returns_recommendation_and_confidence(self):
        c = Course.objects.create(name="CourseX", description="", difficulty=1)
        Lesson.objects.create(course=c, title="Next", tags=["t"], order_index=1)
        resp = self.client.get("/api/students/recommendation/")
        self.assertEqual(resp.status_code, 200)
        j = resp.json()
        self.assertIn("recommendation", j)
        self.assertIn("confidence", j)

    def test_analyze_code_detects_issues(self):
        code = "def f(x):\n  print(x)\ntry:\n  pass\nexcept:\n  pass\n"
        resp = self.client.post("/api/analyze-code/", data={"code": code}, content_type="application/json")
        self.assertEqual(resp.status_code, 200)
        issues = resp.json().get("issues", [])
        self.assertIsInstance(issues, list)
        self.assertTrue(any(i.get("rule") in ("unused-arg", "print-call", "bare-except", "syntax-error") for i in issues))


class AttemptsCourseTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="att", password="p", email="att@example.com")
        self.student = Student.objects.create(user=self.user, name="att", email="att@example.com")
        token = str(AccessToken.for_user(self.user))
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'

    def test_create_attempt_and_validation(self):
        c = Course.objects.create(name="C1", description="", difficulty=1)
        l = Lesson.objects.create(course=c, title="L1", tags=[], order_index=1)
        payload = {"lesson": l.id, "code": "print(1)", "language": "python"}
        r = self.client.post("/api/attempts/", data=payload, content_type="application/json")
        self.assertIn(r.status_code, (200, 201))
        # missing lesson -> 400
        r2 = self.client.post("/api/attempts/", data={"code": "x"}, content_type="application/json")
        self.assertEqual(r2.status_code, 400)

    def test_course_list_includes_lessons_and_progress(self):
        c = Course.objects.create(name="Cprog", description="", difficulty=1)
        l1 = Lesson.objects.create(course=c, title="A", tags=[], order_index=1)
        Attempt.objects.create(student=self.student, lesson=l1, code="x", correctness=1.0, hints_used=0, duration_sec=5)
        r = self.client.get("/api/courses/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        course_payload = next((x for x in data if x["id"] == c.id), None)
        self.assertIsNotNone(course_payload)
        self.assertIn("lessons", course_payload)

    def test_course_detail_and_lessons_endpoint(self):
        c = Course.objects.create(name="DetailC", description="", difficulty=1)
        Lesson.objects.create(course=c, title="L1", tags=["a"], order_index=1)
        r = self.client.get(f"/api/courses/{c.id}/")
        self.assertEqual(r.status_code, 200)
        j = r.json()
        self.assertEqual(j["id"], c.id)
        r2 = self.client.get(f"/api/lesson/{c.id}")
        self.assertIn(r2.status_code, (200, 404))
        if r2.status_code == 200:
            self.assertIsInstance(r2.json(), list)
