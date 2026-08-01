export type MarketingCampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "SENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type MarketingStatusCampaign = {
  id: string;
  name: string;
  messageName: string;
  messageType: "IMAGE" | "CAROUSEL_FEED";
  targetCount: number;
  sentCount: number;
  successCount: number;
  readCount: number;
  readRate: number | null;
  status: MarketingCampaignStatus;
  sentAt: string | null;
  createdByName: string;
};

export type MarketingStatusDashboard = {
  generatedAt: string;
  lastUpdatedAt: string | null;
  entitlement: {
    imageMessageCredits: number;
    carouselFeedCredits: number;
    totalCredits: number;
    availableMessages: number;
  };
  totals: {
    sentCount: number;
    estimatedSmsCost: number;
    estimatedBrandMessageCost: number;
    estimatedSavings: number;
  };
  campaigns: MarketingStatusCampaign[];
  topCampaigns: MarketingStatusCampaign[];
};
