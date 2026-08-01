import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import {
  eventImageCreateData,
  getContentEventCloudFrontUrl,
  parseContentEventInput,
  serializeContentEvent,
} from "@/lib/content-events";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const events = await getDatabase().contentEvent.findMany({
    where: { hospitalId: user.hospitalId },
    include: { images: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
  return Response.json({ events: events.map(serializeContentEvent) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = parseContentEventInput(
    (await request.json().catch(() => null)) as Record<string, unknown> | null,
    user.hospitalId,
  );
  if (!parsed.input) {
    return Response.json(
      { error: parsed.error ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    const input = parsed.input;
    const cloudFrontUrl = getContentEventCloudFrontUrl();
    const event = await getDatabase().contentEvent.create({
      data: {
        hospitalId: user.hospitalId,
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
        images: {
          create: eventImageCreateData(input, cloudFrontUrl),
        },
      },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    return Response.json(
      { event: serializeContentEvent(event) },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이벤트를 등록하지 못했습니다.",
      },
      { status: 503 },
    );
  }
}
