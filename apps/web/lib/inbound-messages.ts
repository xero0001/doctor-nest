import { getDatabase } from "@doctornest/database";
import { after } from "next/server";

import { translateIncomingMessage } from "@/lib/ai-translation";
import { getTranslationContext } from "@/lib/translation-context";

export type SupportedChannel =
  "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM";

export type InboundEvent = {
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

export type WebhookConnection = {
  id: string;
  hospitalId: string;
  credentialsEncrypted: string | null;
};

export type PersistedInboundEvent = {
  patientId: string | null;
  patientChannelId: string;
  conversationId: string;
  messageId: string;
  matchedBy: "CHANNEL" | "CHART_NUMBER" | "PHONE" | "UNLINKED";
  duplicate: boolean;
};

function normalizePhone(phone: string | undefined) {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0082")) digits = digits.slice(2);
  if (digits.startsWith("82") && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  }

  return digits || null;
}

export async function persistInboundEvent(
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
    let matchedBy: PersistedInboundEvent["matchedBy"] =
      existingPatientChannel?.patient ? "CHANNEL" : "UNLINKED";

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
      const phoneMatches = await transaction.patient.findMany({
        where: {
          hospitalId: connection.hospitalId,
          phoneNormalized,
        },
        orderBy: { createdAt: "asc" },
        take: 2,
      });
      if (phoneMatches.length === 1) {
        patient = phoneMatches[0];
        matchedBy = "PHONE";
      }
    }

    const shouldBecomePrimary = patient
      ? existingPatientChannel?.patientId === patient.id
        ? existingPatientChannel.isPrimary
        : (await transaction.patientChannel.count({
            where: { patientId: patient.id, isPrimary: true },
          })) === 0
      : false;

    const patientChannel = await transaction.patientChannel.upsert({
      where: {
        hospitalId_channel_externalCustomerId: {
          hospitalId: connection.hospitalId,
          channel,
          externalCustomerId,
        },
      },
      update: {
        ...(patient
          ? {
              patientId: patient.id,
              isPrimary: shouldBecomePrimary,
              linkMethod: "AUTO" as const,
              linkedAt: new Date(),
            }
          : {}),
        displayName: event.customerName?.trim() || undefined,
        phone: phone ?? undefined,
        phoneNormalized: phoneNormalized ?? undefined,
      },
      create: {
        hospitalId: connection.hospitalId,
        patientId: patient?.id ?? null,
        channel,
        externalCustomerId,
        displayName: event.customerName?.trim() || null,
        phone,
        phoneNormalized,
        isPrimary: shouldBecomePrimary,
        linkMethod: patient ? "AUTO" : null,
        linkedAt: patient ? new Date() : null,
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
          patientId: patient?.id ?? null,
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
            patientId: patient?.id ?? null,
            patientChannelId: patientChannel.id,
            status: "OPEN",
            unreadCount: { increment: 1 },
            lastMessageAt: sentAt,
          },
        })
      : await transaction.conversation.create({
          data: {
            ...conversationKey,
            patientId: patient?.id ?? null,
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
      patientId: patient?.id ?? null,
      patientChannelId: patientChannel.id,
      conversationId: conversation.id,
      messageId: storedMessage.id,
      matchedBy,
      duplicate: false,
    };
  });
}

export function scheduleInboundTranslation(
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
      ...(shouldUpdatePatientLanguage && result.patientId
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
