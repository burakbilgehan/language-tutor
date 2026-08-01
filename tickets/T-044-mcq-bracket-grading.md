---
id: T-044
title: mcq counts the correct choice as "wrong" (furigana bracket asymmetry)
status: done
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-26
---
Reported with a screenshot: in an mcq, even though the correct choice
(姉) was selected, it came back "Wrong; correct answer: 姉[あね]".

Root cause: in the DB, both the choice and the answer are bracketed and
**identical** (`姉[あね]`; the schema's `superRefine` already enforces
`options.includes(answer)`, the UI sends the choice raw). `attemptExercise`
(`src/core/lesson.ts`) applied `stripFurigana` only to the expected side;
`姉` vs `姉[あね]` never matched. One-sided stripping is correct for
written exercises (the user can't type brackets), but wrong for an mcq
answer that's a machine copy of the choice.

Fix (three touches):
- `src/core/lesson.ts`: `userResponse` is now also stripped; the
  comparison is symmetric. No-op for written types; existing bracketed
  questions in the DB are fixed with no migration needed.
- `src/components/lesson/LessonPlayer.tsx`: the "Correct answer: …"
  feedback is now rendered as ruby via `<Furigana>` (consistent with the
  self-check path).
- `src/lib/llm/prompts/lesson.ts`: clarified a contradictory rule;
  "bracket every kanji" + "answer has no brackets" + "answer is an exact
  copy of the choice" couldn't all hold at once for a kanji mcq. Now
  bracket-free applies only to written types; in mcq, the answer is a
  literal copy of the choice.

Note: a tooltip-reading improvement tried in the same session (JMdict
kanji-run reading) produced a wrong reading (行く -> gyou) and was fully
reverted; that work is deliberately not being pursued (see T-030
reverted). The tooltip continues to show no reading for kanji generated
without brackets.
