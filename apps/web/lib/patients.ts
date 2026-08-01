import { getDatabase } from "@doctornest/database";

import {
  normalizePhoneCountryCode,
  type PhoneCountryCode,
} from "@/lib/phone-country";

export const MAX_PATIENT_IMPORT_ROWS = 500;

export type PatientUpsertInput = {
  id?: string;
  chartNumber?: string;
  name: string;
  phone: string;
  phoneCountryCode?: PhoneCountryCode;
  treatmentTags?: string[];
};

export function normalizePhone(phone: string, phoneCountryCode = "+82") {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const countryCode = normalizePhoneCountryCode(phoneCountryCode) ?? "+82";
  const countryDigits = countryCode.slice(1);
  const explicitlyInternational = phone.trim().startsWith("+");

  if (countryCode === "+82") {
    if (digits.startsWith("82")) return `0${digits.slice(2)}`;
    return digits;
  }

  if (explicitlyInternational || digits.startsWith(countryDigits)) {
    return digits;
  }

  return `${countryDigits}${digits.startsWith("0") ? digits.slice(1) : digits}`;
}

export function normalizeTreatmentTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .flatMap((tag) => tag.split(/[,，]/))
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

export async function upsertPatients(
  hospitalId: string,
  inputRows: PatientUpsertInput[],
  options: {
    createOnly?: boolean;
    modifiedById?: string;
    modifiedByName?: string;
    historySource?: "CUSTOMER_INPUT" | "EXCEL_IMPORT";
  } = {},
) {
  const rows = inputRows
    .map((row) => ({
      id: row.id?.trim() || undefined,
      chartNumber: row.chartNumber?.trim() || undefined,
      name: row.name.trim(),
      phone: row.phone.trim(),
      phoneCountryCode:
        normalizePhoneCountryCode(row.phoneCountryCode) ?? "+82",
      treatmentTags: normalizeTreatmentTags(row.treatmentTags ?? []),
    }))
    .filter((row) => row.name || row.phone);

  if (rows.length === 0) {
    throw new Error("저장할 고객 정보를 입력해 주세요.");
  }

  if (rows.length > MAX_PATIENT_IMPORT_ROWS) {
    throw new Error(
      `한 번에 최대 ${MAX_PATIENT_IMPORT_ROWS.toLocaleString("ko-KR")}명까지 등록할 수 있습니다.`,
    );
  }

  const invalidRowIndex = rows.findIndex(
    (row) => !row.name || !normalizePhone(row.phone, row.phoneCountryCode),
  );
  if (invalidRowIndex >= 0) {
    throw new Error(
      `${invalidRowIndex + 1}번째 고객의 고객명과 휴대폰번호를 확인해 주세요.`,
    );
  }

  const database = getDatabase();

  return database.$transaction(
    async (transaction) => {
      const savedPatientIds: string[] = [];

      for (const row of rows) {
        const phoneNormalized = normalizePhone(
          row.phone,
          row.phoneCountryCode,
        )!;
        const existingPatient = row.id
          ? await transaction.patient.findFirst({
              where: { id: row.id, hospitalId },
              select: { id: true },
            })
          : await transaction.patient.findFirst({
              where: {
                hospitalId,
                OR: [
                  { phoneNormalized },
                  ...(row.chartNumber
                    ? [{ chartNumber: row.chartNumber }]
                    : []),
                ],
              },
              select: { id: true },
            });

        if (row.id && !existingPatient) {
          throw new Error("수정할 고객 정보를 찾을 수 없습니다.");
        }
        if (!row.id && existingPatient && options.createOnly) {
          throw new Error(
            `${row.name} 고객과 동일한 휴대폰번호가 이미 등록되어 있습니다. 기존 고객은 ‘전체’에서 수정해 주세요.`,
          );
        }

        const patient = existingPatient
          ? await transaction.patient.update({
              where: { id: existingPatient.id },
              data: {
                name: row.name,
                phone: row.phone,
                phoneCountryCode: row.phoneCountryCode,
                phoneNormalized,
                ...(row.chartNumber ? { chartNumber: row.chartNumber } : {}),
              },
              select: { id: true },
            })
          : await transaction.patient.create({
              data: {
                hospitalId,
                chartNumber: row.chartNumber ?? null,
                name: row.name,
                phone: row.phone,
                phoneCountryCode: row.phoneCountryCode,
                phoneNormalized,
              },
              select: { id: true },
            });

        const previousTreatmentTags = existingPatient
          ? await transaction.patientTagAssignment.findMany({
              where: {
                patientId: patient.id,
                tag: { category: "TREATMENT" },
              },
              select: { tag: { select: { name: true } } },
              orderBy: { createdAt: "asc" },
            })
          : [];
        const treatmentTagIds: string[] = [];
        for (const tagName of row.treatmentTags) {
          const tag = options.createOnly
            ? await transaction.patientTag.findFirst({
                where: {
                  hospitalId,
                  name: tagName,
                  category: "TREATMENT",
                },
                select: { id: true },
              })
            : await transaction.patientTag.upsert({
                where: {
                  hospitalId_name: {
                    hospitalId,
                    name: tagName,
                  },
                },
                update: { category: "TREATMENT" },
                create: {
                  hospitalId,
                  name: tagName,
                  category: "TREATMENT",
                },
                select: { id: true },
              });
          if (!tag) {
            throw new Error(`등록되지 않은 치료태그입니다: ${tagName}`);
          }
          treatmentTagIds.push(tag.id);
        }

        await transaction.patientTagAssignment.deleteMany({
          where: {
            patientId: patient.id,
            tag: { category: "TREATMENT" },
          },
        });

        if (treatmentTagIds.length > 0) {
          await transaction.patientTagAssignment.createMany({
            data: treatmentTagIds.map((tagId) => ({
              patientId: patient.id,
              tagId,
            })),
            skipDuplicates: true,
          });
        }

        const previousTagNames = previousTreatmentTags
          .map(({ tag }) => tag.name)
          .sort();
        const nextTagNames = [...row.treatmentTags].sort();
        const treatmentTagsChanged =
          previousTagNames.length !== nextTagNames.length ||
          previousTagNames.some((name, index) => name !== nextTagNames[index]);

        if (treatmentTagsChanged) {
          await transaction.patientTagHistory.create({
            data: {
              hospitalId,
              patientId: patient.id,
              tagNames: row.treatmentTags,
              source: options.historySource ?? "CUSTOMER_INPUT",
              modifiedById: options.modifiedById,
              modifiedByName: options.modifiedByName ?? "시스템",
            },
          });
        }

        savedPatientIds.push(patient.id);
      }

      return transaction.patient.findMany({
        where: { id: { in: savedPatientIds }, hospitalId },
        include: {
          tagAssignments: {
            where: { tag: { category: "TREATMENT" } },
            include: { tag: true },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      });
    },
    { timeout: 30_000 },
  );
}
