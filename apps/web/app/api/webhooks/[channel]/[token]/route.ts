import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { getDatabase } from "@doctornest/database";
import { after } from "next/server";

import { translateIncomingMessage } from "@/lib/ai-translation";
import { decryptLineCredentials } from "@/lib/channel-credentials";
import { getTranslationContext } from "@/lib/translation-context";

const supportedChannels = [
  "KAKAO",
  "LINE",
  "NAVER_TALK",
  "WECHAT",
  "WHATSAPP",
  "INSTAGRAM",
] as const;

type SupportedChannel = (typeof supportedChannels)[number];

type InboundEvent = {
  externalCustomerId?: string;
  externalThreadId?: string;
  externalMessageId?: string;
  chartNumber?: string;
  customerName?: string;
  phone?: string;
  email?: string;
  gender?: string;
  birthDate?: string;
  language?: string;
  message?: string;
  sentAt?: string;
};

type LineWebhookEvent = {
  type?: string;
  timestamp?: number;
  webhookEventId?: string;
  source?: {
    userId?: string;
  };
  message?: {
    id?: string;
    type?: string;
    text?: string;
  };
};

type LineWebhookPayload = {
  events?: LineWebhookEvent[];
};

type RouteContext = {
  params: Promise<{ channel: string; token: string }>;
};

type WebhookConnection = {
  id: string;
  hospitalId: string;
  credentialsEncrypted: string | null;
};

type PersistedInboundEvent = {
  patientId: string;
  patientChannelId: string;
  conversationId: string;
  messageId: string;
  matchedBy: "CHANNEL" | "CHART_NUMBER" | "PHONE" | "NEW";
  duplicate: boolean;
};

function isSupportedChannel(channel: string): channel is SupportedChannel {
  return supportedChannels.some((supported) => supported === channel);
}

function normalizePhone(phone: string | undefined) {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0082")) digits = digits.slice(2);
  if (digits.startsWith("82") && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  }

  return digits || null;
}

function parseJson<T>(rawBody: string) {
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return null;
  }
}

function hasValidLineSignature(
  rawBody: string,
  signature: string,
  channelSecret: string,
) {
  const expectedSignature = createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest();
  const receivedSignature = Buffer.from(signature, "base64");

  return (
    expectedSignature.length === receivedSignature.length &&
    timingSafeEqual(expectedSignature, receivedSignature)
  );
}

async function getLineDisplayName(userId: string, accessToken: string) {
  if (!accessToken) return undefined;

  const response = await fetch(
    `https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response?.ok) return undefined;

  const profile = (await response.json().catch(() => null)) as {
    displayName?: string;
  } | null;

  return profile?.displayName?.trim() || undefined;
}

async function persistInboundEvent(
  connection: WebhookConnection,
  channel: SupportedChannel,
  event: InboundEvent,
): Promise<PersistedInboundEvent> {
  const externalCustomerId = event.externalCustomerId?.trim();
  const message = event.message?.trim();

  if (!externalCustomerId || !message) {
    throw new Error(
      "externalCustomerId와 message가 포함된 정규화 이벤트가 필요합니다.",
    );
  }

  const externalThreadId = event.externalThreadId?.trim() || externalCustomerId;
  const sentAt = event.sentAt ? new Date(event.sentAt) : new Date();
  const birthDate = event.birthDate ? new Date(event.birthDate) : null;

  if (Number.isNaN(sentAt.getTime())) {
    throw new Error("sentAt 형식이 올바르지 않습니다.");
  }

  if (birthDate && Number.isNaN(birthDate.getTime())) {
    throw new Error("birthDate 형식이 올바르지 않습니다.");
  }

  const phone = event.phone?.trim() || null;
  const phoneNormalized = normalizePhone(phone ?? undefined);
  const chartNumber = event.chartNumber?.trim();
  const database = getDatabase();

  return database.$transaction(async (transaction) => {
    const existingPatientChannel = await transaction.patientChannel.findUnique({
      where: {
        hospitalId_channel_externalCustomerId: {
          hospitalId: connection.hospitalId,
          channel,
          externalCustomerId,
        },
      },
      include: { patient: true },
    });

    let patient = existingPatientChannel?.patient ?? null;
    let matchedBy: "CHANNEL" | "CHART_NUMBER" | "PHONE" | "NEW" =
      existingPatientChannel ? "CHANNEL" : "NEW";

    if (!patient && chartNumber) {
      patient = await transaction.patient.findUnique({
        where: {
          hospitalId_chartNumber: {
            hospitalId: connection.hospitalId,
            chartNumber,
          },
        },
      });
      if (patient) matchedBy = "CHART_NUMBER";
    }

    if (!patient && phoneNormalized) {
      patient = await transaction.patient.findFirst({
        where: {
          hospitalId: connection.hospitalId,
          OR: [
            { phoneNormalized },
            {
              channels: {
                some: { phoneNormalized },
              },
            },
          ],
        },
        orderBy: { createdAt: "asc" },
      });
      if (patient) matchedBy = "PHONE";
    }

    if (patient) {
      patient = await transaction.patient.update({
        where: { id: patient.id },
        data: {
          name: event.customerName?.trim() || undefined,
          phone: phone ?? undefined,
          phoneNormalized: phoneNormalized ?? undefined,
          email: event.email?.trim() || undefined,
          gender: event.gender?.trim() || undefined,
          birthDate: birthDate ?? undefined,
          language: event.language?.trim() || undefined,
        },
      });
    } else {
      patient = await transaction.patient.create({
        data: {
          hospitalId: connection.hospitalId,
          chartNumber:
            chartNumber ?? `AUTO-${randomUUID().slice(0, 8).toUpperCase()}`,
          name: event.customerName?.trim() || `${channel} 환자`,
          phone,
          phoneNormalized,
          email: event.email?.trim() || null,
          gender: event.gender?.trim() || null,
          birthDate,
          language: event.language?.trim() || "ko",
          legacyTags: [],
        },
      });
    }

    const patientChannel = await transaction.patientChannel.upsert({
      where: {
        hospitalId_channel_externalCustomerId: {
          hospitalId: connection.hospitalId,
          channel,
          externalCustomerId,
        },
      },
      update: {
        patientId: patient.id,
        displayName: event.customerName?.trim() || undefined,
        phone: phone ?? undefined,
        phoneNormalized: phoneNormalized ?? undefined,
      },
      create: {
        hospitalId: connection.hospitalId,
        patientId: patient.id,
        channel,
        externalCustomerId,
        displayName: event.customerName?.trim() || null,
        phone,
        phoneNormalized,
      },
    });

    const externalMessageId = event.externalMessageId?.trim();
    const conversationKey = {
      hospitalId: connection.hospitalId,
      channel,
      externalThreadId,
    };
    const existingConversation = await transaction.conversation.findUnique({
      where: {
        hospitalId_channel_externalThreadId: conversationKey,
      },
    });

    if (existingConversation && externalMessageId) {
      const existingMessage = await transaction.message.findUnique({
        where: {
          conversationId_externalMessageId: {
            conversationId: existingConversation.id,
            externalMessageId,
          },
        },
      });

      if (existingMessage) {
        return {
          patientId: patient.id,
          patientChannelId: patientChannel.id,
          conversationId: existingConversation.id,
          messageId: existingMessage.id,
          matchedBy,
          duplicate: true,
        };
      }
    }

    const conversation = existingConversation
      ? await transaction.conversation.update({
          where: { id: existingConversation.id },
          data: {
            patientId: patient.id,
            patientChannelId: patientChannel.id,
            status: "OPEN",
            unreadCount: { increment: 1 },
            lastMessageAt: sentAt,
          },
        })
      : await transaction.conversation.create({
          data: {
            ...conversationKey,
            patientId: patient.id,
            patientChannelId: patientChannel.id,
            unreadCount: 1,
            lastMessageAt: sentAt,
          },
        });

    const storedMessage = await transaction.message.create({
      data: {
        conversationId: conversation.id,
        externalMessageId: externalMessageId || null,
        direction: "INBOUND",
        sender: "CUSTOMER",
        content: message,
        sentAt,
      },
    });

    return {
      patientId: patient.id,
      patientChannelId: patientChannel.id,
      conversationId: conversation.id,
      messageId: storedMessage.id,
      matchedBy,
      duplicate: false,
    };
  });
}

function scheduleInboundTranslation(
  connection: WebhookConnection,
  result: PersistedInboundEvent,
  content: string,
) {
  if (result.duplicate) return;

  after(async () => {
    const context = await getTranslationContext({
      hospitalId: connection.hospitalId,
      conversationId: result.conversationId,
      excludeMessageId: result.messageId,
    });
    const translation = await translateIncomingMessage(
      content,
      connection.hospitalId,
      context,
    );
    const shouldUpdatePatientLanguage =
      translation.sourceLanguage &&
      translation.sourceLanguage.toLowerCase() !== "und";
    const database = getDatabase();

    await database.$transaction([
      database.message.update({
        where: { id: result.messageId },
        data: {
          sourceLanguage: translation.sourceLanguage,
          sourceLanguageName: translation.sourceLanguageName,
          translatedContent: translation.translatedContent,
          translatedLanguage: translation.translatedLanguage,
          translatedLanguageName: translation.translatedLanguageName,
        },
      }),
      ...(shouldUpdatePatientLanguage
        ? [
            database.patient.update({
              where: { id: result.patientId },
              data: { language: translation.sourceLanguage },
            }),
          ]
        : []),
    ]);
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { channel, token } = await params;

  if (!isSupportedChannel(channel)) {
    return Response.json({ error: "Unknown channel" }, { status: 404 });
  }

  const connection = await getDatabase().channelConnection.findFirst({
    where: {
      channel,
      webhookToken: token,
    },
    select: {
      id: true,
      hospitalId: true,
      credentialsEncrypted: true,
    },
  });

  if (!connection) {
    return Response.json({ error: "Unknown webhook" }, { status: 404 });
  }

  const rawBody = await request.text();

  if (channel === "LINE") {
    if (!connection.credentialsEncrypted) {
      return Response.json(
        { error: "LINE 자격증명이 등록되지 않았습니다." },
        { status: 503 },
      );
    }

    let credentials;
    try {
      credentials = decryptLineCredentials(connection.credentialsEncrypted);
    } catch {
      return Response.json(
        { error: "LINE 자격증명을 읽지 못했습니다." },
        { status: 503 },
      );
    }

    const signature = request.headers.get("x-line-signature");
    if (
      !signature ||
      !hasValidLineSignature(rawBody, signature, credentials.channelSecret)
    ) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = parseJson<LineWebhookPayload>(rawBody);
    if (!payload || !Array.isArray(payload.events)) {
      return Response.json({ error: "Invalid LINE webhook" }, { status: 400 });
    }

    const results = [];
    for (const lineEvent of payload.events) {
      if (
        lineEvent.type !== "message" ||
        lineEvent.message?.type !== "text" ||
        !lineEvent.message.text ||
        !lineEvent.source?.userId
      ) {
        continue;
      }

      const customerName = await getLineDisplayName(
        lineEvent.source.userId,
        credentials.channelAccessToken,
      );
      const result = await persistInboundEvent(connection, channel, {
        externalCustomerId: lineEvent.source.userId,
        externalThreadId: lineEvent.source.userId,
        externalMessageId: lineEvent.message.id ?? lineEvent.webhookEventId,
        customerName,
        message: lineEvent.message.text,
        sentAt: lineEvent.timestamp
          ? new Date(lineEvent.timestamp).toISOString()
          : undefined,
      });
      results.push(result);
      scheduleInboundTranslation(connection, result, lineEvent.message.text);
    }

    await getDatabase().channelConnection.update({
      where: { id: connection.id },
      data: {
        status: "CONNECTED",
        connectedAt: new Date(),
      },
    });

    return Response.json({ received: true, processed: results.length });
  }

  const event = parseJson<InboundEvent>(rawBody);
  if (!event) {
    return Response.json(
      { error: "올바른 JSON 이벤트가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const result = await persistInboundEvent(connection, channel, event);
    scheduleInboundTranslation(connection, result, event.message!.trim());
    return Response.json({ received: true, ...result }, { status: 202 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이벤트를 처리하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
