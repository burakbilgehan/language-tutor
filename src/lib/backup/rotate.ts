// Pure rotation helper for the local IndexedDB snapshot store (src/db/browser.ts).
// "Keep the last K, prune the oldest" in one tested place.
//
// T-050: this was shared with the Google Drive backend's version rotation; with
// Drive gone the local snapshot store is the only caller. The cloud sync
// (src/lib/backup/cloud.ts) writes a single R2 key and keeps no history, so it
// has nothing to rotate.

/** A rotatable item identified by a timestamp (epoch ms). */
export interface Rotatable {
  /** Stable id (IDB key). */
  id: string;
  /** Epoch ms this snapshot represents; newest wins. */
  at: number;
}

/**
 * Given existing items and a max count K, returns the ids to DELETE so that at
 * most K newest remain. Assumes the caller has already added the new item to
 * `items` (or will keep it). Pure and order-independent.
 */
export function pruneToK<T extends Rotatable>(items: T[], k: number): string[] {
  if (k <= 0) return items.map((i) => i.id);
  const sorted = [...items].sort((a, b) => b.at - a.at); // newest first
  return sorted.slice(k).map((i) => i.id);
}
