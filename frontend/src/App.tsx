import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./routes/Dashboard";
import Login from "./routes/Login";
import Home from "./routes/Home";
import Register from "./routes/Register";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./routes/NotFound";
import { Toaster } from "react-hot-toast";
import CourseDetails from "@/components/CourseDetails/CourseDetails";
import ProfilePage from "./components/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <div
        className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300"
        style={{ paddingTop: "var(--navbar-height)" }}
      >
        <div className="mx-auto max-w-7xl p-4">
          <Navbar />
        </div>

        <Toaster position="top-right" />
        <main className="mx-auto max-w-7xl p-6">
          {/* // App.tsx: use this instead of wrapping Routes with <ProtectedRoute> */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* protected routes nested under element */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/course/:id" element={<CourseDetails />} />
              {/* <Route path="/profile" element={<ProfilePage />} /> */}
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
