export interface IncidentReport {
  incidentId: number,
  residentId: number,
  safehouseId: number,
  incidentDate: string,
  incidentType: string,
  severity: string,
  description: string,
  responseTaken: string,
  resolved: boolean,
  resolutionDate?: string | null,
  reportedBy: string,
  followUpRequired: boolean,
}
