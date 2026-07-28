export type ChatChannel =
  "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM";

export type ConversationMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  sender: "CUSTOMER" | "STAFF" | "AI" | "SYSTEM";
  content: string;
  sentAt: string;
};

export type ConversationAppointment = {
  id: string;
  scheduledAt: string;
  doctorName: string;
  treatment: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
};

export type ConversationItem = {
  id: string;
  channel: ChatChannel;
  status: "OPEN" | "CLOSED";
  important: boolean;
  unreadCount: number;
  lastMessageAt: string;
  customer: {
    id: string;
    externalRef: string | null;
    name: string;
    phone: string | null;
    email: string | null;
    gender: string | null;
    birthDate: string | null;
    language: string;
    notes: string | null;
    tags: string[];
    appointments: ConversationAppointment[];
  };
  messages: ConversationMessage[];
};
