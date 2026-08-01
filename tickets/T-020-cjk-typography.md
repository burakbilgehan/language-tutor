---
id: T-020
title: CJK typography, hanzi too small and inconsistent font
status: done
priority: p2
effort: S
confidence: medium
depends: []
created: 2026-07-18
---
Observation: Chinese characters are both too small and give a "the font keeps
changing" feeling. Likely cause: the UI fonts (Fraunces/Nunito Sans) don't
contain CJK glyphs, so the browser falls back to a system font; which font it
falls back to varies by element/character, which looks inconsistent. Also,
without a `lang` attribute, the same code point can get the wrong glyph
between the ja/zh variant (Han unification).

Fix direction:
- Define an explicit CJK font stack: zh -> `"Noto Sans SC", "PingFang SC",
  ...`, ja -> `"Noto Sans JP", "Hiragino Sans", ...` (as a globals.css
  `@theme` token, e.g. `--font-cjk-*`). Embedding a web font (Noto subset)
  could be heavy, try consistency with system fonts first, subset with
  next/font if that's not enough.
- Add a `lang="zh-Hans"` / `lang="ja"` attribute to components carrying CJK
  text (`Furigana`, vocab/kanji lists, example sentences), for the correct
  glyph variant.
- Size: bump body CJK text one step larger than Latin (character density is
  higher, unreadable at the same px), e.g. a shared utility class for example
  sentences and list-heading characters.

Verification: side-by-side visual check of ja and zh pages (macOS + a Windows/
Android device, fallback differences are large there).
</content>
