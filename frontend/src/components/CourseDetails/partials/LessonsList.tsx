import React from "react";
import { Lesson } from "../CourseDetails";

export default function LessonsList({
  lessons,
  selectedId,
  onSelect,
}: {
  lessons: Lesson[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Lessons</h2>
        <div className="text-sm text-gray-500">{lessons.length} lessons</div>
      </div>

      <ul className="space-y-3">
        {lessons.map((lesson) => (
          <li
            key={lesson.id}
            onClick={() => onSelect(lesson.id)}
            className={`p-3 rounded-lg border cursor-pointer hover:shadow ${
              selectedId === lesson.id ? "bg-gray-100" : ""
            }`}
          >
            <div className="font-medium">{lesson.title}</div>
            {/* <div className="text-xs text-gray-500">Order: {lesson.order_index ?? "-"}</div> */}
          </li>
        ))}
        {lessons.length === 0 && <li className="text-sm text-gray-500">No lessons available.</li>}
      </ul>
    </div>
  );
}
