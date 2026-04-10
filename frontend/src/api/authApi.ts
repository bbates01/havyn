import { apiFetch } from './apiHelper';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

// ─── Shared types ────────────────────────────────────────────

export interface AuthSession {
  isAuthenticated: boolean;
  userName?: string;
  email?: string;
  roles: string[];
  safehouseId?: number | null;
  socialWorkerCode?: string | null;
  supporterId?: number | null;
}

export interface LoginResponse {
  message: string;
  requiresMfa?: boolean;
}

export interface MfaStatus {
  isMfaEnabled: boolean;
  hasAuthenticator: boolean;
}

export interface MfaSetup {
  sharedKey: string;
  authenticatorUri: string;
  qrCodeDataUri: string;
}

export interface MfaEnableResponse {
  message: string;
  recoveryCodes: string[];
}

// ─── Auth ────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
  rememberMe = false,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, rememberMe }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed.');
  return data;
}

export function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  return apiFetch<void>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function logout() {
  return apiFetch<void>('/api/auth/logout', { method: 'POST' });
}

export function getCurrentUser() {
  return apiFetch<AuthSession>('/api/auth/me');
}

// ─── MFA ─────────────────────────────────────────────────────

export async function getMfaStatus(): Promise<MfaStatus> {
  const res = await fetch(`${API_BASE}/api/auth/mfa/status`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to get MFA status');
  return res.json();
}

export async function setupMfa(): Promise<MfaSetup> {
  const res = await fetch(`${API_BASE}/api/auth/mfa/setup`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to setup MFA');
  return res.json();
}

export async function enableMfa(
  verificationCode: string,
): Promise<MfaEnableResponse> {
  const res = await fetch(`${API_BASE}/api/auth/mfa/enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ verificationCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to enable MFA');
  return data;
}

export async function disableMfa(
  password: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/mfa/disable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to disable MFA');
  return data;
}

export async function verifyMfa(
  code: string,
  rememberMe = false,
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: '', code, rememberMe }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Invalid verification code');
  return data;
}

export async function verifyRecoveryCode(
  code: string,
  rememberMe = false,
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/mfa/verify-recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: '', code, rememberMe }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Invalid recovery code');
  return data;
}
