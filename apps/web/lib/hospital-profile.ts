import type {
  HospitalOperatingHourRecord,
  HospitalProfileImage,
  HospitalProfileRecord,
  HospitalWeekday,
} from "@/features/settings/hospital-profile-types";
import { hospitalWeekdays } from "@/features/settings/hospital-profile-types";
import {
  createHospitalProfilePublicUrl,
  getHospitalProfileAssetConfig,
  isAllowedHospitalProfileImageType,
  MAX_HOSPITAL_PROFILE_IMAGE_SIZE_BYTES,
} from "@/lib/hospital-profile-assets";

export function createDefaultOperatingHours(): HospitalOperatingHourRecord[] {
  return hospitalWeekdays.map((weekday) => ({
    weekday,
    isOpen: weekday !== "SUNDAY",
    openMinutes: 600,
    closeMinutes: weekday === "SATURDAY" ? 840 : 1140,
  }));
}

type SerializableHospital = {
  name: string;
  introduction: string;
  operatingNotes: string;
  profileImageObjectKey: string | null;
  profileImageUrl: string | null;
  profileImageOriginalName: string | null;
  profileImageContentType: string | null;
  profileImageSizeBytes: number | null;
};

export function serializeHospitalProfile(
  hospital: SerializableHospital,
  operatingHours: HospitalOperatingHourRecord[],
): HospitalProfileRecord {
  const completeHours = createDefaultOperatingHours().map(
    (fallback) =>
      operatingHours.find((hour) => hour.weekday === fallback.weekday) ??
      fallback,
  );
  const hasImage =
    hospital.profileImageObjectKey &&
    hospital.profileImageUrl &&
    hospital.profileImageOriginalName &&
    hospital.profileImageContentType &&
    hospital.profileImageSizeBytes;

  return {
    name: hospital.name,
    introduction: hospital.introduction,
    operatingNotes: hospital.operatingNotes,
    profileImage: hasImage
      ? {
          objectKey: hospital.profileImageObjectKey!,
          publicUrl: hospital.profileImageUrl!,
          originalName: hospital.profileImageOriginalName!,
          contentType: hospital.profileImageContentType!,
          sizeBytes: hospital.profileImageSizeBytes!,
        }
      : null,
    operatingHours: completeHours,
  };
}

type HospitalProfileInput = {
  name: string;
  introduction: string;
  operatingNotes: string;
  profileImage: HospitalProfileImage | null;
  operatingHours: HospitalOperatingHourRecord[];
};

function parseProfileImage(
  value: unknown,
  hospitalId: string,
): HospitalProfileImage | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const image = value as Record<string, unknown>;
  const objectKey =
    typeof image.objectKey === "string" ? image.objectKey.trim() : "";
  const originalName =
    typeof image.originalName === "string" ? image.originalName.trim() : "";
  const contentType =
    typeof image.contentType === "string" ? image.contentType.trim() : "";
  const sizeBytes =
    typeof image.sizeBytes === "number" ? image.sizeBytes : Number.NaN;
  if (
    !objectKey.startsWith(`hospital-profiles/${hospitalId}/`) ||
    !originalName ||
    originalName.length > 200 ||
    !isAllowedHospitalProfileImageType(contentType) ||
    !Number.isInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_HOSPITAL_PROFILE_IMAGE_SIZE_BYTES
  ) {
    return undefined;
  }
  return {
    objectKey,
    publicUrl: createHospitalProfilePublicUrl(
      getHospitalProfileAssetConfig().cloudFrontUrl,
      objectKey,
    ),
    originalName,
    contentType,
    sizeBytes,
  };
}

export function parseHospitalProfileInput(
  body: Record<string, unknown> | null,
  hospitalId: string,
): { input?: HospitalProfileInput; error?: string } {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const introduction =
    typeof body?.introduction === "string" ? body.introduction.trim() : "";
  const operatingNotes =
    typeof body?.operatingNotes === "string" ? body.operatingNotes.trim() : "";
  const profileImage = parseProfileImage(body?.profileImage, hospitalId);
  const rawHours = Array.isArray(body?.operatingHours)
    ? body.operatingHours
    : [];
  const operatingHours = rawHours
    .map((value) => {
      if (!value || typeof value !== "object") return null;
      const hour = value as Record<string, unknown>;
      if (
        typeof hour.weekday !== "string" ||
        !hospitalWeekdays.includes(hour.weekday as HospitalWeekday) ||
        typeof hour.isOpen !== "boolean" ||
        typeof hour.openMinutes !== "number" ||
        !Number.isInteger(hour.openMinutes) ||
        typeof hour.closeMinutes !== "number" ||
        !Number.isInteger(hour.closeMinutes) ||
        hour.openMinutes < 0 ||
        hour.openMinutes > 1439 ||
        hour.closeMinutes < 1 ||
        hour.closeMinutes > 1440 ||
        (hour.isOpen && hour.openMinutes >= hour.closeMinutes)
      ) {
        return null;
      }
      return {
        weekday: hour.weekday as HospitalWeekday,
        isOpen: hour.isOpen,
        openMinutes: hour.openMinutes,
        closeMinutes: hour.closeMinutes,
      };
    })
    .filter((hour): hour is HospitalOperatingHourRecord => Boolean(hour));

  if (!name || name.length > 100) {
    return { error: "병원명은 1자 이상 100자 이하로 입력해 주세요." };
  }
  if (introduction.length > 1_000) {
    return { error: "소개글은 1,000자 이하로 입력해 주세요." };
  }
  if (operatingNotes.length > 5_000) {
    return { error: "참고사항은 5,000자 이하로 입력해 주세요." };
  }
  if (profileImage === undefined) {
    return { error: "병원 프로필 이미지 정보가 올바르지 않습니다." };
  }
  if (
    rawHours.length !== hospitalWeekdays.length ||
    operatingHours.length !== hospitalWeekdays.length ||
    new Set(operatingHours.map((hour) => hour.weekday)).size !==
      hospitalWeekdays.length
  ) {
    return { error: "요일별 운영시간을 모두 입력해 주세요." };
  }

  return {
    input: {
      name,
      introduction,
      operatingNotes,
      profileImage,
      operatingHours,
    },
  };
}
