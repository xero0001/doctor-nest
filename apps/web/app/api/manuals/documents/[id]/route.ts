import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import {
  createManualAssetPublicUrl,
  getManualAssetConfig,
  isAllowedManualImageType,
  MAX_MANUAL_IMAGES,
  MAX_MANUAL_IMAGE_SIZE_BYTES,
} from "@/lib/manual-assets";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ManualImageInput = {
  objectKey: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  altText: string;
};

function normalizeTagNames(tags: unknown) {
  if (!Array.isArray(tags)) return null;

  return Array.from(
    new Set(
      tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

function normalizeImages(images: unknown, hospitalId: string) {
  if (!Array.isArray(images) || images.length > MAX_MANUAL_IMAGES) return null;

  const normalized: ManualImageInput[] = [];
  const objectKeys = new Set<string>();

  for (const value of images) {
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
    const altText =
      typeof image.altText === "string" ? image.altText.trim() : "";

    if (
      !objectKey.startsWith(`manuals/${hospitalId}/`) ||
      objectKeys.has(objectKey) ||
      !originalName ||
      originalName.length > 200 ||
      !isAllowedManualImageType(contentType) ||
      !Number.isInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > MAX_MANUAL_IMAGE_SIZE_BYTES ||
      altText.length > 200
    ) {
      return null;
    }

    objectKeys.add(objectKey);
    normalized.push({
      objectKey,
      originalName,
      contentType,
      sizeBytes,
      altText,
    });
  }

  return normalized;
}

function findManualDocument(id: string, hospitalId: string) {
  return getDatabase().manualDocument.findFirst({
    where: { id, hospitalId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      tags: {
        include: { tag: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

function serializeManualDocument(
  document: NonNullable<Awaited<ReturnType<typeof findManualDocument>>>,
) {
  return {
    id: document.id,
    folderId: document.folderId,
    title: document.title,
    slug: document.slug,
    contentMarkdown: document.contentMarkdown,
    cautionMarkdown: document.cautionMarkdown,
    cautionEnabled: document.cautionEnabled,
    isActive: document.isActive,
    sortOrder: document.sortOrder,
    updatedAt: document.updatedAt.toISOString(),
    tags: document.tags.map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
    images: document.images.map((image) => ({
      id: image.id,
      objectKey: image.objectKey,
      publicUrl: image.publicUrl,
      originalName: image.originalName,
      contentType: image.contentType,
      sizeBytes: image.sizeBytes,
      altText: image.altText,
      sortOrder: image.sortOrder,
    })),
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const hasTitle = Boolean(body && Object.hasOwn(body, "title"));
  const hasFolderId = Boolean(body && Object.hasOwn(body, "folderId"));
  const hasContent = Boolean(body && Object.hasOwn(body, "contentMarkdown"));
  const hasCaution = Boolean(body && Object.hasOwn(body, "cautionMarkdown"));
  const hasCautionEnabled = Boolean(
    body && Object.hasOwn(body, "cautionEnabled"),
  );
  const hasIsActive = Boolean(body && Object.hasOwn(body, "isActive"));
  const hasTags = Boolean(body && Object.hasOwn(body, "tags"));
  const hasImages = Boolean(body && Object.hasOwn(body, "images"));

  if (
    !hasTitle &&
    !hasFolderId &&
    !hasContent &&
    !hasCaution &&
    !hasCautionEnabled &&
    !hasIsActive &&
    !hasTags &&
    !hasImages
  ) {
    return Response.json(
      { error: "변경할 치료태그 매뉴얼 정보를 입력해 주세요." },
      { status: 400 },
    );
  }

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const folderId =
    typeof body?.folderId === "string" ? body.folderId.trim() : "";
  const contentMarkdown =
    typeof body?.contentMarkdown === "string" ? body.contentMarkdown : "";
  const cautionMarkdown =
    typeof body?.cautionMarkdown === "string" ? body.cautionMarkdown : "";
  const tagNames = hasTags ? normalizeTagNames(body?.tags) : undefined;
  const images = hasImages
    ? normalizeImages(body?.images, user.hospitalId)
    : undefined;

  if (hasTitle && (!title || title.length > 100)) {
    return Response.json(
      { error: "치료태그 이름을 1~100자로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (hasFolderId && !folderId) {
    return Response.json(
      { error: "저장할 폴더를 선택해 주세요." },
      { status: 400 },
    );
  }

  if (hasContent && contentMarkdown.length > 100_000) {
    return Response.json(
      { error: "매뉴얼 내용은 100,000자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (hasCaution && cautionMarkdown.length > 20_000) {
    return Response.json(
      { error: "주의사항 메시지는 20,000자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (
    (hasCautionEnabled && typeof body?.cautionEnabled !== "boolean") ||
    (hasIsActive && typeof body?.isActive !== "boolean")
  ) {
    return Response.json(
      { error: "사용 여부 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (hasTags && (!tagNames || tagNames.some((tag) => tag.length > 30))) {
    return Response.json(
      { error: "검색 태그는 각각 30자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (hasImages && !images) {
    return Response.json(
      { error: "이미지는 최대 10개이며 파일당 10MB 이하여야 합니다." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const [existingDocument, folder] = await Promise.all([
    database.manualDocument.findFirst({
      where: { id, hospitalId: user.hospitalId },
      include: { images: true },
    }),
    hasFolderId
      ? database.manualFolder.findFirst({
          where: { id: folderId, hospitalId: user.hospitalId },
          select: { id: true },
        })
      : Promise.resolve(undefined),
  ]);

  if (!existingDocument) {
    return Response.json(
      { error: "치료태그 매뉴얼을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (hasFolderId && !folder) {
    return Response.json(
      { error: "저장할 폴더를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  let cloudFrontUrl = "";
  if (
    images?.some(
      (image) =>
        !existingDocument.images.some(
          (existingImage) => existingImage.objectKey === image.objectKey,
        ),
    )
  ) {
    try {
      cloudFrontUrl = getManualAssetConfig().cloudFrontUrl;
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "이미지 저장소 설정을 확인해 주세요.",
        },
        { status: 503 },
      );
    }
  }

  const existingImagesByKey = new Map(
    existingDocument.images.map((image) => [image.objectKey, image]),
  );

  await database.$transaction(async (transaction) => {
    await transaction.manualDocument.update({
      where: { id: existingDocument.id },
      data: {
        ...(hasTitle ? { title } : {}),
        ...(hasFolderId && folder ? { folderId: folder.id } : {}),
        ...(hasContent ? { contentMarkdown } : {}),
        ...(hasCaution ? { cautionMarkdown } : {}),
        ...(typeof body?.cautionEnabled === "boolean"
          ? { cautionEnabled: body.cautionEnabled }
          : {}),
        ...(typeof body?.isActive === "boolean"
          ? { isActive: body.isActive }
          : {}),
      },
    });

    if (tagNames) {
      await transaction.manualDocumentTag.deleteMany({
        where: { documentId: existingDocument.id },
      });

      for (const name of tagNames) {
        const tag = await transaction.manualTag.upsert({
          where: {
            hospitalId_name: {
              hospitalId: user.hospitalId,
              name,
            },
          },
          update: {},
          create: { hospitalId: user.hospitalId, name },
        });

        await transaction.manualDocumentTag.create({
          data: { documentId: existingDocument.id, tagId: tag.id },
        });
      }
    }

    if (images) {
      await transaction.manualDocumentImage.deleteMany({
        where: { documentId: existingDocument.id },
      });
      await transaction.manualDocumentImage.createMany({
        data: images.map((image, sortOrder) => ({
          documentId: existingDocument.id,
          objectKey: image.objectKey,
          publicUrl:
            existingImagesByKey.get(image.objectKey)?.publicUrl ??
            createManualAssetPublicUrl(cloudFrontUrl, image.objectKey),
          originalName: image.originalName,
          contentType: image.contentType,
          sizeBytes: image.sizeBytes,
          altText: image.altText,
          sortOrder,
        })),
      });
    }
  });

  const document = await findManualDocument(
    existingDocument.id,
    user.hospitalId,
  );

  if (!document) {
    return Response.json(
      { error: "치료태그 매뉴얼을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return Response.json({ document: serializeManualDocument(document) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const database = getDatabase();
  const document = await database.manualDocument.findFirst({
    where: { id, hospitalId: user.hospitalId },
    select: { id: true },
  });

  if (!document) {
    return Response.json(
      { error: "치료태그 매뉴얼을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  await database.manualDocument.delete({ where: { id: document.id } });

  return Response.json({ deletedDocumentId: document.id });
}
