import type { SocialMediaPost } from '../types/SocialMediaPost';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchPosts(params: {
  pageSize: number;
  pageIndex: number;
  platform?: string;
  postType?: string;
  campaign?: string;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<SocialMediaPost>>(`/api/social-media${query}`);
}

export function getPost(id: number) {
  return apiFetch<SocialMediaPost>(`/api/social-media/${id}`);
}
