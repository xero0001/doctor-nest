import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import {
  MAX_TRANSLATION_CONTEXT_MESSAGE_COUNT,
  MIN_TRANSLATION_CONTEXT_MESSAGE_COUNT,
} from "@/lib/translation-context";

export async function PUT(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    translationContextEnabled?: boolean;
    translationContextMessageCount?: number;
  } | null;

  if (
    typeof body?.translationContextEnabled !== "boolean" ||
    !Number.isInteger(body.translationContextMessageCount) ||
    body.translationContextMessageCount! <
      MIN_TRANSLATION_CONTEXT_MESSAGE_COUNT ||
    body.translationContextMessageCount! > MAX_TRANSLATION_CONTEXT_MESSAGE_COUNT
  ) {
    return Response.json(
      {
        error: `컨텍스트 메시지 수는 ${MIN_TRANSLATION_CONTEXT_MESSAGE_COUNT}~${MAX_TRANSLATION_CONTEXT_MESSAGE_COUNT} 사이의 정수로 입력해 주세요.`,
      },
      { status: 400 },
    );
  }

  const hospital = await getDatabase().hospital.update({
    where: { id: user.hospitalId },
    data: {
      translationContextEnabled: body.translationContextEnabled,
      translationContextMessageCount: body.translationContextMessageCount,
    },
    select: {
      translationContextEnabled: true,
      translationContextMessageCount: true,
    },
  });

  return Response.json(hospital);
}
