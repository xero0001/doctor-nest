import { getDatabase } from "@doctornest/database";

import { AutomationsClient } from "@/features/automations/components/automations-client";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const user = await requireUser("/service/automations");
  const database = getDatabase();
  const [automations, treatmentTags] = await Promise.all([
    database.careAutomation.findMany({
      where: { hospitalId: user.hospitalId },
      include: {
        messages: {
          orderBy: [{ sortOrder: "asc" }, { dayOffset: "asc" }],
        },
        targetTags: {
          include: { tag: true },
          orderBy: { tag: { name: "asc" } },
        },
      },
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    }),
    database.patientTag.findMany({
      where: { hospitalId: user.hospitalId, category: "TREATMENT" },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const items = await Promise.all(
    automations.map(async (automation) => ({
      id: automation.id,
      name: automation.name,
      nationality: automation.nationality,
      message: automation.message,
      messages: automation.messages.map((message) => ({
        id: message.id,
        dayOffset: message.dayOffset,
        title: message.title,
        content: message.content,
        sortOrder: message.sortOrder,
      })),
      isActive: automation.isActive,
      appliedCount: await database.patient.count({
        where: {
          hospitalId: user.hospitalId,
          ...(automation.nationality
            ? { nationality: automation.nationality }
            : {}),
          tagAssignments: {
            some: {
              tagId: { in: automation.targetTags.map(({ tagId }) => tagId) },
            },
          },
        },
      }),
      sentCount: 0,
      tags: automation.targetTags.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
      createdAt: automation.createdAt.toISOString(),
      updatedAt: automation.updatedAt.toISOString(),
    })),
  );

  return (
    <AutomationsClient
      initialAutomations={items}
      treatmentTags={treatmentTags}
    />
  );
}
