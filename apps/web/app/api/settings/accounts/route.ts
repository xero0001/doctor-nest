import { randomUUID } from "node:crypto";

import { getDatabase } from "@doctornest/database";
import { hashPassword } from "better-auth/crypto";

import {
  canManageHospitalAccounts,
  listHospitalAccounts,
  MAX_HOSPITAL_ACCOUNTS,
} from "@/features/settings/server/account-records";
import { ensurePermissionSettings } from "@/features/settings/permissions/permission-service";
import type {
  AccountAccessProfileKey,
  AccountRole,
} from "@/features/settings/types/accounts";
import { getCurrentUser } from "@/lib/auth";

const usernamePattern = /^[a-zA-Z0-9._-]{3,30}$/;
const accessProfileKeys = new Set<AccountAccessProfileKey>([
  "MASTER",
  "ADMIN",
  "STAFF",
  "STAFF_2",
  "STAFF_3",
]);

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function isAccessProfileKey(value: unknown): value is AccountAccessProfileKey {
  return (
    typeof value === "string" &&
    accessProfileKeys.has(value as AccountAccessProfileKey)
  );
}

function authRoleForProfile(key: AccountAccessProfileKey): AccountRole {
  if (key === "MASTER") return "OWNER";
  if (key === "ADMIN") return "ADMIN";
  return "AGENT";
}

async function resolveAccessProfile(
  hospitalId: string,
  key: AccountAccessProfileKey,
) {
  await ensurePermissionSettings(hospitalId);
  return getDatabase().hospitalAccessProfile.findUnique({
    where: { hospitalId_key: { hospitalId, key } },
    select: { id: true },
  });
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

async function requireManager() {
  const user = await getCurrentUser();
  if (!user) return { response: errorResponse("로그인이 필요합니다.", 401) };
  if (!canManageHospitalAccounts(user.role)) {
    return {
      response: errorResponse("계정을 관리할 권한이 없습니다.", 403),
    };
  }
  return { user };
}

export async function POST(request: Request) {
  const access = await requireManager();
  if ("response" in access) return access.response;
  const { user } = access;
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    username?: unknown;
    password?: unknown;
    jobTitle?: unknown;
    accessProfileKey?: unknown;
    isDefaultAssignee?: unknown;
  } | null;
  const name = normalizeText(body?.name, 40);
  const username =
    typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const jobTitle = normalizeText(body?.jobTitle, 30);
  const accessProfileKey = body?.accessProfileKey;
  const isDefaultAssignee = body?.isDefaultAssignee === true;

  if (!name || !jobTitle || !isAccessProfileKey(accessProfileKey)) {
    return errorResponse("이름, 직급과 권한을 확인해 주세요.", 400);
  }
  if (!usernamePattern.test(username)) {
    return errorResponse(
      "아이디는 영문, 숫자, 마침표, 밑줄, 하이픈으로 3~30자까지 입력해 주세요.",
      400,
    );
  }
  if (password.length < 8 || password.length > 72) {
    return errorResponse("임시 비밀번호는 8~72자로 입력해 주세요.", 400);
  }
  if (accessProfileKey === "MASTER" && user.role !== "OWNER") {
    return errorResponse("마스터 권한은 마스터만 지정할 수 있습니다.", 403);
  }
  if (
    user.role === "ADMIN" &&
    (accessProfileKey === "MASTER" || accessProfileKey === "ADMIN")
  ) {
    return errorResponse("관리자는 직원 권한만 지정할 수 있습니다.", 403);
  }

  const database = getDatabase();
  const accessProfile = await resolveAccessProfile(
    user.hospitalId,
    accessProfileKey,
  );
  if (!accessProfile) {
    return errorResponse("선택한 권한을 찾을 수 없습니다.", 400);
  }
  const role = authRoleForProfile(accessProfileKey);
  const [accountCount, duplicate] = await Promise.all([
    database.authUser.count({ where: { hospitalId: user.hospitalId } }),
    database.authUser.findFirst({
      where: { username },
      select: { id: true },
    }),
  ]);
  if (accountCount >= MAX_HOSPITAL_ACCOUNTS) {
    return errorResponse(
      `현재 요금제에서는 계정을 최대 ${MAX_HOSPITAL_ACCOUNTS}개까지 등록할 수 있습니다.`,
      409,
    );
  }
  if (duplicate) return errorResponse("이미 사용 중인 아이디입니다.", 409);

  const userId = randomUUID();
  const credentialId = randomUUID();
  const passwordHash = await hashPassword(password);
  const email = `${username.replace(/[^a-zA-Z0-9.-]/g, "-")}.${userId.slice(0, 8)}@accounts.doctornest.local`;

  try {
    await database.$transaction(async (transaction) => {
      if (isDefaultAssignee) {
        await transaction.authUser.updateMany({
          where: { hospitalId: user.hospitalId },
          data: { isDefaultAssignee: false },
        });
      }
      await transaction.authUser.create({
        data: {
          id: userId,
          name,
          email,
          emailVerified: true,
          username,
          displayUsername: username,
          hospitalId: user.hospitalId,
          jobTitle,
          role,
          accessProfileId: accessProfile.id,
          isDefaultAssignee,
        },
      });
      await transaction.authAccount.create({
        data: {
          id: credentialId,
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
        },
      });
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return errorResponse("이미 사용 중인 아이디입니다.", 409);
    }
    throw error;
  }

  return Response.json(
    {
      accounts: await listHospitalAccounts(user.hospitalId, user.id),
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const access = await requireManager();
  if ("response" in access) return access.response;
  const { user } = access;
  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    name?: unknown;
    password?: unknown;
    jobTitle?: unknown;
    accessProfileKey?: unknown;
    isDefaultAssignee?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const name = normalizeText(body?.name, 40);
  const password = typeof body?.password === "string" ? body.password : "";
  const jobTitle = normalizeText(body?.jobTitle, 30);
  const accessProfileKey = body?.accessProfileKey;
  const isDefaultAssignee = body?.isDefaultAssignee === true;

  if (!id || !name || !jobTitle || !isAccessProfileKey(accessProfileKey)) {
    return errorResponse("수정할 계정 정보를 확인해 주세요.", 400);
  }
  if (password && (password.length < 8 || password.length > 72)) {
    return errorResponse("새 비밀번호는 8~72자로 입력해 주세요.", 400);
  }

  const database = getDatabase();
  const target = await database.authUser.findFirst({
    where: { id, hospitalId: user.hospitalId },
    select: { id: true, role: true },
  });
  if (!target) return errorResponse("계정을 찾을 수 없습니다.", 404);
  const role = authRoleForProfile(accessProfileKey);
  if (user.role === "ADMIN" && (target.role !== "AGENT" || role !== "AGENT")) {
    return errorResponse("관리자는 직원 계정만 수정할 수 있습니다.", 403);
  }
  if (role === "OWNER" && user.role !== "OWNER") {
    return errorResponse("마스터 권한은 마스터만 지정할 수 있습니다.", 403);
  }
  if (target.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await database.authUser.count({
      where: { hospitalId: user.hospitalId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return errorResponse(
        "병원에는 마스터 계정이 한 명 이상 필요합니다.",
        409,
      );
    }
  }

  const accessProfile = await resolveAccessProfile(
    user.hospitalId,
    accessProfileKey,
  );
  if (!accessProfile) {
    return errorResponse("선택한 권한을 찾을 수 없습니다.", 400);
  }

  const passwordHash = password ? await hashPassword(password) : null;
  await database.$transaction(async (transaction) => {
    if (isDefaultAssignee) {
      await transaction.authUser.updateMany({
        where: { hospitalId: user.hospitalId, NOT: { id } },
        data: { isDefaultAssignee: false },
      });
    }
    await transaction.authUser.update({
      where: { id },
      data: {
        name,
        jobTitle,
        role,
        accessProfileId: accessProfile.id,
        isDefaultAssignee,
      },
    });
    if (passwordHash) {
      const credential = await transaction.authAccount.findFirst({
        where: { userId: id, providerId: "credential" },
        select: { id: true },
      });
      if (credential) {
        await transaction.authAccount.update({
          where: { id: credential.id },
          data: { password: passwordHash },
        });
      } else {
        await transaction.authAccount.create({
          data: {
            id: randomUUID(),
            accountId: id,
            providerId: "credential",
            userId: id,
            password: passwordHash,
          },
        });
      }
      await transaction.authSession.deleteMany({ where: { userId: id } });
    }
  });

  return Response.json({
    accounts: await listHospitalAccounts(user.hospitalId, user.id),
  });
}

export async function DELETE(request: Request) {
  const access = await requireManager();
  if ("response" in access) return access.response;
  const { user } = access;
  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return errorResponse("삭제할 계정을 확인해 주세요.", 400);
  if (id === user.id)
    return errorResponse("현재 로그인한 계정은 삭제할 수 없습니다.", 409);

  const database = getDatabase();
  const target = await database.authUser.findFirst({
    where: { id, hospitalId: user.hospitalId },
    select: { id: true, role: true },
  });
  if (!target) return errorResponse("계정을 찾을 수 없습니다.", 404);
  if (target.role === "OWNER") {
    return errorResponse("마스터 계정은 삭제할 수 없습니다.", 409);
  }
  if (user.role === "ADMIN" && target.role !== "AGENT") {
    return errorResponse("관리자는 상담사 계정만 삭제할 수 있습니다.", 403);
  }

  await database.authUser.delete({ where: { id } });
  return Response.json({
    accounts: await listHospitalAccounts(user.hospitalId, user.id),
  });
}
