import Image from "next/image";

export function WhatsAppChannelIcon({
  size,
  className = "",
}: {
  size: number;
  className?: string;
}) {
  return (
    <span
      aria-label="WhatsApp"
      title="WhatsApp"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/channels/whatsapp-glyph-green.svg"
        alt=""
        width={720}
        height={720}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
