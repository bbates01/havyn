import { apiFetch } from './apiHelper';

export interface AuthSession {
  isAuthenticated: boolean;
  userName?: string;
  email?: string;
  roles: string[];
  safehouseId?: number | null;
  socialWorkerCode?: string | null;
  supporterId?: number | null;
}

export function login(email: string, password: string) {
  return apiFetch<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export interface RegisterDonorPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  country: string;
  supporterType?: string;
  organizationName?: string;
}

export function register(data: RegisterDonorPayload) {
  return apiFetch<{ message?: string }>('/api/auth/register', {
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

export function verifyMfa(code: string) {
  return apiFetch<void>('/api/auth/verify-mfa', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}