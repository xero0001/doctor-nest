ALTER TABLE "AuthUser"
ADD COLUMN "jobTitle" TEXT NOT NULL DEFAULT '직원',
ADD COLUMN "isDefaultAssignee" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ChannelAssigneeSetting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" "ChatChannel" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelAssigneeSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChannelAssigneeSetting_organizationId_channel_key"
ON "ChannelAssigneeSetting"("organizationId", "channel");

CREATE INDEX "ChannelAssigneeSetting_userId_idx"
ON "ChannelAssigneeSetting"("userId");

ALTER TABLE "ChannelAssigneeSetting"
ADD CONSTRAINT "ChannelAssigneeSetting_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChannelAssigneeSetting"
ADD CONSTRAINT "ChannelAssigneeSetting_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AuthUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
