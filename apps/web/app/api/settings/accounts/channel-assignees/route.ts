import { getDatabase } from "@doctornest/database";

import { canManageHospitalAccounts } from "@/features/settings/server/account-records";
import { getCurrentUser } from "@/lib/auth";

type SupportedChannel =
  "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM";

const channels = new Set<SupportedChannel>([
  "KAKAO",
  "LINE",
  "NAVER_TALK",
  "WECHAT",
  "WHATSAPP",
  "INSTAGRAM",
]);

function isSupportedChannel(value: string): value is SupportedChannel {
  return channels.has(value as SupportedChannel);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!canManageHospitalAccounts(user.role)) {
    return Response.json(
      { error: "채널 상담사를 지정할 권한이 없습니다." },
      { status: 403 },
    );
  }
  const body = (await request.json().catch(() => null)) as {
    channel?: unknown;
    userId?: unknown;
  } | null;
  const channel = typeof body?.channel === "string" ? body.channel : "";
  const userId = typeof body?.userId === "string" ? body.userId : null;
  if (!isSupportedChannel(channel)) {
    return Response.json(
      { error: "지원하지 않는 채널입니다." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const connection = await database.channelConnection.findFirst({
    where: {
      hospitalId: user.hospitalId,
      channel,
      status: "CONNECTED",
    },
    select: { id: true },
  });
  if (!connection) {
    return Response.json(
      { error: "연동된 채널에서만 상담사를 지정할 수 있습니다." },
      { status: 409 },
    );
  }

  if (!userId) {
    await database.channelAssigneeSetting.deleteMany({
      where: {
        hospitalId: user.hospitalId,
        channel,
      },
    });
    return Response.json({ channel, userId: null });
  }

  const assignee = await database.authUser.findFirst({
    where: { id: userId, hospitalId: user.hospitalId },
    select: { id: true },
  });
  if (!assignee) {
    return Response.json(
      { error: "상담사 계정을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  await database.channelAssigneeSetting.upsert({
    where: {
      hospitalId_channel: {
        hospitalId: user.hospitalId,
        channel: channel as
          "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM",
      },
    },
    create: { hospitalId: user.hospitalId, channel, userId },
    update: { userId },
  });

  return Response.json({ channel, userId });
}
