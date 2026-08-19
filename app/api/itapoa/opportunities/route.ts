import snapshotJson from "@/data/itapoa-opportunities.public.json";
import type { OpportunitySnapshot } from "@/app/itapoa/domain";

const snapshot = snapshotJson as unknown as OpportunitySnapshot;

export async function GET() {
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "X-Snapshot-Captured-At": snapshot.snapshot.capturedAt,
    },
  });
}
