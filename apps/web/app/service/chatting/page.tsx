import { getDatabase } from "@doctornest/database";

import { requireUser } from "@/lib/auth";

import { ChattingClient } from "./chatting-client";
import type { ConversationItem } from "./chat-types";

export const dynamic = "force-dynamic";

export default async function ChattingPage() {
  const user = await requireUser();
  const [conversations, manualFolders] = await Promise.all([
    getDatabase().conversation.findMany({
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
          orderBy: { sentAt: "asc" },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    }),
    getDatabase().manualFolder.findMany({
      where: { hospitalId: user.hospitalId },
      include: {
        documents: {
          include: {
            tags: {
              include: { tag: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const serializedConversations: ConversationItem[] = conversations.map(
    (conversation) => ({
      id: conversation.id,
      channel: conversation.channel,
      status: conversation.status,
      important: conversation.important,
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
        appointments: conversation.patient.appointments.map((appointment) => ({
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
      organizationName={user.hospital.name}
      manualFolders={manualFolders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        documents: folder.documents.map((document) => ({
          id: document.id,
          title: document.title,
          slug: document.slug,
          contentMarkdown: document.contentMarkdown,
          tags: document.tags.map(({ tag }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
          })),
        })),
      }))}
    />
  );
}
