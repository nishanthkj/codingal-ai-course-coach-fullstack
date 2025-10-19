// CoursesGrid.tsx
import React from "react";
import CourseCard from "./CourseCard";

type RawAttempt = {
  id?: number;
  timestamp?: string | null;
  correctness?: number;
  hints_used?: number;
  duration_sec?: number;
};

type RawLesson = {
  id: number;
  title: string;
  order_index?: number;
  tags?: string[];
  latest_attempt?: RawAttempt | null;
};

type RawCourse = {
  id: number;
  name: string;
  description?: string;
  difficulty?: number;
  lessons?: RawLesson[];
};

export default function CoursesGrid({ courses }: { courses: RawCourse[] }) {
  const mapCourse = (course: RawCourse) => {
    const lessons = course.lessons ?? [];

    // --- Calculate progress ---
    const attemptedLessons = lessons.filter((l) => l.latest_attempt).length;
    const totalLessons = lessons.length || 1;
    const progress = Math.round((attemptedLessons / totalLessons) * 100);

    // --- Find next lesson (first one without attempt) ---
    const nextUp = lessons.find((l) => !l.latest_attempt)?.title;

    // --- Calculate last activity (max timestamp from all latest_attempts) ---
    const timestamps = lessons
      .map((l) => l.latest_attempt?.timestamp)
      .filter(Boolean)
      .map((t) => Date.parse(t as string))
      .filter((t) => !isNaN(t));

    const lastActivity =
      timestamps.length > 0
        ? new Date(Math.max(...timestamps)).toLocaleString()
        : "No activity yet";

    return {
      id: String(course.id),
      name: course.name,
      progress,
      nextUp,
      lastActivity,
    };
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c, i) => (
        <CourseCard key={c.id ?? i} course={mapCourse(c)} />
      ))}
    </div>
  );
}
