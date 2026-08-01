export type ContentEventDetailType = "IMAGE" | "TEXT";

export type ContentEventImageRecord = {
  id: string;
  role: "THUMBNAIL" | "DETAIL";
  objectKey: string;
  publicUrl: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  altText: string;
  sortOrder: number;
};

export type ContentEventRecord = {
  id: string;
  title: string;
  summary: string;
  originalPrice: number;
  discountAmount: number;
  currency: string;
  isActive: boolean;
  isPinned: boolean;
  exposureStartAt: string | null;
  exposureEndAt: string | null;
  detailType: ContentEventDetailType;
  detailText: string;
  viewCount: number;
  consultationCount: number;
  thumbnail: ContentEventImageRecord | null;
  detailImages: ContentEventImageRecord[];
  createdAt: string;
  updatedAt: string;
};
