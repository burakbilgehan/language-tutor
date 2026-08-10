# T-023 Content Quality Audit Report

Date: 2026-08-10. Read-only audit; no DB, seed, or code changes were made.
Source: `data/app.db` snapshot. This supersedes the 2026-07-18 kanji+grammar
leg (`docs/kanji-content-audit-2026-07-18.md`), whose "clean" verdict does not
hold at this sample size.

## Method

- Sample: 470 content items, deterministic (seeded PRNG, reproducible),
  level-balanced: zh vocab 200 of 4991, ja kanji 100 of 2211, grammar ja 50 of
  298 + zh 50 of 184 + nl 40 of 72 + fr 30 of 80, plus the full static
  conjugation tables (`src/lib/conjugation/{ja,zh,nl}.ts`). fr grammar was not
  in the original ticket scope but exists in the DB and was included.
- Auditors: 23 Opus subagents (one per batch), each grading every finding as
  CRITICAL (nonsense/hallucination), MAJOR (real factual error), MINOR
  (small slip), or SUSPICIOUS (uncertain, listed separately).
- Verification: all 68 CRITICAL claims went through independent adversarial
  verifiers whose only job was to refute them; a systematic 57-of-394 sample
  of MAJOR claims was verified the same way to estimate precision. The three
  nl and one ja conjugation code claims were verified by actually running
  `conjugateNl`/`conjugateJa`.

## Headline numbers

Verification results first, because they calibrate everything else:

- CRITICAL claims: 68 filed, 41 confirmed critical, 27 downgraded (21 to
  major, 6 to minor), **0 refuted**. Precision of the critical class: 100%
  as real errors, 60% at the claimed grade.
- MAJOR sample: 57 verified, 46 confirmed, 9 downgraded to minor, 1 refuted,
  1 uncertain. Estimated MAJOR precision: **~81%**.

Per-surface rates. "Items with real errors" counts items carrying at least
one critical or major finding, discounted by the 81% major precision;
"confirmed critical items" are post-verification.

| Surface | Sample | Confirmed critical items | Items w/ critical or major findings (raw) | Est. true major+ item rate |
| --- | --- | --- | --- | --- |
| zh vocab | 200 | 9 (4.5%) | 118 (59%) | ~48% |
| ja kanji | 100 | 6 (6%) | 46 (46%) | ~37% |
| grammar ja | 50 | 3 (6%) | 25 (50%) | ~40% |
| grammar zh | 50 | 3 (6%) | 20 (40%) | ~32% |
| grammar nl | 40 | 5 (12.5%) | 29 (72.5%) | ~59% |
| grammar fr | 30 | 2 (6.7%) | 19 (63%) | ~51% |
| conjugation zh | full file | 0 | 0 | clean (6 minor label/copy slips) |
| conjugation ja | full file | 1 algorithmic bug | 2 | code bug, affects every user |
| conjugation nl | full file | 3 algorithmic bugs | 5 | code bugs, affect every user |

Every LLM-generated surface is far above the ticket's 5% threshold. Raw
finding totals across the sample: 68 critical, 394 major, 776 minor, 207
suspicious claims (minor and suspicious were not verified; treat them as
indicative only).

## Confirmed critical errors

The 41 verified criticals. Grouped by surface; "current" values abbreviated.

### zh vocab (10 findings, 9 words)

| word | field | defect |
| --- | --- | --- |
| 竟然 | entire tr payload | Uses 竢 (U+7AE2) ten times, 竟 zero times: no example, collocation, or char row contains the headword; the wrong character is glossed with 竟's reading |
| 脏 | entire tr payload | Static reading is zāng "dirty" (meanings_en leads with dirty); the tr payload teaches only zàng "viscera", so the word is both mispronounced and mis-defined; example sentences (人体有五个脏) are themselves unnatural |
| 悬念 | note_tr | Leaked raw tool-call markup (`<parameter name=...>` + "null") stored in the learner-facing note; classifier_note_tr key absent |
| 惭愧 | meanings_tr + example + collocation | "ödü kopmak" (terrified) for a word meaning ashamed; propagates into an example translation and a collocation gloss |
| 请示 | meanings_tr[2] | "başsağlığı almak" (receiving condolences) invented; the word means asking a superior for instructions |
| 悔恨 | meanings_tr[3] | "enginiş": not a Turkish word; hallucinated token in the meaning list |
| 臂 | en meanings + example | Invented sense "wing (of a bird)"; generated example 鸟展开双臂飞向天空 (a bird spreading its arms) is not Chinese usage |
| 敬礼 | note_tr | Tells the learner to distinguish from "huīhuō (el sallama)", a word that does not exist (waving is 挥手 huīshǒu) |
| 所以 | en collocations | 就是所以 presented as idiomatic; not parseable Chinese |
| 赔偿 | meanings_tr | "karşılaştırmak" (to compare) listed for a word meaning to compensate (from vocab-zh-06; verified in the batch pass) |

### ja kanji (11 findings, 6 characters)

| char | field | defect |
| --- | --- | --- |
| 諒 | 5 of its examples | Fabricated compounds 容諒, 寛諒, 情諒, 嘉諒, 了諒: none attested in Japanese; invented readings and glosses |
| 遇 | examples + note | 遇然 for ぐうぜん (correct: 偶然), taught twice; 相遇 for そうぐう (correct: 遭遇, which the en payload itself lists) |
| 鷹 | examples | Invented idiom 目を鷹にする (real: 目を皿にする) |
| 啓 | en examples | 啓動 "boot-up": Chinese 启动; Japanese is 起動, and it is framed as a gaming term |
| 棺 | en examples | 棺材: the Chinese word for coffin, unattested reading かんざい, back-formed gloss |
| 朝 | en note | 朝代 = dynasty: Chinese; Japanese uses 王朝 |

Related batch-level note: 苑's entire tr example list (6 of 6) uses 園
instead of 苑, so the learner never sees the character being taught; the
verifier graded the individual rows as major (the words shown are real
words), but the card as a whole fails its purpose.

### grammar ja (4 findings, 3 topics)

| slug | defect |
| --- | --- |
| koto-tote | Example contains Cyrillic corruption 「старい人間」; rendered text is not Japanese |
| nante-nanka | 大[きら]いだ in an example AND in the pattern table: 嫌 was dropped and 大 was assigned the reading きら; the broken form is the model sentence |
| made-mo-nai | en payload invents a meaning for までのことだ ("matter too minor to bother with"; it means "I will simply do X") and the contrast table glosses both patterns with the same inverted meaning |

### grammar zh (3 topics)

| slug | defect |
| --- | --- |
| you-you | Pattern-table cell is literal garbage: 「又high又dà 又高又大」 mixes English and bare pinyin into the hanzi column |
| tone-sandhi | Teaches a false sandhi rule with an impossible syllable ("yiǎng"): 想 before 去 (4th tone) never shifts |
| buzhiyu | Pattern table fabricates a 不至于 + 于 + clause structure that does not exist |

### grammar nl (6 findings, 5 topics) and conjugation nl (3 code bugs)

| where | defect |
| --- | --- |
| nominalization, relative-clauses, reflexive-verbs | ALL tr examples carry pseudo-phonetic garbage in the `reading` field ("De reegeering naam een belangrijke besliesing", "zay sHaamen ziH voor hün Hedrah"); not any transcription convention, and `GrammarTopicView.tsx:190` renders `ex.reading` with no language gate, so users see it |
| participle-adjectives | "De vrouw is lezend" taught as predicative use; not Dutch |
| reflexive-verbs | "Ze houden van zich." taught as correct (rare) Dutch; ungrammatical, needs zichzelf |
| adjective-inflection | False rule "elke/ieder/welk(e) + adjective always takes -e"; wrong before singular het-words |
| conj-nl code (nl.ts:293) | Weak participles double final t/d: gepraatt, geantwoordd, gevoedd; Dutch forbids this |
| conj-nl code (nl.ts:344) | Separable verbs re-append the prefix in present plural: "Wij opbellen op" |
| conj-nl code (nl.ts:186) | Open-syllable rule breaks -aan verbs and vowel-initial stems: jij "gat"/"stat"/"slat", ik "et" |

### grammar fr (2 topics) and conjugation ja (1 code bug)

| where | defect |
| --- | --- |
| interrogative-pronouns (fr) | Declares standard French "Que se passe-t-il ?" incorrect with an invented justification |
| agreement-advanced (fr) | Leaked generation markup (`</intro_tr>` + `<parameter name="related_slugs">null`) stored in the en intro |
| conj-ja code (ja.ts:351) | i-adjective stem rule treats every ...いい like 良い: かわいい conjugates to かわよくない/かわよかった; the よ irregularity belongs only to the いい morpheme |

## Systemic patterns (beyond individual errors)

1. **Fabricated character etymology is the single largest error class.** In
   zh vocab, roughly half of all major findings are invented radical/component
   breakdowns in `chars[].hint_tr` (阔 given 門's role, 电 built from 王+气,
   悲/忽/惭 assigned 忄 where the character writes 心, one hint even
   containing a Korean hangul syllable). tr and en payloads of the same entry
   frequently contradict each other, confirming the field has no grounding.
2. **A mechanically checkable pinyin/furigana error class.** Wrong tones,
   wrong syllables, and doubled letters inside bracket notation (`jì` for 弃,
   `yuánnzé`, `diànnjìng`, `mànghuà` for 漫画). A non-LLM validator mapping
   bracketed readings against a hanzi/kanji reading table would catch nearly
   all of these at generation time.
3. **Bracket notation misuse breaks rendering.** Whole-sentence pinyin
   appended in one bracket instead of per-word `词[cí]`; brackets that span
   only part of their host phrase. The `Furigana` renderer pairs brackets
   with the preceding token, so these display wrong even when the pinyin is
   right.
4. **Generation-pipeline leaks reached the DB.** Raw tool-call/XML markup
   stored inside learner-facing fields in at least two places (zh vocab 悬念,
   fr grammar agreement-advanced). Zod validates shape, not content, so
   these pass the schema.
5. **Cross-language contamination in ja content.** Multiple kanji cards teach
   Chinese words as Japanese (啓動, 棺材, 朝代, 相遇). Haiku appears to fall
   back on Chinese lexicon for rarer kanji.
6. **nl is the weakest LLM surface and its garbage is structural.** The tr
   `reading` fields on nl grammar examples are filled with invented
   pseudo-phonetics across entire topics, and the UI renders them. nl also
   has the highest raw item error rate (72.5%).
7. **The static conjugation code has real bugs (worst severity per user).**
   Unlike LLM content, `nl.ts` (three bugs) and `ja.ts` (one bug) show wrong
   forms deterministically to every visitor of /conjugate. zh.ts is clean.
8. **En payloads are not safer than tr.** Several confirmed criticals live in
   the en half (臂 "wing", made-mo-nai, 啓動, 棺材); the en-native seed gap
   (T-064) inherits all of this.

## Suspicious items

207 suspicious claims were filed across all surfaces (not verified, by
design). They skew toward: naturalness judgments on example sentences,
register claims, and rare-but-possibly-attested readings. They are listed
per batch in the audit session's scratchpad finding files; they did not
enter any count above.

## Conclusion

The 2026-07-18 sample (78 kanji, mostly low levels, 2 definite errors) gave
false comfort. At 470 items with adversarial verification, every
LLM-generated surface has an item-level real-error rate between roughly 30%
and 60%, and about 4.5-12.5% of items per surface contain at least one
confirmed critical (hallucinated or nonsensical) element. Content is not
"mostly broken": meanings lists and explanations are usually serviceable,
and the pedagogy holds. The damage concentrates in specific weak fields
(character etymology hints, bracket readings, rarer kanji examples, nl
readings) plus a handful of flatly wrong meanings.

## Recommendations (NOT implemented; decisions are Burak's)

Ordered by leverage:

1. **Fix the 4 conjugation code bugs first** (nl x3, ja x1). Static code,
   deterministic, affects every user, and fixes are small and testable.
2. **Drop or ground `chars[].hint_tr`.** Either remove character-breakdown
   hints from the vocab prompt/UI or feed them from a real decomposition
   dataset. This single field accounts for the largest share of major errors.
3. **Add a mechanical bracket-reading validator to the pipeline** (hanzi ->
   pinyin, kanji word -> reading via a dictionary table) and a leak scanner
   (reject content containing `<parameter`, `</`, or non-target-script
   characters). Cheap, no LLM, catches classes 2, 3, 4, and the Cyrillic/
   hangul corruption cases.
4. **Regenerate the confirmed-critical items** (9 vocab words, 6 kanji, 13
   grammar topics) with a stronger model than haiku; they are enumerated
   above and are few.
5. **nl grammar needs a regeneration pass of its own** (readings garbage is
   topic-wide), or the `reading` field should stop rendering for nl until
   regenerated.
6. **Do not re-export seeds** (`seed:grammar|kanji|vocab`) until at least
   items 4-5 are done, to avoid re-packaging known-broken content.
7. For future blast runs, move the weak fields (etymology, example
   generation for N1/rare kanji) to a stronger model tier; the meanings/
   explanation fields can stay on the fast tier.
