import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

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
            include: { tag: true },
            orderBy: { createdAt: "asc" },
          },
          appointments: {
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
      messages: {
        orderBy: [{ sentAt: "desc" }, { id: "desc" }],
        take: 1,
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
        unreadCount: conversation.unreadCount,
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        customer: {
          id: conversation.patient.id,
          chartNumber: conversation.patient.chartNumber,
          name: conversation.patient.name,
          phone: conversation.patient.phone,
          email: conversation.patient.email,
          gender: conversation.patient.gender,
          birthDate: conversation.patient.birthDate?.toISOString() ?? null,
          language: conversation.patient.language,
          notes: conversation.patient.notes,
          tags: conversation.patient.tagAssignments.map(({ tag }) => tag.name),
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
        },
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
