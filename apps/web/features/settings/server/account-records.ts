import { getDatabase } from "@doctornest/database";

import type {
  AccountRole,
  ManagedAccount,
} from "@/features/settings/types/accounts";

export const MAX_HOSPITAL_ACCOUNTS = 5;

export function canManageHospitalAccounts(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export async function listHospitalAccounts(
  hospitalId: string,
  currentUserId: string,
): Promise<ManagedAccount[]> {
  const accounts = await getDatabase().authUser.findMany({
    where: { hospitalId },
    orderBy: [{ isDefaultAssignee: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      displayUsername: true,
      jobTitle: true,
      role: true,
      isDefaultAssignee: true,
    },
  });

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    username: account.displayUsername ?? account.username ?? "",
    jobTitle: account.jobTitle,
    role: account.role as AccountRole,
    isDefaultAssignee: account.isDefaultAssignee,
    isCurrentUser: account.id === currentUserId,
  }));
}
