-- CreateTable
CREATE TABLE "CareAutomationMessage" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "dayOffset" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareAutomationMessage_pkey" PRIMARY KEY ("id")
);

-- Backfill the existing single-message automations as the first schedule item.
INSERT INTO "CareAutomationMessage" (
  "id",
  "automationId",
  "dayOffset",
  "title",
  "content",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  'message-' || "id",
  "id",
  1,
  '첫 안내',
  "message",
  0,
  "createdAt",
  "updatedAt"
FROM "CareAutomation"
WHERE BTRIM("message") <> '';

-- CreateIndex
CREATE INDEX "CareAutomationMessage_automationId_sortOrder_idx"
ON "CareAutomationMessage"("automationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "CareAutomationMessage"
ADD CONSTRAINT "CareAutomationMessage_automationId_fkey"
FOREIGN KEY ("automationId") REFERENCES "CareAutomation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep the oldest automation when legacy data assigned one treatment tag to
-- multiple automations, then enforce one automation per treatment tag.
DELETE FROM "CareAutomationTag" AS target
USING (
  SELECT "automationId", "tagId"
  FROM (
    SELECT
      mapping."automationId",
      mapping."tagId",
      ROW_NUMBER() OVER (
        PARTITION BY mapping."tagId"
        ORDER BY automation."createdAt" ASC, mapping."automationId" ASC
      ) AS row_number
    FROM "CareAutomationTag" AS mapping
    JOIN "CareAutomation" AS automation
      ON automation."id" = mapping."automationId"
  ) AS ranked
  WHERE ranked.row_number > 1
) AS duplicate
WHERE target."automationId" = duplicate."automationId"
  AND target."tagId" = duplicate."tagId";

DROP INDEX IF EXISTS "CareAutomationTag_tagId_idx";
CREATE UNIQUE INDEX "CareAutomationTag_tagId_key"
ON "CareAutomationTag"("tagId");
