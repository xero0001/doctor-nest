import Image from "next/image";

export function KakaoChannelIcon({
  size,
  className = "",
}: {
  size: number;
  className?: string;
}) {
  return (
    <span
      aria-label="카카오"
      title="카카오"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/channels/kakao-channel-app-icon.png"
        alt=""
        width={512}
        height={512}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
