import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  createContentEventAssetObjectKey,
  createContentEventAssetPublicUrl,
  getContentEventAssetConfig,
  isAllowedContentEventImageType,
  MAX_CONTENT_EVENT_IMAGE_SIZE_BYTES,
} from "@/lib/content-event-assets";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    fileName?: unknown;
    contentType?: unknown;
    sizeBytes?: unknown;
  } | null;
  const fileName =
    typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const contentType =
    typeof body?.contentType === "string" ? body.contentType.trim() : "";
  const sizeBytes =
    typeof body?.sizeBytes === "number" ? body.sizeBytes : Number.NaN;

  if (!fileName || fileName.length > 200) {
    return Response.json(
      { error: "이미지 파일 이름이 올바르지 않습니다." },
      { status: 400 },
    );
  }
  if (!isAllowedContentEventImageType(contentType)) {
    return Response.json(
      { error: "JPG, PNG, WebP, GIF, AVIF 이미지만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }
  if (
    !Number.isInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_CONTENT_EVENT_IMAGE_SIZE_BYTES
  ) {
    return Response.json(
      { error: "이미지는 파일당 10MB 이하만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  try {
    const config = getContentEventAssetConfig();
    const objectKey = createContentEventAssetObjectKey(
      user.hospitalId,
      fileName,
    );
    const uploadUrl = await getSignedUrl(
      new S3Client({ region: config.region }),
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: sizeBytes,
      }),
      { expiresIn: 300 },
    );

    return Response.json({
      uploadUrl,
      image: {
        objectKey,
        publicUrl: createContentEventAssetPublicUrl(
          config.cloudFrontUrl,
          objectKey,
        ),
        originalName: fileName,
        contentType,
        sizeBytes,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 업로드 주소를 만들지 못했습니다.",
      },
      { status: 503 },
    );
  }
}
