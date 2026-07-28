import { getDatabase } from "@doctornest/database";

import {
  ChatTranslationError,
  translateStaffReply,
} from "@/lib/ai-translation";
import { getCurrentUser } from "@/lib/auth";
import { decryptLineCredentials } from "@/lib/channel-credentials";
import { getTranslationContext } from "@/lib/translation-context";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializeConversation(
  conversation: NonNullable<
    Awaited<ReturnType<typeof findConversationForHospital>>
  >,
) {
  return {
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
      sourceLanguage: message.sourceLanguage,
      sourceLanguageName: message.sourceLanguageName,
      translatedContent: message.translatedContent,
      translatedLanguage: message.translatedLanguage,
      translatedLanguageName: message.translatedLanguageName,
      sentAt: message.sentAt.toISOString(),
    })),
  };
}

function findConversationForHospital(id: string, hospitalId: string) {
  return getDatabase().conversation.findFirst({
    where: {
      id,
      hospitalId,
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
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await findConversationForHospital(id, user.hospitalId);

  if (!conversation) {
    return Response.json(
      { error: "채팅을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return Response.json(
    { conversation: serializeConversation(conversation) },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    important?: unknown;
  } | null;

  if (
    body &&
    Object.hasOwn(body, "important") &&
    typeof body.important !== "boolean"
  ) {
    return Response.json(
      { error: "중요 표시 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const existingConversation = await database.conversation.findFirst({
    where: {
      id,
      hospitalId: user.hospitalId,
    },
    select: { id: true },
  });

  if (!existingConversation) {
    return Response.json(
      { error: "채팅을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  await database.conversation.update({
    where: { id: existingConversation.id },
    data:
      typeof body?.important === "boolean"
        ? { important: body.important }
        : { unreadCount: 0 },
  });

  const conversation = await findConversationForHospital(
    existingConversation.id,
    user.hospitalId,
  );

  if (!conversation) {
    return Response.json(
      { error: "채팅을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return Response.json(
    { conversation: serializeConversation(conversation) },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    content?: string;
    autoTranslate?: boolean;
  } | null;
  const content = body?.content?.trim();
  const autoTranslate = body?.autoTranslate !== false;

  if (!content) {
    return Response.json({ error: "메시지를 입력해 주세요." }, { status: 400 });
  }

  if (content.length > 4000) {
    return Response.json(
      { error: "메시지는 4,000자까지 입력할 수 있습니다." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const conversation = await database.conversation.findFirst({
    where: {
      id,
      hospitalId: user.hospitalId,
    },
    select: {
      id: true,
      channel: true,
      patient: {
        select: {
          language: true,
        },
      },
      patientChannel: {
        select: {
          externalCustomerId: true,
        },
      },
    },
  });

  if (!conversation) {
    return Response.json(
      { error: "채팅을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  let translation = {
    sourceLanguage: "ko",
    sourceLanguageName: "한국어",
    translatedContent: content,
    translatedLanguage: "ko",
    translatedLanguageName: "한국어",
  };

  if (autoTranslate) {
    try {
      const context = await getTranslationContext({
        hospitalId: user.hospitalId,
        conversationId: conversation.id,
      });
      translation = await translateStaffReply(
        content,
        conversation.patient.language,
        user.hospitalId,
        context,
      );
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof ChatTranslationError
              ? error.message
              : "고객 언어로 번역하지 못했습니다.",
        },
        { status: 502 },
      );
    }
  }

  const deliveredContent = translation.translatedContent || content;

  if (conversation.channel === "LINE") {
    const connection = await database.channelConnection.findUnique({
      where: {
        hospitalId_channel: {
          hospitalId: user.hospitalId,
          channel: "LINE",
        },
      },
      select: {
        credentialsEncrypted: true,
      },
    });

    if (
      !connection?.credentialsEncrypted ||
      !conversation.patientChannel?.externalCustomerId
    ) {
      return Response.json(
        { error: "LINE Messaging API 연동을 먼저 완료해 주세요." },
        { status: 409 },
      );
    }

    let accessToken: string;
    try {
      accessToken = decryptLineCredentials(
        connection.credentialsEncrypted,
      ).channelAccessToken;
    } catch {
      return Response.json(
        { error: "LINE 자격증명을 읽지 못했습니다." },
        { status: 500 },
      );
    }

    const lineResponse = await fetch(
      "https://api.line.me/v2/bot/message/push",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: conversation.patientChannel.externalCustomerId,
          messages: [{ type: "text", text: deliveredContent }],
        }),
        cache: "no-store",
      },
    ).catch(() => null);

    if (!lineResponse?.ok) {
      return Response.json(
        { error: "LINE 메시지를 발송하지 못했습니다." },
        { status: 502 },
      );
    }
  }

  const sentAt = new Date();
  const message = await database.$transaction(async (transaction) => {
    const storedMessage = await transaction.message.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        sender: "STAFF",
        content,
        sourceLanguage: translation.sourceLanguage,
        sourceLanguageName: translation.sourceLanguageName,
        translatedContent: translation.translatedContent,
        translatedLanguage: translation.translatedLanguage,
        translatedLanguageName: translation.translatedLanguageName,
        sentAt,
      },
    });

    await transaction.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: sentAt },
    });

    return storedMessage;
  });

  return Response.json(
    {
      message: {
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
      },
    },
    { status: 201 },
  );
}
