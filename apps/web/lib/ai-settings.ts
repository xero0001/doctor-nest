import { getDatabase } from "@doctornest/database";

export const DEFAULT_AI_CONTEXT_MESSAGE_COUNT = 10;
export const MIN_AI_CONTEXT_MESSAGE_COUNT = 1;
export const MAX_AI_CONTEXT_MESSAGE_COUNT = 50;
export const DEFAULT_AUTO_RESPONSE_DELAY_MINUTES = 5;
export const MIN_AUTO_RESPONSE_DELAY_MINUTES = 1;
export const MAX_AUTO_RESPONSE_DELAY_MINUTES = 1_440;

export type AISettings = {
  translationContextEnabled: boolean;
  translationContextMessageCount: number;
  chatCoachContextEnabled: boolean;
  chatCoachContextMessageCount: number;
  autoResponseContextEnabled: boolean;
  autoResponseContextMessageCount: number;
  autoResponseDelayMinutes: number;
};

function normalizeInteger(
  value: number,
  minimum: number,
  maximum: number,
  fallback: number,
) {
  if (!Number.isInteger(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

export async function getAISettings(hospitalId: string): Promise<AISettings> {
  const hospital = await getDatabase().hospital.findUnique({
    where: { id: hospitalId },
    select: {
      translationContextEnabled: true,
      translationContextMessageCount: true,
      chatCoachContextEnabled: true,
      chatCoachContextMessageCount: true,
      autoResponseContextEnabled: true,
      autoResponseContextMessageCount: true,
      autoResponseDelayMinutes: true,
    },
  });

  return {
    translationContextEnabled: hospital?.translationContextEnabled ?? true,
    translationContextMessageCount: normalizeInteger(
      hospital?.translationContextMessageCount ??
        DEFAULT_AI_CONTEXT_MESSAGE_COUNT,
      MIN_AI_CONTEXT_MESSAGE_COUNT,
      MAX_AI_CONTEXT_MESSAGE_COUNT,
      DEFAULT_AI_CONTEXT_MESSAGE_COUNT,
    ),
    chatCoachContextEnabled: hospital?.chatCoachContextEnabled ?? true,
    chatCoachContextMessageCount: normalizeInteger(
      hospital?.chatCoachContextMessageCount ??
        DEFAULT_AI_CONTEXT_MESSAGE_COUNT,
      MIN_AI_CONTEXT_MESSAGE_COUNT,
      MAX_AI_CONTEXT_MESSAGE_COUNT,
      DEFAULT_AI_CONTEXT_MESSAGE_COUNT,
    ),
    autoResponseContextEnabled: hospital?.autoResponseContextEnabled ?? true,
    autoResponseContextMessageCount: normalizeInteger(
      hospital?.autoResponseContextMessageCount ??
        DEFAULT_AI_CONTEXT_MESSAGE_COUNT,
      MIN_AI_CONTEXT_MESSAGE_COUNT,
      MAX_AI_CONTEXT_MESSAGE_COUNT,
      DEFAULT_AI_CONTEXT_MESSAGE_COUNT,
    ),
    autoResponseDelayMinutes: normalizeInteger(
      hospital?.autoResponseDelayMinutes ?? DEFAULT_AUTO_RESPONSE_DELAY_MINUTES,
      MIN_AUTO_RESPONSE_DELAY_MINUTES,
      MAX_AUTO_RESPONSE_DELAY_MINUTES,
      DEFAULT_AUTO_RESPONSE_DELAY_MINUTES,
    ),
  };
}
