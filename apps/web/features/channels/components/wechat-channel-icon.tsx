import Image from "next/image";

export function WeChatChannelIcon({
  size,
  className = "",
}: {
  size: number;
  className?: string;
}) {
  return (
    <span
      aria-label="WeChat"
      title="WeChat"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] p-[18%] ${className}`}
      style={{ width: size, height: size, backgroundColor: "#07C160" }}
    >
      <Image
        src="/images/channels/wechat-glyph-white.svg"
        alt=""
        width={24}
        height={24}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
