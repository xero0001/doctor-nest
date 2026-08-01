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
  bookmarkedAt: string | null;
  sentAt: string;
};

export type ConversationAppointment = {
  id: string;
  scheduledAt: string;
  doctorName: string;
  treatment: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
};

export type PatientSearchResult = {
  id: string;
  chartNumber: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  birthDate: string | null;
};

export type StaffMember = {
  id: string;
  name: string;
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
    cautionMarkdown: string;
    cautionEnabled: boolean;
    images: Array<{
      id: string;
      publicUrl: string;
      altText: string;
      originalName: string;
    }>;
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
  autoRespondEnabled: boolean;
  autoTranslateEnabled: boolean;
  unreadCount: number;
  lastMessageAt: string;
  assignees: StaffMember[];
  chatAccount: {
    id: string | null;
    channel: ChatChannel;
    externalCustomerId: string | null;
    displayName: string | null;
    phone: string | null;
    isPrimary: boolean;
    linkMethod: "AUTO" | "MANUAL" | null;
    linkedAt: string | null;
  };
  customer: {
    id: string;
    chartNumber: string | null;
    name: string;
    phone: string | null;
    email: string | null;
    gender: string | null;
    birthDate: string | null;
    visitType: string | null;
    nationality: string | null;
    language: string;
    notes: string | null;
    notesUpdatedAt: string | null;
    tags: Array<{
      name: string;
      color: string;
    }>;
    channels: Array<{
      id: string;
      channel: ChatChannel;
      displayName: string | null;
      phone: string | null;
    }>;
    appointments: ConversationAppointment[];
  } | null;
  messages: ConversationMessage[];
  coachSuggestions: ChatCoachSuggestion[];
};

export type ChatCoachSuggestion = {
  id: string;
  generatedForMessageId: string;
  responseGuide: string;
  answerExample: string;
  model: string;
  generatedAt: string;
  sources: Array<{
    id: string;
    title: string;
  }>;
};
