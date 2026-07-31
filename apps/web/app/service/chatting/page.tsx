import { getDatabase } from "@doctornest/database";

import { requireUser } from "@/lib/auth";
import { serializeChatCoachGeneration } from "@/lib/chat-coach-generation";

import { ChattingClient } from "./chatting-client";
import type {
  ConversationItem,
  ManualFolderItem,
  StaffMember,
} from "./chat-types";

export const dynamic = "force-dynamic";

type ManualFolderRecord = {
  id: string;
  parentId: string | null;
  name: string;
  documents: ManualFolderItem["documents"];
};

function buildManualFolderTree(folders: ManualFolderRecord[]) {
  const nodes = new Map<
    string,
    ManualFolderRecord & { children: ManualFolderItem[] }
  >(
    folders.map((folder) => [
      folder.id,
      {
        ...folder,
        children: [],
      },
    ]),
  );
  const roots: ManualFolderItem[] = [];

  for (const folder of folders) {
    const node = nodes.get(folder.id);
    if (!node) continue;

    const item: ManualFolderItem = {
      id: node.id,
      name: node.name,
      documents: node.documents,
      children: node.children,
    };
    const parent = folder.parentId ? nodes.get(folder.parentId) : undefined;

    if (parent) {
      parent.children.push(item);
    } else {
      roots.push(item);
    }
  }

  return roots;
}

export default async function ChattingPage() {
  const user = await requireUser();
  const [conversations, manualFolders, staffMembers] = await Promise.all([
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
        assignees: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { assignedAt: "asc" },
        },
        chatCoachGenerations: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
      orderBy: { lastMessageAt: "desc" },
    }),
    getDatabase().manualFolder.findMany({
      where: { hospitalId: user.hospitalId, isActive: true },
      include: {
        documents: {
          where: { isActive: true },
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
            },
            tags: {
              include: { tag: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getDatabase().authUser.findMany({
      where: { hospitalId: user.hospitalId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedConversations: ConversationItem[] = conversations.map(
    (conversation) => ({
      id: conversation.id,
      channel: conversation.channel,
      status: conversation.status,
      important: conversation.important,
      autoRespondEnabled: conversation.autoRespondEnabled,
      autoTranslateEnabled: conversation.autoTranslateEnabled,
      unreadCount: conversation.unreadCount,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      assignees: conversation.assignees.map(({ user: assignedUser }) => ({
        id: assignedUser.id,
        name: assignedUser.name,
      })),
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
        notesUpdatedAt:
          conversation.patient.notesUpdatedAt?.toISOString() ?? null,
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
        sourceLanguage: message.sourceLanguage,
        sourceLanguageName: message.sourceLanguageName,
        translatedContent: message.translatedContent,
        translatedLanguage: message.translatedLanguage,
        translatedLanguageName: message.translatedLanguageName,
        bookmarkedAt: message.bookmarkedAt?.toISOString() ?? null,
        sentAt: message.sentAt.toISOString(),
      })),
      coachSuggestions: conversation.chatCoachGenerations.map(
        serializeChatCoachGeneration,
      ),
    }),
  );

  return (
    <ChattingClient
      conversations={serializedConversations}
      staffMembers={staffMembers satisfies StaffMember[]}
      manualFolders={buildManualFolderTree(
        manualFolders.map((folder) => ({
          id: folder.id,
          parentId: folder.parentId,
          name: folder.name,
          documents: folder.documents.map((document) => ({
            id: document.id,
            title: document.title,
            slug: document.slug,
            contentMarkdown: document.contentMarkdown,
            cautionMarkdown: document.cautionMarkdown,
            cautionEnabled: document.cautionEnabled,
            images: document.images.map((image) => ({
              id: image.id,
              publicUrl: image.publicUrl,
              altText: image.altText,
              originalName: image.originalName,
            })),
            tags: document.tags.map(({ tag }) => ({
              id: tag.id,
              name: tag.name,
              color: tag.color,
            })),
          })),
        })),
      )}
    />
  );
}
