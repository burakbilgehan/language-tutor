import { requireAuth } from "@/lib/auth";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { applyGrammarSeed, listGrammarTopics } from "@/core/grammar";
import { recoverStaleJobs } from "@/lib/jobs";
import type { GrammarTopicContent } from "@/lib/llm/schemas";
import type { NativeLang } from "@/lib/llm/lang-content";

export const runtime = "nodejs";

// Paketlenmiş seed sunuculu modda da yeni profilleri besler. Dosya profil
// başına en fazla bir kez okunur. İki katman (T-064): tr = gerçek içerik
// (<lang>.json), diğer native diller = build-time MT (<lang>.<native>.json,
// bkz. src/lib/grammar-seed.ts).
const seedCache = new Map<string, Record<string, GrammarTopicContent> | null>();
function loadSeed(lang: string, nativeLang: NativeLang) {
  const file = nativeLang === "tr" ? `${lang}.json` : `${lang}.${nativeLang}.json`;
  const key = `${lang}:${nativeLang}`;
  if (!seedCache.has(key)) {
    try {
      const raw = fs.readFileSync(
        path.join(process.cwd(), "public", "grammar-seed", file),
        "utf8"
      );
      seedCache.set(key, JSON.parse(raw).topics ?? null);
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
  let topics = listGrammarTopics(db, profile.targetLanguage, nativeLang);
  if (topics.some((t) => t.status === "pending" || t.status === "error")) {
    const seed = loadSeed(profile.targetLanguage, nativeLang);
    if (
      seed &&
      applyGrammarSeed(db, profile.targetLanguage, seed, nativeLang, nativeLang) > 0
    ) {
      topics = listGrammarTopics(db, profile.targetLanguage, nativeLang);
    }
  }
  return NextResponse.json({ topics });
}
