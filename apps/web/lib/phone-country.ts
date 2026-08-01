export const phoneCountryOptions = [
  { value: "+82", label: "대한민국 (+82)" },
  { value: "+1", label: "미국·캐나다 (+1)" },
  { value: "+81", label: "일본 (+81)" },
  { value: "+86", label: "중국 (+86)" },
] as const;

export type PhoneCountryCode = (typeof phoneCountryOptions)[number]["value"];

export function normalizePhoneCountryCode(
  value: string | null | undefined,
): PhoneCountryCode | null {
  return phoneCountryOptions.some((option) => option.value === value)
    ? (value as PhoneCountryCode)
    : null;
}

export function stripPhoneCountryCode(
  phone: string | null | undefined,
  countryCode: string | null | undefined,
) {
  const trimmedPhone = phone?.trim() ?? "";
  const normalizedCountryCode = normalizePhoneCountryCode(countryCode);
  if (
    !normalizedCountryCode ||
    !trimmedPhone.startsWith(normalizedCountryCode)
  ) {
    return trimmedPhone;
  }
  return trimmedPhone.slice(normalizedCountryCode.length).trim();
}

export function formatPhoneWithCountryCode(
  phone: string | null | undefined,
  countryCode: string | null | undefined,
) {
  const trimmedPhone = phone?.trim();
  if (!trimmedPhone) return "연락처 미등록";

  const normalizedCountryCode =
    normalizePhoneCountryCode(countryCode) ??
    phoneCountryOptions.find((option) => trimmedPhone.startsWith(option.value))
      ?.value ??
    "+82";
  const localPhone = stripPhoneCountryCode(trimmedPhone, normalizedCountryCode);
  return `(${normalizedCountryCode}) ${localPhone}`;
}
