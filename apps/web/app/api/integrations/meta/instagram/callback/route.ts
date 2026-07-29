import { getDatabase } from "@doctornest/database";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { encryptChannelCredentials } from "@/lib/channel-credentials";
import {
  exchangeInstagramCode,
  exchangeInstagramLongLivedToken,
  getInstagramAccountProfile,
  getInstagramOAuthConfig,
  subscribeInstagramWebhooks,
} from "@/lib/instagram-api";

export const runtime = "nodejs";

const oauthStateCookie = "doctornest_instagram_oauth_state";

function redirectToSettings(request: Request, result: string) {
  const url = new URL("/service/settings/channels", request.url);
  url.searchParams.set("instagram", result);
  const response = NextResponse.redirect(url);
  response.cookies.delete({
    name: oauthStateCookie,
    path: "/api/integrations/meta/instagram",
  });
  return response;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectToSettings(request, "session_expired");

  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code")?.trim();
  const state = searchParams.get("state")?.trim();
  const expectedState = (await cookies()).get(oauthStateCookie)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToSettings(request, "invalid_state");
  }

  try {
    const config = getInstagramOAuthConfig(request.url);
    const shortLivedToken = await exchangeInstagramCode({
      code,
      appId: config.appId,
      appSecret: config.appSecret,
      redirectUri: config.redirectUri,
    });
    const longLivedToken = await exchangeInstagramLongLivedToken({
      accessToken: shortLivedToken.accessToken,
      appSecret: config.appSecret,
    });
    const profile = await getInstagramAccountProfile(
      shortLivedToken.userId,
      longLivedToken.accessToken,
    );
    const instagramUserId = profile.id || shortLivedToken.userId;
    const database = getDatabase();
    const conflictingConnection = await database.channelConnection.findFirst({
      where: {
        channel: "INSTAGRAM",
        externalAccountId: instagramUserId,
        hospitalId: { not: user.hospitalId },
        status: { not: "DISCONNECTED" },
      },
      select: { id: true },
    });

    if (conflictingConnection) {
      return redirectToSettings(request, "already_connected");
    }

    await subscribeInstagramWebhooks(
      instagramUserId,
      longLivedToken.accessToken,
    );

    const credentialsEncrypted = encryptChannelCredentials({
      instagramUserId,
      username: profile.username,
      accessToken: longLivedToken.accessToken,
      expiresAt: longLivedToken.expiresAt,
    });

    await database.channelConnection.upsert({
      where: {
        hospitalId_channel: {
          hospitalId: user.hospitalId,
          channel: "INSTAGRAM",
        },
      },
      update: {
        status: "CONNECTED",
        displayName: `@${profile.username}`,
        externalAccountId: instagramUserId,
        credentialsEncrypted,
        connectedAt: new Date(),
      },
      create: {
        hospitalId: user.hospitalId,
        channel: "INSTAGRAM",
        status: "CONNECTED",
        displayName: `@${profile.username}`,
        externalAccountId: instagramUserId,
        credentialsEncrypted,
        connectedAt: new Date(),
      },
    });

    return redirectToSettings(request, "connected");
  } catch {
    return redirectToSettings(request, "connection_failed");
  }
}
