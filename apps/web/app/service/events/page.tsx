import { getDatabase } from "@doctornest/database";

import { EventsClient } from "@/features/events/components/events-client";
import { requireUser } from "@/lib/auth";
import { serializeContentEvent } from "@/lib/content-events";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const user = await requireUser("/service/events");
  const events = await getDatabase().contentEvent.findMany({
    where: { hospitalId: user.hospitalId },
    include: { images: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return <EventsClient initialEvents={events.map(serializeContentEvent)} />;
}
