import { getDatabase } from "@doctornest/database";

import type { TranslationContextMessage } from "@/lib/ai-translation";

export const DEFAULT_TRANSLATION_CONTEXT_MESSAGE_COUNT = 10;
export const MIN_TRANSLATION_CONTEXT_MESSAGE_COUNT = 1;
export const MAX_TRANSLATION_CONTEXT_MESSAGE_COUNT = 50;

export type TranslationContextSettings = {
  enabled: boolean;
  messageCount: number;
};

function normalizeMessageCount(value: number) {
  if (!Number.isInteger(value)) {
    return DEFAULT_TRANSLATION_CONTEXT_MESSAGE_COUNT;
  }

  return Math.min(
    MAX_TRANSLATION_CONTEXT_MESSAGE_COUNT,
    Math.max(MIN_TRANSLATION_CONTEXT_MESSAGE_COUNT, value),
  );
}

export async function getTranslationContextSettings(
  hospitalId: string,
): Promise<TranslationContextSettings> {
  const hospital = await getDatabase().hospital.findUnique({
    where: { id: hospitalId },
    select: {
      translationContextEnabled: true,
      translationContextMessageCount: true,
    },
  });

  return {
    enabled: hospital?.translationContextEnabled ?? true,
    messageCount: normalizeMessageCount(
      hospital?.translationContextMessageCount ??
        DEFAULT_TRANSLATION_CONTEXT_MESSAGE_COUNT,
    ),
  };
}

export async function getTranslationContext({
  hospitalId,
  conversationId,
  excludeMessageId,
}: {
  hospitalId: string;
  conversationId: string;
  excludeMessageId?: string;
}): Promise<TranslationContextMessage[]> {
  const settings = await getTranslationContextSettings(hospitalId);

  if (!settings.enabled) {
    return [];
  }

  const messages = await getDatabase().message.findMany({
    where: {
      conversationId,
      ...(excludeMessageId ? { id: { not: excludeMessageId } } : {}),
      sender: { in: ["CUSTOMER", "STAFF"] },
      conversation: { hospitalId },
    },
    select: {
      sender: true,
      content: true,
      translatedContent: true,
    },
    orderBy: [{ sentAt: "desc" }, { id: "desc" }],
    take: settings.messageCount,
  });

  return messages.reverse().map((message) => ({
    role: message.sender === "CUSTOMER" ? "customer" : "staff",
    content:
      message.sender === "STAFF"
        ? message.translatedContent || message.content
        : message.content,
  }));
}
