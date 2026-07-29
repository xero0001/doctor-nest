import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  createInstagramAuthorizationUrl,
  getInstagramOAuthConfig,
} from "@/lib/instagram-api";

export const runtime = "nodejs";

const oauthStateCookie = "doctornest_instagram_oauth_state";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", "/service/settings/channels");
    return NextResponse.redirect(loginUrl);
  }

  let config;
  try {
    config = getInstagramOAuthConfig(request.url);
  } catch {
    const settingsUrl = new URL("/service/settings/channels", request.url);
    settingsUrl.searchParams.set("instagram", "configuration_error");
    return NextResponse.redirect(settingsUrl);
  }

  const state = randomBytes(32).toString("base64url");
  const authorizationUrl = createInstagramAuthorizationUrl({
    appId: config.appId,
    redirectUri: config.redirectUri,
    state,
  });
  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(oauthStateCookie, state, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/meta/instagram",
    maxAge: 10 * 60,
  });
  return response;
}
