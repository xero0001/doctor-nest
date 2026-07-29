import { getDatabase } from "@doctornest/database";

import type { TranslationContextMessage } from "@/lib/ai-translation";
import { getAISettings } from "@/lib/ai-settings";

export type TranslationContextSettings = {
  enabled: boolean;
  messageCount: number;
};

export async function getTranslationContextSettings(
  hospitalId: string,
): Promise<TranslationContextSettings> {
  const settings = await getAISettings(hospitalId);

  return {
    enabled: settings.translationContextEnabled,
    messageCount: settings.translationContextMessageCount,
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
