-- CreateTable
CREATE TABLE "HospitalAccessProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalAccessProfile_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AuthUser" ADD COLUMN "accessProfileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "HospitalAccessProfile_organizationId_key_key"
ON "HospitalAccessProfile"("organizationId", "key");

-- CreateIndex
CREATE INDEX "HospitalAccessProfile_organizationId_sortOrder_idx"
ON "HospitalAccessProfile"("organizationId", "sortOrder");

-- CreateIndex
CREATE INDEX "AuthUser_accessProfileId_idx" ON "AuthUser"("accessProfileId");

-- AddForeignKey
ALTER TABLE "HospitalAccessProfile"
ADD CONSTRAINT "HospitalAccessProfile_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthUser"
ADD CONSTRAINT "AuthUser_accessProfileId_fkey"
FOREIGN KEY ("accessProfileId") REFERENCES "HospitalAccessProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
