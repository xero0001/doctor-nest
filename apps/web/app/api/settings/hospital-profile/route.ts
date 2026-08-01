import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import {
  parseHospitalProfileInput,
  serializeHospitalProfile,
} from "@/lib/hospital-profile";

async function findProfile(hospitalId: string) {
  const database = getDatabase();
  const [hospital, operatingHours] = await Promise.all([
    database.hospital.findUniqueOrThrow({ where: { id: hospitalId } }),
    database.hospitalOperatingHour.findMany({ where: { hospitalId } }),
  ]);
  return serializeHospitalProfile(hospital, operatingHours);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return Response.json({ profile: await findProfile(user.hospitalId) });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const parsed = parseHospitalProfileInput(
    (await request.json().catch(() => null)) as Record<string, unknown> | null,
    user.hospitalId,
  );
  if (!parsed.input) {
    return Response.json(
      { error: parsed.error ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const input = parsed.input;
  const database = getDatabase();
  await database.$transaction(async (transaction) => {
    await transaction.hospital.update({
      where: { id: user.hospitalId },
      data: {
        name: input.name,
        introduction: input.introduction,
        operatingNotes: input.operatingNotes,
        profileImageObjectKey: input.profileImage?.objectKey ?? null,
        profileImageUrl: input.profileImage?.publicUrl ?? null,
        profileImageOriginalName: input.profileImage?.originalName ?? null,
        profileImageContentType: input.profileImage?.contentType ?? null,
        profileImageSizeBytes: input.profileImage?.sizeBytes ?? null,
      },
    });
    for (const hour of input.operatingHours) {
      await transaction.hospitalOperatingHour.upsert({
        where: {
          hospitalId_weekday: {
            hospitalId: user.hospitalId,
            weekday: hour.weekday,
          },
        },
        update: {
          isOpen: hour.isOpen,
          openMinutes: hour.openMinutes,
          closeMinutes: hour.closeMinutes,
        },
        create: { hospitalId: user.hospitalId, ...hour },
      });
    }
  });

  return Response.json({ profile: await findProfile(user.hospitalId) });
}
