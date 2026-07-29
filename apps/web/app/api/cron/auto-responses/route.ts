import { runDueAutoResponses } from "@/lib/auto-response";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDueAutoResponses();
    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("자동 응대 Cron 실행에 실패했습니다.", error);
    return Response.json(
      { error: "자동 응대 작업을 완료하지 못했습니다." },
      { status: 500 },
    );
  }
}
