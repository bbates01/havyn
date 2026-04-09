export interface ResidentOutcome {
  totalActiveResidents: number,
  riskDistribution: { riskLevel: string | null, count: number }[],
  avgEducationProgress: number,
  avgHealthScore: number,
  reintegrationSummary: { reintegrationType: string | null, count: number }[],
}
