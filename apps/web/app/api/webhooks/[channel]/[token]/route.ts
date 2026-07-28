import { randomUUID } from "node:crypto";

import { getDatabase } from "@doctornest/database";

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

type RouteContext = {
  params: Promise<{ channel: string; token: string }>;
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
    select: { id: true, hospitalId: true },
  });

  if (!connection) {
    return Response.json({ error: "Unknown webhook" }, { status: 404 });
  }

  const event = (await request.json().catch(() => null)) as InboundEvent | null;
  const externalCustomerId = event?.externalCustomerId?.trim();
  const message = event?.message?.trim();

  if (!event || !externalCustomerId || !message) {
    return Response.json(
      {
        error:
          "externalCustomerId와 message가 포함된 정규화 이벤트가 필요합니다.",
      },
      { status: 400 },
    );
  }

  const externalThreadId =
    event.externalThreadId?.trim() || externalCustomerId;
  const sentAt = event.sentAt ? new Date(event.sentAt) : new Date();
  const birthDate = event.birthDate ? new Date(event.birthDate) : null;

  if (Number.isNaN(sentAt.getTime())) {
    return Response.json(
      { error: "sentAt 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (birthDate && Number.isNaN(birthDate.getTime())) {
    return Response.json(
      { error: "birthDate 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const phone = event.phone?.trim() || null;
  const phoneNormalized = normalizePhone(phone ?? undefined);
  const chartNumber = event.chartNumber?.trim();
  const database = getDatabase();

  const result = await database.$transaction(async (transaction) => {
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
    };
  });

  return Response.json({ received: true, ...result }, { status: 202 });
}
