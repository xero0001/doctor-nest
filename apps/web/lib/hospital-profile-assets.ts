import { randomUUID } from "node:crypto";

import {
  createManualAssetPublicUrl,
  getManualAssetConfig,
  isAllowedManualImageType,
  MAX_MANUAL_IMAGE_SIZE_BYTES,
} from "@/lib/manual-assets";

export const MAX_HOSPITAL_PROFILE_IMAGE_SIZE_BYTES =
  MAX_MANUAL_IMAGE_SIZE_BYTES;

export function getHospitalProfileAssetConfig() {
  return getManualAssetConfig();
}

export function isAllowedHospitalProfileImageType(contentType: string) {
  return isAllowedManualImageType(contentType);
}

export function createHospitalProfileObjectKey(
  hospitalId: string,
  originalName: string,
) {
  const extension = originalName.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0] ?? "";
  return `hospital-profiles/${hospitalId}/${randomUUID()}${extension.toLowerCase()}`;
}

export function createHospitalProfilePublicUrl(
  cloudFrontUrl: string,
  objectKey: string,
) {
  return createManualAssetPublicUrl(cloudFrontUrl, objectKey);
}
