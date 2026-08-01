export type AutomationManagementDashboard = {
  month: string;
  generatedAt: string;
  totals: {
    customers: number;
    automationCustomers: number;
    consultations: number;
  };
  customerManagement: {
    managedCustomers: number;
    newCustomers: number;
    daily: Array<{
      date: string;
      managedCustomers: number;
      newCustomers: number;
    }>;
  };
  automationManagement: {
    sentMessages: number;
    appliedCustomers: number;
    consultations: number;
  };
  remarketing: {
    campaigns: number;
  };
  popularTreatments: Array<{
    id: string;
    name: string;
    color: string;
    count: number;
    rankChange: number | null;
    popularCombination: {
      id: string;
      name: string;
      color: string;
    } | null;
  }>;
  chatting: {
    channels: Array<{
      channel:
        "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM";
      consultations: number;
      newConsultations: number;
    }>;
    unansweredOverSixHours: number;
    averageResponseMinutes: number;
    responseRate: number;
  };
};
