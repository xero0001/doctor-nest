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
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/channels/wechat-app-icon.png"
        alt=""
        width={400}
        height={400}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
