import Image from "next/image";

export function LineChannelIcon({
  size,
  className = "",
}: {
  size: number;
  className?: string;
}) {
  return (
    <span
      aria-label="LINE"
      title="LINE"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/channels/line-app-icon.png"
        alt=""
        width={1001}
        height={1000}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
