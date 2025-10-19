// src/components/Navbar.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sun, Moon, LogOut, User, LayoutDashboard, Menu } from "lucide-react";
import {
  useAuthStore,
  refreshAuthState,
  forceLogout,
} from "@/store/useAuthStore";

export default function Navbar() {
  const { isAuthenticated, username } = useAuthStore();
  const [dark, setDark] = useState<boolean>(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );
  const [menuOpen, setMenuOpen] = useState(false); // mobile menu
  const [profileOpen, setProfileOpen] = useState(false); // desktop profile dropdown
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    refreshAuthState();
    function onStorage(e: StorageEvent) {
      if (e.key === "token" || e.key === "user_name") refreshAuthState();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // close mobile menu on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  // close profile dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    if (profileOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [profileOpen]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) {
        const isDark = saved === "dark";
        setDark(isDark);
        document.documentElement.classList.toggle("dark", isDark);
      }
    } catch {}
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  function handleLogout() {
    try {
      forceLogout();
    } catch {
      try {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user_name");
      } catch {}
      navigate("/");
    }
  }

  const shortName = username ?? sessionStorage.getItem("user_name") ?? "User";
  const initials = shortName
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <header className="w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-lg font-bold text-indigo-600">
              CodingAl
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle always visible (desktop + mobile) */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                type="button"
              >
                {dark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Desktop controls */}
            <div className="hidden sm:flex items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    className="text-sm px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm px-3 py-1 rounded bg-indigo-600 text-white hover:opacity-95"
                  >
                    Register
                  </Link>
                </>
              ) : (
                <>
                  {/* Profile dropdown contains Dashboard + Profile + Logout */}
                  <div className="relative" ref={profileRef}>
                    <Button
                      variant="ghost" // ShadCN variant; change to "outline", "default", etc. as needed
                      type="button"
                      onClick={() => setProfileOpen((p) => !p)}
                      className="flex items-center gap-2 text-sm px-2 py-1"
                      // Axe fix: aria-expanded must evaluate to a boolean, not a string
                      aria-expanded={!!profileOpen}
                      aria-haspopup="menu"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{initials || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline">
                        {username ?? "Profile"}
                      </span>
                    </Button>

                    {profileOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-50">
                        <nav className="flex flex-col p-2">
                          <Link
                            to="/dashboard"
                            className="text-sm px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2"
                            onClick={() => setProfileOpen(false)}
                          >
                            <LayoutDashboard className="h-4 w-4" /> Dashboard
                          </Link>

                          <Link
                            to="/profile"
                            className="text-sm px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2"
                            onClick={() => setProfileOpen(false)}
                          >
                            <User className="h-4 w-4" /> Profile
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              handleLogout();
                              setProfileOpen(false);
                            }}
                            className="text-left text-sm px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2"
                          >
                            <LogOut className="h-4 w-4" /> Logout
                          </button>
                        </nav>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu */}
            <div className="sm:hidden relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((p) => !p)}
                type="button"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-50">
                  <div className="flex flex-col p-2">
                    {/* Theme toggle in mobile menu as action */}
                    {/* <button onClick={() => { toggleTheme(); setMenuOpen(false); }} className="text-left text-sm px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                      {dark ? "Light mode" : "Dark mode"}
                    </button> */}

                    {!isAuthenticated ? (
                      <>
                        <Link
                          to="/login"
                          className="text-sm px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          onClick={() => setMenuOpen(false)}
                        >
                          Login
                        </Link>
                        <Link
                          to="/register"
                          className="text-sm px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          onClick={() => setMenuOpen(false)}
                        >
                          Register
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/dashboard"
                          className="text-left text-sm px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2"
                          onClick={() => setMenuOpen(false)}
                        >
                          <LayoutDashboard className="h-4 w-4" /> Dashboard
                        </Link>

                        <Link
                          to="/profile"
                          className="text-left text-sm px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2"
                          onClick={() => setMenuOpen(false)}
                        >
                          <User className="h-4 w-4" /> Profile
                        </Link>

                        <button
                          onClick={() => {
                            handleLogout();
                            setMenuOpen(false);
                          }}
                          className="text-left text-sm px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2"
                        >
                          <LogOut className="h-4 w-4" /> Logout
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* end mobile menu */}
          </div>
        </div>
      </div>
    </header>
  );
}
