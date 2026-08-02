import { getDatabase } from "@doctornest/database";

import { AccountsClient } from "@/features/settings/components/accounts-client";
import {
  canManageHospitalAccounts,
  listHospitalAccounts,
  MAX_HOSPITAL_ACCOUNTS,
} from "@/features/settings/server/account-records";
import type { AccountRole } from "@/features/settings/types/accounts";
import { ensurePermissionSettings } from "@/features/settings/permissions/permission-service";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const channelLabels = {
  KAKAO: "카카오 상담톡",
  LINE: "LINE",
  NAVER_TALK: "네이버 톡톡",
  WECHAT: "WeChat",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
} as const;

export default async function AccountsSettingsPage() {
  const user = await requireUser("/service/settings/accounts");
  const database = getDatabase();
  await ensurePermissionSettings(user.hospitalId);
  const [accounts, connections, assignments] = await Promise.all([
    listHospitalAccounts(user.hospitalId, user.id),
    database.channelConnection.findMany({
      where: { hospitalId: user.hospitalId, status: "CONNECTED" },
      orderBy: { connectedAt: "asc" },
      select: { channel: true, displayName: true },
    }),
    database.channelAssigneeSetting.findMany({
      where: { hospitalId: user.hospitalId },
      select: { channel: true, userId: true },
    }),
  ]);

  return (
    <AccountsClient
      initialAccounts={accounts}
      channels={connections.map((connection) => ({
        channel: connection.channel,
        displayName:
          connection.displayName || channelLabels[connection.channel],
        userId:
          assignments.find(
            (assignment) => assignment.channel === connection.channel,
          )?.userId ?? null,
      }))}
      currentRole={user.role as AccountRole}
      canManage={canManageHospitalAccounts(user.role)}
      maxAccounts={MAX_HOSPITAL_ACCOUNTS}
    />
  );
}
