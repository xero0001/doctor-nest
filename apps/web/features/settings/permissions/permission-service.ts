import { getDatabase } from "@doctornest/database";

import {
  AccessProfileRecord,
  allPermissionKeys,
  defaultAccessProfiles,
  isPermissionKey,
} from "@/features/settings/permissions/permission-config";

type AccessProfileWithCount = {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: string[];
  isLocked: boolean;
  sortOrder: number;
  _count: { users: number };
};

export function serializeAccessProfile(
  profile: AccessProfileWithCount,
): AccessProfileRecord {
  return {
    id: profile.id,
    key: profile.key,
    name: profile.name,
    description: profile.description,
    permissions: profile.permissions.filter(isPermissionKey),
    isLocked: profile.isLocked,
    sortOrder: profile.sortOrder,
    userCount: profile._count.users,
  };
}

export async function listAccessProfiles(hospitalId: string) {
  const profiles = await getDatabase().hospitalAccessProfile.findMany({
    where: { hospitalId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return profiles.map(serializeAccessProfile);
}

export async function ensurePermissionSettings(
  hospitalId: string,
  currentUserId: string,
) {
  const database = getDatabase();

  await database.$transaction(async (transaction) => {
    for (const profile of defaultAccessProfiles) {
      await transaction.hospitalAccessProfile.upsert({
        where: { hospitalId_key: { hospitalId, key: profile.key } },
        update: {
          name: profile.name,
          description: profile.description,
          isLocked: profile.isLocked,
          sortOrder: profile.sortOrder,
          ...(profile.key === "MASTER"
            ? { permissions: allPermissionKeys }
            : {}),
        },
        create: {
          hospitalId,
          key: profile.key,
          name: profile.name,
          description: profile.description,
          permissions: [...profile.permissions],
          isLocked: profile.isLocked,
          sortOrder: profile.sortOrder,
        },
      });
    }

    const profiles = await transaction.hospitalAccessProfile.findMany({
      where: { hospitalId, key: { in: ["MASTER", "ADMIN", "STAFF"] } },
      select: { id: true, key: true },
    });
    const profileIds = new Map(
      profiles.map((profile) => [profile.key, profile.id]),
    );
    const masterProfileId = profileIds.get("MASTER");
    const adminProfileId = profileIds.get("ADMIN");
    const staffProfileId = profileIds.get("STAFF");
    if (!masterProfileId || !adminProfileId || !staffProfileId) {
      throw new Error("기본 권한 프로필을 준비하지 못했습니다.");
    }

    await transaction.authUser.updateMany({
      where: {
        hospitalId,
        accessProfileId: null,
        role: "ADMIN",
      },
      data: { accessProfileId: adminProfileId },
    });
    await transaction.authUser.updateMany({
      where: {
        hospitalId,
        accessProfileId: null,
        role: "AGENT",
      },
      data: { accessProfileId: staffProfileId },
    });

    await transaction.authUser.updateMany({
      where: { id: currentUserId, hospitalId },
      data: { role: "OWNER", accessProfileId: masterProfileId },
    });
  });

  return listAccessProfiles(hospitalId);
}
