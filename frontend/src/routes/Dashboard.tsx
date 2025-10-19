import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import CoursesGrid from "@/components/CoursesGrid";
import { recommendNext } from "@/ai/recommender";
import { formatExplanation } from "@/ai/explain";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import AICourseCoachPanel from "@/components/AICourseCoachPanel ";

export default function Dashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [explain, setExplain] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingName, setGreetingName] = useState("");
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    async function tryFetch(backendPath: string, staticPath: string) {
      try {
        const resp = await api.get(backendPath);
        return resp.data;
      } catch (err) {
        try {
          const r = await fetch(staticPath);
          if (!r.ok) throw new Error(`static ${staticPath} ${r.status}`);
          return await r.json();
        } catch (sErr) {
          throw sErr;
        }
      }
    }
    

    async function load() {
      setLoading(true);
      try {
        const [c, s, a] = await Promise.all([
          tryFetch("/api/courses/", "/data/courses.json"),
          tryFetch("/api/students/overview/", "/data/students.json"),
          tryFetch("/api/attempts/", "/data/attempts.json"),
        ]);

        if (!mounted) return;
        setCourses(Array.isArray(c) ? c : []);
        setStudents(Array.isArray(s) ? s : []);
        setAttempts(Array.isArray(a) ? a : []);

        const student =
          Array.isArray(s) && s.length
            ? s[0]
            : s?.student
            ? s.student
            : s ?? null;

        setStudent(student);

        if (student?.name && !sessionStorage.getItem("greeted")) {
          sessionStorage.setItem("greeted", "1");
          setGreetingName(student.name.split(" ")[0]);
          setShowGreeting(true);
        }

        const rec = recommendNext({ student, courses: c, attempts: a });

        setExplain(formatExplanation(rec));
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function createAttempt(payload: any) {
    try {
      // backend expects `lesson` id. prefer payload.lesson if provided
      const body = {
        lesson:
          payload.lesson ??
          payload.lesson_id ??
          payload.lessonId ??
          // fallback: use first course -> first lesson
          courses[0]?.lessons?.[0]?.id ??
          null,
        correctness: payload.correctness ?? 0,
        hints_used: payload.hints_used ?? 0,
        duration_sec: payload.duration_sec ?? 0,
      };
      if (!body.lesson)
        throw new Error("No lesson id available to create attempt");

      const res = await api.post("/api/attempts/", body);
      const data = res.data;
      setAttempts((p) => [data, ...p]);

      // refresh recommendation from server if available
      try {
        const recRes = await api.get("/api/students/recommendation/");
        if (recRes?.data) setExplain(formatExplanation(recRes.data));
      } catch {}

      return data;
    } catch (err) {
      console.error("createAttempt failed:", err);
      throw err;
    }
  }

  async function analyzeCode(snippet: string) {
    try {
      const res = await api.post("/api/analyze-code/", { code: snippet });
      return res.data;
    } catch (err) {
      console.error("analyzeCode failed:", err);
      return { issues: ["analysis unavailable"] };
    }
  }

  async function refreshRecommendation() {
    try {
      const res = await api.get("/api/students/recommendation/");
      if (res?.data) setExplain(formatExplanation(res.data));
    } catch (err) {
      console.error("refreshRecommendation failed:", err);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          {loading
            ? "Loading..."
            : ` Student Name : ${student.name} ·  \nCourses : ${courses.length}  `}
        </div>
      </div>
      <Dialog open={showGreeting} onOpenChange={setShowGreeting}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Welcome back, {greetingName}! 👋
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
              Ready to continue learning today?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex justify-center">
            <Button
              onClick={() => setShowGreeting(false)}
              className="px-6 py-2 text-sm"
            >
              Let’s Go
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section>
        <h2 className="mb-3 text-xl font-semibold">My Courses</h2>
        <CoursesGrid courses={courses} />
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <AICourseCoachPanel />
      </section>
    </div>
  );
}
