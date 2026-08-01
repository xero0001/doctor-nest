import { getDatabase } from "@doctornest/database";

import { HospitalProfileClient } from "@/features/settings/components/hospital-profile-client";
import { requireUser } from "@/lib/auth";
import { serializeHospitalProfile } from "@/lib/hospital-profile";

export const dynamic = "force-dynamic";

export default async function HospitalProfilePage() {
  const user = await requireUser("/service/settings/profile");
  const database = getDatabase();
  const [hospital, operatingHours] = await Promise.all([
    database.hospital.findUniqueOrThrow({ where: { id: user.hospitalId } }),
    database.hospitalOperatingHour.findMany({
      where: { hospitalId: user.hospitalId },
    }),
  ]);

  return (
    <HospitalProfileClient
      initialProfile={serializeHospitalProfile(hospital, operatingHours)}
    />
  );
}
