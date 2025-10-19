import React from "react";

export default function ResourcesPanel({
  lessonId,
  resources,
}: {
  lessonId: number | null;
  resources: any[];
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex justify-between mb-3">
        <h2 className="text-lg font-semibold">Lesson Resources</h2>
        {lessonId && <div className="text-xs text-gray-500">Lesson {lessonId}</div>}
      </div>
      {!lessonId && <div className="text-sm text-gray-500">Select a lesson to view resources.</div>}
      {lessonId && resources.length === 0 && (
        <div className="text-sm text-gray-500">No resources found.</div>
      )}
      <ul className="space-y-3">
        {resources.map((r) => (
          <li key={r.id ?? r.title} className="p-3 border rounded-md">
            <div className="font-medium">
              {r.kind === "video" ? "Video: " : "Question: "}
              {r.title ?? r.name}
            </div>
            {r.content && <div className="text-sm text-gray-600 mt-1">{r.content}</div>}
            {r.url && (
              <a className="text-xs underline mt-1 block" href={r.url} target="_blank" rel="noreferrer">
                Open
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
