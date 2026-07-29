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
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className="h-full w-full"
        role="img"
      >
        <rect width="64" height="64" rx="14" fill="#FEE500" />
        <path
          fill="#3C1E1E"
          d="M32 12.5c-13.25 0-24 8.42-24 18.8 0 6.7 4.48 12.59 11.23 15.92l-2.67 9.74c-.23.84.74 1.54 1.49 1.06l11.9-7.08c.68.06 1.36.09 2.05.09 13.25 0 24-8.42 24-18.8S45.25 12.5 32 12.5Z"
        />
        <text
          x="32"
          y="35.9"
          fill="#FEE500"
          fontFamily="Arial, sans-serif"
          fontSize="10.5"
          fontWeight="800"
          letterSpacing="0.15"
          textAnchor="middle"
        >
          TALK
        </text>
      </svg>
    </span>
  );
}
