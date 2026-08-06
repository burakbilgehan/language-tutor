import { requireAuth } from "@/lib/auth";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { applyVocabSeed, listVocab } from "@/core/vocab";
import { recoverStaleJobs } from "@/lib/jobs";
import type { VocabContent } from "@/lib/llm/schemas";
import type { NativeLang } from "@/lib/llm/lang-content";

export const runtime = "nodejs";

// Paketlenmiş seed (public/vocab-seed/<lang>.json) sunuculu modda da yeni
// profilleri besler. Dosya profil başına en fazla bir kez okunur.
const seedCache = new Map<string, Record<string, VocabContent> | null>();
function loadSeed(lang: string, native: string = "tr") {
  const key = `${lang}:${native}`;
  if (!seedCache.has(key)) {
    try {
      const file = native === "tr" ? `${lang}.json` : `${lang}.${native}.json`;
      const raw = fs.readFileSync(
        path.join(process.cwd(), "public", "vocab-seed", file),
        "utf8"
      );
      seedCache.set(key, JSON.parse(raw).words ?? null);
    } catch {
      seedCache.set(key, null);
    }
  }
  return seedCache.get(key) ?? null;
}

// Deliberately NO auto-queue on list open (unlike /api/kanji): vocab is
// ~5000 entries — generation is user-triggered only, like grammar.
export async function GET(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  const nativeLang = (profile.nativeLanguage ?? "tr") as NativeLang;
  let entries = listVocab(db, profile.targetLanguage, nativeLang);
  if (entries.some((e) => e.status === "pending" || e.status === "error")) {
    const seed = loadSeed(profile.targetLanguage, nativeLang);
    if (
      seed &&
      applyVocabSeed(db, profile.targetLanguage, seed, nativeLang, nativeLang) > 0
    ) {
      entries = listVocab(db, profile.targetLanguage, nativeLang);
    }
  }
  return NextResponse.json({ entries });
}
