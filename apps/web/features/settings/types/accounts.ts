export type AccountRole = "OWNER" | "ADMIN" | "AGENT";

export type AccountAccessProfileKey =
  "MASTER" | "ADMIN" | "STAFF" | "STAFF_2" | "STAFF_3";

export const ACCOUNT_ACCESS_PROFILE_OPTIONS: Array<{
  value: AccountAccessProfileKey;
  label: string;
}> = [
  { value: "MASTER", label: "마스터" },
  { value: "ADMIN", label: "관리자" },
  { value: "STAFF", label: "직원" },
  { value: "STAFF_2", label: "직원2" },
  { value: "STAFF_3", label: "직원3" },
];

export type ManagedAccount = {
  id: string;
  name: string;
  username: string;
  jobTitle: string;
  role: AccountRole;
  accessProfileKey: AccountAccessProfileKey;
  isDefaultAssignee: boolean;
  isCurrentUser: boolean;
};

export type ChannelAssignee = {
  channel: string;
  displayName: string;
  userId: string | null;
};
