import { useState, useEffect } from "react";
import { getAccessToken, verifyToken, clearAuthSession } from "@/lib/auth";

type AuthState = { isAuthenticated: boolean; username: string | null };

let globalState: AuthState = { isAuthenticated: false, username: null };
let subscribers = new Set<() => void>();
let expiryTimer: number | null = null;

function notify() {
  for (const s of subscribers) s();
}

export function setAuthState(isAuth: boolean, username: string | null = null) {
  globalState = { isAuthenticated: isAuth, username };
  notify();
}

export function useAuthStore() {
  const [state, setState] = useState<AuthState>(globalState);

  useEffect(() => {
    const update = () => setState(globalState);
    subscribers.add(update);
    // CORRECT: return a cleanup function, not the boolean result of delete()
    return () => {
      subscribers.delete(update);
    };
  }, []);

  return state;
}

function clearExpiryTimer() {
  if (expiryTimer !== null) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

function handleExpiry() {
  clearExpiryTimer();
  clearAuthSession();
  setAuthState(false, null);
  window.location.href = "/login";
}

function scheduleExpiry(expSec: number) {
  clearExpiryTimer();
  const now = Math.floor(Date.now() / 1000);
  const ms = Math.max((expSec - now) * 1000, 0);
  if (ms <= 0) {
    handleExpiry();
    return;
  }
  expiryTimer = window.setTimeout(() => handleExpiry(), ms);
}

export async function refreshAuthState(): Promise<boolean> {
  const token = getAccessToken();
  if (!token) {
    setAuthState(false, null);
    return false;
  }

  // Local expiry check
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && now >= payload.exp) {
        handleExpiry();
        return false;
      }

      if (typeof payload.exp === "number") {
        scheduleExpiry(payload.exp);
      }
    }
  } catch {
    // ignore malformed JWTs
  }

  // Backend verification
  try {
    const ok = await verifyToken(token); // now boolean | null
    if (ok === false) {
      // only logout if backend explicitly rejects
      handleExpiry();
      return false;
    }
    // ok === null → network issue, do not clear token
  } catch {
    // any thrown error -> rely on local expiry
  }

  // Restore username from session (consistent key)
  const username = sessionStorage.getItem("user_name");
  setAuthState(true, username);
  return true;
}


export function setAuthFromLogin(username: string | null, tokenExpSec?: number) {
  setAuthState(true, username ?? null);
  if (typeof tokenExpSec === "number") scheduleExpiry(tokenExpSec);
}

export function forceLogout() {
  clearExpiryTimer();
  clearAuthSession();
  setAuthState(false, null);
  window.location.href = "/login";
}
