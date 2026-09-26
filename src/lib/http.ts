/**
 * Hydro Sathi HTTP client.
 *
 * Talks to the Node.js + Express + MySQL API (see `server/`).
 * Handles JWT access tokens, transparent refresh-token rotation and
 * JSON / multipart requests.
 */
export const API_BASE_URL: string =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:4000/api/v1";

const ACCESS_KEY = "hs.accessToken";
const REFRESH_KEY = "hs.refreshToken";

export const tokenStore = {
  get access() {
    return typeof window === "undefined" ? null : window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return typeof window === "undefined" ? null : window.localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_KEY, access);
    window.localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const listeners = new Set<() => void>();
/** Called when the session becomes invalid (refresh failed). */
export function onSessionExpired(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error("refresh failed");
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      tokenStore.set(data.accessToken, data.refreshToken);
      return true;
    } catch {
      tokenStore.clear();
      listeners.forEach((l) => l());
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
  retry?: boolean;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, auth = true, query, retry = true } = opts;

  let url = `${API_BASE_URL}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    if ([...qs.keys()].length) url += `?${qs.toString()}`;
  }

  const headers: Record<string, string> = {};
  if (!formData) headers["Content-Type"] = "application/json";
  const token = tokenStore.access;
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    ...(formData ? { body: formData } : body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401 && auth && retry && tokenStore.refresh) {
    if (await refreshSession()) return request<T>(path, { ...opts, retry: false });
  }

  const text = await res.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    throw new ApiError(res.status, (payload["error"] as string) ?? res.statusText, payload["details"]);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], auth = true) =>
    request<T>(path, query ? { query, auth } : { auth }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: "POST", body, auth }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", formData }),
  uploadPatch: <T>(path: string, formData: FormData) => request<T>(path, { method: "PATCH", formData }),
};
