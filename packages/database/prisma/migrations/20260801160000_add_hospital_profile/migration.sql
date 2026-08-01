-- CreateEnum
CREATE TYPE "HospitalWeekday" AS ENUM (
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
);

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "introduction" TEXT NOT NULL DEFAULT '',
ADD COLUMN "operatingNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN "profileImageObjectKey" TEXT,
ADD COLUMN "profileImageUrl" TEXT,
ADD COLUMN "profileImageOriginalName" TEXT,
ADD COLUMN "profileImageContentType" TEXT,
ADD COLUMN "profileImageSizeBytes" INTEGER;

-- CreateTable
CREATE TABLE "HospitalOperatingHour" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "weekday" "HospitalWeekday" NOT NULL,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "openMinutes" INTEGER NOT NULL DEFAULT 600,
  "closeMinutes" INTEGER NOT NULL DEFAULT 1140,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HospitalOperatingHour_pkey" PRIMARY KEY ("id")
);

-- Backfill a complete weekly schedule for existing hospitals.
INSERT INTO "HospitalOperatingHour" (
  "id",
  "hospitalId",
  "weekday",
  "isOpen",
  "openMinutes",
  "closeMinutes",
  "createdAt",
  "updatedAt"
)
SELECT
  'hours-' || organization."id" || '-' || weekday.value,
  organization."id",
  weekday.value::"HospitalWeekday",
  weekday.value <> 'SUNDAY',
  600,
  CASE WHEN weekday.value = 'SATURDAY' THEN 840 ELSE 1140 END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" AS organization
CROSS JOIN (
  VALUES
    ('MONDAY'),
    ('TUESDAY'),
    ('WEDNESDAY'),
    ('THURSDAY'),
    ('FRIDAY'),
    ('SATURDAY'),
    ('SUNDAY')
) AS weekday(value);

-- CreateIndex
CREATE UNIQUE INDEX "HospitalOperatingHour_hospitalId_weekday_key"
ON "HospitalOperatingHour"("hospitalId", "weekday");

CREATE INDEX "HospitalOperatingHour_hospitalId_weekday_idx"
ON "HospitalOperatingHour"("hospitalId", "weekday");

-- AddForeignKey
ALTER TABLE "HospitalOperatingHour"
ADD CONSTRAINT "HospitalOperatingHour_hospitalId_fkey"
FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
