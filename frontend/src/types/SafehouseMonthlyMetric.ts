export interface SafehouseMonthlyMetric {
  metricId: number,
  safehouseId: number,
  monthStart: string,
  monthEnd: string,
  activeResidents: number,
  avgEducationProgress?: number | null,
  avgHealthScore?: number | null,
  processRecordingCount: number,
  homeVisitationCount: number,
  incidentCount: number,
  notes?: string | null,
}
