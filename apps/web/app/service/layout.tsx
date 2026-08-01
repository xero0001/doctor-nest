import { getDatabase } from "@doctornest/database";

import { requireUser } from "@/lib/auth";

import { ServiceShell } from "./service-shell";

export default async function ServiceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const hospital = await getDatabase().hospital.findUniqueOrThrow({
    where: { id: user.hospitalId },
    select: { appointmentManagementEnabled: true },
  });

  return (
    <ServiceShell
      user={{
        name: user.name,
        organizationName: user.hospital.name,
      }}
      appointmentManagementEnabled={hospital.appointmentManagementEnabled}
    >
      {children}
    </ServiceShell>
  );
}
