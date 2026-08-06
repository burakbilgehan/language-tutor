import { requireAuth } from "@/lib/auth";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { applyKanjiSeed, listKanji } from "@/core/kanji";
import { queueKanjiLevel, recoverStaleJobs, topChapterLevel } from "@/lib/jobs";
import { isJlptLevel, levelOrdinal, type JlptLevel } from "@/lib/curriculum/levels";
import { eq } from "drizzle-orm";
import { tables } from "@/db";
import type { KanjiContent } from "@/lib/llm/schemas";
import type { NativeLang } from "@/lib/llm/lang-content";

export const runtime = "nodejs";

// Paketlenmiş seed (public/kanji-seed/<lang>.json) sunuculu modda da yeni
// profilleri besler. Dosya profil başına en fazla bir kez okunur.
const seedCache = new Map<string, Record<string, KanjiContent> | null>();
function loadSeed(lang: string, native: string = "tr") {
  const key = `${lang}:${native}`;
  if (!seedCache.has(key)) {
    try {
      const file = native === "tr" ? `${lang}.json` : `${lang}.${native}.json`;
      const raw = fs.readFileSync(
        path.join(process.cwd(), "public", "kanji-seed", file),
        "utf8"
      );
      seedCache.set(key, JSON.parse(raw).chars ?? null);
    } catch {
      seedCache.set(key, null);
    }
  }
  return seedCache.get(key) ?? null;
}

export async function GET(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  const nativeLang = (profile.nativeLanguage ?? "tr") as NativeLang;
  let entries = listKanji(db, profile.targetLanguage, nativeLang);
  // Boş girişleri önce seed'den doldur — auto-fill LLM kuyruğu ancak seed'in
  // kapatamadığı boşluklar için devreye girsin.
  if (entries.some((e) => e.status === "pending" || e.status === "error")) {
    const seed = loadSeed(profile.targetLanguage, nativeLang);
    if (
      seed &&
      applyKanjiSeed(db, profile.targetLanguage, seed, nativeLang, nativeLang) > 0
    ) {
      entries = listKanji(db, profile.targetLanguage, nativeLang);
    }
  }

  // Auto-fill: opening the kanji list starts generating the learner's current
  // level in the background so examples are ready by default. "Current" =
  // the LOWEST level that still has pending entries, capped at the top
  // curriculum chapter. Only 'pending' — errored entries need the explicit
  // per-level button, never a silent background retry. (Sunucuya özgü: LLM
  // job'u — statik mod tarayıcı LLM katmanıyla alacak.)
  const curriculum = db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profile.id))
    .limit(1)
    .get();
  const top = curriculum
    ? topChapterLevel(curriculum.id, profile.targetLanguage)
    : null;
  if (top && isJlptLevel(top)) {
    const autoLevel = entries
      .filter((e) => e.status === "pending" && isJlptLevel(e.level))
      .map((e) => e.level as JlptLevel)
      .filter((l) => levelOrdinal(l) <= levelOrdinal(top))
      .sort((a, b) => levelOrdinal(a) - levelOrdinal(b))[0];
    if (autoLevel)
      queueKanjiLevel(profile.targetLanguage, autoLevel, false, nativeLang);
  }

  return NextResponse.json({ entries });
}
