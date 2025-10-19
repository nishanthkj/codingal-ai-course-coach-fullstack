// src/services/authService.ts
type LoginResp = { access: string; user?: { id: number; username: string; email?: string } };

const LOGIN = "/api/user/login/";
const REFRESH = "/api/user/refresh/";
const ME = "/api/user/me/";
const LOGOUT = "/api/user/logout/";

let accessToken: string | null = null;

function emitTokenChange() {
  window.dispatchEvent(new CustomEvent("tokenchange", { detail: { token: accessToken } }));
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  emitTokenChange();
}

export async function login(username: string, password: string): Promise<LoginResp> {
  const res = await fetch(LOGIN, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(j.detail || "Login failed");
  }
  const data = (await res.json()) as LoginResp;
  setAccessToken(data.access);
  return data;
}

export async function refreshAccessToken(): Promise<string> {
  const res = await fetch(REFRESH, { method: "POST", credentials: "include" });
  if (!res.ok) {
    setAccessToken(null);
    throw new Error("Refresh failed");
  }
  const data = (await res.json()) as { access: string };
  setAccessToken(data.access);
  return data.access;
}

export async function logout(): Promise<void> {
  try {
    await fetch(LOGOUT, { method: "POST", credentials: "include" });
  } catch {}
  setAccessToken(null);
}

export async function me(): Promise<any> {
  const res = await authFetch(ME, { method: "GET" });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> || {}) };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let res = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retry) {
    try {
      const newToken = await refreshAccessToken();
      const retryHeaders = { ...(init.headers as Record<string, string> || {}), Authorization: `Bearer ${newToken}` };
      return fetch(input, { ...init, headers: retryHeaders, credentials: "include" });
    } catch {
      setAccessToken(null);
      return res;
    }
  }
  return res;
}

export function onTokenChange(cb: (t: string | null) => void) {
  const handler = (e: Event) => cb((e as CustomEvent).detail.token ?? null);
  window.addEventListener("tokenchange", handler as EventListener);
  return () => window.removeEventListener("tokenchange", handler as EventListener);
}
