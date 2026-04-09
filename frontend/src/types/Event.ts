export interface Event {
  eventId: number,
  eventType: string,
  title: string,
  description?: string | null,
  eventDate: string,
  eventTime: string,
  safehouseId?: number | null,
  createdByUserId: string,
  status: string,
  createdAt: string,
  updatedAt: string,
}
