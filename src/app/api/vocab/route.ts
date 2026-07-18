import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { applyVocabSeed, listVocab } from "@/core/vocab";
import { recoverStaleJobs } from "@/lib/jobs";
import type { VocabContent } from "@/lib/llm/schemas";

export const runtime = "nodejs";

// Paketlenmiş seed (public/vocab-seed/<lang>.json) sunuculu modda da yeni
// profilleri besler. Dosya profil başına en fazla bir kez okunur.
const seedCache = new Map<string, Record<string, VocabContent> | null>();
function loadSeed(lang: string) {
  if (!seedCache.has(lang)) {
    try {
      const raw = fs.readFileSync(
        path.join(process.cwd(), "public", "vocab-seed", `${lang}.json`),
        "utf8"
      );
      seedCache.set(lang, JSON.parse(raw).words ?? null);
    } catch {
      seedCache.set(lang, null);
    }
  }
  return seedCache.get(lang) ?? null;
}

// Deliberately NO auto-queue on list open (unlike /api/kanji): vocab is
// ~5000 entries — generation is user-triggered only, like grammar.
export async function GET() {
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  let entries = listVocab(db, profile.targetLanguage);
  if (entries.some((e) => e.status === "pending" || e.status === "error")) {
    const seed = loadSeed(profile.targetLanguage);
    if (seed && applyVocabSeed(db, profile.targetLanguage, seed) > 0) {
      entries = listVocab(db, profile.targetLanguage);
    }
  }
  return NextResponse.json({ entries });
}
