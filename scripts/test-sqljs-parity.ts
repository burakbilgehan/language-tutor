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

console.log(fail === 0 ? "ALL PASS" : `${fail} FAILURES`);
process.exit(fail ? 1 : 0);

}
main();
