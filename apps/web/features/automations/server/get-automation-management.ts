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
    monthlyConversations,
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
        patientId: true,
        createdAt: true,
        tag: { select: { name: true, color: true } },
      },
    }),
    database.conversation.findMany({
      where: {
        hospitalId,
        OR: [
          { createdAt: monthlyDateFilter },
          { messages: { some: { sentAt: monthlyDateFilter } } },
        ],
      },
      select: {
        id: true,
        channel: true,
        createdAt: true,
        messages: {
          where: { sentAt: { lt: end } },
          select: { direction: true, sender: true, sentAt: true },
          orderBy: { sentAt: "asc" },
        },
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
  const currentTagIdsByPatient = new Map<string, Set<string>>();
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
      const patientTags =
        currentTagIdsByPatient.get(assignment.patientId) ?? new Set<string>();
      patientTags.add(assignment.tagId);
      currentTagIdsByPatient.set(assignment.patientId, patientTags);
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
  const combinationCounts = new Map<string, Map<string, number>>();
  for (const patientTags of currentTagIdsByPatient.values()) {
    const tagIds = [...patientTags];
    for (const tagId of tagIds) {
      const peerCounts =
        combinationCounts.get(tagId) ?? new Map<string, number>();
      for (const peerTagId of tagIds) {
        if (peerTagId === tagId) continue;
        peerCounts.set(peerTagId, (peerCounts.get(peerTagId) ?? 0) + 1);
      }
      combinationCounts.set(tagId, peerCounts);
    }
  }

  const channelCounts = new Map<
    AutomationManagementDashboard["chatting"]["channels"][number]["channel"],
    { consultations: number; newConsultations: number }
  >();
  let unansweredOverSixHours = 0;
  let inboundMessages = 0;
  let answeredInboundMessages = 0;
  let totalResponseMinutes = 0;
  const responseCutoff = Math.min(Date.now(), end.getTime());
  for (const conversation of monthlyConversations) {
    const hasMonthlyMessage = conversation.messages.some(
      (message) => message.sentAt >= start && message.sentAt < end,
    );
    const isNewConversation =
      conversation.createdAt >= start && conversation.createdAt < end;
    const channel = channelCounts.get(conversation.channel) ?? {
      consultations: 0,
      newConsultations: 0,
    };
    if (hasMonthlyMessage) channel.consultations += 1;
    if (isNewConversation) channel.newConsultations += 1;
    channelCounts.set(conversation.channel, channel);

    const lastMessage = conversation.messages.at(-1);
    if (
      lastMessage?.direction === "INBOUND" &&
      lastMessage.sentAt >= start &&
      responseCutoff - lastMessage.sentAt.getTime() >= 6 * 60 * 60 * 1_000
    ) {
      unansweredOverSixHours += 1;
    }

    for (let index = 0; index < conversation.messages.length; index += 1) {
      const message = conversation.messages[index];
      if (
        message.direction !== "INBOUND" ||
        message.sentAt < start ||
        message.sentAt >= end
      ) {
        continue;
      }
      inboundMessages += 1;
      const response = conversation.messages
        .slice(index + 1)
        .find((candidate) => candidate.direction === "OUTBOUND");
      if (response) {
        answeredInboundMessages += 1;
        totalResponseMinutes += Math.max(
          0,
          (response.sentAt.getTime() - message.sentAt.getTime()) / 60_000,
        );
      }
    }
  }

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
    popularTreatments: currentRanked.map((item, index) => {
      const popularCombinationEntry = [
        ...(combinationCounts.get(item.id)?.entries() ?? []),
      ].sort((left, right) => {
        if (right[1] !== left[1]) return right[1] - left[1];
        return (
          (currentTreatmentCounts.get(right[0])?.count ?? 0) -
          (currentTreatmentCounts.get(left[0])?.count ?? 0)
        );
      })[0];
      const popularCombination = popularCombinationEntry
        ? currentTreatmentCounts.get(popularCombinationEntry[0])
        : null;
      return {
        ...item,
        rankChange: previousRanks.has(item.id)
          ? previousRanks.get(item.id)! - (index + 1)
          : null,
        popularCombination: popularCombination
          ? {
              id: popularCombination.id,
              name: popularCombination.name,
              color: popularCombination.color,
            }
          : null,
      };
    }),
    chatting: {
      channels: [...channelCounts.entries()]
        .map(([channel, counts]) => ({ channel, ...counts }))
        .sort(
          (left, right) =>
            right.consultations - left.consultations ||
            right.newConsultations - left.newConsultations,
        ),
      unansweredOverSixHours,
      averageResponseMinutes:
        answeredInboundMessages > 0
          ? Math.round(totalResponseMinutes / answeredInboundMessages)
          : 0,
      responseRate:
        inboundMessages > 0
          ? Math.round((answeredInboundMessages / inboundMessages) * 1_000) / 10
          : 0,
    },
  };
}
