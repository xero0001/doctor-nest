export type ChatChannel =
  "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM";

export type ConversationMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  sender: "CUSTOMER" | "STAFF" | "AI" | "SYSTEM";
  content: string;
  sourceLanguage: string;
  sourceLanguageName: string;
  translatedContent: string;
  translatedLanguage: string;
  translatedLanguageName: string;
  sentAt: string;
};

export type ConversationAppointment = {
  id: string;
  scheduledAt: string;
  doctorName: string;
  treatment: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
};

export type ManualFolderItem = {
  id: string;
  name: string;
  children: ManualFolderItem[];
  documents: Array<{
    id: string;
    title: string;
    slug: string;
    contentMarkdown: string;
    tags: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  }>;
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
    chartNumber: string;
    name: string;
    phone: string | null;
    email: string | null;
    gender: string | null;
    birthDate: string | null;
    language: string;
    notes: string | null;
    tags: string[];
    channels: Array<{
      id: string;
      channel: ChatChannel;
      displayName: string | null;
      phone: string | null;
    }>;
    appointments: ConversationAppointment[];
  };
  messages: ConversationMessage[];
};
