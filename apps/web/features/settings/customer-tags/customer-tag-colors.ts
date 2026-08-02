import {
  DEFAULT_TAG_COLOR,
  TAG_COLOR_PRESETS,
} from "@/features/settings/tag-colors";

export const CUSTOMER_TAG_COLOR_PRESETS = TAG_COLOR_PRESETS;

export const DEFAULT_CUSTOMER_TAG_COLOR = DEFAULT_TAG_COLOR;

export function normalizeCustomerTagColor(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();
  return CUSTOMER_TAG_COLOR_PRESETS.some(
    (preset) => preset.value === normalized,
  )
    ? normalized
    : null;
}
