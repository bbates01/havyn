export interface FormHistoryItem {
  formType: string;
  recordId: number;
  residentId: number;
  residentInternalCode: string;
  safehouseId: number;
  eventDate: string;
  submittedBy?: string | null;
  summary: string;
}

