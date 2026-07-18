# Backlog

Ticket dosyaları bu dizinde; her biri frontmatter (status/priority/effort/
confidence/depends) + bağlam taşır. Statüler: backlog → todo → in-progress
→ done / wontfix. Boş kalınca buradan iş çekilir; yeni iş = yeni T-xxx
dosyası + buraya satır. Bu index her ticket değişikliğinde güncellenir.

| ID | Başlık | Statü | Öncelik | Efor | Güven |
|---|---|---|---|---|---|
| [T-016](T-016-reading-aware-search.md) | Okuma-farkında arama (hikari → 光) | done | p2 | M | medium |
| [T-017](T-017-feedback-mechanism.md) | Kullanıcı feedback mekanizması (+screenshot) | done | p2 | M | medium |
| [T-015](T-015-mobile-friendly.md) | Mobil uyumluluk geçişi | done | p2 | L | medium |
| [T-001](T-001-inburgering-mock-exams.md) | Inburgering deneme bölümleri | backlog | p2 | M | medium |
| [T-005](T-005-zh-stroke-dictionary.md) | zh yazım + hanzi sözlüğü (CEDICT) | backlog | p2 | L | medium |
| [T-004](T-004-overview-llm-layer.md) | Overview LLM yorum katmanı | backlog | p3 | S | medium |
| [T-002](T-002-skill-tree.md) | Skill tree (dallı ders grafiği) | backlog | p3 | XL | low |
| [T-023](T-023-haiku-content-qa.md) | Haiku içerik kalite denetimi | parked | p1 | S | high |
| [T-019](T-019-vocab-bulk-fill-seed.md) | zh sözlük seed altyapısı (export + applyVocabSeed) | done | p2 | M | high |
| [T-003](T-003-remaining-grammar.md) | Kalan grammar (zh 99 + ja 16) — hafta sonu kota | done | p1 | S | high |
| [T-021](T-021-conjugate-zh-nl-content.md) | Çekim cheatsheet — zh zayıf, nl boş | done | p2 | M | medium |
| [T-006](T-006-nl-weak-separables.md) | nl zayıf ayrılabilir fiiller | done | p3 | S | high |
| [T-022](T-022-regenerate-with-feedback.md) | Ders yeniden üretmeye feedback text box'ı | done | p2 | S | high |
| [T-018](T-018-remove-side-quests.md) | Side quest özelliğini kaldır | done | p2 | M | high |
| [T-020](T-020-cjk-typography.md) | CJK tipografi — hanzi küçük/font tutarsız | done | p2 | S | medium |
| [T-014](T-014-static-nav-basepath.md) | Statik modda nav basePath kaybı (import/dil değişimi → /map) | done | p1 | S | high |
| [T-013](T-013-stale-nav-after-profile-add.md) | Yeni dil ekleyince header/nav bayat kalıyor | done | p3 | S | high |
| [T-012](T-012-zh-vocab-dictionary.md) | zh kelime sözlüğü (HSK vocab cheatsheet) | done | p2 | M | high |
| [T-008](T-008-branch-hygiene.md) | Branch push / PR kararı (main'e direkt push + Pages env fix) | done | p2 | S | high |
| [T-009](T-009-local-first-static.md) | Faz 2b — local-first statik build (tarayıcı SQLite + Pages) | done | p1 | XL | medium |
| [T-010](T-010-llm-setup-wizard.md) | LLM bağlantı sihirbazı (kod bilmeyene kurulum akışı) | done | p1 | M | high |
| [T-011](T-011-sidequest-backfill.md) | Mevcut nl/zh profillerine yan görev backfill | wontfix | p2 | S | high |
| [T-007](T-007-kanji-n1-tail.md) | Kanji N1 kuyruğu (ops'a taşındı — blast paneli) | wontfix | p3 | S | high |

## Yol haritası (2026-07-18 sprint)

Her adım ayrı session'da implement edilir; adım bitince main'e push
(T-008 kararı: direkt main). Paralel adımlar ayrı worktree + branch,
merge sırası: küçük olan önce, ikinci merge eden rebase edip conflict çözer.

| Adım | Ticketlar | Mod | Model önerisi | Not |
|---|---|---|---|---|
| 1 | T-014 + T-013 | seri, önce bu | sonnet | Canlı bug; aynı bölge (basePath + profil meta cache), tek session — **done** |
| 2a | T-022 | paralel ok | sonnet | Lesson prompt + UI — **done** |
| 2b | T-018 | paralel ok | sonnet | Quest kodu silme — **done**. Not: "dosya kümesi ayrık" yanlış çıktı, 4 dosyada üçlü çakışma vardı (llm-gen.ts, client-api.ts, LessonPlayer.tsx, QuestPlayer.tsx modify/delete) — cherry-pick sırasıyla (T-018→T-022→T-020) çözüldü, sonraki paralel adımlarda dosya kümesi varsayımını tekrar doğrula |
| 2c | T-020 | paralel ok | sonnet | globals.css + font/lang attribute — **done** |
| 3 | T-019 | done | sonnet | Seed altyapısı bitti (export scripti + applyVocabSeed, dört bağlantı noktası grammar'la birebir). İçerik blast'ta arka planda doluyor; tam re-export ops adımı 3'te. |
| 4a | T-021 + T-006 | paralel ok | opus | Aynı dosyalar (conjugation/*), tek session; içerik ağır — **done**. Not: T-021 içerik zaten f587ab9'da şevkedilmişti (ticket metni bayatmış, sadece kapatıldı); T-006 tek gerçek iş — `splitSeparable` curated `WEAK_SEPARABLE_BASES` listesiyle genişletildi (açık heuristik değil — opperen/openen gibi tesadüfen op- ile başlayan basit fiiller yanlış bölünürdü) |
| 4b | T-016 | paralel ok | opus | Global arama MVP (cmd+K palette) — **done**. Karar: kapsam sadece dizinler; kanji sonucu için `/stroke?char=` deep-link eklendi (ayrı kanji route yok). Katman 2 (cmd+F intercept) yapılmadı. |
| 5 | T-017 | seri | sonnet | MVP: GitHub issue prefill + html2canvas — **done**. Karar: hedef = GitHub Issues (`feedback` label'ı repoda oluşturuldu); screenshot html2canvas-**pro** (Tailwind 4 color-mix/oklch klasik html2canvas'ı kırıyor) → panoya, kullanıcı issue'ya yapıştırır. Dev indicator sol alttan sağa taşındı (buton çakışması). |
| 6 | T-015 | en son | sonnet | **done**. Not: ticket premise yanlış çıktı — master-detail/stroke/map paneli zaten mobilde stack'liydi. Gerçek kırık: map bubble sabit-px offset dar ekranda taşıyordu → viewport-oranlı hale getirildi. Onboarding padding hafif sıkışıktı → ease edildi. Chat composer klavye davranışı gerçek cihazda doğrulanmadı (Chrome resize tool bu oturumda viewport'u güvenilir değiştirmedi). |

İçerik üretimi = ops, ticket AÇILMAZ; blast paneli üzerinden yürür
(`node scripts/blast-dashboard.mjs` → :4646). Sıralı ops listesi:
1. Sonraki kota penceresi: panelden Başlat — kalan ~570 kanji + 4989 vocab.
2. Vocab bitince T-023'ün vocab ayağı (kanji/grammar denetimi yapıldı, temiz).
3. `seed:grammar` + `seed:vocab` re-export → commit → Pages deploy.

Sprint dışı (sıralanmadı): T-001, T-002, T-004, T-005.
