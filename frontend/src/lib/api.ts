// api.ts
// -------------------------------------------------------------
// Centralized Axios instance for making HTTP requests to backend
// Automatically attaches:
//   • JWT token from sessionStorage (Authorization: Bearer <token>)
//   • CSRF token from cookies for write requests (POST/PUT/PATCH/DELETE)
// -------------------------------------------------------------

import axios, { type InternalAxiosRequestConfig } from "axios";

// Create a configured Axios instance
export const api = axios.create({
  // Base URL for backend; falls back to localhost if VITE_BACKEND_URL not set
  baseURL: (import.meta as any).env?.VITE_BACKEND_URL ?? "http://127.0.0.1:8000",
  // Set true if your backend uses cookies/CSRF (safe to keep enabled)
  withCredentials: true,
  // Default headers for all requests
  headers: { "Content-Type": "application/json" },
});

// -------------------------------------------------------------
// Helper: Read CSRF token from cookie (used for Django or similar)
// -------------------------------------------------------------
export function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

// -------------------------------------------------------------
// Helper: Retrieve JWT token from sessionStorage
// (Login component must call sessionStorage.setItem("token", token))
// -------------------------------------------------------------
function getAccessToken(): string | null {
  return sessionStorage.getItem("token");
}

// -------------------------------------------------------------
// Request Interceptor
// Runs before every axios request
//   1. Ensures headers object exists
//   2. Adds Bearer token if available
//   3. Adds CSRF header for modifying requests
// -------------------------------------------------------------
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.headers = config.headers ?? ({} as InternalAxiosRequestConfig["headers"]);

    // Attach JWT access token
    const access = getAccessToken();
    if (access) (config.headers as any).Authorization = `Bearer ${access}`;

    // Attach CSRF token for unsafe methods if present
    const method = (config.method ?? "get").toString().toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
      const csrftoken = readCookie("csrftoken");
      if (csrftoken) (config.headers as any)["X-CSRFToken"] = csrftoken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------------------------------------
// Usage examples elsewhere in your frontend:
//
// import { api } from "@/lib/api";
//
// // GET request
// const res = await api.get("/api/students/overview/");
// console.log(res.data);
//
// // POST request with payload
// await api.post("/api/attempts/", { lesson_id: 1, correctness: 0.8 });
//
// -------------------------------------------------------------

export default api;
