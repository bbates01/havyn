import { apiFetch } from './apiHelper';

export interface StaffAccountSummary {
  id: string;
  email?: string | null;
  displayName: string;
  roles: string[];
  safehouseId?: number | null;
  socialWorkerCode?: string | null;
  supporterId?: number | null;
}

export interface ListStaffAccountsResponse {
  items?: StaffAccountSummary[];
  Items?: StaffAccountSummary[];
  totalCount?: number;
  TotalCount?: number;
}

export async function listStaffAccounts(params?: {
  pageSize?: number;
  pageIndex?: number;
  role?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.pageSize != null) qs.set('pageSize', String(params.pageSize));
  if (params?.pageIndex != null) qs.set('pageIndex', String(params.pageIndex));
  if (params?.role) qs.set('role', params.role);
  const q = qs.toString();
  return apiFetch<ListStaffAccountsResponse>(`/api/StaffAccounts${q ? `?${q}` : ''}`);
}

export interface UpdateStaffAccountPayload {
  displayName?: string;
  email?: string;
  phone?: string;
  safehouseId?: number | null;
}

export async function updateStaffAccount(userId: string, data: UpdateStaffAccountPayload) {
  return apiFetch<StaffAccountSummary>(`/api/StaffAccounts/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStaffAccount(userId: string) {
  return apiFetch<void>(`/api/StaffAccounts/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}
