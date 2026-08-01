---
id: T-052
title: Yūyake palette migration - globals drop-in + moss/gold->indigo/amber sweep + info variant + Kumo mark (handoff task 1-4)
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-27
---
The v2 handoff arrived (`design/okumo-yuyake/`, "Yūyake", Samurai Champloo
direction); the v1 sky family is INVALID (clean revert: no sky remnants in
globals, verified). Palette: terracotta -> **vermilion** #c14a1d (dark
#e07b3f), moss is **removed** -> the **aizome indigo** family
(`--indigo-soft/-mid/--indigo/--indigo-deep`, info+success+state), gold ->
amber #e8a13c (text on light background `--amber-text` #b07414), new
background/surface/ink/danger values. Fidelity: high, globals.css drop-in
ready. Source: `design/okumo-yuyake/README.md` + DS v2 html (section 01
tokens, 04 component roles, 07 migration guide).

Handoff task 1-4 = this ticket:
1. **Replace `src/app/globals.css` wholesale** with the
   `design/okumo-yuyake/globals.css` drop-in (README: `--header-h`, CJK
   rules, prose-cozy, animations preserved; color + shadow + pulse-glow color
   + `.prose-cozy a` are new; dark applies in both the `.dark` and
   prefers-color-scheme blocks). Before replacing, DIFF against the current
   file; if a rule entered globals after the handoff was generated, don't
   lose it, stop and report.
2. **Class sweep moss/gold -> indigo/amber**; mapping is in README task 2.
   Known spots: LessonPlayer, RoadmapView, SrsSession, JobQueuePanel,
   StatsHeader, StrokeTrainer (cssVar fallback `"#c4643b"` -> `"#c14a1d"`,
   around lines 167-168). Verify completeness with grep. Warning:
   `src/lib/conjugation/nl.ts:132` `gold` is the Dutch verb "gelden" (to
   apply/be valid), DO NOT TOUCH.
3. **CozyButton `info` variant**: `info: "bg-indigo text-surface
   hover:brightness-110 shadow-cozy disabled:opacity-40"`; the existing three
   variants stay unchanged.
4. **StatsHeader Kumo mark**: a ~28px cloud SVG to the left of the title
   (markup ready in the README), 10px gap, auto-matches both themes via
   `var(--accent)` + `var(--indigo)`.

Fence: globals.css + CozyButton + StatsHeader + task 2 sweep files.
Verification: no moss/gold class remnants in src (except nl.ts), no sky
token anywhere, `tsc --noEmit` + `npm test` + `npm run build:static`. Manual
visual dark/light check remains.

## History
- The v1 "sky" implementation was merged 2026-07-27 and reverted the same day
  (`1907e54`); Burak didn't like the design. Rescoped and reopened the same
  day with the v2 Yūyake handoff; the v1 handoff folder was deleted (in git
  history: `5ad0c88`).
- **Done 2026-07-27**: `13e2ed5` + `938eb26` (Kumo shrink-0), fast-forward
  merged to main. Evidence: globals byte-identical to the handoff (cmp), zero
  moss/gold/sky in src (except the nl.ts verb), tsc clean, 111/111 tests,
  build:static green in the worktree (19 pages, indigo/amber rules verified
  in compiled CSS). Manual visual dark/light check still open. Deliberate
  leftover: StrokeTrainer's `--ink`/`--surface-2` cssVar fallback hex values
  are still the old ones (only visible if the cssVar fails to resolve,
  cosmetic).
