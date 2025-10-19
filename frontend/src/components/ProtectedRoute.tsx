import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuthStore, refreshAuthState } from "@/store/useAuthStore";
import React, { useEffect, useState } from "react";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  const [checked, setChecked] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => { await refreshAuthState(); if (mounted) setChecked(true); })();
    return () => { mounted = false; };
  }, [loc.pathname]);

  if (!checked) return <div>Checking session…</div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <Outlet />;
}
