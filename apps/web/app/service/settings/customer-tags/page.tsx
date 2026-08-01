import { getDatabase } from "@doctornest/database";

import { CustomerTagsClient } from "@/features/settings/components/customer-tags-client";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CustomerTagsSettingsPage() {
  const user = await requireUser("/service/settings/customer-tags");
  const tags = await getDatabase().patientTag.findMany({
    where: { hospitalId: user.hospitalId, category: "STATUS" },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  return (
    <CustomerTagsClient
      initialTags={tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        assignmentCount: tag._count.assignments,
      }))}
    />
  );
}
