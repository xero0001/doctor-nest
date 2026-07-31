import { randomUUID } from "node:crypto";

import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

function createSlug(title: string) {
  const base =
    title
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "manual";

  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    folderId?: string;
    title?: string;
  } | null;
  const folderId = body?.folderId?.trim() ?? "";
  const title = body?.title?.trim() || "새 문서";

  if (title.length > 100) {
    return Response.json(
      { error: "문서 제목은 100자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const folder = await database.manualFolder.findFirst({
    where: { id: folderId, hospitalId: user.hospitalId },
    select: { id: true },
  });

  if (!folder) {
    return Response.json(
      { error: "문서를 저장할 폴더를 선택해 주세요." },
      { status: 404 },
    );
  }

  const lastDocument = await database.manualDocument.aggregate({
    where: { folderId: folder.id },
    _max: { sortOrder: true },
  });
  const document = await database.manualDocument.create({
    data: {
      hospitalId: user.hospitalId,
      folderId: folder.id,
      title,
      slug: createSlug(title),
      contentMarkdown: `# ${title}\n\n내용을 입력해 주세요.`,
      sortOrder: (lastDocument._max.sortOrder ?? -1) + 1,
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
      tags: {
        include: { tag: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return Response.json(
    {
      document: {
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
      },
    },
    { status: 201 },
  );
}
