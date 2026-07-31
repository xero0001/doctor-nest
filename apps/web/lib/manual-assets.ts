import { randomUUID } from "node:crypto";

export const MAX_MANUAL_IMAGES = 10;
export const MAX_MANUAL_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const allowedImageTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isAllowedManualImageType(contentType: string) {
  return allowedImageTypes.has(contentType);
}

export function getManualAssetConfig() {
  const bucket = process.env.MANUAL_ASSETS_S3_BUCKET?.trim();
  const cloudFrontUrl = process.env.MANUAL_ASSETS_CLOUDFRONT_URL?.trim();
  const region = process.env.AWS_REGION?.trim() || "ap-northeast-2";

  if (!bucket || !cloudFrontUrl) {
    throw new Error(
      "이미지 저장소가 설정되지 않았습니다. MANUAL_ASSETS_S3_BUCKET과 MANUAL_ASSETS_CLOUDFRONT_URL을 설정해 주세요.",
    );
  }

  const parsedCloudFrontUrl = new URL(cloudFrontUrl);
  if (parsedCloudFrontUrl.protocol !== "https:") {
    throw new Error("CloudFront 주소는 HTTPS URL이어야 합니다.");
  }

  return {
    bucket,
    cloudFrontUrl: parsedCloudFrontUrl.toString().replace(/\/+$/, ""),
    region,
  };
}

export function createManualAssetObjectKey(
  hospitalId: string,
  originalName: string,
) {
  const extension = originalName.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0] ?? "";
  return `manuals/${hospitalId}/${randomUUID()}${extension.toLowerCase()}`;
}

export function createManualAssetPublicUrl(
  cloudFrontUrl: string,
  objectKey: string,
) {
  return `${cloudFrontUrl}/${objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}
