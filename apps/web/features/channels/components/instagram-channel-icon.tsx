import { useId } from "react";

export function InstagramChannelIcon({
  size,
  className = "",
}: {
  size: number;
  className?: string;
}) {
  const gradientId = useId().replaceAll(":", "");
  const accentGradientId = `${gradientId}-accent`;

  return (
    <span
      aria-label="Instagram"
      title="Instagram"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className="h-full w-full"
        role="img"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="10.5"
            y1="57.5"
            x2="56"
            y2="9"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFDC80" />
            <stop offset="0.32" stopColor="#F77737" />
            <stop offset="0.62" stopColor="#E1306C" />
            <stop offset="1" stopColor="#833AB4" />
          </linearGradient>
          <radialGradient
            id={accentGradientId}
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(8 61) rotate(-48.5) scale(47 46)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FCAF45" />
            <stop offset="0.58" stopColor="#FD1D1D" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="64" height="64" rx="15" fill={`url(#${gradientId})`} />
        <rect
          width="64"
          height="64"
          rx="15"
          fill={`url(#${accentGradientId})`}
        />
        <rect
          x="15.5"
          y="15.5"
          width="33"
          height="33"
          rx="10"
          fill="none"
          stroke="white"
          strokeWidth="4"
        />
        <circle
          cx="32"
          cy="32"
          r="8"
          fill="none"
          stroke="white"
          strokeWidth="4"
        />
        <circle cx="43.5" cy="20.5" r="2.7" fill="white" />
      </svg>
    </span>
  );
}
