import Image from "next/image";

import type { MessageAttachment } from "@/features/chatting/message-attachments";

export function MessageAttachmentGallery({
  attachments,
  inbound,
}: {
  attachments: MessageAttachment[];
  inbound: boolean;
}) {
  if (attachments.length === 0) return null;

  return (
    <div
      className={`mb-3 grid overflow-hidden rounded-xl ${
        attachments.length === 1 ? "grid-cols-1" : "grid-cols-2 gap-1"
      } ${inbound ? "bg-[#f4f6fa]" : "bg-white/10"}`}
    >
      {attachments.map((attachment, index) => (
        <a
          key={`${attachment.url}-${index}`}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="relative block aspect-square min-w-0 overflow-hidden bg-white/90"
          aria-label={`${attachment.altText || "첨부 이미지"} 원본 보기`}
        >
          <Image
            src={attachment.url}
            alt={attachment.altText || "첨부 이미지"}
            fill
            sizes="(max-width: 1024px) 40vw, 320px"
            className="object-contain"
          />
        </a>
      ))}
    </div>
  );
}
