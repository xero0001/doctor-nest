import { getDatabase } from "@doctornest/database";

import { normalizeCustomerTagColor } from "@/features/settings/customer-tags/customer-tag-colors";
import { getCurrentUser } from "@/lib/auth";

const MAX_CUSTOMER_TAGS = 5;

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

async function serializeTags(hospitalId: string) {
  const tags = await getDatabase().patientTag.findMany({
    where: { hospitalId, category: "STATUS" },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assignments: true } } },
  });
  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    assignmentCount: tag._count.assignments,
  }));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return Response.json({ tags: await serializeTags(user.hospitalId) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    color?: unknown;
  } | null;
  const name = normalizeName(body?.name);
  const color = normalizeCustomerTagColor(body?.color);
  if (!name || name.length > 30 || !color) {
    return Response.json(
      { error: "태그명과 색상을 확인해 주세요." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const [count, duplicate] = await Promise.all([
    database.patientTag.count({
      where: { hospitalId: user.hospitalId, category: "STATUS" },
    }),
    database.patientTag.findFirst({
      where: { hospitalId: user.hospitalId, name },
      select: { id: true },
    }),
  ]);
  if (count >= MAX_CUSTOMER_TAGS) {
    return Response.json(
      {
        error: `고객태그는 최대 ${MAX_CUSTOMER_TAGS}개까지 등록할 수 있습니다.`,
      },
      { status: 409 },
    );
  }
  if (duplicate) {
    return Response.json(
      { error: "같은 이름의 태그가 이미 존재합니다." },
      { status: 409 },
    );
  }

  await database.patientTag.create({
    data: {
      hospitalId: user.hospitalId,
      name,
      category: "STATUS",
      color,
    },
  });
  return Response.json(
    { tags: await serializeTags(user.hospitalId) },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    name?: unknown;
    color?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const name = normalizeName(body?.name);
  const color = normalizeCustomerTagColor(body?.color);
  if (!id || !name || name.length > 30 || !color) {
    return Response.json(
      { error: "수정할 태그의 이름과 색상을 확인해 주세요." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const [tag, duplicate] = await Promise.all([
    database.patientTag.findFirst({
      where: { id, hospitalId: user.hospitalId, category: "STATUS" },
      select: { id: true },
    }),
    database.patientTag.findFirst({
      where: { hospitalId: user.hospitalId, name, NOT: { id } },
      select: { id: true },
    }),
  ]);
  if (!tag) {
    return Response.json(
      { error: "고객태그를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (duplicate) {
    return Response.json(
      { error: "같은 이름의 태그가 이미 존재합니다." },
      { status: 409 },
    );
  }

  await database.patientTag.update({ where: { id }, data: { name, color } });
  return Response.json({ tags: await serializeTags(user.hospitalId) });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const database = getDatabase();
  const tag = await database.patientTag.findFirst({
    where: { id, hospitalId: user.hospitalId, category: "STATUS" },
    include: { _count: { select: { assignments: true } } },
  });
  if (!tag) {
    return Response.json(
      { error: "고객태그를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (tag._count.assignments > 0) {
    return Response.json(
      { error: "고객에게 사용 중인 태그는 삭제할 수 없습니다." },
      { status: 409 },
    );
  }

  await database.patientTag.delete({ where: { id } });
  return Response.json({ tags: await serializeTags(user.hospitalId) });
}
