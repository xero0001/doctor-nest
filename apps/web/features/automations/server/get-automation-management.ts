import { getDatabase } from "@doctornest/database";

import type { AutomationManagementDashboard } from "@/features/automations/management-types";

const SEOUL_TIME_ZONE = "Asia/Seoul";

function currentSeoulMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}`;
}

export function normalizeManagementMonth(value?: string | null) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? value
    : currentSeoulMonth();
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(
    `${year}-${String(monthNumber).padStart(2, "0")}-01T00:00:00+09:00`,
  );
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const end = new Date(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+09:00`,
  );
  const previousYear = monthNumber === 1 ? year - 1 : year;
  const previousMonth = monthNumber === 1 ? 12 : monthNumber - 1;
  const previousStart = new Date(
    `${previousYear}-${String(previousMonth).padStart(2, "0")}-01T00:00:00+09:00`,
  );
  return { start, end, previousStart };
}

function seoulDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function datesInMonth(start: Date, end: Date) {
  const dates: string[] = [];
  for (
    let cursor = new Date(start);
    cursor.getTime() < end.getTime();
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1_000)
  ) {
    dates.push(seoulDateKey(cursor));
  }
  return dates;
}

export async function getAutomationManagementDashboard(
  hospitalId: string,
  requestedMonth?: string | null,
): Promise<AutomationManagementDashboard> {
  const month = normalizeManagementMonth(requestedMonth);
  const { start, end, previousStart } = monthRange(month);
  const database = getDatabase();

  const automationTags = await database.careAutomationTag.findMany({
    where: { automation: { hospitalId } },
    select: { tagId: true },
  });
  const automationTagIds = automationTags.map(({ tagId }) => tagId);
  const monthlyDateFilter = { gte: start, lt: end };

  const [
    totalCustomers,
    automationCustomers,
    totalConsultations,
    monthlyPatients,
    monthlyAutomationAssignments,
    monthlySentMessages,
    monthlyConsultations,
    monthlyCampaigns,
    treatmentAssignments,
  ] = await Promise.all([
    database.patient.count({ where: { hospitalId } }),
    automationTagIds.length > 0
      ? database.patient.count({
          where: {
            hospitalId,
            tagAssignments: { some: { tagId: { in: automationTagIds } } },
          },
        })
      : Promise.resolve(0),
    database.conversation.count({ where: { hospitalId } }),
    database.patient.findMany({
      where: {
        hospitalId,
        OR: [
          { createdAt: monthlyDateFilter },
          { updatedAt: monthlyDateFilter },
        ],
      },
      select: { id: true, createdAt: true, updatedAt: true },
    }),
    automationTagIds.length > 0
      ? database.patientTagAssignment.findMany({
          where: {
            tagId: { in: automationTagIds },
            createdAt: monthlyDateFilter,
            patient: { hospitalId },
          },
          select: { patientId: true },
          distinct: ["patientId"],
        })
      : Promise.resolve([]),
    database.autoResponseGeneration.count({
      where: {
        hospitalId,
        status: "COMPLETED",
        sentAt: monthlyDateFilter,
      },
    }),
    database.conversation.count({
      where: {
        hospitalId,
        messages: { some: { sentAt: monthlyDateFilter } },
      },
    }),
    database.contentEvent.count({
      where: { hospitalId, createdAt: monthlyDateFilter },
    }),
    database.patientTagAssignment.findMany({
      where: {
        createdAt: { gte: previousStart, lt: end },
        patient: { hospitalId },
        tag: { category: "TREATMENT" },
      },
      select: {
        tagId: true,
        createdAt: true,
        tag: { select: { name: true, color: true } },
      },
    }),
  ]);

  const createdByDay = new Map<string, Set<string>>();
  const managedByDay = new Map<string, Set<string>>();
  for (const patient of monthlyPatients) {
    if (patient.createdAt >= start && patient.createdAt < end) {
      const key = seoulDateKey(patient.createdAt);
      const ids = createdByDay.get(key) ?? new Set<string>();
      ids.add(patient.id);
      createdByDay.set(key, ids);
    }
    if (patient.updatedAt >= start && patient.updatedAt < end) {
      const key = seoulDateKey(patient.updatedAt);
      const ids = managedByDay.get(key) ?? new Set<string>();
      ids.add(patient.id);
      managedByDay.set(key, ids);
    }
  }

  const currentTreatmentCounts = new Map<
    string,
    { id: string; name: string; color: string; count: number }
  >();
  const previousTreatmentCounts = new Map<string, number>();
  for (const assignment of treatmentAssignments) {
    if (assignment.createdAt >= start) {
      const current = currentTreatmentCounts.get(assignment.tagId) ?? {
        id: assignment.tagId,
        name: assignment.tag.name,
        color: assignment.tag.color,
        count: 0,
      };
      current.count += 1;
      currentTreatmentCounts.set(assignment.tagId, current);
    } else {
      previousTreatmentCounts.set(
        assignment.tagId,
        (previousTreatmentCounts.get(assignment.tagId) ?? 0) + 1,
      );
    }
  }

  const currentRanked = [...currentTreatmentCounts.values()].sort(
    (left, right) =>
      right.count - left.count || left.name.localeCompare(right.name, "ko"),
  );
  const previousRanks = new Map(
    [...previousTreatmentCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([tagId], index) => [tagId, index + 1]),
  );

  const daily = datesInMonth(start, end).map((date) => ({
    date,
    managedCustomers: managedByDay.get(date)?.size ?? 0,
    newCustomers: createdByDay.get(date)?.size ?? 0,
  }));

  return {
    month,
    generatedAt: new Date().toISOString(),
    totals: {
      customers: totalCustomers,
      automationCustomers,
      consultations: totalConsultations,
    },
    customerManagement: {
      managedCustomers: new Set(
        monthlyPatients
          .filter(
            (patient) => patient.updatedAt >= start && patient.updatedAt < end,
          )
          .map((patient) => patient.id),
      ).size,
      newCustomers: new Set(
        monthlyPatients
          .filter(
            (patient) => patient.createdAt >= start && patient.createdAt < end,
          )
          .map((patient) => patient.id),
      ).size,
      daily,
    },
    automationManagement: {
      sentMessages: monthlySentMessages,
      appliedCustomers: monthlyAutomationAssignments.length,
      consultations: monthlyConsultations,
    },
    remarketing: { campaigns: monthlyCampaigns },
    popularTreatments: currentRanked.slice(0, 10).map((item, index) => ({
      ...item,
      rankChange: previousRanks.has(item.id)
        ? previousRanks.get(item.id)! - (index + 1)
        : null,
    })),
  };
}
