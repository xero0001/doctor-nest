import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

type AutomationInput = {
  name?: unknown;
  tagIds?: unknown;
  nationality?: unknown;
  message?: unknown;
  messages?: unknown;
  isActive?: unknown;
};

function parseAutomationInput(body: AutomationInput | null) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const tagIds = Array.isArray(body?.tagIds)
    ? Array.from(
        new Set(
          body.tagIds.filter((id): id is string => typeof id === "string"),
        ),
      )
    : [];
  const nationality =
    typeof body?.nationality === "string" && body.nationality.trim()
      ? body.nationality.trim()
      : null;
  const messages = Array.isArray(body?.messages)
    ? body.messages
        .map((item, index) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const dayOffset =
            typeof record.dayOffset === "number" &&
            Number.isInteger(record.dayOffset)
              ? record.dayOffset
              : Number.NaN;
          const title =
            typeof record.title === "string" ? record.title.trim() : "";
          const content =
            typeof record.content === "string" ? record.content.trim() : "";
          return dayOffset >= 0 && title && content
            ? { dayOffset, title, content, sortOrder: index }
            : null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];
  const message = messages[0]?.content ?? "";
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : true;
  return { name, tagIds, nationality, message, messages, isActive };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const input = parseAutomationInput(
    (await request.json().catch(() => null)) as AutomationInput | null,
  );
  if (!input.name || input.tagIds.length === 0 || input.messages.length === 0) {
    return Response.json(
      { error: "명칭, 치료태그, 메시지를 모두 입력해 주세요." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const validTags = await database.patientTag.findMany({
    where: {
      id: { in: input.tagIds },
      hospitalId: user.hospitalId,
      category: "TREATMENT",
    },
    select: { id: true },
  });
  if (validTags.length !== input.tagIds.length) {
    return Response.json(
      { error: "사용할 수 없는 치료태그가 포함되어 있습니다." },
      { status: 400 },
    );
  }

  const conflictingTarget = await database.careAutomationTag.findFirst({
    where: { tagId: { in: input.tagIds } },
    select: { tagId: true },
  });
  if (conflictingTarget) {
    return Response.json(
      { error: "현재 설정된 치료태그로 설정된 자동화가 이미 존재합니다." },
      { status: 409 },
    );
  }

  let automation;
  try {
    automation = await database.careAutomation.create({
      data: {
        hospitalId: user.hospitalId,
        name: input.name,
        nationality: input.nationality,
        message: input.message,
        isActive: input.isActive,
        targetTags: {
          create: validTags.map((tag) => ({ tagId: tag.id })),
        },
        messages: { create: input.messages },
      },
      include: {
        targetTags: { include: { tag: true } },
        messages: { orderBy: { sortOrder: "asc" } },
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "현재 설정된 치료태그로 설정된 자동화가 이미 존재합니다." },
        { status: 409 },
      );
    }
    throw error;
  }
  const appliedCount = await database.patient.count({
    where: {
      hospitalId: user.hospitalId,
      ...(automation.nationality
        ? { nationality: automation.nationality }
        : {}),
      tagAssignments: {
        some: {
          tagId: { in: automation.targetTags.map(({ tagId }) => tagId) },
        },
      },
    },
  });

  return Response.json(
    {
      automation: {
        id: automation.id,
        name: automation.name,
        nationality: automation.nationality,
        message: automation.message,
        messages: automation.messages.map((scheduledMessage) => ({
          id: scheduledMessage.id,
          dayOffset: scheduledMessage.dayOffset,
          title: scheduledMessage.title,
          content: scheduledMessage.content,
          sortOrder: scheduledMessage.sortOrder,
        })),
        isActive: automation.isActive,
        appliedCount,
        sentCount: 0,
        tags: automation.targetTags.map(({ tag }) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        })),
        createdAt: automation.createdAt.toISOString(),
        updatedAt: automation.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
