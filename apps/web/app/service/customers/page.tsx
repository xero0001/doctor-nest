import { getDatabase } from "@doctornest/database";

import { CustomerInputClient } from "@/features/customers/components/customer-input-client";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser("/service/customers");
  const { view } = await searchParams;
  const database = getDatabase();

  const [
    patients,
    totalCount,
    missingTreatmentTagCount,
    treatmentTags,
    hospital,
  ] =
    await Promise.all([
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
    database.patientTag.findMany({
      where: { hospitalId: user.hospitalId, category: "TREATMENT" },
      select: { id: true, name: true, color: true },
      orderBy: [{ name: "asc" }],
    }),
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
      },
    }),
  ]);

  return (
    <CustomerInputClient
      totalCount={totalCount}
      missingTreatmentTagCount={missingTreatmentTagCount}
      availableTreatmentTags={treatmentTags}
      inputFields={{
        chartNumber: hospital.customerInputChartNumberEnabled,
        visitType: hospital.customerInputVisitTypeEnabled,
        countryCode: hospital.customerInputCountryCodeEnabled,
        birthDate: hospital.customerInputBirthDateEnabled,
        gender: hospital.customerInputGenderEnabled,
        treatmentTag: hospital.customerInputTreatmentTagEnabled,
        nationality: hospital.customerInputNationalityEnabled,
        marketingConsent: hospital.customerInputMarketingEnabled,
      }}
      initialMode={
        view === "daily"
          ? "DAILY"
          : view === "all"
            ? "ALL"
            : view === "missing-tag"
              ? "MISSING_TAG"
              : "INPUT"
      }
      initialPatients={patients.map((patient) => ({
        id: patient.id,
        chartNumber: patient.chartNumber ?? "",
        name: patient.name,
        phone: patient.phone ?? "",
        birthDate: patient.birthDate?.toISOString() ?? null,
        gender: patient.gender,
        treatmentTags: patient.tagAssignments.map(({ tag }) => tag.name),
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
      }))}
    />
  );
}
