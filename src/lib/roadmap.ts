import { db } from "@/db";
import * as core from "@/core/roadmap";
import { ensureChaptersBackfilled } from "./jobs";

// Sunucu tarafı sarmalayıcı: iş mantığı src/core/roadmap.ts'te (ortam
// bağımsız), burası sunucu db'sini + legacy self-heal'i bağlar.

export type Roadmap = core.Roadmap;

export function getRoadmap(profileId: string) {
  return core.getRoadmap(db, profileId, {
    ensureBackfilled: ensureChaptersBackfilled,
  });
}

export function completeNode(nodeId: string): string[] {
  return core.completeNode(db, nodeId);
}

export function isCurriculumTail(nodeId: string): boolean {
  return core.isCurriculumTail(db, nodeId);
}
