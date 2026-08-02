import { redirect } from "next/navigation";

import { PermissionSettingsClient } from "@/features/settings/permissions/permission-settings-client";
import { ensurePermissionSettings } from "@/features/settings/permissions/permission-service";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PermissionSettingsPage() {
  const user = await requireUser("/service/settings/permissions");
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    redirect("/service/settings/accounts");
  }
  const profiles = await ensurePermissionSettings(user.hospitalId);

  return (
    <PermissionSettingsClient
      initialProfiles={profiles}
      currentAccount={{
        name: user.name,
        username: user.username,
        accessName: user.role === "OWNER" ? "마스터" : "관리자",
      }}
    />
  );
}
