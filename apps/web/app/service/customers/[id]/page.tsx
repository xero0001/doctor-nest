import { getDatabase } from "@doctornest/database";
import { notFound } from "next/navigation";

import { CustomerDetailClient } from "@/features/customers/components/customer-detail-client";
import { requireUser } from "@/lib/auth";
import { stripPhoneCountryCode } from "@/lib/phone-country";

export const dynamic = "force-dynamic";

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/service/customers/${id}`);
  const database = getDatabase();
  const [patient, treatmentTags] = await Promise.all([
    database.patient.findFirst({
      where: { id, hospitalId: user.hospitalId },
      include: {
        channels: { orderBy: { createdAt: "desc" } },
        conversations: {
          select: {
            id: true,
            patientChannelId: true,
            channel: true,
            status: true,
            lastMessageAt: true,
          },
          orderBy: { lastMessageAt: "desc" },
          take: 10,
        },
        tagAssignments: {
          where: { tag: { category: "TREATMENT" } },
          include: { tag: true },
          orderBy: { createdAt: "asc" },
        },
        tagHistories: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    }),
    database.patientTag.findMany({
      where: { hospitalId: user.hospitalId, category: "TREATMENT" },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!patient) notFound();

  return (
    <CustomerDetailClient
      availableTreatmentTags={treatmentTags}
      initialPatient={{
        id: patient.id,
        name: patient.name,
        chartNumber: patient.chartNumber ?? "",
        phone: stripPhoneCountryCode(patient.phone, patient.phoneCountryCode),
        phoneCountryCode: patient.phoneCountryCode,
        email: patient.email ?? "",
        birthDate: toDateInputValue(patient.birthDate),
        gender:
          patient.gender === "남성"
            ? "MALE"
            : patient.gender === "여성"
              ? "FEMALE"
              : patient.gender === "기타"
                ? "OTHER"
                : (patient.gender ?? ""),
        visitType: patient.visitType ?? "",
        nationality: patient.nationality ?? "",
        marketingConsent: patient.marketingConsent,
        notes: patient.notes ?? "",
        managementNotes: patient.managementNotes ?? "",
        treatmentTags: patient.tagAssignments.map(({ tag }) => tag.name),
        tagHistories: patient.tagHistories.map((history) => ({
          id: history.id,
          tagNames: history.tagNames,
          source: history.source,
          modifiedByName: history.modifiedByName,
          createdAt: history.createdAt.toISOString(),
        })),
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
        channels: patient.channels.map((channel) => ({
          id: channel.id,
          channel: channel.channel,
          displayName: channel.displayName,
          externalCustomerId: channel.externalCustomerId,
          phone: channel.phone,
          isPrimary: channel.isPrimary,
          linkMethod: channel.linkMethod,
          linkedAt: channel.linkedAt?.toISOString() ?? null,
        })),
        conversations: patient.conversations.map((conversation) => ({
          id: conversation.id,
          patientChannelId: conversation.patientChannelId,
          channel: conversation.channel,
          status: conversation.status,
          lastMessageAt: conversation.lastMessageAt.toISOString(),
        })),
      }}
    />
  );
}
