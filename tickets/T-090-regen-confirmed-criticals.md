---
id: T-090
title: Regenerate the 28 verified-critical content items with sonnet
status: done
priority: p1
effort: S
confidence: high
depends: []
created: 2026-08-10
---
T-023 verified 41 critical findings across 28 named items (see the error
tables in `tickets/T-023-audit-report.md`). Regenerate exactly these with
the content pipeline at sonnet tier (haiku forbidden), writing only to
`data/app.db`:

- zh vocab (9 + 1 words): 竟然, 脏, 悬念, 惭愧, 请示, 悔恨, 臂, 敬礼, 所以, 赔偿
- ja kanji (6 chars): 諒, 遇, 鷹, 啓, 棺, 朝 (plus 苑, whose tr examples all
  use 園; batch-level finding, same treatment)
- grammar topics: ja koto-tote, nante-nanka, made-mo-nai; zh you-you,
  tone-sandhi, buzhiyu; fr interrogative-pronouns, agreement-advanced
  (nl topics are covered wholesale by T-089)

Mechanism: set the rows' `status` appropriately for regeneration or call the
generation path directly per item; verify each regenerated payload against
the specific defect listed in the report (e.g. 竟然 examples must contain
竟然, 脏 must teach zāng "dirty", no markup fragments anywhere).

Scope guard: `data/app.db` only; no seed export, no deploy (T-092). Backups
exist (2026-08-10).

Acceptance: all listed items ready with the original defect verifiably gone;
zod-valid; a one-line before/after note per item.

## Result

Regenerated the 25 items enumerated in the ticket body (10 zh vocab words,
7 ja kanji chars including the batch-level 苑 finding, 8 grammar topics; 50
language-half units total) using `scripts/regen-content.ts criticals`
against the real content pipeline. Note: the ticket title says "28" but the
enumerated list in the body is 25 items (9+1 vocab, 6+1 kanji, 8 grammar);
this Result covers exactly the 25 named items, matching the body.

`validate-criticals`: `ok=50 fail=0`, every payload zod-valid against its
schema (`VocabContentSchema`/`KanjiContentSchema`/`GrammarTopicSchema`).
`llm_calls` since run start: 100% `model=sonnet`, split across
`tier=balanced purpose=grammar` (grammar topics) and `tier=fast
purpose=kanji|vocab` (kanji/vocab, where the fast tier's CLI default is
haiku -- confirmed the `LLM_MODEL_FAST=sonnet` override was load-bearing
and took effect, zero haiku recorded). `npm run llm:smoke` confirmed
unaffected (returns `model=haiku tier=fast` when run without the driver's
env override, i.e. the codebase default is untouched).

A machine-checked assertion suite (`scripts/regen-content.ts
verify-criticals`) was written encoding all 25 items' specific named
defects as string/regex tests, and validated by running it against the
PRE-regeneration content first (captured to a scratchpad snapshot before
any writes): the suite correctly failed 25/25 on the known-broken content,
confirming the checks actually discriminate rather than trivially passing.
Two iterations were needed to remove false positives found during that
adversarial pass (the 脏 check was matching zàng inside zàng-only content
because zàng and zāng share a substring pattern; the fr/interrogative-
pronouns check only searched forward from the quoted phrase and missed a
"you cannot say X" phrasing where the verdict precedes the quote). After
generation, the same suite ran against the real regenerated content.

First pass: 22/25 passed. Three genuine content-quality misses were found
(not driver bugs -- the driver's own read/write and concurrency logic was
independently confirmed correct, including a lost-update race that was
caught and fixed in code review before any real generation ran under
concurrency):
- `k:苑`: the `en` half regenerated correctly (5/5 examples using 苑), but
  the `tr` half came back as literal placeholder content (`"word": "a"`,
  `"note_tr": "test"`) that still happened to satisfy the zod schema shape.
- `g:ja/koto-tote`: a fresh Cyrillic corruption appeared in a different
  example than the original audit finding (`старし` inside an otherwise
  Japanese sentence).
- `g:fr/interrogative-pronouns`: the same false claim survived in a
  different location (moved from a footnote into a "Common Mistakes" table
  row) -- still declaring standard "Que se passe-t-il ?" incorrect.

All three were re-rolled by clearing their ledger keys (both language
halves, to avoid mixing an old half with a new one) and relaunching
`criticals`, which resumed cleanly without touching any of the other 22
already-correct items. Second pass: 25/25 pass, `validate-criticals`
re-confirmed `ok=50 fail=0`.

### Per-item before/after

| item | defect (T-023) | after regeneration |
| --- | --- | --- |
| v:竟然 | entire tr payload used 竢 instead of 竟 | tr payload rewritten from scratch; `verify-criticals` confirms 竟然 present, 竢 absent |
| v:脏 | tr taught only zàng "viscera", no zāng "dirty" | tr meanings now lead with "kirli, pis" (dirty) and 弄脏[nòngzāng] "to make dirty"; zāng reading confirmed present |
| v:悬念 | note_tr had leaked `<parameter...>` + "null" tool-call markup | note_tr is now clean prose, no leaked fragments in tr or en |
| v:惭愧 | "ödü kopmak" (terrified) glossed for a word meaning ashamed | meanings_tr now "utanmak, mahcup olmak" (to be ashamed) + "vicdan azabı duymak" (to feel guilt), no terrified gloss |
| v:请示 | invented "başsağlığı almak" (condolences) meaning | meanings_tr now "talimat istemek", "görüş sormak, onay/yönerge almak" (asking a superior for guidance/approval), no condolences gloss |
| v:悔恨 | "enginiş" hallucinated token in meanings_tr | meanings_tr now "pişmanlık, vicdan azabı" / "derin pişmanlık duymak, tövbe etmek", no invented token |
| v:臂 | en invented "wing (of a bird)" sense + unnatural example | en meanings now "arm" + "(metaphorical/technical) arm-shaped extension, e.g. robot arm"; no bird-wing sense, no invented example |
| v:敬礼 | note_tr invented "huīhuō (el sallama)" as a distractor word | note_tr rewritten, no huīhuō anywhere |
| v:所以 | en collocations presented 就是所以 as idiomatic | en collocations rewritten, no 就是所以 |
| v:赔偿 | meanings_tr included "karşılaştırmak" (to compare) | meanings_tr now "Tazmin etmek, zararı karşılamak" / "ödeme yapmak", no "karşılaştırmak" |
| k:諒 | 5 fabricated compounds (容諒, 寛諒, 情諒, 嘉諒, 了諒) | none of the 5 fabricated compounds appear anywhere in tr or en |
| k:遇 | 遇然 for ぐうぜん (should be 偶然); 相遇 for そうぐう (should be 遭遇) | neither wrong compound appears; tr/en now correctly reference 遭遇/待遇-style onyomi compounds |
| k:鷹 | invented idiom 目を鷹にする (real: 目を皿にする) | invented idiom removed; meanings simplified to "Şahin" / "Atmaca", no fabricated idiom |
| k:啓 | en used Chinese 啓動 "boot-up" framed as Japanese | en examples rewritten around actual Japanese usage (啓発, 拝啓-style), no 啓動 |
| k:棺 | en used Chinese 棺材 with an unattested reading かんざい | en examples rewritten; no 棺材 anywhere |
| k:朝 | en glossed 朝代 (Chinese "dynasty") as Japanese | en note now distinguishes あさ "morning" (everyday) from ちょう (formal/Sino-Japanese compounds like 朝食), no 朝代 |
| k:苑 | all 6 tr examples substituted 園 for the headword 苑 | first attempt produced placeholder junk in tr (caught by verify-criticals, re-rolled); final tr AND en both have 5/5 examples actually containing 苑 (御苑, 神苑, 学苑, 鹿苑寺, 苑 standalone) |
| g:ja/koto-tote | Cyrillic corruption「старい人間」 in an example | first attempt still had Cyrillic corruption (「старし...」, different location); re-rolled; final version has zero Cyrillic across all 7 examples, all valid Japanese with furigana |
| g:ja/nante-nanka | 大[きら]いだ: 嫌 dropped, き reading misassigned to 大 | the broken form 大[きら]いだ does not appear anywhere in the regenerated payload |
| g:ja/made-mo-nai | en payload inverted the までのことだ meaning | en payload no longer contains the inverted "matter too minor to bother with" framing |
| g:zh/you-you | pattern table cell mixed English/pinyin into the hanzi column (又high又dà) | that garbled cell does not appear; table rewritten with clean hanzi |
| g:zh/tone-sandhi | taught a false sandhi rule citing the impossible syllable "yiǎng" | "yiǎng" does not appear anywhere in tr or en |
| g:zh/buzhiyu | pattern table fabricated a 不至于 + 于 + clause structure | that fabricated structure does not appear in the regenerated table |
| g:fr/interrogative-pronouns | declared standard "Que se passe-t-il ?" incorrect with an invented justification | first attempt still declared it wrong (relocated into a "Common Mistakes" table row); re-rolled; final tr and en payloads no longer mention "Que se passe-t-il" at all, so the false claim is gone |
| g:fr/agreement-advanced | en intro had leaked `</intro_tr>` + `<parameter name="related_slugs">null` markup | en intro is clean prose, no leaked generation markup |

Execution notes: run at a bounded concurrent worker pool (conc=16, per an
owner instruction that also applied to T-089), completed the initial 25
items in 227s wall-clock with zero rate-limit/backoff events; the 3-item
re-roll ran separately at conc=3. No fr profile exists in this DB (`ja`,
`nl`, `zh` only), so the two fr grammar topics generated with
`selfLevel: "zero"` (the code's documented fallback) -- harmless, noted for
completeness since it wasn't obvious from the run log alone.

Unverified / not in scope: seed re-export and deploy are explicitly T-092
(owner-gated) and were not touched.
