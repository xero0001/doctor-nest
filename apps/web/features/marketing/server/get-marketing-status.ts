import { getDatabase } from "@doctornest/database";

import type {
  MarketingStatusCampaign,
  MarketingStatusDashboard,
} from "@/features/marketing/types";

const SMS_COST_PER_MESSAGE = 100;
const BRAND_MESSAGE_COST_PER_MESSAGE = 22.5;

function readRate(successCount: number, readCount: number) {
  if (successCount <= 10) return null;
  return Math.min(100, Math.round((readCount / successCount) * 1_000) / 10);
}

export async function getMarketingStatusDashboard(
  hospitalId: string,
): Promise<MarketingStatusDashboard> {
  const database = getDatabase();
  const [entitlement, campaignRecords] = await Promise.all([
    database.marketingEntitlement.findUnique({ where: { hospitalId } }),
    database.marketingCampaign.findMany({
      where: { hospitalId },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
  ]);

  const campaigns: MarketingStatusCampaign[] = campaignRecords.map(
    (campaign) => ({
      id: campaign.id,
      name: campaign.name,
      messageName: campaign.messageName,
      messageType: campaign.messageType,
      targetCount: campaign.targetCount,
      sentCount: campaign.sentCount,
      successCount: campaign.successCount,
      readCount: campaign.readCount,
      readRate: readRate(campaign.successCount, campaign.readCount),
      status: campaign.status,
      sentAt: campaign.sentAt?.toISOString() ?? null,
      createdByName: campaign.createdByName,
    }),
  );
  const sentCount = campaigns.reduce(
    (total, campaign) => total + campaign.sentCount,
    0,
  );
  const estimatedSmsCost = Math.round(sentCount * SMS_COST_PER_MESSAGE);
  const estimatedBrandMessageCost = Math.round(
    sentCount * BRAND_MESSAGE_COST_PER_MESSAGE,
  );
  const updatedDates = [
    entitlement?.updatedAt,
    ...campaignRecords.map((campaign) => campaign.updatedAt),
  ].filter((value): value is Date => Boolean(value));
  const lastUpdatedAt = updatedDates.reduce<Date | null>(
    (latest, value) =>
      latest === null || value > latest ? value : latest,
    null,
  );

  const topCampaigns = campaigns
    .filter((campaign) => campaign.status === "COMPLETED")
    .sort((left, right) => {
      const leftRate = left.readRate ?? -1;
      const rightRate = right.readRate ?? -1;
      return (
        rightRate - leftRate ||
        right.readCount - left.readCount ||
        right.successCount - left.successCount
      );
    })
    .slice(0, 3);
  const imageMessageCredits = entitlement?.imageMessageCredits ?? 0;
  const carouselFeedCredits = entitlement?.carouselFeedCredits ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null,
    entitlement: {
      imageMessageCredits,
      carouselFeedCredits,
      totalCredits: imageMessageCredits + carouselFeedCredits,
      availableMessages: imageMessageCredits + carouselFeedCredits,
    },
    totals: {
      sentCount,
      estimatedSmsCost,
      estimatedBrandMessageCost,
      estimatedSavings: Math.max(
        0,
        estimatedSmsCost - estimatedBrandMessageCost,
      ),
    },
    campaigns,
    topCampaigns,
  };
}
