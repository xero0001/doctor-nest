export const hospitalWeekdays = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type HospitalWeekday = (typeof hospitalWeekdays)[number];

export type HospitalProfileImage = {
  objectKey: string;
  publicUrl: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
};

export type HospitalOperatingHourRecord = {
  weekday: HospitalWeekday;
  isOpen: boolean;
  openMinutes: number;
  closeMinutes: number;
};

export type HospitalProfileRecord = {
  name: string;
  introduction: string;
  operatingNotes: string;
  profileImage: HospitalProfileImage | null;
  operatingHours: HospitalOperatingHourRecord[];
};
