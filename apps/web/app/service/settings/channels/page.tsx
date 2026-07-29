import { getDatabase } from "@doctornest/database";

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
      },
    }),
  ]);

  return (
    <ChannelsClient
      organizationName={user.hospital.name}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
      instagramResult={instagramResult ?? null}
      instagramOAuthConfigured={Boolean(
        process.env.META_INSTAGRAM_APP_ID &&
        process.env.META_INSTAGRAM_APP_SECRET,
      )}
      translationSettings={{
        contextEnabled: hospital.translationContextEnabled,
        contextMessageCount: hospital.translationContextMessageCount,
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
  );
}
