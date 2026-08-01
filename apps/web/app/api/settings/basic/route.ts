import { getDatabase } from "@doctornest/database";

import type {
  AutomationTagSelectionMode,
  CustomerInputFieldKey,
} from "@/features/settings/service-settings-types";
import { getCurrentUser } from "@/lib/auth";
import { serializeBasicServiceSettings } from "@/lib/basic-service-settings";

const inputFieldKeys = [
  "chartNumber",
  "visitType",
  "countryCode",
  "birthDate",
  "gender",
  "treatmentTag",
  "nationality",
  "marketingConsent",
] as const satisfies readonly CustomerInputFieldKey[];

const MAX_TREATMENT_TAGS = 50;
const colorPattern = /^#[0-9A-F]{6}$/i;

type SettingsRequestBody = {
  inputFields?: unknown;
  automationTagSelectionMode?: unknown;
  autoResponseContextEnabled?: unknown;
  autoResponseContextMessageCount?: unknown;
  appointmentManagementEnabled?: unknown;
  treatmentTags?: unknown;
};

function normalizeTagName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function parseRequest(body: SettingsRequestBody | null) {
  if (!body || !body.inputFields || typeof body.inputFields !== "object") {
    throw new Error("입력정보 설정을 확인해 주세요.");
  }

  const inputFields = body.inputFields as Record<string, unknown>;
  if (!inputFieldKeys.every((key) => typeof inputFields[key] === "boolean")) {
    throw new Error("입력정보 설정을 확인해 주세요.");
  }

  const automationTagSelectionMode = body.automationTagSelectionMode;
  if (
    automationTagSelectionMode !== "FIRST" &&
    automationTagSelectionMode !== "ALL"
  ) {
    throw new Error("상담자동화 적용 방식을 선택해 주세요.");
  }

  if (
    typeof body.autoResponseContextEnabled !== "boolean" ||
    typeof body.autoResponseContextMessageCount !== "number" ||
    !Number.isInteger(body.autoResponseContextMessageCount) ||
    body.autoResponseContextMessageCount < 1 ||
    body.autoResponseContextMessageCount > 50
  ) {
    throw new Error("최근 대화 윈도우는 1~50턴 사이로 입력해 주세요.");
  }

  if (typeof body.appointmentManagementEnabled !== "boolean") {
    throw new Error("예약관리 사용 여부를 확인해 주세요.");
  }

  if (
    !Array.isArray(body.treatmentTags) ||
    body.treatmentTags.length > MAX_TREATMENT_TAGS
  ) {
    throw new Error(
      `치료태그는 최대 ${MAX_TREATMENT_TAGS}개까지 등록할 수 있습니다.`,
    );
  }

  const treatmentTags = body.treatmentTags.map((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("치료태그 정보를 확인해 주세요.");
    }
    const tag = value as Record<string, unknown>;
    const id = typeof tag.id === "string" ? tag.id : "";
    const name = normalizeTagName(tag.name);
    const color = typeof tag.color === "string" ? tag.color.toUpperCase() : "";
    if (!name || name.length > 30 || !colorPattern.test(color)) {
      throw new Error("치료태그명과 색상을 확인해 주세요.");
    }
    return { id, name, color };
  });

  const normalizedNames = treatmentTags.map((tag) => tag.name.toLowerCase());
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    throw new Error("같은 이름의 치료태그를 중복 등록할 수 없습니다.");
  }

  return {
    inputFields: Object.fromEntries(
      inputFieldKeys.map((key) => [key, inputFields[key]]),
    ) as Record<CustomerInputFieldKey, boolean>,
    automationTagSelectionMode:
      automationTagSelectionMode as AutomationTagSelectionMode,
    autoResponseContextEnabled: body.autoResponseContextEnabled,
    autoResponseContextMessageCount: body.autoResponseContextMessageCount,
    appointmentManagementEnabled: body.appointmentManagementEnabled,
    treatmentTags,
  };
}

async function readSettings(hospitalId: string) {
  const database = getDatabase();
  const [hospital, treatmentTags] = await Promise.all([
    database.hospital.findUniqueOrThrow({
      where: { id: hospitalId },
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
      where: { hospitalId, category: "TREATMENT" },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { assignments: true, automationTargets: true } },
      },
    }),
  ]);

  return serializeBasicServiceSettings(
    hospital,
    treatmentTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      assignmentCount: tag._count.assignments,
      automationCount: tag._count.automationTargets,
    })),
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return Response.json({ settings: await readSettings(user.hospitalId) });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let input;
  try {
    input = parseRequest(
      (await request.json().catch(() => null)) as SettingsRequestBody | null,
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "설정을 확인해 주세요.",
      },
      { status: 400 },
    );
  }

  const database = getDatabase();
  try {
    await database.$transaction(async (transaction) => {
      const existingTags = await transaction.patientTag.findMany({
        where: { hospitalId: user.hospitalId, category: "TREATMENT" },
        include: {
          _count: { select: { assignments: true, automationTargets: true } },
        },
      });
      const existingById = new Map(existingTags.map((tag) => [tag.id, tag]));
      const retainedIds = input.treatmentTags
        .map((tag) => tag.id)
        .filter((id) => existingById.has(id));

      const unknownPersistedId = input.treatmentTags.find(
        (tag) =>
          tag.id && !tag.id.startsWith("new-") && !existingById.has(tag.id),
      );
      if (unknownPersistedId) {
        throw new Error("수정할 치료태그를 찾을 수 없습니다.");
      }

      const deletedTags = existingTags.filter(
        (tag) => !retainedIds.includes(tag.id),
      );
      const inUseTag = deletedTags.find(
        (tag) => tag._count.assignments > 0 || tag._count.automationTargets > 0,
      );
      if (inUseTag) {
        throw new Error(
          `‘${inUseTag.name}’ 태그는 고객 또는 상담자동화에서 사용 중이라 삭제할 수 없습니다.`,
        );
      }

      const requestedNames = input.treatmentTags.map((tag) => tag.name);
      const conflictingTags = await transaction.patientTag.findMany({
        where: {
          hospitalId: user.hospitalId,
          name: { in: requestedNames },
          id: { notIn: [...retainedIds, ...deletedTags.map((tag) => tag.id)] },
        },
        select: { name: true },
      });
      if (conflictingTags[0]) {
        throw new Error(
          `‘${conflictingTags[0].name}’ 태그가 이미 등록되어 있습니다.`,
        );
      }

      if (deletedTags.length > 0) {
        await transaction.patientTag.deleteMany({
          where: { id: { in: deletedTags.map((tag) => tag.id) } },
        });
      }

      for (const tag of input.treatmentTags) {
        if (existingById.has(tag.id)) {
          await transaction.patientTag.update({
            where: { id: tag.id },
            data: { name: tag.name, color: tag.color },
          });
        } else {
          await transaction.patientTag.create({
            data: {
              hospitalId: user.hospitalId,
              category: "TREATMENT",
              name: tag.name,
              color: tag.color,
            },
          });
        }
      }

      await transaction.hospital.update({
        where: { id: user.hospitalId },
        data: {
          customerInputChartNumberEnabled: input.inputFields.chartNumber,
          customerInputVisitTypeEnabled: input.inputFields.visitType,
          customerInputCountryCodeEnabled: input.inputFields.countryCode,
          customerInputBirthDateEnabled: input.inputFields.birthDate,
          customerInputGenderEnabled: input.inputFields.gender,
          customerInputTreatmentTagEnabled: input.inputFields.treatmentTag,
          customerInputNationalityEnabled: input.inputFields.nationality,
          customerInputMarketingEnabled: input.inputFields.marketingConsent,
          automationTagSelectionMode: input.automationTagSelectionMode,
          autoResponseContextEnabled: input.autoResponseContextEnabled,
          autoResponseContextMessageCount:
            input.autoResponseContextMessageCount,
          appointmentManagementEnabled: input.appointmentManagementEnabled,
        },
      });
    });

    return Response.json({ settings: await readSettings(user.hospitalId) });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "서비스 기본설정을 저장하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
