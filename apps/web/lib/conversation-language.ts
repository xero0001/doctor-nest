export const translationLanguageOptions = [
  { value: "en", label: "영어" },
  { value: "ja", label: "일본어" },
  { value: "zh", label: "중국어" },
  { value: "ko", label: "한국어" },
] as const;

export type TranslationTargetLanguage =
  (typeof translationLanguageOptions)[number]["value"];

type LanguageMessage = {
  direction?: "INBOUND" | "OUTBOUND";
  sourceLanguage: string;
  content: string;
};

export function normalizeTranslationTargetLanguage(
  value: unknown,
): TranslationTargetLanguage | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace("_", "-").toLowerCase();
  if (!normalized) return null;
  if (normalized === "ko" || normalized.startsWith("ko-")) return "ko";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "ja" || normalized.startsWith("ja-")) return "ja";
  if (
    normalized === "zh" ||
    normalized.startsWith("zh-") ||
    normalized === "cmn" ||
    normalized.startsWith("cmn-")
  ) {
    return "zh";
  }
  return null;
}

function detectSupportedLanguage(content: string) {
  if (/[가-힣]/.test(content)) return "ko" as const;
  if (/[ぁ-んァ-ヶ]/.test(content)) return "ja" as const;
  if (/[一-龯]/.test(content)) return "zh" as const;
  if (/[A-Za-z]/.test(content)) return "en" as const;
  return null;
}

export function inferConversationTargetLanguage(
  messages: LanguageMessage[],
  fallbackLanguage?: string | null,
): TranslationTargetLanguage {
  const counts = new Map<TranslationTargetLanguage, number>();
  const firstSeen = new Map<TranslationTargetLanguage, number>();

  messages.forEach((message, index) => {
    if (message.direction === "OUTBOUND") return;

    const language =
      normalizeTranslationTargetLanguage(message.sourceLanguage) ??
      detectSupportedLanguage(message.content);
    if (!language) return;

    counts.set(language, (counts.get(language) ?? 0) + 1);
    if (!firstSeen.has(language)) firstSeen.set(language, index);
  });

  const inferredLanguage = Array.from(counts.keys()).sort((left, right) => {
    const countDifference = (counts.get(right) ?? 0) - (counts.get(left) ?? 0);
    if (countDifference !== 0) return countDifference;
    return (firstSeen.get(left) ?? 0) - (firstSeen.get(right) ?? 0);
  })[0];

  return (
    inferredLanguage ??
    normalizeTranslationTargetLanguage(fallbackLanguage) ??
    "ko"
  );
}
