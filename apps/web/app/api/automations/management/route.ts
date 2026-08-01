import {
  getAutomationManagementDashboard,
  normalizeManagementMonth,
} from "@/features/automations/server/get-automation-management";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const month = normalizeManagementMonth(
    new URL(request.url).searchParams.get("month"),
  );
  const dashboard = await getAutomationManagementDashboard(
    user.hospitalId,
    month,
  );

  return Response.json(
    { dashboard },
    { headers: { "Cache-Control": "no-store" } },
  );
}
