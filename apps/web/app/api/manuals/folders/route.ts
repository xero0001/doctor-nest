import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: string }).code === "P2002"
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    parentId?: string | null;
  } | null;
  const name = body?.name?.trim() ?? "";
  const parentId = body?.parentId?.trim() || null;

  if (!name || name.length > 50) {
    return Response.json(
      { error: "폴더 이름을 1~50자로 입력해 주세요." },
      { status: 400 },
    );
  }

  const database = getDatabase();

  if (parentId) {
    const parent = await database.manualFolder.findFirst({
      where: { id: parentId, hospitalId: user.hospitalId },
      select: { id: true },
    });

    if (!parent) {
      return Response.json(
        { error: "상위 폴더를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
  }

  const lastFolder = await database.manualFolder.aggregate({
    where: { hospitalId: user.hospitalId, parentId },
    _max: { sortOrder: true },
  });

  try {
    const folder = await database.manualFolder.create({
      data: {
        hospitalId: user.hospitalId,
        parentId,
        name,
        sortOrder: (lastFolder._max.sortOrder ?? -1) + 1,
      },
      select: {
        id: true,
        parentId: true,
        name: true,
        sortOrder: true,
        isActive: true,
      },
    });

    return Response.json({ folder }, { status: 201 });
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
