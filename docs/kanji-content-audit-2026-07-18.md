Historical audit report (2026-07-18), related to [T-023](../tickets/T-023-haiku-content-qa.md). Originally scratchpad-kanji-audit-report.md at the repo root.

# Quality audit: haiku-generated content (data/app.db)

Date: 2026-07-18. Sample: targeted a random 100 from `status='ready'` rows;
actual distribution **78 kanji + 2 vocab + 20 grammar** (vocab has only 2 ready rows, so a target of 20 was impossible, shifted to kanji).

Audit: Opus using its own ja/zh/nl knowledge + a second adversarial verifier pass. The bar for a definite error was set high.

## (a) Summary

| Category | n | Definite error | Suspect | Clean | Note |
|----------|---|-----------|---------|-------|------|
| kanji    | 78 | **2** | 4 | 72 | all readings (onyomi/kunyomi) correct; errors are in the TR gloss layer |
| grammar  | 20 | 0 | 0 | 20 | ja/zh/nl examples + pinyin + translation all real/correct |
| vocab    | 2  | 0 | 0 | 2 | clean, but n=2, **no statistical signal**, vocab cannot be called "validated" |

**Overall verdict:** this is a **translation-layer quality issue**, not a "the model doesn't
know Japanese" issue. Every kana reading in the sample, every example word structure, all
grammar/pinyin came out correct; both errors are Turkish gloss errors (one a fabricated
meaning, one a wrong translation). This is exactly the error type that moving the fast tier
to sonnet fixes.

**For the rate / decision:**
- Definite error (kanji): 2/78 ~= **2.6%**. n=78 -> wide confidence interval (~0.3-9%). Point
  estimate: ~50 broken kanji out of 1932; honest range is tens up to ~170.
- If "broken OR weak/odd gloss" is included, the kanji rate rises to ~4-5% (suspects below)
  -> ~80-100 kanji records. This is **right above the 5% threshold**, the deciding zone for
  the regenerate-vs-sonnet call.
- Grammar is clearly clean; the vocab sample is too small to mean anything (only 2 records exist).

## (b) Definite errors (verifier-confirmed)

1. **郡** (id `dEF1dV0DSNV3YD6MTbZoK`): `meanings_tr` contains `"Gün (Eski Asya)"` ("Day
   (Old Asia)"); 郡 does not mean "day" under any reading, it only means county/administrative
   district. A fabricated meaning.
   - Note: its example words (郡市/郡道/郡役所) are real; only the gloss list is broken.
2. **扇** (id `V5OR4sqlwXyoRDNvNv7Bn`): 扇子(せんす) has `meaning_tr = "Uçkur"` ("drawstring/waistband
   cord"); 扇子 = a folding hand fan, "uckur" is completely unrelated. The same error repeats in
   `note_tr` ("扇子 ise uçkur anlamına gelir", "as for 扇子, it means uckur"), so it's not a one-off
   typo but systematic.

## (c) Suspects (NOT touched, informational)

Did not clear the definite-error bar:
- **窃** (id `rWWJiM1bIIRl9fy4YUpxg`): the 窃盗 gloss reads `"Hırsızlık, tırnakla hırsızlık"`
  ("Theft, theft by fingernail"); "theft by fingernail" is a nonsensical addition (the core
  meaning is correct). 窃む -> ぬすむ is nonstandard (the common form is 盗む).
- **締** (id `H_CnedZFx_oUfuCQqpFKh`): ドアを締める -> "to close the door" ("kapıyı kapatmak");
  the standard spelling is 閉める. 締 does carry a "shut/lock" sense, so this is borderline, not
  a dictionary error.
- **峰** (id `BarwD3TdUYwjrLMjDwVfN`): 奥峰(おくみね) is not a standard dictionary headword;
  most likely a place name or proper noun only. (峰々 is real, no issue there.)
- **酬** (id `n_LoFK2d2RbexdHL0fmqS`): 酬宴(しゅうえん) is not a standard banquet word (the real
  ones are 祝宴/酒宴/饗宴). The reading is internally consistent; fabrication could not be proven.

No offline 国語辞典 (Japanese dictionary) was available for 奥峰 and 酬宴; if checked against a
real dictionary API they could turn out to be "rare but real."

## (d) UPDATE SQL: NOT RUN (the user said "analysis only")

If approved, first confirm with `pgrep -f blast-generate` that generation is not running, then:

```sql
-- Mark the definite errors as 'error' so the next blast-generate run regenerates them
UPDATE kanji_entries SET status='error' WHERE id IN (
  'dEF1dV0DSNV3YD6MTbZoK',  -- 郡: "Gün (Eski Asya)" fabricated meaning
  'V5OR4sqlwXyoRDNvNv7Bn'   -- 扇: 扇子="Uçkur" wrong translation
);
```

Alternative (point fix without regenerating): remove the "Gün (Eski Asya)" gloss from 郡;
change the 扇子 meaning_tr + note_tr in 扇's content to "katlanır el yelpazesi" (folding hand fan).

## (e) Next-step decision (for the user)

- Definite error rate 2.6%, but including weak glosses ~4-5%, above the threshold.
- Since the error type is gloss quality, **fast tier -> sonnet** (`LLM_MODEL_FAST=sonnet` for
  blast) will likely clean these up, at roughly 2-3x slower.
- Alternative: mark only the 2 definite errors as error and spot-fix; but the weak-gloss queue remains.
