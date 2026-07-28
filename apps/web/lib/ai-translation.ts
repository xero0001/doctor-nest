import { generateText, Output } from "ai";
import { z } from "zod";

const KOREAN_CODE = "ko";
const KOREAN_NAME = "한국어";
const DEFAULT_TRANSLATION_MODEL = "google/gemini-3.5-flash-lite";

const incomingTranslationSchema = z.object({
  sourceLanguage: z.string().min(1).max(32),
  sourceLanguageName: z.string().min(1).max(64),
  koreanTranslation: z.string().min(1),
});

const outgoingTranslationSchema = z.object({
  translatedContent: z.string().min(1),
});

export type ChatTranslation = {
  sourceLanguage: string;
  sourceLanguageName: string;
  translatedContent: string;
  translatedLanguage: string;
  translatedLanguageName: string;
};

export type TranslationContextMessage = {
  role: "customer" | "staff";
  content: string;
};

export class ChatTranslationError extends Error {
  constructor(message = "AI 번역을 완료하지 못했습니다.") {
    super(message);
    this.name = "ChatTranslationError";
  }
}

function normalizeLanguageCode(value: string) {
  return value.trim().replace("_", "-");
}

export function isKoreanLanguage(value: string) {
  const normalized = normalizeLanguageCode(value).toLowerCase();
  return normalized === KOREAN_CODE || normalized.startsWith(`${KOREAN_CODE}-`);
}

function detectLanguageFallback(text: string) {
  if (/[가-힣]/.test(text)) {
    return { code: KOREAN_CODE, name: KOREAN_NAME };
  }
  if (/[ぁ-んァ-ヶ]/.test(text)) {
    return { code: "ja", name: "일본어" };
  }
  if (/[一-龯]/.test(text)) {
    return { code: "zh", name: "중국어" };
  }
  if (/[а-яА-ЯёЁ]/.test(text)) {
    return { code: "ru", name: "러시아어" };
  }
  return { code: "en", name: "영어" };
}

function languageName(code: string) {
  const normalized = normalizeLanguageCode(code);
  if (!normalized) return "";

  try {
    return (
      new Intl.DisplayNames(["ko"], { type: "language" }).of(normalized) ??
      normalized
    );
  } catch {
    return normalized;
  }
}

function gatewayOptions(
  direction: "inbound" | "outbound",
  hospitalId?: string,
) {
  return {
    gateway: {
      tags: ["chat-translation", direction],
      user: hospitalId,
    },
  };
}

export async function translateIncomingMessage(
  text: string,
  hospitalId?: string,
  context: TranslationContextMessage[] = [],
): Promise<ChatTranslation> {
  const fallback = detectLanguageFallback(text);

  if (isKoreanLanguage(fallback.code)) {
    return {
      sourceLanguage: KOREAN_CODE,
      sourceLanguageName: KOREAN_NAME,
      translatedContent: text,
      translatedLanguage: KOREAN_CODE,
      translatedLanguageName: KOREAN_NAME,
    };
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    console.warn("AI_GATEWAY_API_KEY가 없어 수신 메시지 번역을 건너뜁니다.");
    return {
      sourceLanguage: fallback.code,
      sourceLanguageName: fallback.name,
      translatedContent: isKoreanLanguage(fallback.code) ? text : "",
      translatedLanguage: KOREAN_CODE,
      translatedLanguageName: KOREAN_NAME,
    };
  }

  try {
    const { output } = await generateText({
      model:
        process.env.AI_GATEWAY_TRANSLATION_MODEL ?? DEFAULT_TRANSLATION_MODEL,
      output: Output.object({ schema: incomingTranslationSchema }),
      system:
        "병원 고객채팅 전문 번역가입니다. 고객 메시지의 언어를 감지하고 자연스럽고 정확한 한국어로 번역합니다. 진료·시술명, 의약품명, 장비명, 브랜드명, 의료진명, 날짜, 시간, 수치와 존칭을 보존하세요. 진단이나 의학적 판단을 추정하지 말고 부정, 가능성, 불확실성을 원문 그대로 유지하세요. 의료 조언을 새로 만들거나 원문에 없는 내용을 추가하지 마세요. 이전 대화는 현재 메시지의 지칭, 생략된 표현과 용어를 이해하기 위한 참고자료일 뿐이며 번역 결과에는 현재 메시지만 포함하세요. sourceLanguage에는 BCP-47 언어 코드, sourceLanguageName에는 한국어 언어명을 반환하세요.",
      prompt:
        context.length > 0
          ? JSON.stringify({
              previousMessagesForContextOnly: context,
              currentMessageToTranslate: text,
            })
          : text,
      temperature: 0,
      maxOutputTokens: 500,
      providerOptions: gatewayOptions("inbound", hospitalId),
    });

    const sourceLanguage =
      normalizeLanguageCode(output.sourceLanguage) || fallback.code;
    const sourceLanguageName =
      output.sourceLanguageName.trim() || fallback.name;

    return {
      sourceLanguage,
      sourceLanguageName,
      translatedContent: isKoreanLanguage(sourceLanguage)
        ? text
        : output.koreanTranslation.trim(),
      translatedLanguage: KOREAN_CODE,
      translatedLanguageName: KOREAN_NAME,
    };
  } catch (error) {
    console.warn("수신 메시지 AI 번역에 실패했습니다.", error);
    return {
      sourceLanguage: fallback.code,
      sourceLanguageName: fallback.name,
      translatedContent: isKoreanLanguage(fallback.code) ? text : "",
      translatedLanguage: KOREAN_CODE,
      translatedLanguageName: KOREAN_NAME,
    };
  }
}

export async function translateStaffReply(
  text: string,
  targetLanguage: string,
  hospitalId?: string,
  context: TranslationContextMessage[] = [],
): Promise<ChatTranslation> {
  const normalizedTarget = normalizeLanguageCode(targetLanguage);
  const targetLanguageName = languageName(normalizedTarget);

  if (!normalizedTarget || isKoreanLanguage(normalizedTarget)) {
    return {
      sourceLanguage: KOREAN_CODE,
      sourceLanguageName: KOREAN_NAME,
      translatedContent: text,
      translatedLanguage: KOREAN_CODE,
      translatedLanguageName: KOREAN_NAME,
    };
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new ChatTranslationError(
      "AI Gateway 설정이 없어 고객 언어로 번역할 수 없습니다.",
    );
  }

  try {
    const { output } = await generateText({
      model:
        process.env.AI_GATEWAY_TRANSLATION_MODEL ?? DEFAULT_TRANSLATION_MODEL,
      output: Output.object({ schema: outgoingTranslationSchema }),
      system:
        "병원 고객채팅 전문 번역가입니다. 상담사가 작성한 한국어 답장을 지정된 고객 언어로 자연스럽고 정중하게 번역하세요. 진료·시술명, 의약품명, 장비명, 브랜드명, 의료진명, 날짜, 시간, 수치와 존칭을 보존하세요. 진단이나 의학적 판단을 추정하지 말고 부정, 가능성, 불확실성을 원문 그대로 유지하세요. 의료 조언을 새로 만들거나 원문에 없는 내용을 추가하지 마세요. 이전 대화는 현재 메시지의 지칭, 생략된 표현과 용어를 이해하기 위한 참고자료일 뿐이며 번역 결과에는 현재 메시지만 포함하세요.",
      prompt: JSON.stringify({
        targetLanguage: normalizedTarget,
        targetLanguageName,
        ...(context.length > 0
          ? { previousMessagesForContextOnly: context }
          : {}),
        currentMessageToTranslate: text,
      }),
      temperature: 0,
      maxOutputTokens: 500,
      providerOptions: gatewayOptions("outbound", hospitalId),
    });

    return {
      sourceLanguage: KOREAN_CODE,
      sourceLanguageName: KOREAN_NAME,
      translatedContent: output.translatedContent.trim(),
      translatedLanguage: normalizedTarget,
      translatedLanguageName: targetLanguageName,
    };
  } catch (error) {
    console.error("발신 메시지 AI 번역에 실패했습니다.", error);
    throw new ChatTranslationError();
  }
}
