import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import { normalizePhone, normalizeTreatmentTags } from "@/lib/patients";

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

  if (
    !body ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.chartNumber !== "string" ||
    typeof body.phone !== "string" ||
    !normalizePhone(body.phone) ||
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
    const savedPatient = await database.$transaction(async (transaction) => {
      const patient = await transaction.patient.findFirst({
        where: { id, hospitalId: user.hospitalId },
        select: { id: true },
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
          phoneNormalized: normalizePhone(phone),
          email: email.trim() || null,
          birthDate: birthDate
            ? new Date(`${birthDate}T00:00:00.000Z`)
            : null,
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

      return transaction.patient.findUniqueOrThrow({
        where: { id },
        include: {
          tagAssignments: {
            where: { tag: { category: "TREATMENT" } },
            include: { tag: true },
          },
        },
      });
    });

    return Response.json({
      patient: {
        id: savedPatient.id,
        updatedAt: savedPatient.updatedAt.toISOString(),
        treatmentTags: savedPatient.tagAssignments.map(({ tag }) => tag.name),
      },
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

    return Response.json(
      { error: message },
      { status: 400 },
    );
  }
}
