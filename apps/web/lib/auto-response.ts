import { getDatabase } from "@doctornest/database";

import {
  generateAutoResponse,
  getAutoResponseModel,
} from "@/lib/ai-auto-response";
import { translateStaffReply } from "@/lib/ai-translation";
import {
  buildKnowledgeContext,
  retrieveKnowledgeDocuments,
} from "@/lib/chat-knowledge";
import { sendChannelTextMessage } from "@/lib/send-channel-message";
import { getTranslationContext } from "@/lib/translation-context";

const MAX_AUTO_RESPONSES_PER_RUN = 10;
const CANDIDATE_SCAN_LIMIT = 100;
const AUTO_RESPONSE_CONCURRENCY = 5;
const STALE_PENDING_TIMEOUT_MS = 5 * 60 * 1_000;

type AutoResponseRunResult = {
  conversationId: string;
  status: "completed" | "skipped" | "failed";
  detail: string;
};

function isCustomerMessage(message: { sender: string; direction: string }) {
  return message.sender === "CUSTOMER" && message.direction === "INBOUND";
}

async function cancelGeneration(id: string, detail: string) {
  await getDatabase().autoResponseGeneration.update({
    where: { id },
    data: {
      status: "CANCELLED",
      errorMessage: detail.slice(0, 1_000),
    },
  });
}

async function failGeneration(id: string, error: unknown) {
  const detail =
    error instanceof Error ? error.message : "알 수 없는 자동 응대 오류";
  await getDatabase()
    .autoResponseGeneration.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage: detail.slice(0, 1_000),
      },
    })
    .catch((persistenceError) => {
      console.error(
        "자동 응대 실패 상태 저장에 실패했습니다.",
        persistenceError,
      );
    });
  return detail;
}

async function finalizeDeliveredResponse(generation: {
  id: string;
  conversationId: string;
  generatedContent: string | null;
  deliveredContent: string | null;
  translatedLanguage: string;
  translatedLanguageName: string;
  externalMessageId: string | null;
  sentAt: Date | null;
}) {
  if (
    !generation.generatedContent ||
    !generation.deliveredContent ||
    !generation.sentAt
  ) {
    throw new Error("발송 완료된 자동 응대 데이터가 올바르지 않습니다.");
  }

  const database = getDatabase();
  const storedExternalMessageId =
    generation.externalMessageId ?? `auto-response:${generation.id}`;

  await database.$transaction(async (transaction) => {
    await transaction.message.upsert({
      where: {
        conversationId_externalMessageId: {
          conversationId: generation.conversationId,
          externalMessageId: storedExternalMessageId,
        },
      },
      update: {},
      create: {
        conversationId: generation.conversationId,
        externalMessageId: storedExternalMessageId,
        direction: "OUTBOUND",
        sender: "AI",
        content: generation.generatedContent!,
        sourceLanguage: "ko",
        sourceLanguageName: "한국어",
        translatedContent: generation.deliveredContent!,
        translatedLanguage: generation.translatedLanguage,
        translatedLanguageName: generation.translatedLanguageName,
        sentAt: generation.sentAt!,
      },
    });
    await transaction.conversation.update({
      where: { id: generation.conversationId },
      data: {
        lastMessageAt: generation.sentAt!,
      },
    });
    await transaction.autoResponseGeneration.update({
      where: { id: generation.id },
      data: {
        status: "COMPLETED",
        errorMessage: null,
      },
    });
  });
}

async function claimGeneration({
  hospitalId,
  conversationId,
  sourceMessageId,
  sourceSnapshot,
  contextMessageCount,
  treatmentTags,
  knowledgeDocumentIds,
  sources,
}: {
  hospitalId: string;
  conversationId: string;
  sourceMessageId: string;
  sourceSnapshot: string;
  contextMessageCount: number;
  treatmentTags: string[];
  knowledgeDocumentIds: string[];
  sources: Array<{ id: string; title: string }>;
}) {
  const database = getDatabase();
  const generationKey = {
    conversationId_sourceMessageId: {
      conversationId,
      sourceMessageId,
    },
  };
  const existing = await database.autoResponseGeneration.findUnique({
    where: generationKey,
  });

  if (existing) {
    if (existing.status !== "PENDING") return null;
    if (existing.sentAt) return existing;
    if (Date.now() - existing.updatedAt.getTime() < STALE_PENDING_TIMEOUT_MS) {
      return null;
    }

    const claimed = await database.autoResponseGeneration.updateMany({
      where: {
        id: existing.id,
        status: "PENDING",
        updatedAt: existing.updatedAt,
      },
      data: {
        model: getAutoResponseModel(),
        sourceSnapshot,
        contextMessageCount,
        treatmentTags,
        knowledgeDocumentIds,
        sources,
        generatedContent: null,
        deliveredContent: null,
        translatedLanguage: "ko",
        translatedLanguageName: "한국어",
        externalMessageId: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        attemptCount: { increment: 1 },
        errorMessage: null,
        sentAt: null,
      },
    });
    if (claimed.count === 0) return null;

    return database.autoResponseGeneration.findUniqueOrThrow({
      where: { id: existing.id },
    });
  }

  try {
    return await database.autoResponseGeneration.create({
      data: {
        hospitalId,
        conversationId,
        sourceMessageId,
        model: getAutoResponseModel(),
        sourceSnapshot,
        contextMessageCount,
        treatmentTags,
        knowledgeDocumentIds,
        sources,
      },
    });
  } catch {
    return null;
  }
}

async function processConversation(
  conversationId: string,
): Promise<AutoResponseRunResult> {
  const database = getDatabase();
  const conversation = await database.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      hospitalId: true,
      channel: true,
      status: true,
      autoRespondEnabled: true,
      autoTranslateEnabled: true,
      hospital: {
        select: {
          autoResponseContextEnabled: true,
          autoResponseContextMessageCount: true,
          autoResponseDelayMinutes: true,
        },
      },
      patient: {
        select: {
          language: true,
          tagAssignments: {
            where: { tag: { category: "TREATMENT" } },
            select: { tag: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      patientChannel: {
        select: {
          externalCustomerId: true,
        },
      },
      messages: {
        select: {
          id: true,
          sender: true,
          direction: true,
          sentAt: true,
        },
        orderBy: [{ sentAt: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
  });

  const latestMessage = conversation?.messages[0];
  if (
    !conversation ||
    conversation.status !== "OPEN" ||
    !conversation.autoRespondEnabled ||
    !latestMessage ||
    !isCustomerMessage(latestMessage)
  ) {
    return {
      conversationId,
      status: "skipped",
      detail: "자동 응대 대상 상태가 아닙니다.",
    };
  }

  const dueAt =
    latestMessage.sentAt.getTime() +
    conversation.hospital.autoResponseDelayMinutes * 60 * 1_000;
  if (Date.now() < dueAt) {
    return {
      conversationId,
      status: "skipped",
      detail: "자동 응대 대기시간이 지나지 않았습니다.",
    };
  }

  const contextMessageCount = conversation.hospital.autoResponseContextEnabled
    ? conversation.hospital.autoResponseContextMessageCount
    : 1;
  const [messages, allDocuments] = await Promise.all([
    database.message.findMany({
      where: {
        conversationId,
        sender: { in: ["CUSTOMER", "STAFF", "AI"] },
      },
      select: {
        id: true,
        sender: true,
        content: true,
        translatedContent: true,
      },
      orderBy: [{ sentAt: "desc" }, { id: "desc" }],
      take: contextMessageCount,
    }),
    database.manualDocument.findMany({
      where: {
        hospitalId: conversation.hospitalId,
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
  const sourceMessage = messages.find(
    (message) => message.id === latestMessage.id,
  );
  if (!sourceMessage) {
    return {
      conversationId,
      status: "skipped",
      detail: "최근 고객 메시지를 찾지 못했습니다.",
    };
  }

  const customerMessage =
    sourceMessage.translatedContent || sourceMessage.content;
  const treatmentTags = conversation.patient.tagAssignments.map(
    ({ tag }) => tag.name,
  );
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
  const sources = retrievedDocuments.map((document) => ({
    id: document.id,
    title: document.title,
  }));
  const generation = await claimGeneration({
    hospitalId: conversation.hospitalId,
    conversationId,
    sourceMessageId: latestMessage.id,
    sourceSnapshot: customerMessage,
    contextMessageCount: conversation.hospital.autoResponseContextEnabled
      ? contextMessageCount
      : 0,
    treatmentTags,
    knowledgeDocumentIds: retrievedDocuments.map((document) => document.id),
    sources,
  });

  if (!generation) {
    return {
      conversationId,
      status: "skipped",
      detail: "이미 처리했거나 다른 실행에서 처리 중입니다.",
    };
  }

  if (generation.sentAt) {
    try {
      await finalizeDeliveredResponse(generation);
      return {
        conversationId,
        status: "completed",
        detail: "기존 발송 결과를 DB에 복구했습니다.",
      };
    } catch (error) {
      const detail = await failGeneration(generation.id, error);
      return { conversationId, status: "failed", detail };
    }
  }

  try {
    const recentConversation = messages
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
    const result = await generateAutoResponse({
      hospitalId: conversation.hospitalId,
      treatmentTags,
      conversation: recentConversation,
      lastCustomerMessage: customerMessage,
      knowledgeDocuments: buildKnowledgeContext(retrievedDocuments),
    });
    const generatedContent = result.output.reply.trim();

    await database.autoResponseGeneration.update({
      where: { id: generation.id },
      data: {
        model: result.model,
        generatedContent,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
      },
    });

    const latestState = await database.conversation.findUnique({
      where: { id: conversation.id },
      select: {
        status: true,
        autoRespondEnabled: true,
        messages: {
          select: { id: true, sender: true, direction: true },
          orderBy: [{ sentAt: "desc" }, { id: "desc" }],
          take: 1,
        },
      },
    });
    if (
      latestState?.status !== "OPEN" ||
      !latestState.autoRespondEnabled ||
      latestState.messages[0]?.id !== latestMessage.id
    ) {
      await cancelGeneration(
        generation.id,
        "답변 생성 중 채팅 상태 또는 마지막 메시지가 변경되었습니다.",
      );
      return {
        conversationId,
        status: "skipped",
        detail: "답변 생성 중 채팅 상태가 변경되어 발송하지 않았습니다.",
      };
    }

    let translation = {
      sourceLanguage: "ko",
      sourceLanguageName: "한국어",
      translatedContent: generatedContent,
      translatedLanguage: "ko",
      translatedLanguageName: "한국어",
    };
    if (conversation.autoTranslateEnabled) {
      const translationContext = await getTranslationContext({
        hospitalId: conversation.hospitalId,
        conversationId: conversation.id,
      });
      translation = await translateStaffReply(
        generatedContent,
        conversation.patient.language,
        conversation.hospitalId,
        translationContext,
      );
    }

    const externalCustomerId = conversation.patientChannel?.externalCustomerId;
    if (!externalCustomerId) {
      throw new Error("고객의 외부 채널 식별자가 없습니다.");
    }

    const deliveredContent = translation.translatedContent || generatedContent;
    const externalMessageId = await sendChannelTextMessage({
      hospitalId: conversation.hospitalId,
      channel: conversation.channel,
      externalCustomerId,
      text: deliveredContent,
    });
    const sentAt = new Date();
    const deliveredGeneration = await database.autoResponseGeneration.update({
      where: { id: generation.id },
      data: {
        deliveredContent,
        translatedLanguage: translation.translatedLanguage,
        translatedLanguageName: translation.translatedLanguageName,
        externalMessageId,
        sentAt,
      },
    });

    await finalizeDeliveredResponse(deliveredGeneration);

    return {
      conversationId,
      status: "completed",
      detail: "자동 응답을 생성하고 발송했습니다.",
    };
  } catch (error) {
    const detail = await failGeneration(generation.id, error);
    console.error(`자동 응대 처리 실패: ${conversationId}`, error);
    return { conversationId, status: "failed", detail };
  }
}

export async function runDueAutoResponses() {
  const database = getDatabase();
  const candidates = await database.conversation.findMany({
    where: {
      status: "OPEN",
      autoRespondEnabled: true,
    },
    select: {
      id: true,
      hospital: {
        select: {
          autoResponseDelayMinutes: true,
        },
      },
      messages: {
        select: {
          sender: true,
          direction: true,
          sentAt: true,
        },
        orderBy: [{ sentAt: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
    orderBy: { lastMessageAt: "asc" },
    take: CANDIDATE_SCAN_LIMIT,
  });
  const now = Date.now();
  const dueConversationIds = candidates
    .filter((candidate) => {
      const latestMessage = candidate.messages[0];
      return (
        latestMessage &&
        isCustomerMessage(latestMessage) &&
        now - latestMessage.sentAt.getTime() >=
          candidate.hospital.autoResponseDelayMinutes * 60 * 1_000
      );
    })
    .slice(0, MAX_AUTO_RESPONSES_PER_RUN)
    .map((candidate) => candidate.id);
  const results: AutoResponseRunResult[] = [];
  for (
    let index = 0;
    index < dueConversationIds.length;
    index += AUTO_RESPONSE_CONCURRENCY
  ) {
    const batch = dueConversationIds.slice(
      index,
      index + AUTO_RESPONSE_CONCURRENCY,
    );
    results.push(...(await Promise.all(batch.map(processConversation))));
  }

  return {
    scanned: candidates.length,
    due: dueConversationIds.length,
    completed: results.filter((result) => result.status === "completed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}
