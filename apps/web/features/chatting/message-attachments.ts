export type MessageImageAttachment = {
  type: "IMAGE";
  url: string;
  altText: string;
};

export type MessageAttachment = MessageImageAttachment;

export function parseMessageAttachments(value: unknown): MessageAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const attachment = item as Record<string, unknown>;
    if (attachment.type !== "IMAGE" || typeof attachment.url !== "string") {
      return [];
    }

    const url = attachment.url.trim();
    if (!url) return [];

    return [
      {
        type: "IMAGE" as const,
        url,
        altText:
          typeof attachment.altText === "string"
            ? attachment.altText.trim()
            : "",
      },
    ];
  });
}
