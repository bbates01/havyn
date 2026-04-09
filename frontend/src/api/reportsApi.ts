import type { ResidentOutcome } from '../types/ResidentOutcome';
import type { DonationTrend } from '../types/DonationTrend';
import type { SafehouseComparison } from '../types/SafehouseComparison';
import type { ServiceProvided } from '../types/ServiceProvided';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchResidentOutcomes(params: {
  from?: string;
  to?: string;
  safehouseId?: number;
  includeClosedCases?: boolean;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<ResidentOutcome[]>(`/api/reports/resident-outcomes${query}`);
}

export function fetchDonationTrends(params: { from?: string; to?: string } = {}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<DonationTrend[]>(`/api/reports/donation-trends${query}`);
}

export function fetchSafehouseComparisons(params: { from?: string; to?: string } = {}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<SafehouseComparison[]>(`/api/reports/safehouse-comparisons${query}`);
}

export function fetchServicesProvided(params: {
  from?: string;
  to?: string;
  safehouseId?: number;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<ServiceProvided[]>(`/api/reports/services-provided${query}`);
}
