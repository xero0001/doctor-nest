import { getDatabase } from "@doctornest/database";

import { CustomerInputClient } from "@/features/customers/components/customer-input-client";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await requireUser("/service/customers");
  const database = getDatabase();

  const [patients, totalCount, missingTreatmentTagCount] = await Promise.all([
    database.patient.findMany({
      where: { hospitalId: user.hospitalId },
      include: {
        tagAssignments: {
          where: { tag: { category: "TREATMENT" } },
          include: { tag: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      take: 500,
    }),
    database.patient.count({
      where: { hospitalId: user.hospitalId },
    }),
    database.patient.count({
      where: {
        hospitalId: user.hospitalId,
        tagAssignments: {
          none: { tag: { category: "TREATMENT" } },
        },
      },
    }),
  ]);

  return (
    <CustomerInputClient
      totalCount={totalCount}
      missingTreatmentTagCount={missingTreatmentTagCount}
      initialPatients={patients.map((patient) => ({
        id: patient.id,
        chartNumber: patient.chartNumber,
        name: patient.name,
        phone: patient.phone ?? "",
        treatmentTags: patient.tagAssignments.map(({ tag }) => tag.name),
        updatedAt: patient.updatedAt.toISOString(),
      }))}
    />
  );
}
