import { getDatabase } from "@doctornest/database";

import {
  generateChatCoachSuggestion,
  getChatCoachModel,
} from "@/lib/ai-chat-coach";
import { getAISettings } from "@/lib/ai-settings";
import { getCurrentUser } from "@/lib/auth";
import { serializeChatCoachGeneration } from "@/lib/chat-coach-generation";
import {
  buildKnowledgeContext,
  retrieveKnowledgeDocuments,
} from "@/lib/chat-knowledge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const PENDING_GENERATION_TIMEOUT_MS = 2 * 60 * 1_000;

function generationResponse(generation: {
  id: string;
  sourceMessageId: string;
  responseGuide: string | null;
  answerExample: string | null;
  model: string;
  sources: unknown;
  createdAt: Date;
}) {
  return Response.json(serializeChatCoachGeneration(generation), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return Response.json(
      { error: "AI 상담 코치 설정이 필요합니다." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const database = getDatabase();
  const aiSettings = await getAISettings(user.hospitalId);
  const [conversation, allDocuments] = await Promise.all([
    database.conversation.findFirst({
      where: {
        id,
        hospitalId: user.hospitalId,
      },
      select: {
        patient: {
          select: {
            tagAssignments: {
              where: { tag: { category: "TREATMENT" } },
              select: { tag: { select: { name: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        messages: {
          where: { sender: { in: ["CUSTOMER", "STAFF", "AI"] } },
          select: {
            id: true,
            sender: true,
            content: true,
            translatedContent: true,
          },
          orderBy: [{ sentAt: "desc" }, { id: "desc" }],
          take: aiSettings.chatCoachContextEnabled
            ? aiSettings.chatCoachContextMessageCount
            : 1,
        },
      },
    }),
    database.manualDocument.findMany({
      where: {
        hospitalId: user.hospitalId,
        isActive: true,
        folder: { isActive: true },
      },
      select: {
        id: true,
        title: true,
        contentMarkdown: true,
        cautionMarkdown: true,
        cautionEnabled: true,
        tags: {
          select: { tag: { select: { name: true } } },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      take: 100,
    }),
  ]);

  if (!conversation) {
    return Response.json(
      { error: "채팅을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const lastCustomerMessage = conversation.messages.find(
    (message) => message.sender === "CUSTOMER",
  );

  if (!lastCustomerMessage) {
    return Response.json(
      { error: "분석할 고객 메시지가 없습니다." },
      { status: 409 },
    );
  }

  const generationKey = {
    conversationId_sourceMessageId: {
      conversationId: id,
      sourceMessageId: lastCustomerMessage.id,
    },
  };
  const existingGeneration = await database.chatCoachGeneration.findUnique({
    where: generationKey,
  });

  if (
    existingGeneration?.status === "COMPLETED" &&
    existingGeneration.responseGuide &&
    existingGeneration.answerExample
  ) {
    return generationResponse(existingGeneration);
  }

  if (
    existingGeneration?.status === "PENDING" &&
    Date.now() - existingGeneration.updatedAt.getTime() <
      PENDING_GENERATION_TIMEOUT_MS
  ) {
    return Response.json(
      { error: "AI 응대 가이드를 생성하고 있습니다." },
      { status: 409 },
    );
  }

  const treatmentTags = (conversation.patient?.tagAssignments ?? []).map(
    ({ tag }) => tag.name,
  );
  const customerMessage =
    lastCustomerMessage.translatedContent || lastCustomerMessage.content;
  const retrievedDocuments = retrieveKnowledgeDocuments(
    allDocuments.map((document) => ({
      ...document,
      contentMarkdown:
        document.cautionEnabled && document.cautionMarkdown
          ? `${document.contentMarkdown}\n\n## 주의사항\n${document.cautionMarkdown}`
          : document.contentMarkdown,
    })),
    treatmentTags,
    customerMessage,
  );
  const knowledgeDocuments = buildKnowledgeContext(retrievedDocuments);
  const recentConversation = conversation.messages
    .slice()
    .reverse()
    .map((message) => ({
      role:
        message.sender === "CUSTOMER"
          ? ("customer" as const)
          : ("staff" as const),
      content:
        message.sender === "CUSTOMER"
          ? message.translatedContent || message.content
          : message.content,
    }));
  const sources = retrievedDocuments.map((document) => ({
    id: document.id,
    title: document.title,
  }));
  const generationData = {
    hospitalId: user.hospitalId,
    conversationId: id,
    sourceMessageId: lastCustomerMessage.id,
    requestedById: user.id,
    model: getChatCoachModel(),
    status: "PENDING" as const,
    sourceSnapshot: customerMessage,
    treatmentTags,
    knowledgeDocumentIds: retrievedDocuments.map((document) => document.id),
    sources,
    responseGuide: null,
    answerExample: null,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    errorMessage: null,
  };
  let generationId: string;

  if (existingGeneration) {
    const generation = await database.chatCoachGeneration.update({
      where: { id: existingGeneration.id },
      data: generationData,
      select: { id: true },
    });
    generationId = generation.id;
  } else {
    try {
      const generation = await database.chatCoachGeneration.create({
        data: generationData,
        select: { id: true },
      });
      generationId = generation.id;
    } catch {
      const concurrentGeneration =
        await database.chatCoachGeneration.findUnique({
          where: generationKey,
        });

      if (
        concurrentGeneration?.status === "COMPLETED" &&
        concurrentGeneration.responseGuide &&
        concurrentGeneration.answerExample
      ) {
        return generationResponse(concurrentGeneration);
      }

      return Response.json(
        { error: "AI 응대 가이드를 생성하고 있습니다." },
        { status: 409 },
      );
    }
  }

  try {
    const result = await generateChatCoachSuggestion({
      hospitalId: user.hospitalId,
      treatmentTags,
      conversation: recentConversation,
      lastCustomerMessage: customerMessage,
      knowledgeDocuments,
    });
    const completedGeneration = await database.chatCoachGeneration.update({
      where: { id: generationId },
      data: {
        status: "COMPLETED",
        model: result.model,
        responseGuide: result.output.responseGuide.trim(),
        answerExample: result.output.answerExample.trim(),
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        errorMessage: null,
      },
    });

    return generationResponse(completedGeneration);
  } catch (error) {
    console.error("AI 상담 코치 생성에 실패했습니다.", error);
    await database.chatCoachGeneration
      .update({
        where: { id: generationId },
        data: {
          status: "FAILED",
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 1_000)
              : "알 수 없는 생성 오류",
        },
      })
      .catch((persistenceError) => {
        console.error(
          "AI 상담 코치 실패 상태 저장에 실패했습니다.",
          persistenceError,
        );
      });

    return Response.json(
      { error: "응대 가이드와 답변 예시를 생성하지 못했습니다." },
      { status: 502 },
    );
  }
}
