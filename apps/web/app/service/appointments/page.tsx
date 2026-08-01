import { getDatabase } from "@doctornest/database";

import { AppointmentSheet } from "@/features/appointments/components/appointment-sheet";
import type { AppointmentOperatingHour } from "@/features/appointments/appointment-types";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const defaultOperatingHours: AppointmentOperatingHour[] = [
  { weekday: "MONDAY", isOpen: true, openMinutes: 600, closeMinutes: 1140 },
  { weekday: "TUESDAY", isOpen: true, openMinutes: 600, closeMinutes: 1140 },
  {
    weekday: "WEDNESDAY",
    isOpen: true,
    openMinutes: 600,
    closeMinutes: 1140,
  },
  {
    weekday: "THURSDAY",
    isOpen: true,
    openMinutes: 600,
    closeMinutes: 1140,
  },
  { weekday: "FRIDAY", isOpen: true, openMinutes: 600, closeMinutes: 1140 },
  { weekday: "SATURDAY", isOpen: true, openMinutes: 600, closeMinutes: 840 },
  { weekday: "SUNDAY", isOpen: false, openMinutes: 600, closeMinutes: 1140 },
];

function getKoreanDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function AppointmentsPage() {
  const user = await requireUser("/service/appointments");
  const database = getDatabase();
  const now = new Date();
  const rangeStart = new Date(now);
  const rangeEnd = new Date(now);
  rangeStart.setUTCFullYear(rangeStart.getUTCFullYear() - 1);
  rangeEnd.setUTCFullYear(rangeEnd.getUTCFullYear() + 1);

  const [hospital, appointments] = await Promise.all([
    database.hospital.findUniqueOrThrow({
      where: { id: user.hospitalId },
      select: {
        appointmentManagementEnabled: true,
        operatingNotes: true,
        operatingHours: {
          orderBy: { weekday: "asc" },
        },
      },
    }),
    database.appointment.findMany({
      where: {
        hospitalId: user.hospitalId,
        scheduledAt: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        patient: {
          select: {
            name: true,
            phone: true,
            chartNumber: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 2_000,
    }),
  ]);

  const operatingHours = defaultOperatingHours.map(
    (fallback) =>
      hospital.operatingHours.find(
        (hour) => hour.weekday === fallback.weekday,
      ) ?? fallback,
  );

  return (
    <AppointmentSheet
      enabled={hospital.appointmentManagementEnabled}
      initialDateKey={getKoreanDateKey(now)}
      operatingNotes={hospital.operatingNotes}
      operatingHours={operatingHours}
      appointments={appointments.map((appointment) => ({
        id: appointment.id,
        patientName: appointment.patient.name,
        patientPhone: appointment.patient.phone ?? "",
        chartNumber: appointment.patient.chartNumber ?? "",
        scheduledAt: appointment.scheduledAt.toISOString(),
        doctorName: appointment.doctorName,
        treatment: appointment.treatment ?? "",
        status: appointment.status,
      }))}
    />
  );
}
