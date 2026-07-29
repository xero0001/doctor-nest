import { generateText, Output } from "ai";
import { z } from "zod";

import type {
  ChatCoachConversationMessage,
  ChatCoachKnowledgeDocument,
} from "@/lib/ai-chat-coach";

const DEFAULT_AUTO_RESPONSE_MODEL = "google/gemini-3.5-flash-lite";

const autoResponseSchema = z.object({
  reply: z.string().min(1).max(4_000),
});

export function getAutoResponseModel() {
  return (
    process.env.AI_GATEWAY_AUTO_RESPONSE_MODEL ??
    process.env.AI_GATEWAY_CHAT_COACH_MODEL ??
    process.env.AI_GATEWAY_TRANSLATION_MODEL ??
    DEFAULT_AUTO_RESPONSE_MODEL
  );
}

export async function generateAutoResponse({
  hospitalId,
  treatmentTags,
  conversation,
  lastCustomerMessage,
  knowledgeDocuments,
}: {
  hospitalId: string;
  treatmentTags: string[];
  conversation: ChatCoachConversationMessage[];
  lastCustomerMessage: string;
  knowledgeDocuments: ChatCoachKnowledgeDocument[];
}) {
  const model = getAutoResponseModel();
  const result = await generateText({
    model,
    output: Output.object({ schema: autoResponseSchema }),
    system:
      "병원 고객상담 채널의 자동 응대 담당자입니다. 고객에게 바로 발송될 답변이므로 짧고 정중하며 자연스러운 한국어로 답하세요. 의료진을 대신해 진단하거나 치료 효과·적합성·부작용을 단정하지 마세요. 진료 판단이 필요한 질문은 의료진 확인이 필요하다고 안내하고 상담 또는 예약으로 연결하세요. 제공된 상담백과사전만 병원 고유의 시술·장비·효과·절차 정보 근거로 사용하고, 자료에 없는 가격·할인·일정·의료진·효과를 만들지 마세요. 확인되지 않은 정보는 담당자 확인 후 안내하겠다고 표현하세요. 이전 대화는 고객의 의도와 생략된 표현을 이해하는 참고자료로만 사용하세요. 인사말을 불필요하게 반복하지 말고 답변 본문만 반환하세요.",
    prompt: JSON.stringify({
      treatmentTags,
      recentConversation: conversation,
      lastCustomerMessage,
      knowledgeBase: knowledgeDocuments,
    }),
    maxOutputTokens: 700,
    providerOptions: {
      gateway: {
        tags: ["auto-response"],
        user: hospitalId,
      },
    },
  });

  return {
    model,
    output: result.output,
    usage: result.usage,
  };
}
