import { getDatabase } from "@doctornest/database";

import {
  MAX_AI_CONTEXT_MESSAGE_COUNT,
  MAX_AUTO_RESPONSE_DELAY_MINUTES,
  MIN_AI_CONTEXT_MESSAGE_COUNT,
  MIN_AUTO_RESPONSE_DELAY_MINUTES,
  type AISettings,
} from "@/lib/ai-settings";
import { getCurrentUser } from "@/lib/auth";

function isValidInteger(value: unknown, minimum: number, maximum: number) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request
    .json()
    .catch(() => null)) as Partial<AISettings> | null;

  if (
    typeof body?.translationContextEnabled !== "boolean" ||
    typeof body.chatCoachContextEnabled !== "boolean" ||
    typeof body.autoResponseContextEnabled !== "boolean" ||
    !isValidInteger(
      body.translationContextMessageCount,
      MIN_AI_CONTEXT_MESSAGE_COUNT,
      MAX_AI_CONTEXT_MESSAGE_COUNT,
    ) ||
    !isValidInteger(
      body.chatCoachContextMessageCount,
      MIN_AI_CONTEXT_MESSAGE_COUNT,
      MAX_AI_CONTEXT_MESSAGE_COUNT,
    ) ||
    !isValidInteger(
      body.autoResponseContextMessageCount,
      MIN_AI_CONTEXT_MESSAGE_COUNT,
      MAX_AI_CONTEXT_MESSAGE_COUNT,
    ) ||
    !isValidInteger(
      body.autoResponseDelayMinutes,
      MIN_AUTO_RESPONSE_DELAY_MINUTES,
      MAX_AUTO_RESPONSE_DELAY_MINUTES,
    )
  ) {
    return Response.json(
      {
        error: `컨텍스트 메시지 수는 ${MIN_AI_CONTEXT_MESSAGE_COUNT}~${MAX_AI_CONTEXT_MESSAGE_COUNT}개, 자동 응대 대기시간은 ${MIN_AUTO_RESPONSE_DELAY_MINUTES}~${MAX_AUTO_RESPONSE_DELAY_MINUTES.toLocaleString("ko-KR")}분 사이의 정수로 입력해 주세요.`,
      },
      { status: 400 },
    );
  }

  const hospital = await getDatabase().hospital.update({
    where: { id: user.hospitalId },
    data: {
      translationContextEnabled: body.translationContextEnabled,
      translationContextMessageCount: body.translationContextMessageCount,
      chatCoachContextEnabled: body.chatCoachContextEnabled,
      chatCoachContextMessageCount: body.chatCoachContextMessageCount,
      autoResponseContextEnabled: body.autoResponseContextEnabled,
      autoResponseContextMessageCount: body.autoResponseContextMessageCount,
      autoResponseDelayMinutes: body.autoResponseDelayMinutes,
    },
    select: {
      translationContextEnabled: true,
      translationContextMessageCount: true,
      chatCoachContextEnabled: true,
      chatCoachContextMessageCount: true,
      autoResponseContextEnabled: true,
      autoResponseContextMessageCount: true,
      autoResponseDelayMinutes: true,
    },
  });

  return Response.json(hospital);
}
