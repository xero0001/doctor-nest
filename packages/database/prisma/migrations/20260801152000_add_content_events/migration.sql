-- CreateEnum
CREATE TYPE "ContentEventDetailType" AS ENUM ('IMAGE', 'TEXT');

-- CreateEnum
CREATE TYPE "ContentEventImageRole" AS ENUM ('THUMBNAIL', 'DETAIL');

-- CreateTable
CREATE TABLE "ContentEvent" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "originalPrice" INTEGER NOT NULL DEFAULT 0,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KRW',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "exposureStartAt" TIMESTAMP(3),
  "exposureEndAt" TIMESTAMP(3),
  "detailType" "ContentEventDetailType" NOT NULL DEFAULT 'IMAGE',
  "detailText" TEXT NOT NULL DEFAULT '',
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "consultationCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEventImage" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "role" "ContentEventImageRole" NOT NULL,
  "objectKey" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "altText" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentEventImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentEvent_hospitalId_isPinned_createdAt_idx"
ON "ContentEvent"("hospitalId", "isPinned", "createdAt");

CREATE INDEX "ContentEvent_hospitalId_isActive_exposureStartAt_exposureEndAt_idx"
ON "ContentEvent"("hospitalId", "isActive", "exposureStartAt", "exposureEndAt");

CREATE UNIQUE INDEX "ContentEventImage_eventId_objectKey_key"
ON "ContentEventImage"("eventId", "objectKey");

CREATE INDEX "ContentEventImage_eventId_role_sortOrder_idx"
ON "ContentEventImage"("eventId", "role", "sortOrder");

-- AddForeignKey
ALTER TABLE "ContentEvent"
ADD CONSTRAINT "ContentEvent_hospitalId_fkey"
FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentEventImage"
ADD CONSTRAINT "ContentEventImage_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "ContentEvent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
