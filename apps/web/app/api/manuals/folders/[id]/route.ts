import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: string }).code === "P2002"
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    isActive?: unknown;
  } | null;
  const hasName = Boolean(body && Object.hasOwn(body, "name"));
  const hasIsActive = Boolean(body && Object.hasOwn(body, "isActive"));
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (hasName && (!name || name.length > 50)) {
    return Response.json(
      { error: "폴더 이름을 1~50자로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (hasIsActive && typeof body?.isActive !== "boolean") {
    return Response.json(
      { error: "폴더 사용 여부 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (!hasName && !hasIsActive) {
    return Response.json(
      { error: "변경할 폴더 정보를 입력해 주세요." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const existingFolder = await database.manualFolder.findFirst({
    where: { id, hospitalId: user.hospitalId },
    select: { id: true },
  });

  if (!existingFolder) {
    return Response.json(
      { error: "폴더를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  try {
    let affectedFolderIds = [existingFolder.id];

    if (typeof body?.isActive === "boolean") {
      const hospitalFolders = await database.manualFolder.findMany({
        where: { hospitalId: user.hospitalId },
        select: { id: true, parentId: true },
      });
      const affectedIds = new Set([existingFolder.id]);
      let changed = true;

      while (changed) {
        changed = false;
        for (const folder of hospitalFolders) {
          if (
            folder.parentId &&
            affectedIds.has(folder.parentId) &&
            !affectedIds.has(folder.id)
          ) {
            affectedIds.add(folder.id);
            changed = true;
          }
        }
      }

      affectedFolderIds = Array.from(affectedIds);
      await database.manualFolder.updateMany({
        where: { id: { in: affectedFolderIds } },
        data: { isActive: body.isActive },
      });
    }

    const folder = await database.manualFolder.update({
      where: { id: existingFolder.id },
      data: {
        ...(hasName ? { name } : {}),
        ...(typeof body?.isActive === "boolean"
          ? { isActive: body.isActive }
          : {}),
      },
      select: {
        id: true,
        parentId: true,
        name: true,
        sortOrder: true,
        isActive: true,
      },
    });

    return Response.json({ folder, affectedFolderIds });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json(
        { error: "같은 이름의 폴더가 이미 있습니다." },
        { status: 409 },
      );
    }

    throw error;
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const database = getDatabase();
  const folder = await database.manualFolder.findFirst({
    where: { id, hospitalId: user.hospitalId },
    select: {
      id: true,
      _count: {
        select: {
          children: true,
          documents: true,
        },
      },
    },
  });

  if (!folder) {
    return Response.json(
      { error: "폴더를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const force = new URL(request.url).searchParams.get("force") === "true";
  const hasContents = folder._count.children > 0 || folder._count.documents > 0;

  if (hasContents && !force) {
    return Response.json(
      {
        error: "하위 폴더와 문서가 포함되어 있습니다.",
        requiresConfirmation: true,
      },
      { status: 409 },
    );
  }

  await database.manualFolder.delete({ where: { id: folder.id } });

  return Response.json({ deletedFolderId: folder.id });
}
