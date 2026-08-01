-- CreateTable
CREATE TABLE "ChannelAutoReplySetting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" "ChatChannel" NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 1,
    "businessHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "businessHoursMessage" TEXT NOT NULL DEFAULT '',
    "outsideBusinessHoursEnabled" BOOLEAN NOT NULL DEFAULT true,
    "outsideBusinessHoursMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelAutoReplySetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelAutoReplySetting_organizationId_channel_key"
ON "ChannelAutoReplySetting"("organizationId", "channel");

-- CreateIndex
CREATE INDEX "ChannelAutoReplySetting_organizationId_channel_idx"
ON "ChannelAutoReplySetting"("organizationId", "channel");

-- AddForeignKey
ALTER TABLE "ChannelAutoReplySetting"
ADD CONSTRAINT "ChannelAutoReplySetting_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
