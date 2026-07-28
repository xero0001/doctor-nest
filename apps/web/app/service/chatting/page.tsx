import { getDatabase } from "@doctornest/database";

import { requireUser } from "@/lib/auth";

import { ChattingClient } from "./chatting-client";
import type { ConversationItem } from "./chat-types";

export const dynamic = "force-dynamic";

export default async function ChattingPage() {
  const user = await requireUser();
  const conversations = await getDatabase().conversation.findMany({
    where: {
      organizationId: user.organizationId,
    },
    include: {
      customer: {
        include: {
          appointments: {
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const serializedConversations: ConversationItem[] = conversations.map(
    (conversation) => ({
      id: conversation.id,
      channel: conversation.channel,
      status: conversation.status,
      important: conversation.important,
      unreadCount: conversation.unreadCount,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      customer: {
        id: conversation.customer.id,
        externalRef: conversation.customer.externalRef,
        name: conversation.customer.name,
        phone: conversation.customer.phone,
        email: conversation.customer.email,
        gender: conversation.customer.gender,
        birthDate: conversation.customer.birthDate?.toISOString() ?? null,
        language: conversation.customer.language,
        notes: conversation.customer.notes,
        tags: conversation.customer.tags,
        appointments: conversation.customer.appointments.map((appointment) => ({
          id: appointment.id,
          scheduledAt: appointment.scheduledAt.toISOString(),
          doctorName: appointment.doctorName,
          treatment: appointment.treatment,
          status: appointment.status,
        })),
      },
      messages: conversation.messages.map((message) => ({
        id: message.id,
        direction: message.direction,
        sender: message.sender,
        content: message.content,
        sentAt: message.sentAt.toISOString(),
      })),
    }),
  );

  return (
    <ChattingClient
      conversations={serializedConversations}
      organizationName={user.organization.name}
    />
  );
}
