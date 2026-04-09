export interface RecommendedSession {
  residentId: number,
  sessionType: string,
  priority: string,
  reason: string,
  suggestedDate?: string | null,
  confidence?: number | null,
}
