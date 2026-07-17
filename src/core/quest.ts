import { eq } from "drizzle-orm";
import * as tables from "@/db/schema";
import type { AppDb } from "./db-types";

/** Yan görevin cache'li payload'ını döner (tamamlanana kadar bedava).
 * Üretim gerekiyorsa null — LLM kararı çağıranda. */
export function getQuestCached(db: AppDb, nodeId: string) {
  const node = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.id, nodeId))
    .limit(1)
    .get();
  if (!node || node.nodeType !== "side_quest") return { status: "notFound" as const };
  if (node.sideQuestPayload) {
    return {
      status: "ready" as const,
      node: { id: node.id, titleTr: node.titleTr, xpReward: node.xpReward },
      quest: node.sideQuestPayload,
    };
  }
  return { status: "needsGeneration" as const, node };
}
