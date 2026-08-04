const defaultGraphApiVersion = "v25.0";

type InstagramTokenResponse = {
  access_token?: string;
  user_id?: number | string;
  expires_in?: number;
};

type InstagramApiError = {
  error?: {
    message?: string;
  };
};

export type InstagramProfile = {
  id: string;
  username: string;
  name?: string;
  account_type?: string;
  profile_pic?: string;
};

function getGraphApiVersion() {
  return process.env.META_GRAPH_API_VERSION?.trim() || defaultGraphApiVersion;
}

function getAppUrl(requestUrl?: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  if (requestUrl) return new URL(requestUrl).origin;
  return "http://localhost:3000";
}

export function getInstagramOAuthConfig(requestUrl?: string) {
  const appId = process.env.META_INSTAGRAM_APP_ID?.trim();
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET?.trim();
  const redirectUri =
    process.env.META_INSTAGRAM_REDIRECT_URI?.trim() ||
    `${getAppUrl(requestUrl)}/api/integrations/meta/instagram/callback`;

  if (!appId || !appSecret) {
    throw new Error("Instagram 앱 ID와 앱 시크릿 설정이 필요합니다.");
  }

  return { appId, appSecret, redirectUri };
}

export function createInstagramAuthorizationUrl({
  appId,
  redirectUri,
  state,
}: {
  appId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    ["instagram_business_basic", "instagram_business_manage_messages"].join(
      ",",
    ),
  );
  url.searchParams.set("state", state);
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");
  return url;
}

async function getInstagramError(response: Response) {
  const body = (await response
    .json()
    .catch(() => null)) as InstagramApiError | null;
  return body?.error?.message || `Instagram API 오류 (${response.status})`;
}

export async function exchangeInstagramCode({
  code,
  appId,
  appSecret,
  redirectUri,
}: {
  code: string;
  appId: string;
  appSecret: string;
  redirectUri: string;
}) {
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await getInstagramError(response));
  }

  const token = (await response.json()) as InstagramTokenResponse;
  if (!token.access_token || !token.user_id) {
    throw new Error("Instagram 액세스 토큰 응답이 올바르지 않습니다.");
  }

  return {
    accessToken: token.access_token,
    userId: String(token.user_id),
  };
}

export async function exchangeInstagramLongLivedToken({
  accessToken,
  appSecret,
}: {
  accessToken: string;
  appSecret: string;
}) {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await getInstagramError(response));
  }

  const token = (await response.json()) as InstagramTokenResponse;
  if (!token.access_token) {
    throw new Error("Instagram 장기 액세스 토큰을 받지 못했습니다.");
  }

  return {
    accessToken: token.access_token,
    expiresAt:
      typeof token.expires_in === "number"
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null,
  };
}

export async function getInstagramAccountProfile(
  userId: string,
  accessToken: string,
) {
  const url = new URL(
    `https://graph.instagram.com/${getGraphApiVersion()}/${encodeURIComponent(userId)}`,
  );
  url.searchParams.set("fields", "id,user_id,username,name,account_type");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await getInstagramError(response));
  }

  const profile = (await response.json()) as InstagramProfile & {
    user_id?: string;
  };
  if (!profile.username) {
    throw new Error("Instagram 계정 정보를 읽지 못했습니다.");
  }

  return {
    ...profile,
    id: String(profile.user_id || profile.id || userId),
  };
}

export async function getInstagramCustomerProfile(
  instagramScopedId: string,
  accessToken: string,
) {
  const url = new URL(
    `https://graph.instagram.com/${getGraphApiVersion()}/${encodeURIComponent(instagramScopedId)}`,
  );
  url.searchParams.set("fields", "id,username,name,profile_pic");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) return null;
  return (await response.json().catch(() => null)) as InstagramProfile | null;
}

export async function subscribeInstagramWebhooks(
  instagramUserId: string,
  accessToken: string,
) {
  const url = new URL(
    `https://graph.instagram.com/${getGraphApiVersion()}/${encodeURIComponent(instagramUserId)}/subscribed_apps`,
  );
  url.searchParams.set(
    "subscribed_fields",
    "messages,messaging_postbacks,messaging_seen,message_reactions",
  );

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await getInstagramError(response));
  }

  const result = (await response.json()) as { success?: boolean };
  if (!result.success) {
    throw new Error("Instagram 메시지 웹훅을 구독하지 못했습니다.");
  }
}

export async function unsubscribeInstagramWebhooks(
  instagramUserId: string,
  accessToken: string,
) {
  const url = new URL(
    `https://graph.instagram.com/${getGraphApiVersion()}/${encodeURIComponent(instagramUserId)}/subscribed_apps`,
  );
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }).catch(() => null);

  return Boolean(response?.ok);
}

export async function sendInstagramTextMessage({
  instagramUserId,
  recipientId,
  accessToken,
  text,
}: {
  instagramUserId: string;
  recipientId: string;
  accessToken: string;
  text: string;
}) {
  const response = await fetch(
    `https://graph.instagram.com/${getGraphApiVersion()}/${encodeURIComponent(instagramUserId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response?.ok) {
    throw new Error(
      response
        ? await getInstagramError(response)
        : "Instagram API에 연결하지 못했습니다.",
    );
  }

  return (await response.json().catch(() => null)) as {
    message_id?: string;
    recipient_id?: string;
  } | null;
}

export async function sendInstagramImageMessage({
  instagramUserId,
  recipientId,
  accessToken,
  imageUrl,
}: {
  instagramUserId: string;
  recipientId: string;
  accessToken: string;
  imageUrl: string;
}) {
  const response = await fetch(
    `https://graph.instagram.com/${getGraphApiVersion()}/${encodeURIComponent(instagramUserId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: "image",
            payload: { url: imageUrl },
          },
        },
      }),
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response?.ok) {
    throw new Error(
      response
        ? await getInstagramError(response)
        : "Instagram API에 연결하지 못했습니다.",
    );
  }

  return (await response.json().catch(() => null)) as {
    message_id?: string;
    recipient_id?: string;
  } | null;
}
