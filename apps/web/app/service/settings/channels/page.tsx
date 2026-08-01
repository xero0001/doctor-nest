import { getDatabase } from "@doctornest/database";

import { HospitalSettingsSidebar } from "@/features/settings/components/hospital-settings-sidebar";
import { requireUser } from "@/lib/auth";

import { ChannelsClient } from "./channels-client";

export const dynamic = "force-dynamic";

export default async function ChannelSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ instagram?: string | string[] }>;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const instagramResult = Array.isArray(resolvedSearchParams.instagram)
    ? resolvedSearchParams.instagram[0]
    : resolvedSearchParams.instagram;
  const [connections, hospital] = await Promise.all([
    getDatabase().channelConnection.findMany({
      where: { hospitalId: user.hospitalId },
      orderBy: { channel: "asc" },
    }),
    getDatabase().hospital.findUniqueOrThrow({
      where: { id: user.hospitalId },
      select: {
        translationContextEnabled: true,
        translationContextMessageCount: true,
        chatCoachContextEnabled: true,
        chatCoachContextMessageCount: true,
        autoResponseContextEnabled: true,
        autoResponseContextMessageCount: true,
        autoResponseDelayMinutes: true,
      },
    }),
  ]);

  return (
    <div className="flex h-full min-h-0 min-w-[1180px] bg-[#f5f7fb]">
      <HospitalSettingsSidebar />
      <section className="min-w-0 flex-1">
        <ChannelsClient
          organizationName={user.hospital.name}
          appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
          instagramResult={instagramResult ?? null}
          instagramOAuthConfigured={Boolean(
            process.env.META_INSTAGRAM_APP_ID &&
            process.env.META_INSTAGRAM_APP_SECRET,
          )}
          aiSettings={{
            translationContextEnabled: hospital.translationContextEnabled,
            translationContextMessageCount:
              hospital.translationContextMessageCount,
            chatCoachContextEnabled: hospital.chatCoachContextEnabled,
            chatCoachContextMessageCount: hospital.chatCoachContextMessageCount,
            autoResponseContextEnabled: hospital.autoResponseContextEnabled,
            autoResponseContextMessageCount:
              hospital.autoResponseContextMessageCount,
            autoResponseDelayMinutes: hospital.autoResponseDelayMinutes,
          }}
          connections={connections.map((connection) => ({
            channel: connection.channel,
            status: connection.status,
            displayName: connection.displayName,
            externalAccountId: connection.externalAccountId,
            webhookToken: connection.webhookToken,
            hasCredentials: Boolean(connection.credentialsEncrypted),
          }))}
        />
      </section>
    </div>
  );
}
