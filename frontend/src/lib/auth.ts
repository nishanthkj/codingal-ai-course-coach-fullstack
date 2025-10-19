// src/lib/auth.ts
import type {
    AxiosError,
    AxiosRequestConfig,
    InternalAxiosRequestConfig,
    AxiosResponse,
} from "axios";
import { api } from "./api";
import { SessionKeyEnum } from '@/contants/sessionKeyEnum';

/* =====================
   TYPE DEFINITIONS
===================== */
export interface UserDto {
    id: number;
    email: string;
    full_name: string;
    student_id: number;
}

export interface RegisterReq {
    full_name: string;
    email: string;
    password: string;
}

export interface LoginReq {
    email: string;
    password: string;
}

export interface RegisterResp {
    status: number;
    message: string;
    user?: UserDto;
    token?: string;
    refresh?: string;
    student_id: number;
}

export interface LoginResp {
    status: number;
    message: string;
    token?: string;
    refresh?: string;
    user?: UserDto;
    student_id: number;
}

export interface TokenResp {
    status: number;
    token?: string;
}

export interface MeResp {
    status: number;
    user: UserDto;
}

export interface LogoutResp {
    status: number;
    message: string;
}

/* =====================
   ACCESS TOKEN (ACCESS KEY)
===================== */

// the access key used for Authorization headers


let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

/* =====================
   TOKEN MANAGEMENT
===================== */
export function getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("token");
}

function setAccessToken(newToken: string | null) {
    if (typeof window === "undefined") return;
    if (newToken) sessionStorage.setItem("token", newToken);
    else sessionStorage.removeItem("token");
}

function getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("refresh_token");
}

/* =====================
   SESSION MANAGEMENT
===================== */
function setAuthSession(token: string | null, refresh?: string | null, user?: UserDto | null) {

    const keys = Object.values(SessionKeyEnum);
    // clear previous session data
    keys.forEach((k) => sessionStorage.removeItem(k));

    if (token) {
        setAccessToken(token);
        if (refresh) {
            sessionStorage.setItem("refresh_token", refresh);
        }

        if (user) {
            sessionStorage.setItem("user_id", String(user.id));
            sessionStorage.setItem("student_id", String((user as any).student_id));
            sessionStorage.setItem("user_email", user.email);
            sessionStorage.setItem("user_name", user.full_name);
            sessionStorage.setItem("user", JSON.stringify(user));
        }

    } else {
        setAccessToken(null);
    }

}


/* =====================
   REFRESH LOGIC
===================== */
async function refreshAccess(): Promise<string | null> {
    if (isRefreshing) {
        return new Promise((resolve) => refreshQueue.push(resolve));
    }

    isRefreshing = true;
    try {
        const refresh = getRefreshToken();
        if (!refresh) {
            // no refresh available. let caller handle logout. do not clear access token here.
            return null;
        }

        const resp = await api.post<TokenResp>("/api/user/refresh/", { refresh });
        const newAccess = resp.data?.token ?? null;

        if (newAccess) setAccessToken(newAccess);

        const newRefresh = (resp.data as any)?.refresh ?? null;
        if (newRefresh) sessionStorage.setItem("refresh_token", newRefresh);

        refreshQueue.forEach((cb) => cb(newAccess));
        refreshQueue = [];

        return newAccess;
    } catch (err) {
        // refresh failed. notify queued callers but do not force-clear the access token here.
        console.debug("refreshAccess failed", err);
        refreshQueue.forEach((cb) => cb(null));
        refreshQueue = [];
        return null;
    } finally {
        isRefreshing = false;
    }
}


/* =====================
   AXIOS 
===================== */

// Attach Authorization header with access key
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    config.headers = config.headers ?? ({} as InternalAxiosRequestConfig["headers"]);
    const accessToken =
        getAccessToken() ??
        (typeof window !== "undefined"
            ? sessionStorage.getItem("token")
            : null);
    if (accessToken) (config.headers as any)["Authorization"] = `Bearer ${accessToken}`;
    return config;
});

// Handle 401 by refreshing token once
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const original = error.config as (AxiosRequestConfig & { __retry?: boolean }) | undefined;
        if (!original) return Promise.reject(error);

        if (error.response?.status === 401 && !original.__retry) {
            original.__retry = true;
            const newToken = await refreshAccess();
            if (newToken) {
                (original.headers as any)["Authorization"] = `Bearer ${newToken}`;
                return api.request(original);
            }
        }
        return Promise.reject(error);
    }
);

/* =====================
   PUBLIC API FUNCTIONS
===================== */
export async function register(data: RegisterReq): Promise<RegisterResp> {
    const resp = await api.post<RegisterResp>("api/user/register/", data);
    const token = resp.data.token ?? null;
    const refresh = (resp.data as any)?.refresh ?? null;
    const user = resp.data.user ?? null;
    setAuthSession(token, refresh, user);
    return resp.data;
}

export async function login(data: LoginReq): Promise<LoginResp> {
    const resp = await api.post<LoginResp>("api/user/login/", data);
    const token = resp.data.token ?? null;
    const refresh = (resp.data as any)?.refresh ?? null;
    const user = resp.data.user ?? null;
    setAuthSession(token, refresh, user);
    return resp.data;
}

export async function me(): Promise<MeResp> {
    const resp = await api.get<MeResp>("api/user/me/");
    return resp.data;
}

export async function logout(): Promise<LogoutResp> {
    try {
        await api.post<LogoutResp>("api/user/logout/");
    } finally {
        setAuthSession(null, null, null);
    }
    return { status: 1, message: "Logged out" };
}

export async function forceRefresh(): Promise<string | null> {
    return refreshAccess();
}

export function clearAuthSession() {
    setAuthSession(null, null, null);
}

// =====================
// VERIFY TOKEN (ONLY)
// =====================

export async function verifyToken(token?: string | null): Promise<boolean | null> {
  const t = token ?? getAccessToken();
  if (!t) return false;

  try {
    const resp = await api.get<{ valid: boolean }>("/api/user/verify/", {
      headers: { Authorization: `Bearer ${t}` },
    });

    // Explicit valid/invalid result
    return resp?.data?.valid === true;
  } catch (err: any) {
    // Distinguish between network issues and explicit 401s
    if (err?.response) {
      // backend responded with 401 or 403 -> invalid
      return false;
    }
    console.debug("verifyToken network or CORS error", err);
    // Unknown / network failure -> do NOT treat as invalid
    return null;
  }
}

