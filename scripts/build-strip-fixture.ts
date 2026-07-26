// Builds the tiny synthetic save used by src/lib/save/seed-strip.test.ts, so
// the seed-strip proof runs inside `npm test` instead of needing the owner's
// real 19.5 MB data/app.db.
//
//   npm run build:strip-fixture
//
// Deliberately minimal: only the columns the strip and apply*Seed actually
// read. It is a FIXTURE, not a save — it never goes through importSave, so it
// needs no full schema. Payloads come from __fixtures__/payloads.ts, shared
// with the test so the two cannot drift.

import fs from "node:fs";
import Database from "better-sqlite3";
import {
  grammarPayload,
  kanjiPayload,
  vocabPayload,
} from "@/lib/save/__fixtures__/payloads";

const OUT = "src/lib/save/__fixtures__/strip-fixture.db";
fs.mkdirSync("src/lib/save/__fixtures__", { recursive: true });
fs.rmSync(OUT, { force: true });

const db = new Database(OUT);
db.exec(`
  CREATE TABLE save_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE profiles (
    id TEXT PRIMARY KEY NOT NULL,
    target_language TEXT NOT NULL,
    native_language TEXT NOT NULL DEFAULT 'tr'
  );
  CREATE TABLE grammar_topics (
    id TEXT PRIMARY KEY NOT NULL, target_language TEXT NOT NULL, slug TEXT NOT NULL,
    status TEXT NOT NULL, content TEXT, generated_at INTEGER
  );
  CREATE TABLE kanji_entries (
    id TEXT PRIMARY KEY NOT NULL, target_language TEXT NOT NULL, char TEXT NOT NULL,
    status TEXT NOT NULL, content TEXT, generated_at INTEGER
  );
  CREATE TABLE vocab_entries (
    id TEXT PRIMARY KEY NOT NULL, target_language TEXT NOT NULL, word TEXT NOT NULL,
    status TEXT NOT NULL, content TEXT, generated_at INTEGER
  );
`);

db.prepare("INSERT INTO save_meta VALUES ('schemaVersion', '8')").run();
db.prepare("INSERT INTO profiles VALUES ('p-ja', 'ja', 'tr')").run();
db.prepare("INSERT INTO profiles VALUES ('p-zh', 'zh', 'en')").run(); // en-native
db.prepare("INSERT INTO profiles VALUES ('p-nl', 'nl', 'tr')").run();

const g = db.prepare("INSERT INTO grammar_topics VALUES (?,?,?,?,?,?)");
const j = (v: unknown) => JSON.stringify(v);

// 1. plain seed match, legacy BARE payload (pre-T-031 shape) → strippable
g.run("g1", "ja", "seed-match", "ready", j(grammarPayload("a")), 1);
// 2. lang-keyed, en half must SURVIVE the strip
g.run("g2", "ja", "keeps-en", "ready", j({ tr: grammarPayload("b"), en: grammarPayload("EN") }), 1);
// 3. user REGENERATED it — slug is in the seed but content differs → keep
g.run("g3", "ja", "regenerated", "ready", j(grammarPayload("USER-EDITED")), 1);
// 4. not in the seed at all → keep
g.run("g4", "ja", "not-in-seed", "ready", j(grammarPayload("d")), 1);
// 5. already pending → nothing to strip
g.run("g5", "ja", "pending-row", "pending", null, null);
// 6. COLLIDING slug in another language with DIFFERENT content
g.run("g6", "zh", "seed-match", "ready", j(grammarPayload("zh-version")), 1);
// 7. en-native profile's language → must never be stripped (apply*Seed refuses)
g.run("g7", "zh", "zh-only", "ready", j(grammarPayload("zh-only")), 1);
// 8. nl, tr-native → strippable
g.run("g8", "nl", "nl-topic", "ready", j(grammarPayload("nl")), 1);

db.prepare("INSERT INTO kanji_entries VALUES (?,?,?,?,?,?)").run(
  "k1", "ja", "日", "ready", j(kanjiPayload("k")), 1
);
db.prepare("INSERT INTO vocab_entries VALUES (?,?,?,?,?,?)").run(
  "v1", "zh", "的", "ready", j(vocabPayload("v")), 1
);

db.close();
console.log(`${OUT}: ${fs.statSync(OUT).size} bytes`);
