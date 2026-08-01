import { getDatabase } from "@doctornest/database";

import { BasicSettingsClient } from "@/features/settings/components/basic-settings-client";
import { requireUser } from "@/lib/auth";
import { serializeBasicServiceSettings } from "@/lib/basic-service-settings";

export const dynamic = "force-dynamic";

export default async function BasicSettingsPage() {
  const user = await requireUser("/service/settings/basic");
  const database = getDatabase();
  const [hospital, treatmentTags] = await Promise.all([
    database.hospital.findUniqueOrThrow({
      where: { id: user.hospitalId },
      select: {
        customerInputChartNumberEnabled: true,
        customerInputVisitTypeEnabled: true,
        customerInputCountryCodeEnabled: true,
        customerInputBirthDateEnabled: true,
        customerInputGenderEnabled: true,
        customerInputTreatmentTagEnabled: true,
        customerInputNationalityEnabled: true,
        customerInputMarketingEnabled: true,
        automationTagSelectionMode: true,
        autoResponseContextEnabled: true,
        autoResponseContextMessageCount: true,
        appointmentManagementEnabled: true,
      },
    }),
    database.patientTag.findMany({
      where: { hospitalId: user.hospitalId, category: "TREATMENT" },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { assignments: true, automationTargets: true } },
      },
    }),
  ]);

  return (
    <BasicSettingsClient
      initialSettings={serializeBasicServiceSettings(
        hospital,
        treatmentTags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
          assignmentCount: tag._count.assignments,
          automationCount: tag._count.automationTargets,
        })),
      )}
    />
  );
}
