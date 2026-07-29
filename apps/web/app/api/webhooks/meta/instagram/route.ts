import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

type InstagramWebhookPayload = {
  object?: string;
  entry?: unknown[];
};

function hasValidSignature(
  rawBody: string,
  signature: string,
  appSecret: string,
) {
  const [algorithm, receivedHex] = signature.split("=");

  if (
    algorithm !== "sha256" ||
    !receivedHex ||
    !/^[a-f0-9]{64}$/i.test(receivedHex)
  ) {
    return false;
  }

  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const received = Buffer.from(receivedHex, "hex");

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export async function GET(request: Request) {
  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken) {
    return Response.json(
      { error: "Meta Webhook 인증 토큰이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode !== "subscribe" ||
    verifyToken !== expectedToken ||
    !challenge
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET;

  if (!appSecret) {
    return Response.json(
      { error: "Instagram 앱 시크릿이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!signature || !hasValidSignature(rawBody, signature, appSecret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: InstagramWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as InstagramWebhookPayload;
  } catch {
    return Response.json(
      { error: "올바른 Instagram Webhook JSON이 필요합니다." },
      { status: 400 },
    );
  }

  if (payload.object !== "instagram" || !Array.isArray(payload.entry)) {
    return Response.json(
      { error: "지원하지 않는 Instagram Webhook입니다." },
      { status: 400 },
    );
  }

  return Response.json({ received: true });
}
