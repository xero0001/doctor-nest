ALTER TABLE "Organization"
ADD COLUMN "customerInputChartNumberEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "customerInputVisitTypeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "customerInputCountryCodeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "customerInputBirthDateEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "customerInputGenderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "customerInputTreatmentTagEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "customerInputNationalityEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "customerInputMarketingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "automationTagSelectionMode" TEXT NOT NULL DEFAULT 'ALL',
ADD COLUMN "appointmentManagementEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Organization"
ADD CONSTRAINT "Organization_automationTagSelectionMode_check"
CHECK ("automationTagSelectionMode" IN ('FIRST', 'ALL'));
