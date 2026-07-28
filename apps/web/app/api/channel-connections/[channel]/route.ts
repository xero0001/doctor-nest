import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

const supportedChannels = new Set([
  "KAKAO",
  "LINE",
  "NAVER_TALK",
  "WECHAT",
  "WHATSAPP",
  "INSTAGRAM",
]);

type RouteContext = {
  params: Promise<{ channel: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channel } = await params;

  if (!supportedChannels.has(channel)) {
    return Response.json(
      { error: "지원하지 않는 채널입니다." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    action?: "save" | "disconnect";
    displayName?: string;
    externalAccountId?: string;
  } | null;

  if (body?.action === "disconnect") {
    const connection = await getDatabase().channelConnection.update({
      where: {
        hospitalId_channel: {
          hospitalId: user.hospitalId,
          channel: channel as
            | "KAKAO"
            | "LINE"
            | "NAVER_TALK"
            | "WECHAT"
            | "WHATSAPP"
            | "INSTAGRAM",
        },
      },
      data: {
        status: "DISCONNECTED",
        externalAccountId: null,
        connectedAt: null,
        credentialsEncrypted: null,
      },
    });

    return Response.json({
      status: connection.status,
      displayName: connection.displayName,
      externalAccountId: connection.externalAccountId,
    });
  }

  const displayName = body?.displayName?.trim();
  const externalAccountId = body?.externalAccountId?.trim();

  if (!displayName || !externalAccountId) {
    return Response.json(
      { error: "채널 이름과 계정 식별자를 입력해 주세요." },
      { status: 400 },
    );
  }

  const connection = await getDatabase().channelConnection.upsert({
    where: {
      hospitalId_channel: {
        hospitalId: user.hospitalId,
        channel: channel as
          "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM",
      },
    },
    update: {
      displayName,
      externalAccountId,
      status: "CONFIGURING",
    },
    create: {
      hospitalId: user.hospitalId,
      channel: channel as
        "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM",
      displayName,
      externalAccountId,
      status: "CONFIGURING",
    },
  });

  return Response.json({
    status: connection.status,
    displayName: connection.displayName,
    externalAccountId: connection.externalAccountId,
  });
}
