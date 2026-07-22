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

// Paketlenmiş seed (public/grammar-seed/<lang>.json) sunuculu modda da yeni
// profilleri besler. Dosya profil başına en fazla bir kez okunur.
const seedCache = new Map<string, Record<string, GrammarTopicContent> | null>();
function loadSeed(lang: string) {
  if (!seedCache.has(lang)) {
    try {
      const raw = fs.readFileSync(
        path.join(process.cwd(), "public", "grammar-seed", `${lang}.json`),
        "utf8"
      );
      seedCache.set(lang, JSON.parse(raw).topics ?? null);
    } catch {
      seedCache.set(lang, null);
    }
  }
  return seedCache.get(lang) ?? null;
}

export async function GET() {
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  const nativeLang = (profile.nativeLanguage ?? "tr") as NativeLang;
  let topics = listGrammarTopics(db, profile.targetLanguage, nativeLang);
  if (topics.some((t) => t.status === "pending" || t.status === "error")) {
    const seed = loadSeed(profile.targetLanguage);
    if (
      seed &&
      applyGrammarSeed(db, profile.targetLanguage, seed, nativeLang) > 0
    ) {
      topics = listGrammarTopics(db, profile.targetLanguage, nativeLang);
    }
  }
  return NextResponse.json({ topics });
}
