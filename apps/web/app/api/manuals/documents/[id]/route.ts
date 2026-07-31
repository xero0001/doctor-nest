import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeTagNames(tags: unknown) {
  if (!Array.isArray(tags)) return [];

  return Array.from(
    new Set(
      tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    folderId?: string;
    contentMarkdown?: string;
    tags?: string[];
  } | null;
  const title = body?.title?.trim() ?? "";
  const folderId = body?.folderId?.trim() ?? "";
  const contentMarkdown = body?.contentMarkdown ?? "";
  const tagNames = normalizeTagNames(body?.tags);

  if (!title || title.length > 100) {
    return Response.json(
      { error: "문서 제목을 1~100자로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (contentMarkdown.length > 100_000) {
    return Response.json(
      { error: "문서 내용은 100,000자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (tagNames.some((tag) => tag.length > 30)) {
    return Response.json(
      { error: "태그는 각각 30자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const [existingDocument, folder] = await Promise.all([
    database.manualDocument.findFirst({
      where: { id, hospitalId: user.hospitalId },
      select: { id: true },
    }),
    database.manualFolder.findFirst({
      where: { id: folderId, hospitalId: user.hospitalId },
      select: { id: true },
    }),
  ]);

  if (!existingDocument) {
    return Response.json(
      { error: "문서를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (!folder) {
    return Response.json(
      { error: "저장할 폴더를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const document = await database.$transaction(async (transaction) => {
    await transaction.manualDocument.update({
      where: { id: existingDocument.id },
      data: {
        title,
        folderId: folder.id,
        contentMarkdown,
      },
    });
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
        create: {
          hospitalId: user.hospitalId,
          name,
        },
      });

      await transaction.manualDocumentTag.create({
        data: {
          documentId: existingDocument.id,
          tagId: tag.id,
        },
      });
    }

    return transaction.manualDocument.findUniqueOrThrow({
      where: { id: existingDocument.id },
      include: {
        tags: {
          include: { tag: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });

  return Response.json({
    document: {
      id: document.id,
      folderId: document.folderId,
      title: document.title,
      slug: document.slug,
      contentMarkdown: document.contentMarkdown,
      sortOrder: document.sortOrder,
      updatedAt: document.updatedAt.toISOString(),
      tags: document.tags.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
    },
  });
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
      { error: "문서를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  await database.manualDocument.delete({ where: { id: document.id } });

  return Response.json({ deletedDocumentId: document.id });
}
