# T-031 Implementation Plan — İçerik dil izolasyonu

Decisions locked (Burak): (1) JSON surfaces → **lang-keyed content map** (exact
restore). (2) Curriculum → manual regen button **+ display gate** (no raw Turkish
on roadmap). (3) Translations → nativeLanguage in cache key (also fixes a
pre-existing collision bug). (4) Scope = comprehensive: "en kullanana Türkçe
gösteremeyiz, vice versa."

Two independent layers → two commit groups. **Layer 2 (content) ships first**
(it's the reported symptom), Layer 1 (error i18n) second.

`SAVE_SCHEMA_VERSION` **will bump to 7** — forced by the translations key change
and the `curricula.contentLang` column. One bump covers both hard cases.

---

## Layer 2 — Content language isolation

### 2.0 Storage wrapper (foundation)
Prompt/output schemas (`LessonSchema`, `GrammarTopicSchema`, `KanjiContentSchema`,
`VocabContentSchema`) **do NOT change** — the LLM still generates ONE language per
call. Add a storage wrapper in `schemas.ts`:

```ts
export type LangKeyed<T> = Partial<Record<"tr" | "en", T>>;
// legacy unstamped rows = a bare T (no tr/en keys) → read as { tr: <bare> }
```

Helper (new, e.g. `src/lib/llm/lang-content.ts` or in schemas.ts):
```ts
// read: pick the profile's language, treat legacy bare content as tr
readLangContent<T>(stored, nativeLang): T | null
// null = mismatch/absent → caller treats as needsGeneration
mergeLangContent<T>(existing, nativeLang, fresh): LangKeyed<T>
// { ...normalizeLegacy(existing), [nativeLang]: fresh } — NEVER replace
```
`normalizeLegacy`: if stored has neither `tr` nor `en` key AND is non-null → wrap
as `{ tr: stored }`. This is the one-time migration-on-read; unstamped rows read
as tr (tr was the historical default). Data-safe, one-time regen cost per row on
first en read.

DB `$type` changes: `lessons.content`, `grammar_topics.content`,
`kanji_entries.content`, `vocab_entries.content` → `$type<LangKeyed<...>>()`.
**No column migration** (JSON column, flexible). No bump from these four.

### 2.1 WRITE side — the exact-restore invariant (CRITICAL)
All 7 write sites currently `.set({ content, ... })` = wholesale replace, which
wipes the other language. Every one must MERGE:
- `src/core/llm-gen.ts:144` (lesson), `:243`, `:298`, `:353`
- `src/core/grammar.ts:82`
- `src/core/kanji.ts:104`
- `src/core/vocab.ts:108`

Pattern: read existing row content, `set({ content: mergeLangContent(existing,
nativeLang, fresh), ... })`. Each writer needs the profile's nativeLanguage in
scope (llm-gen already resolves profile; verify grammar/kanji/vocab do too).
**If any writer stays wholesale-replace, exact-restore silently fails.** This is
the #1 verification target.

### 2.2 READ side — mismatch gate
Each core read gate treats lang-mismatch as needsGeneration/pending:
- `src/core/lesson.ts:79` `openNode` — currently checks `status==="ready" &&
  content`; add profile lookup + `readLangContent(content, nativeLang)` null →
  `needsGeneration`. (openNode does NOT read profile today — add it.)
- `src/core/grammar.ts` `findGrammarTopic` / list — mismatch row shows as not-ready
  in list, generate on open.
- `src/core/kanji.ts:177` `kanjiLookup` — fallback path already exists
  (`meaningsEn` when not ready); route mismatch through the SAME fallback.
- `src/core/vocab.ts` `findVocab` — same as grammar.

List GETs (grammar/kanji/vocab) already expose per-row `status`; derive an
effective status = mismatch ? "pending" : status so the list UI shows "Hazırla".

### 2.3 Packaged seeds — gate on tr (pre-existing gap)
`applyGrammarSeed` / `applyKanjiSeed` / `applyVocabSeed` currently apply Turkish
seed content with NO native-language check. Gate: **only apply when
`profile.nativeLanguage === "tr"`** (seed JSON is tr-native). Simplest: guard at
each `applyXSeed` call. en users generate from LLM.
- Wire points: server list GET (grammar/kanji/vocab routes) + static detail
  deep-link paths. Both already call applyXSeed — add the guard inside the core
  apply fn (so both modes inherit) OR at each call site.
- Seed content stamped: when applied, write as `{ tr: <seed> }` so it round-trips
  correctly if the user later adds en then returns to tr.
- **No-LLM degrade edge (accepted, note only):** on `LLM_CLI_DISABLED` deploys an
  en user gets no seed AND no generate → empty content. Acceptable per scope;
  log/note, don't guard.

### 2.4 Translations cache — key fix (schema change → bump)
- `schema.ts:291` add `nativeLanguage` column; change
  `uniqueIndex("translation_text_idx")` to `.on(targetLanguage, nativeLanguage,
  sourceText)`.
- `src/core/translate.ts` `cachedTranslation` + writer: thread nativeLanguage into
  key. Fixes pre-existing collision (tr & en profiles on same target shared a row).
- `src/app/api/translate/route.ts` passes nativeLanguage.

### 2.5 Curriculum — stamp + display gate + regen button (schema change)
- `schema.ts` add `contentLang` (nullable text) to **`curricula`** only (one
  column, not five). null = legacy = tr.
- `generateChapter` (`src/core/curriculum-gen.ts`) stamps `contentLang =
  nativeLanguage` on write.
- **Display gate** (`src/core/roadmap.ts` / `overview.ts`): when
  `curricula.contentLang` (?? "tr") !== profile.nativeLanguage → roadmap renders a
  "Bu dilde hazırlanmadı — yeniden üret" placeholder instead of raw Turkish
  titles. This is what honors "en adama Türkçe gösteremeyiz."
- **Regen button**: Settings or roadmap — `POST /api/curriculum/regenerate` (or
  reuse generate with a force flag) rebuilds all chapters in nativeLanguage,
  restamps contentLang. Manual (2–5 min, don't auto-spend on switch).
- Curriculum content is NOT preserved per-language (plain columns) — regen
  overwrites. Acceptable: titles are cheap vs lesson content, and Burak chose
  button-only for the write side.

### 2.6 nativeLanguage-change UX (Settings)
`PATCH /api/profile` handles the tr↔en change (`ProfileSection.tsx`). Add a cost
warning at the change point: "cache'li içerik bu dilde yok, açtıkça yeniden
üretilecek; müfredat için yeniden-üret butonu." Content is NOT deleted — return to
tr restores exactly (map keys intact).

---

## Layer 1 — Hardcoded Turkish (error strings)
Sweep result: **JSX is clean** (all in S tables). The leak is bare Turkish thrown
from `client-api.ts` + ~18 route files, rendered verbatim by every `catch (e) {
setError(e.message) }`. `"Profil yok"` fires when NO profile exists → no
profile.uiLanguage at throw site → **error-code contract** (not uiLanguage
threading) is the only correct fix.

### 1.1 Error-code contract
- Throw stable codes, not prose: `throw new AppError("profile_missing")` (new
  `src/lib/errors.ts`, code enum). Routes return `{ error: code }`.
- UI boundary maps code → localized string via a co-located S table
  (`src/lib/i18n/errors.ts`, tr/en). `fetchJson` / catch blocks resolve code →
  `useStrings`. Pre-profile: UI still knows uiLanguage (draft/navigator), so it
  localizes correctly.
- Scope: **top + mid tier only** (sweep ranking). Bottom-tier 400s ("response
  gerekli" etc.) are code-bug-only, out of first pass — noted, not fixed.
- Codes to cover: profile_missing, curriculum_not_ready, not_found
  (kanji/word/topic/lesson/card/exercise/job — param'd), llm_unconfigured
  (already a code path — align), node_locked, lesson_gen_failed,
  duplicate_profile, save_invalid / save_version_mismatch (interpolate version),
  profile_mismatch, no_level_to_extend, job_cancelled.

---

## Verification (per ticket)
1. tr profile → generate grammar+kanji+lesson (content stamped `{tr}`).
2. Settings → nativeLanguage=en → those surfaces drop to pending, LLM regenerates
   en (writes `{tr, en}` — tr preserved).
3. Roadmap shows en titles or "hazırlanmadı" placeholder, NOT raw Turkish.
4. Back to tr → old Turkish content returns **exactly** (map key `tr` intact) — no
   regeneration.
5. Seeds do NOT apply to en profile (grammar/kanji/vocab stay pending for en).
6. Translations: en user does not see a tr-cached translation for same target/text.
7. Error strings render in en when uiLanguage=en (e.g. no-profile state).

Regression: run `npx tsx scripts/test-sqljs-parity.ts` (touched core/*), `npm
test`, `LLM_PROVIDER=fixture npm run build`.

## Commit sequence
1. `feat(content): lang-keyed content map + merge writes + mismatch gate` (2.0–2.2)
2. `feat(content): gate packaged seeds on tr native` (2.3)
3. `feat: translations cache keyed by native language` (2.4) — bump
4. `feat: curriculum lang stamp + roadmap display gate + regen` (2.5) — bump
5. `feat: nativeLanguage-change cost warning` (2.6)
6. `feat(i18n): error-code contract for API/client-api errors` (Layer 1)

SAVE_SCHEMA_VERSION 6→7 lands in commit 3.
