import { apiFetch } from './apiHelper';

export function login(email: string, password: string) {
  return apiFetch<{ token?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
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
  return apiFetch<{ email: string; roles: string[] }>('/api/auth/me');
}

export function verifyMfa(code: string) {
  return apiFetch<void>('/api/auth/verify-mfa', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
