import { getDatabase } from "@doctornest/database";

import { requireUser } from "@/lib/auth";

import { ChannelsClient } from "./channels-client";

export const dynamic = "force-dynamic";

export default async function ChannelSettingsPage() {
  const user = await requireUser();
  const connections = await getDatabase().channelConnection.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { channel: "asc" },
  });

  return (
    <ChannelsClient
      organizationName={user.organization.name}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
      connections={connections.map((connection) => ({
        channel: connection.channel,
        status: connection.status,
        displayName: connection.displayName,
        externalAccountId: connection.externalAccountId,
        webhookToken: connection.webhookToken,
      }))}
    />
  );
}
