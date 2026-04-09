export interface Appointment {
  appointmentId: number,
  staffUserId: string,
  residentId: number,
  appointmentDate: string,
  appointmentTime: string,
  appointmentType: string,
  sessionFormat: string,
  location?: string | null,
  notes?: string | null,
  status: string,
  createdAt: string,
  updatedAt: string,
}
