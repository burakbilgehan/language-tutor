// Pure rotation helpers shared by the local IndexedDB snapshot store and the
// Drive backend. "Keep the last K, prune the oldest" in one tested place.

/** A rotatable item identified by a timestamp (epoch ms). */
export interface Rotatable {
  /** Stable id (IDB key or Drive file id). */
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

/**
 * Newer-save detection: is the remote (Drive) save strictly newer than what we
 * last synced locally? Null localTs means we've never synced → any remote save
 * counts as newer. Null remoteTs means Drive is empty → never newer.
 */
export function isRemoteNewer(
  localSyncedAt: number | null,
  remoteAt: number | null
): boolean {
  if (remoteAt === null) return false;
  if (localSyncedAt === null) return true;
  return remoteAt > localSyncedAt;
}
