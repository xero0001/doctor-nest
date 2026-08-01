import { randomUUID } from "node:crypto";

import {
  createManualAssetPublicUrl,
  getManualAssetConfig,
  isAllowedManualImageType,
  MAX_MANUAL_IMAGE_SIZE_BYTES,
} from "@/lib/manual-assets";

export const MAX_CONTENT_EVENT_DETAIL_IMAGES = 10;
export const MAX_CONTENT_EVENT_IMAGE_SIZE_BYTES = MAX_MANUAL_IMAGE_SIZE_BYTES;

export function isAllowedContentEventImageType(contentType: string) {
  return isAllowedManualImageType(contentType);
}

export function getContentEventAssetConfig() {
  return getManualAssetConfig();
}

export function createContentEventAssetObjectKey(
  hospitalId: string,
  originalName: string,
) {
  const extension = originalName.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0] ?? "";
  return `events/${hospitalId}/${randomUUID()}${extension.toLowerCase()}`;
}

export function createContentEventAssetPublicUrl(
  cloudFrontUrl: string,
  objectKey: string,
) {
  return createManualAssetPublicUrl(cloudFrontUrl, objectKey);
}
