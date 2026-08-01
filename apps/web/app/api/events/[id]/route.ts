import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import {
  eventImageCreateData,
  getContentEventCloudFrontUrl,
  parseContentEventInput,
  serializeContentEvent,
} from "@/lib/content-events";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const database = getDatabase();
  const existing = await database.contentEvent.findFirst({
    where: { id, hospitalId: user.hospitalId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json(
      { error: "이벤트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const keys = body ? Object.keys(body) : [];
  const quickToggle =
    keys.length === 1 &&
    (typeof body?.isActive === "boolean" ||
      typeof body?.isPinned === "boolean");

  if (quickToggle) {
    const event = await database.contentEvent.update({
      where: { id: existing.id },
      data: {
        ...(typeof body?.isActive === "boolean"
          ? { isActive: body.isActive }
          : {}),
        ...(typeof body?.isPinned === "boolean"
          ? { isPinned: body.isPinned }
          : {}),
      },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    return Response.json({ event: serializeContentEvent(event) });
  }

  const parsed = parseContentEventInput(body, user.hospitalId);
  if (!parsed.input) {
    return Response.json(
      { error: parsed.error ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    const input = parsed.input;
    const imageData = eventImageCreateData(
      input,
      getContentEventCloudFrontUrl(),
    );
    await database.$transaction(async (transaction) => {
      await transaction.contentEvent.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          summary: input.summary,
          originalPrice: input.originalPrice,
          discountAmount: input.discountAmount,
          currency: input.currency,
          isActive: input.isActive,
          isPinned: input.isPinned,
          exposureStartAt: input.exposureStartAt,
          exposureEndAt: input.exposureEndAt,
          detailType: input.detailType,
          detailText: input.detailText,
        },
      });
      await transaction.contentEventImage.deleteMany({
        where: { eventId: existing.id },
      });
      await transaction.contentEventImage.createMany({
        data: imageData.map((image) => ({
          eventId: existing.id,
          ...image,
        })),
      });
    });
    const event = await database.contentEvent.findUniqueOrThrow({
      where: { id: existing.id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    return Response.json({ event: serializeContentEvent(event) });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이벤트를 수정하지 못했습니다.",
      },
      { status: 503 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const event = await getDatabase().contentEvent.findFirst({
    where: { id, hospitalId: user.hospitalId },
    select: { id: true },
  });
  if (!event) {
    return Response.json(
      { error: "이벤트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  await getDatabase().contentEvent.delete({ where: { id: event.id } });
  return Response.json({ deletedEventId: event.id });
}
