# Backlog

Ticket dosyaları bu dizinde; her biri frontmatter (status/priority/effort/
confidence/depends) + bağlam taşır. Statüler: backlog → todo → in-progress
→ done / wontfix. Boş kalınca buradan iş çekilir; yeni iş = yeni T-xxx
dosyası + buraya satır. Bu index her ticket değişikliğinde güncellenir.

| ID | Başlık | Statü | Öncelik | Efor | Güven |
|---|---|---|---|---|---|
| [T-003](T-003-remaining-grammar.md) | Kalan grammar (zh 99 + ja 16) — hafta sonu kota | **todo** | p1 | S | high |
| [T-022](T-022-regenerate-with-feedback.md) | Ders yeniden üretmeye feedback text box'ı | **todo** | p2 | S | high |
| [T-018](T-018-remove-side-quests.md) | Side quest özelliğini kaldır | backlog | p2 | M | high |
| [T-019](T-019-vocab-bulk-fill-seed.md) | zh sözlük toplu doldurma + paketlenmiş seed | backlog | p2 | M | high |
| [T-015](T-015-mobile-friendly.md) | Mobil uyumluluk geçişi | backlog | p2 | L | medium |
| [T-016](T-016-reading-aware-search.md) | Okuma-farkında arama (hikari → 光) | backlog | p2 | M | medium |
| [T-017](T-017-feedback-mechanism.md) | Kullanıcı feedback mekanizması (+screenshot) | backlog | p2 | M | medium |
| [T-020](T-020-cjk-typography.md) | CJK tipografi — hanzi küçük/font tutarsız | backlog | p2 | S | medium |
| [T-021](T-021-conjugate-zh-nl-content.md) | Çekim cheatsheet — zh zayıf, nl boş | backlog | p2 | M | medium |
| [T-001](T-001-inburgering-mock-exams.md) | Inburgering deneme bölümleri | backlog | p2 | M | medium |
| [T-005](T-005-zh-stroke-dictionary.md) | zh yazım + hanzi sözlüğü (CEDICT) | backlog | p2 | L | medium |
| [T-004](T-004-overview-llm-layer.md) | Overview LLM yorum katmanı | backlog | p3 | S | medium |
| [T-006](T-006-nl-weak-separables.md) | nl zayıf ayrılabilir fiiller | backlog | p3 | S | high |
| [T-002](T-002-skill-tree.md) | Skill tree (dallı ders grafiği) | backlog | p3 | XL | low |
| [T-007](T-007-kanji-n1-tail.md) | Kanji N1 kuyruğu | backlog | p3 | S | high |
| [T-012](T-012-zh-vocab-dictionary.md) | zh kelime sözlüğü (HSK vocab cheatsheet) | done | p2 | M | high |
| [T-011](T-011-sidequest-backfill.md) | Mevcut nl/zh profillerine yan görev backfill | wontfix | p2 | S | high |
| [T-014](T-014-static-nav-basepath.md) | Statik modda nav basePath kaybı (import/dil değişimi → /map) | done | p1 | S | high |
| [T-013](T-013-stale-nav-after-profile-add.md) | Yeni dil ekleyince header/nav bayat kalıyor | done | p3 | S | high |

## Yol haritası (2026-07-18 sprint)

Her adım ayrı session'da implement edilir; adım bitince main'e push
(T-008 kararı: direkt main). Paralel adımlar ayrı worktree + branch,
merge sırası: küçük olan önce, ikinci merge eden rebase edip conflict çözer.

| Adım | Ticketlar | Mod | Model önerisi | Not |
|---|---|---|---|---|
| 1 | T-014 + T-013 | seri, önce bu | sonnet | Canlı bug; aynı bölge (basePath + profil meta cache), tek session |
| 2a | T-022 | paralel ok | sonnet | Lesson prompt + UI |
| 2b | T-018 | paralel ok | sonnet | Quest kodu silme; dosya kümesi 2a/2c ile ayrık |
| 2c | T-020 | paralel ok | sonnet | globals.css + font/lang attribute |
| 3 | T-019 | seri (script+core) | sonnet | Altyapı bitince toplu üretim gece/hafta sonu kotasında koşar (T-003 ile aynı kota penceresi) |
| 4a | T-021 + T-006 | paralel ok | opus | Aynı dosyalar (conjugation/*), tek session; içerik ağır |
| 4b | T-016 | paralel ok | opus | Tasarım kararı açık (global arama MVP); header'a dokunur, T-015'ten önce bitmeli |
| 5 | T-017 | seri | sonnet | MVP: GitHub issue prefill + html2canvas |
| 6 | T-015 | en son | sonnet | Tüm UI oturduktan sonra responsive pass; sayfa sayfa commit |

Arka plan (kod değil, owner makinesi + LLM kotası): T-003 grammar üretimi,
T-019'un toplu üretim koşusu, sonra `seed:grammar`/`seed:vocab` re-export.

Sprint dışı (sıralanmadı): T-001, T-002, T-004, T-005, T-007.
| [T-008](T-008-branch-hygiene.md) | Branch push / PR kararı (main'e direkt push + Pages env fix) | done | p2 | S | high |
| [T-009](T-009-local-first-static.md) | Faz 2b — local-first statik build (tarayıcı SQLite + Pages) | done | p1 | XL | medium |
| [T-010](T-010-llm-setup-wizard.md) | LLM bağlantı sihirbazı (kod bilmeyene kurulum akışı) | done | p1 | M | high |
