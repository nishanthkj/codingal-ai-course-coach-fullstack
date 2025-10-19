import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/", { replace: true }), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
        Page not found. Redirecting to home…
      </p>
    </div>
  );
}
