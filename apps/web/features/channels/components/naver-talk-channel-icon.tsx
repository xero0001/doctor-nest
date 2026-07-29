import Image from "next/image";

export function NaverTalkChannelIcon({
  size,
  className = "",
}: {
  size: number;
  className?: string;
}) {
  return (
    <span
      aria-label="네이버 톡톡"
      title="네이버 톡톡"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/channels/naver-talk-app-icon.png"
        alt=""
        width={180}
        height={180}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
