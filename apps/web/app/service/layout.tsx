import { requireUser } from "@/lib/auth";

import { ServiceShell } from "./service-shell";

export default async function ServiceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <ServiceShell
      user={{
        name: user.name,
        organizationName: user.organization.name,
      }}
    >
      {children}
    </ServiceShell>
  );
}
