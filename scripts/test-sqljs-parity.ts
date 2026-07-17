// sql.js sürücü parite testi: gerçek app.db imajını sql.js'e yükle, core
// SRS fonksiyonlarını çalıştır (tarayıcıda çalışacak yolun aynısı, node'da).
import fs from "node:fs";
import initSqlJs from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import * as schema from "@/db/schema";
import { srsDue, srsReview } from "@/core/srs";
import { getActiveProfile } from "@/core/profile";
import { totalXp } from "@/core/xp";

async function main() {
const SQL = await initSqlJs({
  locateFile: (f: string) => `node_modules/sql.js/dist/${f}`,
});
const bytes = fs.readFileSync("data/app.db");
const sqlite = new SQL.Database(bytes);
sqlite.run("PRAGMA foreign_keys = ON");
const db = drizzle(sqlite, { schema });

let fail = 0;
const check = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "OK " : "FAIL"} ${name} ${extra}`);
  if (!cond) fail++;
};

// 1. Profil okuma (relational query + .sync())
const profile = getActiveProfile(db as never);
check("getActiveProfile", !!profile, `→ ${profile?.targetLanguage}`);

// 2. srsDue (findMany + count + get)
const due = srsDue(db as never);
check("srsDue çalışır", due !== null, `→ ${due?.dueCount} due, ${due?.cards.length} kart`);

// 3. srsReview (transaction + update + insert + XP) — due kart varsa
if (due && due.cards.length > 0) {
  const before = totalXp(db as never, profile!.id);
  const r = srsReview(db as never, due.cards[0].id, 2);
  const after = totalXp(db as never, profile!.id);
  check("srsReview transaction", r !== null, `→ interval ${r?.intervalDays}g, kalan ${r?.remaining}`);
  check("XP yazıldı (+2)", after === before + 2, `${before}→${after}`);
} else {
  // due kart yoksa herhangi bir kartla test et
  const anyCard = db.query.srsCards.findFirst().sync();
  if (anyCard) {
    const r = srsReview(db as never, anyCard.id, 2);
    check("srsReview transaction (rastgele kart)", r !== null, `→ interval ${r?.intervalDays}g`);
  } else check("test edilecek kart yok", false);
}

// 4. İmaj export (save uyumluluğu) — başlık "SQLite format 3"
const out = sqlite.export();
const header = Buffer.from(out.slice(0, 15)).toString();
check("export SQLite imajı", header === "SQLite format 3", `${(out.length / 1e6).toFixed(1)}MB`);


// 5. Roadmap + Stats (harita tranche'ı)
{
  const { getRoadmap } = await import("@/core/roadmap");
  const { getStats } = await import("@/core/stats");
  const { listProfiles } = await import("@/core/profile");
  const rm = getRoadmap(db as never, profile!.id);
  check("getRoadmap", rm !== null, `→ ${rm?.units.length} ünite, ${rm?.sideQuests.length} yan görev, xp=${rm?.xpTotal}`);
  const st = getStats(db as never);
  check("getStats", st.llm.totalCalls > 0, `→ ${st.llm.totalCalls} çağrı, $${st.llm.totalUsd.toFixed(2)}`);
  const ps = listProfiles(db as never);
  check("listProfiles", ps.length > 0 && typeof ps[0].displayName === "string", `→ ${ps.length} profil`);
}


// 6. Ders akışı (open/attempt/complete)
{
  const { openNode, attemptExercise, completeNodeFlow } = await import("@/core/lesson");
  const schema = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const readyLesson = db.select().from(schema.lessons).where(eq(schema.lessons.status, "ready")).limit(1).get();
  const opened = readyLesson ? openNode(db as never, readyLesson.nodeId) : null;
  check("openNode ready", opened?.status === "ready",
    opened?.status === "ready" ? `→ ${opened.exercises.length} egzersiz` : String(opened?.status));

  if (opened?.status === "ready") {
    // deterministik yanlış cevap (mcq)
    const mcq = opened.exercises.find((e) => e.type === "mcq");
    if (mcq) {
      const out = await attemptExercise(db as never, {
        exerciseId: mcq.id, response: "kesinlikle-yanlis-cevap-xyz",
        profile: { id: profile!.id, targetLanguage: profile!.targetLanguage, uiLanguage: "tr" },
      });
      check("attempt mcq deterministik", out.kind === "graded" && out.result.gradedBy === "deterministic",
        out.kind === "graded" ? `→ correct=${out.result.isCorrect}` : out.kind);
    }
    // self-check protokolü (translate, llmGrade yok)
    const tr = db.select().from(schema.exercises)
      .where(eq(schema.exercises.grading, "llm")).limit(1).get();
    if (tr) {
      const p = { id: profile!.id, targetLanguage: profile!.targetLanguage, uiLanguage: "tr" };
      const step1 = await attemptExercise(db as never, { exerciseId: tr.id, response: "alakasiz xyz", profile: p });
      check("attempt self-check adım 1", step1.kind === "needsSelfCheck");
      const step2 = await attemptExercise(db as never, { exerciseId: tr.id, response: "alakasiz xyz", selfVerdict: true, profile: p });
      check("attempt self-check adım 2", step2.kind === "graded" && step2.result.gradedBy === "self" && step2.result.xpAwarded === 5);
    }
    // complete akışı
    const flow = completeNodeFlow(db as never, opened.node.id, profile!.id);
    check("completeNodeFlow", flow !== null, `→ xp=${flow?.xpAwarded}, yeniKart=${flow?.newCards}, unlock=${flow?.unlockedNodeIds.length}`);
  }
}


// 7. Gramer (nl profiline geçiş + dil-doğru liste — kullanıcının bug senaryosu)
{
  const { listGrammarTopics } = await import("@/core/grammar");
  const { setActiveProfile, listProfiles: lp } = await import("@/core/profile");
  const nl = lp(db as never).find((p) => p.targetLanguage === "nl");
  if (nl) {
    setActiveProfile(db as never, nl.id);
    const topics = listGrammarTopics(db as never, "nl");
    const wrongLang = topics.some((t) => /[぀-ヿ一-鿿]/.test(t.titleTr));
    check("nl grammar listesi nl", topics.length > 0 && !wrongLang, `→ ${topics.length} konu, ilki: ${topics[0]?.titleTr}`);
  } else check("nl profili yok", false);
}


// 8. Süpürme: overview/kanji/chat/lookup/quest-cached/translate-cached
{
  const { getOverview } = await import("@/core/overview");
  const { listKanji, kanjiLookup } = await import("@/core/kanji");
  const { chatHistory } = await import("@/core/chat");
  const { getQuestCached } = await import("@/core/quest");
  const { cachedTranslation } = await import("@/core/translate");
  const { setActiveProfile: sap } = await import("@/core/profile");
  const schema = await import("@/db/schema");
  sap(db as never, profile!.id); // ja'ya dön

  const ov = getOverview(db as never, profile!);
  check("getOverview (raw SQL → sql tag)", ov.nodes.total > 0, `→ ${ov.nodes.completed}/${ov.nodes.total} node, srs due=${ov.srs.due}`);

  const kl = listKanji(db as never, "ja");
  check("listKanji", kl.length > 100, `→ ${kl.length} kanji`);

  const look = kanjiLookup(db as never, "ja", "日本");
  check("kanjiLookup", look.kanji.length > 0, `→ ${look.kanji.map(k=>k.char).join("")}, word=${!!look.word}`);

  const ch = chatHistory(db as never, profile!.id);
  check("chatHistory", Array.isArray(ch.messages), `→ ${ch.messages.length} mesaj`);

  const questRow = db.select().from(schema.nodes).all().find((n) => n.nodeType === "side_quest" && n.sideQuestPayload);
  if (questRow) {
    const q = getQuestCached(db as never, questRow.id);
    check("quest cached", q.status === "ready");
  }

  const tr = db.select().from(schema.translations).limit(1).get();
  if (tr) {
    const hit = cachedTranslation(db as never, tr.targetLanguage, tr.sourceText);
    check("cachedTranslation", hit === tr.translationTr);
  }
}

console.log(fail === 0 ? "ALL PASS" : `${fail} FAILURES`);
process.exit(fail ? 1 : 0);

}
main();
