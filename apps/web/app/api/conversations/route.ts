import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import { parseMessageAttachments } from "@/features/chatting/message-attachments";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const conversations = await getDatabase().conversation.findMany({
    where: {
      hospitalId: user.hospitalId,
    },
    include: {
      patient: {
        include: {
          channels: {
            orderBy: { createdAt: "asc" },
          },
          tagAssignments: {
            where: { tag: { category: "TREATMENT" } },
            include: { tag: true },
            orderBy: { createdAt: "asc" },
          },
          appointments: {
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
      patientChannel: true,
      messages: {
        orderBy: [{ sentAt: "desc" }, { id: "desc" }],
        take: 1,
      },
      assignees: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { assignedAt: "asc" },
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
  });

  return Response.json(
    {
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        channel: conversation.channel,
        status: conversation.status,
        important: conversation.important,
        autoRespondEnabled: conversation.autoRespondEnabled,
        autoTranslateEnabled: conversation.autoTranslateEnabled,
        translationTargetLanguage: conversation.translationTargetLanguage,
        unreadCount: conversation.unreadCount,
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        assignees: conversation.assignees.map(({ user: assignedUser }) => ({
          id: assignedUser.id,
          name: assignedUser.name,
        })),
        chatAccount: {
          id: conversation.patientChannel?.id ?? null,
          channel: conversation.channel,
          externalCustomerId:
            conversation.patientChannel?.externalCustomerId ?? null,
          displayName: conversation.patientChannel?.displayName ?? null,
          phone: conversation.patientChannel?.phone ?? null,
          isPrimary: conversation.patientChannel?.isPrimary ?? false,
          linkMethod: conversation.patientChannel?.linkMethod ?? null,
          linkedAt:
            conversation.patientChannel?.linkedAt?.toISOString() ?? null,
        },
        customer: conversation.patient
          ? {
              id: conversation.patient.id,
              chartNumber: conversation.patient.chartNumber,
              name: conversation.patient.name,
              phone: conversation.patient.phone,
              phoneCountryCode: conversation.patient.phoneCountryCode,
              email: conversation.patient.email,
              gender: conversation.patient.gender,
              birthDate: conversation.patient.birthDate?.toISOString() ?? null,
              visitType: conversation.patient.visitType,
              nationality: conversation.patient.nationality,
              language: conversation.patient.language,
              notes: conversation.patient.notes,
              notesUpdatedAt:
                conversation.patient.notesUpdatedAt?.toISOString() ?? null,
              tags: conversation.patient.tagAssignments.map(({ tag }) => ({
                name: tag.name,
                color: tag.color,
              })),
              channels: conversation.patient.channels.map((patientChannel) => ({
                id: patientChannel.id,
                channel: patientChannel.channel,
                displayName: patientChannel.displayName,
                phone: patientChannel.phone,
              })),
              appointments: conversation.patient.appointments.map(
                (appointment) => ({
                  id: appointment.id,
                  scheduledAt: appointment.scheduledAt.toISOString(),
                  doctorName: appointment.doctorName,
                  treatment: appointment.treatment,
                  status: appointment.status,
                }),
              ),
            }
          : null,
        messages: conversation.messages
          .slice()
          .reverse()
          .map((message) => ({
            id: message.id,
            direction: message.direction,
            sender: message.sender,
            content: message.content,
            sourceLanguage: message.sourceLanguage,
            sourceLanguageName: message.sourceLanguageName,
            translatedContent: message.translatedContent,
            translatedLanguage: message.translatedLanguage,
            translatedLanguageName: message.translatedLanguageName,
            attachments: parseMessageAttachments(message.attachments),
            bookmarkedAt: message.bookmarkedAt?.toISOString() ?? null,
            sentAt: message.sentAt.toISOString(),
          })),
        coachSuggestions: [],
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
