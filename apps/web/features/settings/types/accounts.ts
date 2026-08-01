export type AccountRole = "OWNER" | "ADMIN" | "AGENT";

export type ManagedAccount = {
  id: string;
  name: string;
  username: string;
  jobTitle: string;
  role: AccountRole;
  isDefaultAssignee: boolean;
  isCurrentUser: boolean;
};

export type ChannelAssignee = {
  channel: string;
  displayName: string;
  userId: string | null;
};
