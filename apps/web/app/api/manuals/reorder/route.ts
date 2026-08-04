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

function normalizeId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasExactIds(actualIds: string[], expectedIds: string[]) {
  return (
    actualIds.length === expectedIds.length &&
    actualIds.every((id) => expectedIds.includes(id))
  );
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    itemId?: unknown;
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
    const itemId = normalizeId(body.itemId);
    const parentId =
      typeof body.parentId === "string" && body.parentId.trim()
        ? body.parentId.trim()
        : null;

    if (!itemId || !orderedIds.includes(itemId)) {
      return Response.json(
        { error: "이동할 폴더를 찾을 수 없습니다." },
        { status: 400 },
      );
    }

    const [movingFolder, targetParent, hospitalFolders] = await Promise.all([
      database.manualFolder.findFirst({
        where: { id: itemId, hospitalId: user.hospitalId },
        select: { id: true, parentId: true },
      }),
      parentId
        ? database.manualFolder.findFirst({
            where: { id: parentId, hospitalId: user.hospitalId },
            select: { id: true },
          })
        : Promise.resolve(null),
      database.manualFolder.findMany({
        where: { hospitalId: user.hospitalId },
        select: { id: true, parentId: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

    if (!movingFolder || (parentId && !targetParent)) {
      return Response.json(
        { error: "이동할 위치를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const descendantIds = new Set([movingFolder.id]);
    let addedDescendant = true;
    while (addedDescendant) {
      addedDescendant = false;
      for (const folder of hospitalFolders) {
        if (
          folder.parentId &&
          descendantIds.has(folder.parentId) &&
          !descendantIds.has(folder.id)
        ) {
          descendantIds.add(folder.id);
          addedDescendant = true;
        }
      }
    }

    if (parentId && descendantIds.has(parentId)) {
      return Response.json(
        { error: "폴더를 자기 자신이나 하위 폴더 안으로 옮길 수 없습니다." },
        { status: 400 },
      );
    }

    const targetSiblingIds = hospitalFolders
      .filter(
        (folder) =>
          folder.parentId === parentId && folder.id !== movingFolder.id,
      )
      .map((folder) => folder.id);
    const expectedTargetIds = [...targetSiblingIds, movingFolder.id];

    if (!hasExactIds(orderedIds, expectedTargetIds)) {
      return Response.json(
        { error: "대상 위치의 폴더 순서가 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const sourceSiblings =
      movingFolder.parentId === parentId
        ? []
        : hospitalFolders.filter(
            (folder) =>
              folder.parentId === movingFolder.parentId &&
              folder.id !== movingFolder.id,
          );

    await database.$transaction([
      ...sourceSiblings.map((folder, sortOrder) =>
        database.manualFolder.update({
          where: { id: folder.id },
          data: { sortOrder },
        }),
      ),
      ...orderedIds.map((id, sortOrder) =>
        database.manualFolder.update({
          where: { id },
          data: {
            sortOrder,
            ...(id === movingFolder.id ? { parentId } : {}),
          },
        }),
      ),
    ]);
  } else {
    const itemId = normalizeId(body.itemId);
    const folderId =
      typeof body.folderId === "string" ? body.folderId.trim() : "";
    if (!itemId || !folderId || !orderedIds.includes(itemId)) {
      return Response.json(
        { error: "이동할 치료태그와 폴더를 확인해 주세요." },
        { status: 400 },
      );
    }

    const [movingDocument, targetFolder, hospitalDocuments] =
      await Promise.all([
        database.manualDocument.findFirst({
          where: { id: itemId, hospitalId: user.hospitalId },
          select: { id: true, folderId: true },
        }),
        database.manualFolder.findFirst({
          where: { id: folderId, hospitalId: user.hospitalId },
          select: { id: true },
        }),
        database.manualDocument.findMany({
          where: { hospitalId: user.hospitalId },
          select: { id: true, folderId: true, sortOrder: true },
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        }),
      ]);

    if (!movingDocument || !targetFolder) {
      return Response.json(
        { error: "이동할 치료태그 또는 폴더를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const targetSiblingIds = hospitalDocuments
      .filter(
        (document) =>
          document.folderId === folderId && document.id !== movingDocument.id,
      )
      .map((document) => document.id);
    const expectedTargetIds = [...targetSiblingIds, movingDocument.id];

    if (!hasExactIds(orderedIds, expectedTargetIds)) {
      return Response.json(
        { error: "대상 폴더의 치료태그 순서가 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const sourceSiblings =
      movingDocument.folderId === folderId
        ? []
        : hospitalDocuments.filter(
            (document) =>
              document.folderId === movingDocument.folderId &&
              document.id !== movingDocument.id,
          );

    await database.$transaction([
      ...sourceSiblings.map((document, sortOrder) =>
        database.manualDocument.update({
          where: { id: document.id },
          data: { sortOrder },
        }),
      ),
      ...orderedIds.map((id, sortOrder) =>
        database.manualDocument.update({
          where: { id },
          data: {
            sortOrder,
            ...(id === movingDocument.id ? { folderId } : {}),
          },
        }),
      ),
    ]);
  }

  return Response.json({ orderedIds });
}
