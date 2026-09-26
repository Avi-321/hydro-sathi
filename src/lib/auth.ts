/**
 * Session state backed by the real API (JWT access token + rotating refresh
 * token). The role always comes from the server — never from the UI.
 */
import { useSyncExternalStore } from "react";
import { api, onSessionExpired, request, tokenStore } from "./http";

export type Role = "BUYER" | "SELLER" | "ADMIN";

export interface SessionUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  status: string;
  emailVerified: boolean;
  sellerId: number | null;
  sellerStatus: string | null;
  createdAt: string;
}

interface SessionResponse {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
}

let state: AuthState = { user: null, loading: true };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

let bootstrapped = false;
async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  if (!tokenStore.access) {
    set({ loading: false });
    return;
  }
  try {
    const res = await api.get<{ user: SessionUser }>("/auth/me");
    set({ user: res.user, loading: false });
  } catch {
    tokenStore.clear();
    set({ user: null, loading: false });
  }
}

onSessionExpired(() => set({ user: null, loading: false }));

function subscribe(cb: () => void) {
  listeners.add(cb);
  void bootstrap();
  return () => listeners.delete(cb);
}

const serverSnapshot: AuthState = { user: null, loading: true };

export function useAuth() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverSnapshot,
  );
}

function accept(res: SessionResponse) {
  tokenStore.set(res.accessToken, res.refreshToken);
  set({ user: res.user, loading: false });
  return res.user;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  accountType?: "BUYER" | "SELLER";
  businessName?: string;
  registrationNumber?: string;
  panNumber?: string;
  province?: string;
  district?: string;
  city?: string;
  addressLine?: string;
  description?: string;
  bankName?: string;
  bankAccountNumber?: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    request<{ ok: boolean; requiresVerification: boolean; emailSent: boolean; role: Role; message: string }>(
      "/auth/register",
      { method: "POST", body: payload, auth: false },
    ),

  async login(email: string, password: string) {
    return accept(await request<SessionResponse>("/auth/login", { method: "POST", body: { email, password }, auth: false }));
  },

  async adminLogin(email: string, password: string) {
    return accept(
      await request<SessionResponse>("/auth/admin/login", { method: "POST", body: { email, password }, auth: false }),
    );
  },

  async verifyEmail(token: string) {
    return accept(await request<SessionResponse>("/auth/verify-email", { method: "POST", body: { token }, auth: false }));
  },

  resendVerification: (email: string) =>
    request<{ ok: true }>("/auth/resend-verification", { method: "POST", body: { email }, auth: false }),

  forgotPassword: (email: string, portal: "user" | "admin" = "user") =>
    request<{ ok: true }>("/auth/forgot-password", { method: "POST", body: { email, portal }, auth: false }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ ok: true }>("/auth/reset-password", { method: "POST", body: { token, newPassword }, auth: false }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ ok: true }>("/auth/password", { currentPassword, newPassword }),

  updateAdminCredentials: (payload: {
    currentPassword: string;
    email?: string;
    newPassword?: string;
    fullName?: string;
  }) => api.patch<{ ok: true; passwordChanged: boolean }>("/auth/admin/credentials", payload),

  async logout() {
    const refreshToken = tokenStore.refresh;
    try {
      await request("/auth/logout", { method: "POST", body: { refreshToken }, auth: false });
    } catch {
      /* logging out locally regardless */
    }
    tokenStore.clear();
    set({ user: null, loading: false });
  },

  async refreshMe() {
    try {
      const res = await api.get<{ user: SessionUser }>("/auth/me");
      set({ user: res.user, loading: false });
    } catch {
      /* ignore */
    }
  },

  addresses: () => api.get<{ data: Record<string, unknown>[] }>("/auth/addresses"),
  addAddress: (payload: Record<string, unknown>) => api.post<{ id: number }>("/auth/addresses", payload),
};

export const isAdmin = (u: SessionUser | null) => u?.role === "ADMIN";
export const isSeller = (u: SessionUser | null) => u?.role === "SELLER";
