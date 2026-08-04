import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import { normalizeTreatmentTags } from "@/lib/patients";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    treatmentTags?: unknown;
  } | null;

  if (
    !body ||
    !Array.isArray(body.treatmentTags) ||
    !body.treatmentTags.every((tag) => typeof tag === "string")
  ) {
    return Response.json(
      { error: "치료태그 입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

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
        select: { id: true, name: true, color: true },
      });
      if (selectedTags.length !== treatmentTags.length) {
        throw new Error("등록된 치료태그만 선택할 수 있습니다.");
      }

      const selectedTagByName = new Map(
        selectedTags.map((tag) => [tag.name, tag]),
      );
      const orderedTags = treatmentTags.flatMap((name) => {
        const tag = selectedTagByName.get(name);
        return tag ? [tag] : [];
      });
      const previousTagNames = patient.tagAssignments.map(
        ({ tag }) => tag.name,
      );
      const tagsChanged =
        previousTagNames.length !== treatmentTags.length ||
        previousTagNames.some((name, index) => name !== treatmentTags[index]);

      if (tagsChanged) {
        await transaction.patientTagAssignment.deleteMany({
          where: { patientId: id, tag: { category: "TREATMENT" } },
        });
        if (orderedTags.length > 0) {
          await transaction.patientTagAssignment.createMany({
            data: orderedTags.map((tag) => ({
              patientId: id,
              tagId: tag.id,
            })),
          });
        }

        await transaction.patient.update({
          where: { id },
          data: { updatedAt: new Date() },
        });
        await transaction.patientTagHistory.create({
          data: {
            hospitalId: user.hospitalId,
            patientId: id,
            tagNames: treatmentTags,
            source: "CUSTOMER_DETAIL",
            modifiedById: user.id,
            modifiedByName: user.name,
          },
        });
      }

      return orderedTags;
    });

    return Response.json({
      tags: result.map((tag) => ({ name: tag.name, color: tag.color })),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "치료태그를 저장하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
