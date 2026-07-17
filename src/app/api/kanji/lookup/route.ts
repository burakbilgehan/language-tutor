import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { lookupWord } from "@/lib/jmdict";

export const runtime = "nodejs";

const KANJI_RE = /[一-鿿々]/g;
const MAX_CHARS = 8;

/**
 * Batch dictionary lookup for the selection tooltip: extracts the unique
 * kanji in `text` and returns readings + meaning per char — plus, when the
 * whole selection is one dictionary word (誕生日), its compound reading and
 * gloss from the vendored JMdict subset. Individual kanji have many readings;
 * the compound tells you which one actually applies. Pure DB/data read —
 * never triggers generation.
 */
export async function GET(req: Request) {
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  const text = new URL(req.url).searchParams.get("text") ?? "";

  // Whole-selection word lookup (kanji compounds and kana words alike).
  const candidate = text.replace(/\s+/g, "");
  const word =
    candidate.length >= 2 && candidate.length <= 12
      ? lookupWord(candidate)
      : null;

  const chars = [...new Set(text.match(KANJI_RE) ?? [])].slice(0, MAX_CHARS);
  if (chars.length === 0) return NextResponse.json({ kanji: [], word });

  const rows = db.query.kanjiEntries
    .findMany({
      where: and(
        eq(tables.kanjiEntries.targetLanguage, profile.targetLanguage),
        inArray(tables.kanjiEntries.char, chars)
      ),
    })
    .sync();
  const byChar = new Map(rows.map((r) => [r.char, r]));

  const kanji = chars.flatMap((char) => {
    const entry = byChar.get(char);
    if (!entry) return [];
    const meaning =
      entry.status === "ready" && entry.content
        ? entry.content.meanings_tr.slice(0, 3).join(", ")
        : entry.meaningsEn.slice(0, 2).join(", ");
    const readings = [...entry.kunyomi.slice(0, 2), ...entry.onyomi.slice(0, 1)];
    return [{ char, reading: readings.join("・"), meaning }];
  });

  return NextResponse.json({ kanji, word });
}
