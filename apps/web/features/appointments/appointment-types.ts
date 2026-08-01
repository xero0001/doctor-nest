export type AppointmentStatus =
  "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type AppointmentSheetItem = {
  id: string;
  patientName: string;
  patientPhone: string;
  chartNumber: string;
  scheduledAt: string;
  doctorName: string;
  treatment: string;
  status: AppointmentStatus;
};

export type AppointmentOperatingHour = {
  weekday:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  isOpen: boolean;
  openMinutes: number;
  closeMinutes: number;
};
