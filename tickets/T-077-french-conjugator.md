---
id: T-077
title: French conjugator view for /conjugate
status: backlog
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-08-03
---

## Problem

French was added as a target language (nl-style CEFR path). `/conjugate`
has views for ja (conjugator), zh (aspect chart) and nl (conjugator), but
nothing for fr; the nav item is gated to `langs: ["ja", "zh", "nl"]` so fr
profiles don't see an empty page. For French specifically this is a real
gap: verb conjugation (three groups, irregular verbs, compound tenses,
subjonctif) is the single hardest mechanical part of the language, arguably
more valuable than the nl conjugator ever was for Dutch.

## Work

- A deterministic French conjugator under `src/lib/conjugation/` following
  the nl pattern (`conjugatorFor` in `src/lib/conjugation/index.ts` says
  "slot in later"): regular -er/-ir/-re paradigms + a curated irregular
  table (être, avoir, aller, faire, venir, pouvoir, devoir, vouloir, savoir,
  prendre, mettre, dire, voir...).
- Tenses worth covering: présent, passé composé (with avoir/être choice +
  agreement note), imparfait, futur simple, conditionnel présent, subjonctif
  présent, impératif.
- A `FrConjugatorView` in `/conjugate/page.tsx` + add `"fr"` to the nav
  item's `langs`.

## Notes

- Vocab dictionary (T-012 pattern) for fr was deliberately NOT opened:
  costly (thousands of LLM-generated entries) and the fr word list has no
  free HSK-equivalent as clean as the zh one. Revisit only on demand.
- An /exam-style page (DELF/DALF practice, mirroring the nl staatsexamen
  page) is a separate candidate; not ticketed yet.
