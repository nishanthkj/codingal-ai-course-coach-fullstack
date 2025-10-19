import ProgressBar from "./ProgressBar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type Course = {
  id: string;
  name: string;
  progress: number;
  nextUp?: string;
  lastActivity?: string;
};

function OpenCourse() {
  // Logic to open the course details
  navigator;
}

export default function CourseCard({ course }: { course: Course }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {course.name}
        </h3>
        {course.nextUp && (
          <span className="text-xs rounded-full bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 text-indigo-700 dark:text-indigo-300">
            Next: {course.nextUp}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="mt-3">
        <ProgressBar value={course.progress} />
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Progress: {course.progress}%
        </div>
      </div>

      {/* Last activity */}
      {course.lastActivity && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Last activity: {course.lastActivity}
        </div>
      )}

      {/* CTA */}
      <button className="mt-4 w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors">
        <Link to={`/course/${course.id}`} state={{ returnUrl: "/" }}>
          View Details
        </Link>
      </button>
    </div>
  );
}
