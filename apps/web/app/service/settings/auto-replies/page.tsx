import { getDatabase } from "@doctornest/database";

import { ChannelAutoReplyClient } from "@/features/settings/components/channel-auto-reply-client";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const channels = [
  "KAKAO",
  "INSTAGRAM",
  "NAVER_TALK",
  "LINE",
  "WECHAT",
  "WHATSAPP",
] as const;

const defaultOutsideMessage =
  "안녕하세요. 현재는 병원 운영시간이 아닙니다. 성함과 연락처를 남겨주시면 상담 가능한 시간에 순서대로 안내해 드리겠습니다.";

export default async function AutoRepliesSettingsPage() {
  const user = await requireUser("/service/settings/auto-replies");
  const database = getDatabase();
  const [connections, savedSettings] = await Promise.all([
    database.channelConnection.findMany({
      where: { hospitalId: user.hospitalId },
      select: { channel: true, status: true },
    }),
    database.channelAutoReplySetting.findMany({
      where: { hospitalId: user.hospitalId },
    }),
  ]);

  return (
    <ChannelAutoReplyClient
      initialSettings={channels.map((channel) => {
        const saved = savedSettings.find(
          (setting) => setting.channel === channel,
        );
        return {
          channel,
          connected: connections.some(
            (connection) =>
              connection.channel === channel &&
              connection.status === "CONNECTED",
          ),
          delayMinutes: saved?.delayMinutes ?? 1,
          businessHoursEnabled: saved?.businessHoursEnabled ?? false,
          businessHoursMessage: saved?.businessHoursMessage ?? "",
          outsideBusinessHoursEnabled:
            saved?.outsideBusinessHoursEnabled ?? true,
          outsideBusinessHoursMessage:
            saved?.outsideBusinessHoursMessage ?? defaultOutsideMessage,
        };
      })}
    />
  );
}
