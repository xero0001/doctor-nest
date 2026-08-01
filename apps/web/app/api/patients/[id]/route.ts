import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import { normalizePhone, normalizeTreatmentTags } from "@/lib/patients";
import { normalizePhoneCountryCode } from "@/lib/phone-country";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MAX_NOTES_LENGTH = 5_000;
const MAX_MANAGEMENT_NOTES_LENGTH = 2_000;

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    chartNumber?: unknown;
    phone?: unknown;
    phoneCountryCode?: unknown;
    email?: unknown;
    birthDate?: unknown;
    gender?: unknown;
    visitType?: unknown;
    nationality?: unknown;
    marketingConsent?: unknown;
    notes?: unknown;
    managementNotes?: unknown;
    treatmentTags?: unknown;
  } | null;

  const validGender =
    body?.gender === "" ||
    body?.gender === "MALE" ||
    body?.gender === "FEMALE" ||
    body?.gender === "OTHER";
  const validVisitType =
    body?.visitType === "" ||
    body?.visitType === "NEW" ||
    body?.visitType === "RETURNING";
  const validBirthDate =
    body?.birthDate === "" ||
    (typeof body?.birthDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.birthDate));
  const phoneCountryCode =
    typeof body?.phoneCountryCode === "string"
      ? normalizePhoneCountryCode(body.phoneCountryCode)
      : null;

  if (
    !body ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.chartNumber !== "string" ||
    typeof body.phone !== "string" ||
    !phoneCountryCode ||
    !normalizePhone(body.phone, phoneCountryCode) ||
    typeof body.email !== "string" ||
    !validBirthDate ||
    !validGender ||
    !validVisitType ||
    typeof body.nationality !== "string" ||
    typeof body.marketingConsent !== "boolean" ||
    typeof body.notes !== "string" ||
    body.notes.length > MAX_NOTES_LENGTH ||
    typeof body.managementNotes !== "string" ||
    body.managementNotes.length > MAX_MANAGEMENT_NOTES_LENGTH ||
    !Array.isArray(body.treatmentTags) ||
    !body.treatmentTags.every((tag) => typeof tag === "string")
  ) {
    return Response.json(
      { error: "고객 상세정보 입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const name = body.name as string;
  const chartNumber = body.chartNumber as string;
  const phone = body.phone as string;
  const email = body.email as string;
  const birthDate = body.birthDate as string;
  const gender = body.gender as string;
  const visitType = body.visitType as string;
  const nationality = body.nationality as string;
  const marketingConsent = body.marketingConsent as boolean;
  const notes = body.notes as string;
  const managementNotes = body.managementNotes as string;
  const treatmentTags = normalizeTreatmentTags(body.treatmentTags as string[]);
  const database = getDatabase();

  try {
    const result = await database.$transaction(async (transaction) => {
      const patient = await transaction.patient.findFirst({
        where: { id, hospitalId: user.hospitalId },
        select: {
          id: true,
          tagAssignments: {
            where: { tag: { category: "TREATMENT" } },
            select: { tag: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!patient) throw new Error("고객을 찾을 수 없습니다.");

      const selectedTags = await transaction.patientTag.findMany({
        where: {
          hospitalId: user.hospitalId,
          category: "TREATMENT",
          name: { in: treatmentTags },
        },
        select: { id: true, name: true },
      });
      if (selectedTags.length !== treatmentTags.length) {
        throw new Error("등록된 치료태그만 선택할 수 있습니다.");
      }

      await transaction.patient.update({
        where: { id },
        data: {
          name: name.trim(),
          chartNumber: chartNumber.trim() || null,
          phone: phone.trim(),
          phoneCountryCode,
          phoneNormalized: normalizePhone(phone, phoneCountryCode),
          email: email.trim() || null,
          birthDate: birthDate ? new Date(`${birthDate}T00:00:00.000Z`) : null,
          gender: gender || null,
          visitType: visitType || null,
          nationality: nationality.trim() || null,
          marketingConsent,
          notes: notes.trim() || null,
          notesUpdatedAt: new Date(),
          managementNotes: managementNotes.trim() || null,
        },
      });

      await transaction.patientTagAssignment.deleteMany({
        where: { patientId: id, tag: { category: "TREATMENT" } },
      });
      if (selectedTags.length > 0) {
        await transaction.patientTagAssignment.createMany({
          data: selectedTags.map((tag) => ({ patientId: id, tagId: tag.id })),
        });
      }

      const previousTagNames = patient.tagAssignments
        .map(({ tag }) => tag.name)
        .sort();
      const nextTagNames = [...treatmentTags].sort();
      const treatmentTagsChanged =
        previousTagNames.length !== nextTagNames.length ||
        previousTagNames.some((name, index) => name !== nextTagNames[index]);
      const tagHistory = treatmentTagsChanged
        ? await transaction.patientTagHistory.create({
            data: {
              hospitalId: user.hospitalId,
              patientId: id,
              tagNames: treatmentTags,
              source: "CUSTOMER_DETAIL",
              modifiedById: user.id,
              modifiedByName: user.name,
            },
          })
        : null;

      const savedPatient = await transaction.patient.findUniqueOrThrow({
        where: { id },
        include: {
          tagAssignments: {
            where: { tag: { category: "TREATMENT" } },
            include: { tag: true },
          },
        },
      });

      return { savedPatient, tagHistory };
    });

    return Response.json({
      patient: {
        id: result.savedPatient.id,
        updatedAt: result.savedPatient.updatedAt.toISOString(),
        treatmentTags: result.savedPatient.tagAssignments.map(
          ({ tag }) => tag.name,
        ),
      },
      tagHistory: result.tagHistory
        ? {
            id: result.tagHistory.id,
            tagNames: result.tagHistory.tagNames,
            source: result.tagHistory.source,
            modifiedByName: result.tagHistory.modifiedByName,
            createdAt: result.tagHistory.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
        ? "이미 사용 중인 차트번호입니다."
        : error instanceof Error
          ? error.message
          : "고객 상세정보를 저장하지 못했습니다.";

    return Response.json({ error: message }, { status: 400 });
  }
}
