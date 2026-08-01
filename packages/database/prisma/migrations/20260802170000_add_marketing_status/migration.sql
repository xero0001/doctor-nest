CREATE TYPE "MarketingMessageType" AS ENUM ('IMAGE', 'CAROUSEL_FEED');

CREATE TYPE "MarketingCampaignStatus" AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'SENDING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TABLE "MarketingEntitlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "imageMessageCredits" INTEGER NOT NULL DEFAULT 0,
    "carouselFeedCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "messageName" TEXT NOT NULL,
    "messageType" "MarketingMessageType" NOT NULL DEFAULT 'IMAGE',
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingEntitlement_organizationId_key"
ON "MarketingEntitlement"("organizationId");

CREATE INDEX "MarketingCampaign_organizationId_status_sentAt_idx"
ON "MarketingCampaign"("organizationId", "status", "sentAt");

CREATE INDEX "MarketingCampaign_organizationId_createdAt_idx"
ON "MarketingCampaign"("organizationId", "createdAt");

ALTER TABLE "MarketingEntitlement"
ADD CONSTRAINT "MarketingEntitlement_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingCampaign"
ADD CONSTRAINT "MarketingCampaign_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
