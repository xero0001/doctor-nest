import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

function normalizeOrderedIds(value: unknown) {
  if (!Array.isArray(value) || value.length > 500) return null;
  const ids = value.filter(
    (id): id is string => typeof id === "string" && Boolean(id.trim()),
  );

  if (ids.length !== value.length || new Set(ids).size !== ids.length) {
    return null;
  }

  return ids;
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    parentId?: unknown;
    folderId?: unknown;
    orderedIds?: unknown;
  } | null;
  const orderedIds = normalizeOrderedIds(body?.orderedIds);

  if ((body?.kind !== "folders" && body?.kind !== "documents") || !orderedIds) {
    return Response.json(
      { error: "정렬할 항목이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const database = getDatabase();

  if (body.kind === "folders") {
    const parentId =
      typeof body.parentId === "string" && body.parentId.trim()
        ? body.parentId.trim()
        : null;
    const folders = await database.manualFolder.findMany({
      where: {
        id: { in: orderedIds },
        hospitalId: user.hospitalId,
        parentId,
      },
      select: { id: true },
    });

    if (folders.length !== orderedIds.length) {
      return Response.json(
        { error: "같은 위치의 폴더만 순서를 변경할 수 있습니다." },
        { status: 400 },
      );
    }

    await database.$transaction(
      orderedIds.map((id, sortOrder) =>
        database.manualFolder.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );
  } else {
    const folderId =
      typeof body.folderId === "string" ? body.folderId.trim() : "";
    if (!folderId) {
      return Response.json(
        { error: "치료태그가 속한 폴더를 찾을 수 없습니다." },
        { status: 400 },
      );
    }

    const documents = await database.manualDocument.findMany({
      where: {
        id: { in: orderedIds },
        hospitalId: user.hospitalId,
        folderId,
      },
      select: { id: true },
    });

    if (documents.length !== orderedIds.length) {
      return Response.json(
        { error: "같은 폴더의 치료태그만 순서를 변경할 수 있습니다." },
        { status: 400 },
      );
    }

    await database.$transaction(
      orderedIds.map((id, sortOrder) =>
        database.manualDocument.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );
  }

  return Response.json({ orderedIds });
}
