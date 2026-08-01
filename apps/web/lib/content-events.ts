import type { ContentEventRecord } from "@/features/events/types";
import {
  createContentEventAssetPublicUrl,
  getContentEventAssetConfig,
  isAllowedContentEventImageType,
  MAX_CONTENT_EVENT_DETAIL_IMAGES,
  MAX_CONTENT_EVENT_IMAGE_SIZE_BYTES,
} from "@/lib/content-event-assets";

export type ContentEventImageInput = {
  objectKey: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  altText: string;
};

export type ContentEventInput = {
  title: string;
  summary: string;
  originalPrice: number;
  discountAmount: number;
  currency: string;
  isActive: boolean;
  isPinned: boolean;
  exposureStartAt: Date | null;
  exposureEndAt: Date | null;
  detailType: "IMAGE" | "TEXT";
  detailText: string;
  thumbnail: ContentEventImageInput;
  detailImages: ContentEventImageInput[];
};

type RawEventInput = Record<string, unknown>;

function parseImage(
  value: unknown,
  hospitalId: string,
): ContentEventImageInput | null {
  if (!value || typeof value !== "object") return null;
  const image = value as Record<string, unknown>;
  const objectKey =
    typeof image.objectKey === "string" ? image.objectKey.trim() : "";
  const originalName =
    typeof image.originalName === "string" ? image.originalName.trim() : "";
  const contentType =
    typeof image.contentType === "string" ? image.contentType.trim() : "";
  const sizeBytes =
    typeof image.sizeBytes === "number" ? image.sizeBytes : Number.NaN;
  const altText = typeof image.altText === "string" ? image.altText.trim() : "";

  if (
    !objectKey.startsWith(`events/${hospitalId}/`) ||
    !originalName ||
    originalName.length > 200 ||
    !isAllowedContentEventImageType(contentType) ||
    !Number.isInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_CONTENT_EVENT_IMAGE_SIZE_BYTES ||
    altText.length > 200
  ) {
    return null;
  }

  return { objectKey, originalName, contentType, sizeBytes, altText };
}

function parseDate(value: unknown, endOfDay = false) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
  );
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

export function parseContentEventInput(
  body: RawEventInput | null,
  hospitalId: string,
): { input?: ContentEventInput; error?: string } {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  const originalPrice =
    typeof body?.originalPrice === "number" ? body.originalPrice : Number.NaN;
  const discountAmount =
    typeof body?.discountAmount === "number" ? body.discountAmount : Number.NaN;
  const currency = body?.currency === "KRW" ? "KRW" : "KRW";
  const isActive = body?.isActive !== false;
  const isPinned = body?.isPinned === true;
  const detailType = body?.detailType === "TEXT" ? "TEXT" : "IMAGE";
  const detailText =
    typeof body?.detailText === "string" ? body.detailText.trim() : "";
  const thumbnail = parseImage(body?.thumbnail, hospitalId);
  const rawDetailImages = Array.isArray(body?.detailImages)
    ? body.detailImages
    : [];
  const detailImages = rawDetailImages
    .map((image) => parseImage(image, hospitalId))
    .filter((image): image is ContentEventImageInput => Boolean(image));
  const hasExposurePeriod = body?.hasExposurePeriod === true;
  const exposureStartAt = hasExposurePeriod
    ? parseDate(body?.exposureStartAt)
    : null;
  const exposureEndAt = hasExposurePeriod
    ? parseDate(body?.exposureEndAt, true)
    : null;

  if (!title || title.length > 120) {
    return { error: "제목은 1자 이상 120자 이하로 입력해 주세요." };
  }
  if (summary.length > 300) {
    return { error: "한줄 소개는 300자 이하로 입력해 주세요." };
  }
  if (
    !Number.isInteger(originalPrice) ||
    originalPrice < 0 ||
    originalPrice > 1_000_000_000 ||
    !Number.isInteger(discountAmount) ||
    discountAmount < 0 ||
    discountAmount > originalPrice
  ) {
    return { error: "가격과 할인금액을 올바르게 입력해 주세요." };
  }
  if (!thumbnail) {
    return { error: "대표 이미지를 등록해 주세요." };
  }
  if (
    rawDetailImages.length !== detailImages.length ||
    detailImages.length > MAX_CONTENT_EVENT_DETAIL_IMAGES
  ) {
    return { error: "상세 이미지는 최대 10개까지 등록할 수 있습니다." };
  }
  const objectKeys = [
    thumbnail.objectKey,
    ...detailImages.map((image) => image.objectKey),
  ];
  if (new Set(objectKeys).size !== objectKeys.length) {
    return { error: "같은 이미지를 중복해서 등록할 수 없습니다." };
  }
  if (detailType === "IMAGE" && detailImages.length === 0) {
    return { error: "상세 이미지를 한 장 이상 등록해 주세요." };
  }
  if (detailType === "TEXT" && (!detailText || detailText.length > 100_000)) {
    return { error: "상세 텍스트는 1자 이상 100,000자 이하로 입력해 주세요." };
  }
  if (
    hasExposurePeriod &&
    (!exposureStartAt || !exposureEndAt || exposureStartAt > exposureEndAt)
  ) {
    return { error: "노출기간을 올바르게 입력해 주세요." };
  }

  return {
    input: {
      title,
      summary,
      originalPrice,
      discountAmount,
      currency,
      isActive,
      isPinned,
      exposureStartAt,
      exposureEndAt,
      detailType,
      detailText: detailType === "TEXT" ? detailText : "",
      thumbnail,
      detailImages: detailType === "IMAGE" ? detailImages : [],
    },
  };
}

type SerializableEvent = {
  id: string;
  title: string;
  summary: string;
  originalPrice: number;
  discountAmount: number;
  currency: string;
  isActive: boolean;
  isPinned: boolean;
  exposureStartAt: Date | null;
  exposureEndAt: Date | null;
  detailType: "IMAGE" | "TEXT";
  detailText: string;
  viewCount: number;
  consultationCount: number;
  images: Array<{
    id: string;
    role: "THUMBNAIL" | "DETAIL";
    objectKey: string;
    publicUrl: string;
    originalName: string;
    contentType: string;
    sizeBytes: number;
    altText: string;
    sortOrder: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeContentEvent(
  event: SerializableEvent,
): ContentEventRecord {
  const thumbnail = event.images.find((image) => image.role === "THUMBNAIL");
  return {
    id: event.id,
    title: event.title,
    summary: event.summary,
    originalPrice: event.originalPrice,
    discountAmount: event.discountAmount,
    currency: event.currency,
    isActive: event.isActive,
    isPinned: event.isPinned,
    exposureStartAt: event.exposureStartAt?.toISOString() ?? null,
    exposureEndAt: event.exposureEndAt?.toISOString() ?? null,
    detailType: event.detailType,
    detailText: event.detailText,
    viewCount: event.viewCount,
    consultationCount: event.consultationCount,
    thumbnail: thumbnail ?? null,
    detailImages: event.images
      .filter((image) => image.role === "DETAIL")
      .sort((left, right) => left.sortOrder - right.sortOrder),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export function eventImageCreateData(
  input: ContentEventInput,
  cloudFrontUrl: string,
) {
  return [
    {
      ...input.thumbnail,
      role: "THUMBNAIL" as const,
      publicUrl: createContentEventAssetPublicUrl(
        cloudFrontUrl,
        input.thumbnail.objectKey,
      ),
      sortOrder: 0,
    },
    ...input.detailImages.map((image, sortOrder) => ({
      ...image,
      role: "DETAIL" as const,
      publicUrl: createContentEventAssetPublicUrl(
        cloudFrontUrl,
        image.objectKey,
      ),
      sortOrder,
    })),
  ];
}

export function getContentEventCloudFrontUrl() {
  return getContentEventAssetConfig().cloudFrontUrl;
}
