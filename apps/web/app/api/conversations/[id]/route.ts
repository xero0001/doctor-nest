import { getDatabase } from "@doctornest/database";

import {
  ChatTranslationError,
  translateStaffReply,
} from "@/lib/ai-translation";
import { getCurrentUser } from "@/lib/auth";
import { serializeChatCoachGeneration } from "@/lib/chat-coach-generation";
import {
  decryptInstagramCredentials,
  decryptLineCredentials,
  decryptNaverTalkCredentials,
} from "@/lib/channel-credentials";
import { sendInstagramTextMessage } from "@/lib/instagram-api";
import { sendNaverTalkTextMessage } from "@/lib/naver-talk-api";
import { getTranslationContext } from "@/lib/translation-context";
import {
  inferConversationTargetLanguage,
  normalizeTranslationTargetLanguage,
} from "@/lib/conversation-language";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MAX_PATIENT_NOTES_LENGTH = 5_000;

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
      linkedAt: conversation.patientChannel?.linkedAt?.toISOString() ?? null,
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
    autoRespondEnabled?: unknown;
    autoTranslateEnabled?: unknown;
    translationTargetLanguage?: unknown;
    status?: unknown;
    notes?: unknown;
    patientId?: unknown;
  } | null;

  const invalidSetting =
    (body &&
      Object.hasOwn(body, "important") &&
      typeof body.important !== "boolean") ||
    (body &&
      Object.hasOwn(body, "autoRespondEnabled") &&
      typeof body.autoRespondEnabled !== "boolean") ||
    (body &&
      Object.hasOwn(body, "autoTranslateEnabled") &&
      typeof body.autoTranslateEnabled !== "boolean") ||
    (body &&
      Object.hasOwn(body, "translationTargetLanguage") &&
      normalizeTranslationTargetLanguage(body.translationTargetLanguage) ===
        null) ||
    (body &&
      Object.hasOwn(body, "status") &&
      body.status !== "OPEN" &&
      body.status !== "CLOSED") ||
    (body &&
      Object.hasOwn(body, "notes") &&
      (typeof body.notes !== "string" ||
        body.notes.length > MAX_PATIENT_NOTES_LENGTH)) ||
    (body &&
      Object.hasOwn(body, "patientId") &&
      body.patientId !== null &&
      (typeof body.patientId !== "string" || !body.patientId.trim()));

  if (invalidSetting) {
    return Response.json(
      {
        error: `채팅 설정 값이 올바르지 않습니다. 상담 메모는 ${MAX_PATIENT_NOTES_LENGTH.toLocaleString("ko-KR")}자 이내로 입력해 주세요.`,
      },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const existingConversation = await database.conversation.findFirst({
    where: {
      id,
      hospitalId: user.hospitalId,
    },
    select: {
      id: true,
      patientId: true,
      patientChannelId: true,
    },
  });

  if (!existingConversation) {
    return Response.json(
      { error: "채팅을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const hasConversationSettings =
    typeof body?.important === "boolean" ||
    typeof body?.autoRespondEnabled === "boolean" ||
    typeof body?.autoTranslateEnabled === "boolean" ||
    normalizeTranslationTargetLanguage(body?.translationTargetLanguage) !==
      null ||
    body?.status === "OPEN" ||
    body?.status === "CLOSED";
  const hasPatientNotes = typeof body?.notes === "string";
  const hasPatientLinkUpdate = Boolean(
    body && Object.hasOwn(body, "patientId"),
  );
  const requestedPatientId =
    typeof body?.patientId === "string" ? body.patientId.trim() : null;
  const normalizedPatientNotes =
    typeof body?.notes === "string" && body.notes.trim().length > 0
      ? body.notes
      : null;

  if (requestedPatientId) {
    const targetPatient = await database.patient.findFirst({
      where: {
        id: requestedPatientId,
        hospitalId: user.hospitalId,
      },
      select: { id: true },
    });

    if (!targetPatient) {
      return Response.json(
        { error: "연결할 고객을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
  }

  if (hasPatientNotes && !existingConversation.patientId) {
    return Response.json(
      { error: "고객 정보를 먼저 연결한 뒤 상담 메모를 저장해 주세요." },
      { status: 409 },
    );
  }

  const shouldBecomePrimary = requestedPatientId
    ? (await database.patientChannel.count({
        where: { patientId: requestedPatientId, isPrimary: true },
      })) === 0
    : false;

  await database.$transaction([
    ...(hasPatientNotes && existingConversation.patientId
      ? [
          database.patient.update({
            where: { id: existingConversation.patientId },
            data: {
              notes: normalizedPatientNotes,
              notesUpdatedAt: new Date(),
            },
          }),
        ]
      : []),
    ...(hasPatientLinkUpdate && existingConversation.patientChannelId
      ? [
          database.patientChannel.update({
            where: { id: existingConversation.patientChannelId },
            data: {
              patientId: requestedPatientId,
              isPrimary: shouldBecomePrimary,
              linkMethod: requestedPatientId ? "MANUAL" : null,
              linkedAt: requestedPatientId ? new Date() : null,
            },
          }),
          database.conversation.updateMany({
            where: {
              hospitalId: user.hospitalId,
              patientChannelId: existingConversation.patientChannelId,
            },
            data: { patientId: requestedPatientId },
          }),
        ]
      : hasPatientLinkUpdate
        ? [
            database.conversation.update({
              where: { id: existingConversation.id },
              data: { patientId: requestedPatientId },
            }),
          ]
        : []),
    ...(hasConversationSettings || !hasPatientNotes
      ? [
          database.conversation.update({
            where: { id: existingConversation.id },
            data: hasConversationSettings
              ? {
                  ...(typeof body?.important === "boolean"
                    ? { important: body.important }
                    : {}),
                  ...(typeof body?.autoRespondEnabled === "boolean"
                    ? { autoRespondEnabled: body.autoRespondEnabled }
                    : {}),
                  ...(typeof body?.autoTranslateEnabled === "boolean"
                    ? { autoTranslateEnabled: body.autoTranslateEnabled }
                    : {}),
                  ...(normalizeTranslationTargetLanguage(
                    body?.translationTargetLanguage,
                  )
                    ? {
                        translationTargetLanguage:
                          normalizeTranslationTargetLanguage(
                            body?.translationTargetLanguage,
                          ),
                      }
                    : {}),
                  ...(body?.status === "OPEN" || body?.status === "CLOSED"
                    ? { status: body.status }
                    : {}),
                }
              : { unreadCount: 0 },
          }),
        ]
      : []),
  ]);

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
    targetLanguage?: unknown;
  } | null;
  const content = body?.content?.trim();
  const autoTranslate = body?.autoTranslate !== false;
  const requestedTargetLanguage = normalizeTranslationTargetLanguage(
    body?.targetLanguage,
  );

  if (
    body &&
    Object.hasOwn(body, "targetLanguage") &&
    !requestedTargetLanguage
  ) {
    return Response.json(
      { error: "번역 대상 언어가 올바르지 않습니다." },
      { status: 400 },
    );
  }

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
      translationTargetLanguage: true,
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
      const inboundMessages =
        requestedTargetLanguage || conversation.translationTargetLanguage
          ? []
          : await database.message.findMany({
              where: {
                conversationId: conversation.id,
                direction: "INBOUND",
                sender: "CUSTOMER",
              },
              select: { content: true, sourceLanguage: true },
              orderBy: [{ sentAt: "asc" }, { id: "asc" }],
            });
      const targetLanguage =
        requestedTargetLanguage ??
        normalizeTranslationTargetLanguage(
          conversation.translationTargetLanguage,
        ) ??
        inferConversationTargetLanguage(
          inboundMessages,
          conversation.patient?.language,
        );
      const context = await getTranslationContext({
        hospitalId: user.hospitalId,
        conversationId: conversation.id,
      });
      translation = await translateStaffReply(
        content,
        targetLanguage,
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
  let externalMessageId: string | null = null;

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

  if (conversation.channel === "NAVER_TALK") {
    const connection = await database.channelConnection.findUnique({
      where: {
        hospitalId_channel: {
          hospitalId: user.hospitalId,
          channel: "NAVER_TALK",
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
        { error: "네이버 톡톡 챗봇 API 연동을 먼저 완료해 주세요." },
        { status: 409 },
      );
    }

    let authorization: string;
    try {
      authorization = decryptNaverTalkCredentials(
        connection.credentialsEncrypted,
      ).authorization;
    } catch {
      return Response.json(
        { error: "네이버 톡톡 자격증명을 읽지 못했습니다." },
        { status: 500 },
      );
    }

    try {
      await sendNaverTalkTextMessage({
        authorization,
        userId: conversation.patientChannel.externalCustomerId,
        text: deliveredContent,
      });
    } catch {
      return Response.json(
        {
          error:
            "네이버 톡톡 메시지를 발송하지 못했습니다. Authorization 키와 챗봇 API 상태를 확인해 주세요.",
        },
        { status: 502 },
      );
    }
  }

  if (conversation.channel === "INSTAGRAM") {
    const connection = await database.channelConnection.findUnique({
      where: {
        hospitalId_channel: {
          hospitalId: user.hospitalId,
          channel: "INSTAGRAM",
        },
      },
      select: {
        status: true,
        credentialsEncrypted: true,
      },
    });

    if (
      connection?.status !== "CONNECTED" ||
      !connection.credentialsEncrypted ||
      !conversation.patientChannel?.externalCustomerId
    ) {
      return Response.json(
        { error: "Instagram 연동을 먼저 완료해 주세요." },
        { status: 409 },
      );
    }

    let credentials;
    try {
      credentials = decryptInstagramCredentials(
        connection.credentialsEncrypted,
      );
    } catch {
      return Response.json(
        { error: "Instagram 자격증명을 읽지 못했습니다." },
        { status: 500 },
      );
    }

    try {
      const result = await sendInstagramTextMessage({
        instagramUserId: credentials.instagramUserId,
        recipientId: conversation.patientChannel.externalCustomerId,
        accessToken: credentials.accessToken,
        text: deliveredContent,
      });
      externalMessageId = result?.message_id ?? null;
    } catch {
      return Response.json(
        {
          error:
            "Instagram 메시지를 발송하지 못했습니다. 연결 상태와 응답 가능 시간을 확인해 주세요.",
        },
        { status: 502 },
      );
    }
  }

  const sentAt = new Date();
  const message = await database.$transaction(async (transaction) => {
    const storedMessage = await transaction.message.create({
      data: {
        conversationId: conversation.id,
        externalMessageId,
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
        bookmarkedAt: message.bookmarkedAt?.toISOString() ?? null,
        sentAt: message.sentAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
