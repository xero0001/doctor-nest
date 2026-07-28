import { generateText, Output } from "ai";
import { z } from "zod";

const DEFAULT_CHAT_COACH_MODEL = "google/gemini-3.5-flash-lite";

const chatCoachSchema = z.object({
  responseGuide: z.string().min(1),
  answerExample: z.string().min(1),
});

export type ChatCoachConversationMessage = {
  role: "customer" | "staff";
  content: string;
};

export type ChatCoachKnowledgeDocument = {
  title: string;
  content: string;
};

export function getChatCoachModel() {
  return (
    process.env.AI_GATEWAY_CHAT_COACH_MODEL ??
    process.env.AI_GATEWAY_TRANSLATION_MODEL ??
    DEFAULT_CHAT_COACH_MODEL
  );
}

export async function generateChatCoachSuggestion({
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
  const model = getChatCoachModel();
  const result = await generateText({
    model,
    output: Output.object({ schema: chatCoachSchema }),
    system:
      "병원 고객상담 직원을 돕는 AI 상담 코치입니다. 의료진을 대신해 진단하거나 치료 효과를 단정하지 말고, 고객의 문의 의도와 예약 전환에 필요한 다음 질문을 안내하세요. 제공된 상담백과사전 자료만 병원 고유의 시술·장비·효과·절차 정보 근거로 사용하고 자료에 없는 가격, 할인, 일정, 의료진, 효과를 만들지 마세요. 불명확한 정보는 확인이 필요하다고 표현하세요. responseGuide에는 직원이 확인하고 안내할 핵심을 간결한 한국어로 작성하세요. answerExample에는 직원이 고객에게 보낼 수 있는 정중하고 자연스러운 한국어 답변만 작성하세요. 답변은 곧바로 발송되지 않고 직원이 검토한 뒤 사용합니다.",
    prompt: JSON.stringify({
      treatmentTags,
      recentConversation: conversation,
      lastCustomerMessage,
      knowledgeBase: knowledgeDocuments,
    }),
    maxOutputTokens: 900,
    providerOptions: {
      gateway: {
        tags: ["chat-coach"],
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
