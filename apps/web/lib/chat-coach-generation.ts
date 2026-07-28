export type ChatCoachSource = {
  id: string;
  title: string;
};

export function parseChatCoachSources(value: unknown): ChatCoachSource[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((source) => {
    if (
      typeof source !== "object" ||
      source === null ||
      !("id" in source) ||
      !("title" in source) ||
      typeof source.id !== "string" ||
      typeof source.title !== "string"
    ) {
      return [];
    }

    return [{ id: source.id, title: source.title }];
  });
}

export function serializeChatCoachGeneration(generation: {
  id: string;
  sourceMessageId: string;
  responseGuide: string | null;
  answerExample: string | null;
  model: string;
  sources: unknown;
  createdAt: Date;
}) {
  return {
    id: generation.id,
    generatedForMessageId: generation.sourceMessageId,
    responseGuide: generation.responseGuide ?? "",
    answerExample: generation.answerExample ?? "",
    model: generation.model,
    generatedAt: generation.createdAt.toISOString(),
    sources: parseChatCoachSources(generation.sources),
  };
}
