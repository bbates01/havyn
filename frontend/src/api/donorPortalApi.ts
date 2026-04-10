import type { Donation } from '../types/Donation';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export interface DonorDashboardSummary {
  totalLifetimeDonations: number;
  donationCount: number;
  activeRecurringCount: number;
  programAllocationsCount: number;
  impactSummary: string;
}

export function fetchDonorDashboardSummary() {
  return apiFetch<DonorDashboardSummary>('/api/Reports/DonorDashboardSummary');
}

export function fetchMyDonations(params: {
  pageSize: number;
  pageIndex: number;
  recurringOnly?: boolean;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<Donation>>(`/api/DonorDonations/MyDonations${query}`);
}

export function createMyDonation(body: {
  amount: number;
  isRecurring: boolean;
  recurringFrequency?: string;
  campaignName?: string;
  notes?: string;
}) {
  return apiFetch<Donation>('/api/DonorDonations/MyDonations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateMyDonation(
  donationId: number,
  body: {
    isRecurring: boolean;
    recurringFrequency?: string;
    amount?: number;
    notes?: string;
  },
) {
  return apiFetch<Donation>(`/api/DonorDonations/MyDonations/${donationId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
