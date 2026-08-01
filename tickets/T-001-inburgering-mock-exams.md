---
id: T-001
title: Inburgering/NT2 format-mimicking mock exam sections
status: backlog
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-17
---
The /exam page is currently a static guide + official links. Missing: generated
sections inside the app that mimic the exam format: lezen (passage + 5 multiple
choice), luisteren (via transcript), schrijven (writing task + LLM evaluation),
KNM quiz. The format can be modeled on past official sample exams
(staatsexamensnt2.nl/oefenen); content generation is LLM-based (copyright clean).

Technical: a new job type or side-quest variant; zod schema + fixture;
deterministic MC grading, LLM verdict for schrijven (existing grading path).
