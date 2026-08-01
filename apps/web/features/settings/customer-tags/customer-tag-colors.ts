export const CUSTOMER_TAG_COLOR_PRESETS = [
  { value: "#3157F6", label: "블루" },
  { value: "#8B5CF6", label: "퍼플" },
  { value: "#0EA5E9", label: "스카이" },
  { value: "#10B981", label: "그린" },
  { value: "#F59E0B", label: "앰버" },
  { value: "#EF4444", label: "레드" },
  { value: "#EC4899", label: "핑크" },
  { value: "#64748B", label: "슬레이트" },
] as const;

export const DEFAULT_CUSTOMER_TAG_COLOR = CUSTOMER_TAG_COLOR_PRESETS[0].value;

export function normalizeCustomerTagColor(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();
  return CUSTOMER_TAG_COLOR_PRESETS.some(
    (preset) => preset.value === normalized,
  )
    ? normalized
    : null;
}
