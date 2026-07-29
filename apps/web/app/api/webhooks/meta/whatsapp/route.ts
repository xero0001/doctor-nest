export const runtime = "nodejs";

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
