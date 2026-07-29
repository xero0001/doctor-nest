export type KnowledgeDocument = {
  id: string;
  title: string;
  contentMarkdown: string;
  tags: Array<{ tag: { name: string } }>;
};

function normalizeForSearch(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function extractSearchTerms(value: string) {
  return Array.from(
    new Set(
      value
        .toLocaleLowerCase()
        .match(/[a-z0-9가-힣]{2,}/g)
        ?.filter((term) => term.length >= 2) ?? [],
    ),
  ).slice(0, 30);
}

export function retrieveKnowledgeDocuments(
  documents: KnowledgeDocument[],
  treatmentTags: string[],
  message: string,
) {
  const normalizedTreatmentTags = treatmentTags.map(normalizeForSearch);
  const searchTerms = extractSearchTerms(
    `${treatmentTags.join(" ")} ${message}`,
  );

  return documents
    .map((document) => {
      const title = normalizeForSearch(document.title);
      const content = normalizeForSearch(document.contentMarkdown);
      const documentTags = document.tags.map(({ tag }) =>
        normalizeForSearch(tag.name),
      );
      let score = 0;

      for (const treatmentTag of normalizedTreatmentTags) {
        if (documentTags.includes(treatmentTag)) score += 20;
        if (title.includes(treatmentTag)) score += 12;
        if (content.includes(treatmentTag)) score += 4;
      }

      for (const term of searchTerms) {
        const normalizedTerm = normalizeForSearch(term);
        if (!normalizedTerm) continue;
        if (documentTags.some((tag) => tag.includes(normalizedTerm)))
          score += 8;
        if (title.includes(normalizedTerm)) score += 5;
        if (content.includes(normalizedTerm)) score += 1;
      }

      return { document, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.document.title.localeCompare(right.document.title, "ko"),
    )
    .slice(0, 3)
    .map(({ document }) => document);
}

export function buildKnowledgeContext(
  documents: KnowledgeDocument[],
  maximumCharacters = 12_000,
) {
  let remainingCharacters = maximumCharacters;

  return documents.map((document) => {
    const content = document.contentMarkdown.slice(
      0,
      Math.max(0, remainingCharacters),
    );
    remainingCharacters -= content.length;

    return {
      title: document.title,
      content,
    };
  });
}
