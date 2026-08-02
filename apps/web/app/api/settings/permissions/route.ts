import { getDatabase } from "@doctornest/database";

import {
  isPermissionKey,
  PermissionKey,
} from "@/features/settings/permissions/permission-config";
import { listAccessProfiles } from "@/features/settings/permissions/permission-service";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return Response.json(
      { error: "마스터 또는 관리자 계정만 권한을 변경할 수 있습니다." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    profileId?: unknown;
    permissions?: unknown;
  } | null;
  const profileId =
    typeof body?.profileId === "string" ? body.profileId.trim() : "";
  const permissions = Array.isArray(body?.permissions)
    ? [...new Set(body.permissions.filter(isPermissionKey))]
    : null;

  if (!profileId || !permissions) {
    return Response.json(
      { error: "저장할 권한 프로필과 접근 범위를 확인해 주세요." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const profile = await database.hospitalAccessProfile.findFirst({
    where: { id: profileId, hospitalId: user.hospitalId },
    select: { id: true, key: true, isLocked: true },
  });
  if (!profile) {
    return Response.json(
      { error: "권한 프로필을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (profile.isLocked) {
    return Response.json(
      { error: "마스터 권한은 수정할 수 없습니다." },
      { status: 409 },
    );
  }
  if (user.role === "ADMIN" && profile.key === "ADMIN") {
    return Response.json(
      { error: "관리자는 자신의 관리자 권한을 변경할 수 없습니다." },
      { status: 403 },
    );
  }

  await database.hospitalAccessProfile.update({
    where: { id: profile.id },
    data: { permissions: permissions as PermissionKey[] },
  });

  return Response.json({ profiles: await listAccessProfiles(user.hospitalId) });
}
