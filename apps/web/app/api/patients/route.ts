import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import {
  MAX_PATIENT_IMPORT_ROWS,
  type PatientUpsertInput,
  upsertPatients,
} from "@/lib/patients";

const MAX_RESULTS = 30;

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const requestedField = searchParams.get("field");
  const field =
    requestedField === "phone" || requestedField === "chartNumber"
      ? requestedField
      : "name";
  const normalizedPhone = query.replace(/\D/g, "");

  const patients = await getDatabase().patient.findMany({
    where: {
      hospitalId: user.hospitalId,
      ...(query
        ? field === "phone"
          ? {
              OR: [
                { phone: { contains: query, mode: "insensitive" as const } },
                ...(normalizedPhone
                  ? [{ phoneNormalized: { contains: normalizedPhone } }]
                  : []),
              ],
            }
          : field === "chartNumber"
            ? {
                chartNumber: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              }
            : { name: { contains: query, mode: "insensitive" as const } }
        : {}),
    },
    select: {
      id: true,
      chartNumber: true,
      name: true,
      phone: true,
      email: true,
      gender: true,
      birthDate: true,
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: MAX_RESULTS,
  });

  return Response.json(
    {
      patients: patients.map((patient) => ({
        ...patient,
        birthDate: patient.birthDate?.toISOString() ?? null,
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    patients?: unknown;
  } | null;

  if (!Array.isArray(body?.patients)) {
    return Response.json(
      { error: "저장할 고객 정보가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (body.patients.length > MAX_PATIENT_IMPORT_ROWS) {
    return Response.json(
      {
        error: `한 번에 최대 ${MAX_PATIENT_IMPORT_ROWS.toLocaleString("ko-KR")}명까지 저장할 수 있습니다.`,
      },
      { status: 400 },
    );
  }

  const patients = body.patients.filter(
    (patient): patient is PatientUpsertInput =>
      Boolean(patient) &&
      typeof patient === "object" &&
      typeof (patient as PatientUpsertInput).name === "string" &&
      typeof (patient as PatientUpsertInput).phone === "string" &&
      (!Object.hasOwn(patient, "id") ||
        typeof (patient as PatientUpsertInput).id === "string") &&
      (!Object.hasOwn(patient, "chartNumber") ||
        typeof (patient as PatientUpsertInput).chartNumber === "string") &&
      (!Object.hasOwn(patient, "phoneCountryCode") ||
        typeof (patient as PatientUpsertInput).phoneCountryCode === "string") &&
      (!Object.hasOwn(patient, "birthDate") ||
        typeof (patient as PatientUpsertInput).birthDate === "string") &&
      (!Object.hasOwn(patient, "gender") ||
        ["", "MALE", "FEMALE", "OTHER"].includes(
          (patient as PatientUpsertInput).gender ?? "",
        )) &&
      (!Object.hasOwn(patient, "visitType") ||
        ["", "NEW", "RETURNING"].includes(
          (patient as PatientUpsertInput).visitType ?? "",
        )) &&
      (!Object.hasOwn(patient, "nationality") ||
        typeof (patient as PatientUpsertInput).nationality === "string") &&
      (!Object.hasOwn(patient, "marketingConsent") ||
        typeof (patient as PatientUpsertInput).marketingConsent ===
          "boolean") &&
      (!Object.hasOwn(patient, "treatmentTags") ||
        (Array.isArray((patient as PatientUpsertInput).treatmentTags) &&
          (patient as PatientUpsertInput).treatmentTags!.every(
            (tag) => typeof tag === "string",
          ))),
  );

  if (patients.length !== body.patients.length) {
    return Response.json(
      { error: "고객명, 휴대폰번호, 치료태그 형식을 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    const savedPatients = await upsertPatients(user.hospitalId, patients, {
      createOnly: true,
      modifiedById: user.id,
      modifiedByName: user.name,
      historySource: "CUSTOMER_INPUT",
    });

    return Response.json({
      savedCount: savedPatients.length,
      patients: savedPatients.map((patient) => ({
        id: patient.id,
        chartNumber: patient.chartNumber,
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        gender: patient.gender,
        birthDate: patient.birthDate?.toISOString() ?? null,
        treatmentTags: patient.tagAssignments.map(({ tag }) => tag.name),
        updatedAt: patient.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "고객 정보를 저장하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
