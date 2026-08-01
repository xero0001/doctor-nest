-- CreateEnum
CREATE TYPE "PatientTagHistorySource" AS ENUM ('CUSTOMER_INPUT', 'EXCEL_IMPORT', 'CUSTOMER_DETAIL', 'MIGRATION');

-- AlterTable
ALTER TABLE "Customer"
ADD COLUMN "phoneCountryCode" TEXT NOT NULL DEFAULT '+82';

UPDATE "Customer"
SET "phoneCountryCode" = CASE
  WHEN "phone" LIKE '+86%' THEN '+86'
  WHEN "phone" LIKE '+82%' THEN '+82'
  WHEN "phone" LIKE '+81%' THEN '+81'
  WHEN "phone" LIKE '+1%' THEN '+1'
  ELSE '+82'
END;

-- AlterTable
ALTER TABLE "Conversation"
ADD COLUMN "translationTargetLanguage" TEXT;

-- CreateTable
CREATE TABLE "PatientTagHistory" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "tagNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "source" "PatientTagHistorySource" NOT NULL,
  "modifiedById" TEXT,
  "modifiedByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientTagHistory_pkey" PRIMARY KEY ("id")
);

-- Backfill existing treatment-tag state
INSERT INTO "PatientTagHistory" (
  "id",
  "hospitalId",
  "patientId",
  "tagNames",
  "source",
  "modifiedByName",
  "createdAt"
)
SELECT
  'migration-' || customer."id",
  customer."organizationId",
  customer."id",
  COALESCE(
    ARRAY_AGG(tag."name" ORDER BY assignment."createdAt")
      FILTER (WHERE tag."id" IS NOT NULL AND tag."category" = 'TREATMENT'),
    ARRAY[]::TEXT[]
  ),
  'MIGRATION'::"PatientTagHistorySource",
  '시스템 이관',
  customer."updatedAt"
FROM "Customer" AS customer
LEFT JOIN "PatientTagAssignment" AS assignment
  ON assignment."patientId" = customer."id"
LEFT JOIN "PatientTag" AS tag
  ON tag."id" = assignment."tagId"
GROUP BY customer."id";

-- CreateIndex
CREATE INDEX "PatientTagHistory_patientId_createdAt_idx"
ON "PatientTagHistory"("patientId", "createdAt");

CREATE INDEX "PatientTagHistory_hospitalId_createdAt_idx"
ON "PatientTagHistory"("hospitalId", "createdAt");

CREATE INDEX "PatientTagHistory_modifiedById_idx"
ON "PatientTagHistory"("modifiedById");

-- AddForeignKey
ALTER TABLE "PatientTagHistory"
ADD CONSTRAINT "PatientTagHistory_hospitalId_fkey"
FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientTagHistory"
ADD CONSTRAINT "PatientTagHistory_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Customer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientTagHistory"
ADD CONSTRAINT "PatientTagHistory_modifiedById_fkey"
FOREIGN KEY ("modifiedById") REFERENCES "AuthUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CareAutomation" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nationality" TEXT,
  "message" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareAutomation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareAutomationTag" (
  "automationId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "CareAutomationTag_pkey" PRIMARY KEY ("automationId", "tagId")
);

-- CreateIndex
CREATE INDEX "CareAutomation_hospitalId_isActive_updatedAt_idx"
ON "CareAutomation"("hospitalId", "isActive", "updatedAt");

CREATE INDEX "CareAutomationTag_tagId_idx"
ON "CareAutomationTag"("tagId");

-- AddForeignKey
ALTER TABLE "CareAutomation"
ADD CONSTRAINT "CareAutomation_hospitalId_fkey"
FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CareAutomationTag"
ADD CONSTRAINT "CareAutomationTag_automationId_fkey"
FOREIGN KEY ("automationId") REFERENCES "CareAutomation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CareAutomationTag"
ADD CONSTRAINT "CareAutomationTag_tagId_fkey"
FOREIGN KEY ("tagId") REFERENCES "PatientTag"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
