import { PermissionSettingsClient } from "@/features/settings/permissions/permission-settings-client";
import { ensurePermissionSettings } from "@/features/settings/permissions/permission-service";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PermissionSettingsPage() {
  const user = await requireUser("/service/settings/permissions");
  const profiles = await ensurePermissionSettings(user.hospitalId, user.id);

  return (
    <PermissionSettingsClient
      initialProfiles={profiles}
      masterAccount={{
        name: user.name,
        username: user.username,
      }}
    />
  );
}
