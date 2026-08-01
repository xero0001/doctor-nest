import {
  runDueAutoResponses,
  runDueChannelAutoReplies,
} from "@/lib/auto-response";

export const runtime = "nodejs";
export const maxDuration = 90;

const CHANNEL_AUTO_REPLY_POLL_INTERVAL_MS = 15_000;
const CHANNEL_AUTO_REPLY_POLLS_PER_INVOCATION = 4;

function waitUntil(timestamp: number) {
  const delay = Math.max(0, timestamp - Date.now());
  return new Promise<void>((resolve) => setTimeout(resolve, delay));
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    const channelAutoReplyRuns = [await runDueChannelAutoReplies()];
    const aiAutoResponsePromise = runDueAutoResponses()
      .then((result) => ({ result, error: null }))
      .catch((error: unknown) => ({ result: null, error }));

    for (
      let poll = 1;
      poll < CHANNEL_AUTO_REPLY_POLLS_PER_INVOCATION;
      poll += 1
    ) {
      await waitUntil(startedAt + poll * CHANNEL_AUTO_REPLY_POLL_INTERVAL_MS);
      channelAutoReplyRuns.push(await runDueChannelAutoReplies());
    }

    const aiAutoResponse = await aiAutoResponsePromise;
    if (aiAutoResponse.error) throw aiAutoResponse.error;

    return Response.json(
      {
        pollIntervalSeconds: CHANNEL_AUTO_REPLY_POLL_INTERVAL_MS / 1_000,
        channelAutoReplyRuns,
        aiAutoResponses: aiAutoResponse.result,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("자동 응대 Cron 실행에 실패했습니다.", error);
    return Response.json(
      { error: "자동 응대 작업을 완료하지 못했습니다." },
      { status: 500 },
    );
  }
}
