import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import BackButton from "./partials/BackButton";
import LessonsList from "./partials/LessonsList";
import CodeViewer from "./partials/CodeViewer";
import { analyzeCode } from "@/ai/codeAnalyzer";

export type Lesson = {
  id: number;
  title: string;
  order_index?: number;
  tags?: string[];
  latest_attempt?: any | null;
};

export type Course = {
  id: number | string;
  name: string;
  description?: string;
  difficulty?: number;
  lessons?: Lesson[];
};

export default function CourseDetails() {
  const { id: routeId } = useParams<{ id?: string }>();
  const location = useLocation();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);

  // track analysis start timestamp to compute duration
  const analysisStartRef = useRef<number | null>(null);

  const getCourseId = () => {
    if (routeId) return String(routeId);
    try {
      const stateAny = (location && (location as any).state) || {};
      if (stateAny?.courseId) return String(stateAny.courseId);
    } catch {}
    try {
      const q = new URLSearchParams(window.location.search);
      return q.get("id");
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      const id = getCourseId();
      try {
        if (!id) {
          const res = await api.get("/api/courses/");
          const arr = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
          if (!mounted) return;
          const chosen = arr.length ? arr[0] : null;
          setCourse(chosen);
          setLessons((chosen?.lessons as Lesson[]) ?? []);
        } else {
          try {
            const res = await api.get(`/api/courses/${id}/`);
            if (!mounted) return;
            setCourse(res.data);
            setLessons((res.data.lessons as Lesson[]) ?? []);
          } catch {
            const list = await api.get("/api/courses/");
            if (!mounted) return;
            const arr = Array.isArray(list.data) ? list.data : list.data?.results ?? [];
            const found = arr.find((c: any) => String(c.id) === String(id));
            setCourse(found ?? (arr.length ? arr[0] : null));
            setLessons(((found ?? arr[0])?.lessons as Lesson[]) ?? []);
          }
        }
      } catch (err: any) {
        console.error("load course failed", err);
        if (!mounted) return;
        setError("Failed to load course data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [routeId]);

  // run analysis and then POST attempt with correctness and duration
  async function runAnalysis(snippet: string) {
    setIssues([]);
    setError(null);

    analysisStartRef.current = Date.now();

    try {
      const local = await analyzeCode(snippet);
      const localIssues = Array.isArray(local?.issues) ? local.issues : [];
      setIssues(localIssues);
    } catch (e: any) {
      console.warn("local analyzeCode failed", e);
    }

    let merged: any[] = [];

    try {
      const res = await api.post("/api/analyze-code/", { code: snippet });
      const data = res.data;
      const backendIssues: any[] = Array.isArray(data?.issues) ? data.issues : data?.results ?? [];

      const seen = new Set<string>();
      const add = (it: any) => {
        const key = `${it.rule ?? ""}::${(it.message ?? "").slice(0, 200)}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(it);
        }
      };

      try {
        const local = await analyzeCode(snippet);
        (local.issues || []).forEach(add);
      } catch {}

      backendIssues.forEach(add);

      setIssues(merged);
    } catch (err: any) {
      console.error("analysis failed", err);
      setError(err?.response?.data?.detail ?? err?.message ?? "Static analysis failed.");
      // still compute attempt using local issues if backend fails
      merged = issues;
    }

    // compute correctness and duration
    const elapsedSec = analysisStartRef.current ? Math.max(0, Math.round((Date.now() - analysisStartRef.current) / 1000)) : 0;
    const correctness = (merged.length === 0) ? 1 : 0;

    // send attempt to server if lesson selected
    if (selectedLessonId) {
      try {
        await upsertAttempt(selectedLessonId, {
          correctness,
          hints_used: 0,
          duration_sec: elapsedSec,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("failed to post attempt after analysis", e);
      }
    }

    analysisStartRef.current = null;

    return merged;
  }

  // Always POST attempts; backend will create or update as needed
  async function upsertAttempt(lessonId: number, payload: { correctness?: number; hints_used?: number; duration_sec?: number; timestamp?: string }) {
    setError(null);
    if (!lessonId) {
      setError("No lesson id provided for attempt.");
      return null;
    }

    try {
      const createRes = await api.post("/api/attempts/", { lesson: lessonId, ...payload });
      return createRes.data;
    } catch (err: any) {
      console.error("upsertAttempt(post) failed", err);
      setError(err?.response?.data ?? err?.message ?? "Failed to create/update attempt.");
      return null;
    }
  }

  function handleLessonSelect(lessonId: number) {
    setSelectedLessonId(lessonId);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course?.name ?? "Course"}</h1>
          {course?.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{course.description}</p>}
        </div>

        <div className="flex items-center gap-4">
          <BackButton />
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <LessonsList lessons={lessons} onSelect={handleLessonSelect} selectedId={selectedLessonId} />
        <CodeViewer runAnalysis={runAnalysis} issues={issues} />
      </section>
    </div>
  );
}
