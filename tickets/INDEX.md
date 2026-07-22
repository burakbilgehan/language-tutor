# Backlog

Ticket dosyaları bu dizinde; her biri frontmatter (status/priority/effort/
confidence/depends) + bağlam taşır. Statüler: backlog → todo → in-progress
→ done / wontfix. Boş kalınca buradan iş çekilir; yeni iş = yeni T-xxx
dosyası + buraya satır. Bu index her ticket değişikliğinde güncellenir.

| ID | Başlık | Statü | Öncelik | Efor | Güven |
|---|---|---|---|---|---|
| [T-024](T-024-save-job-queue-leak.md) | Save'e job kuyruğu sızması (import token yakıyor) — geçici fix; kalıcı çözüm T-034 | done | p1 | S | high |
| [T-025](T-025-onboarding-load-or-new.md) | Onboarding "Kayıt yükle / Yeni başla" ekranı | done | p2 | M | high |
| [T-026](T-026-security-review.md) | Kapsamlı security review (batch sonrası koşar) | done | p1 | L | medium |
| [T-039](T-039-bridge-csrf-rebinding.md) | Bridge CSRF quota-burn + DNS-rebinding exfil (frame A, CONFIRMED) | backlog | p1 | S | high |
| [T-040](T-040-server-mode-auth-gate.md) | Server modu auth katmanı (frame B, public blocker) | backlog | p1 | L | high |
| [T-041](T-041-save-import-hardening.md) | Save import sertleştirme (kötücül trigger + statik boyut cap) | backlog | p2 | M | high |
| [T-042](T-042-scrub-rawoutput-export.md) | Save export'tan raw_output scrub (LLM key sızma yolu) | backlog | p3 | S | high |
| [T-027](T-027-routing-hardening.md) | Routing hardening (dil değişimi + .txt navigasyonu) | done | p1 | M | medium |
| [T-028](T-028-settings-affordance.md) | Ayarlar çipi — köşede ama belirgin | done | p3 | S | high |
| [T-029](T-029-vocab-index-multiform.md) | Vocab index çok-form birleştirme (马 "horse") | done | p2 | S | high |
| [T-030](T-030-ja-vocab-dictionary.md) | ja kelime sözlüğü (JMdict tabanlı) | reverted | p2 | L | medium |
| [T-031](T-031-content-language-isolation.md) | İçerik dil izolasyonu (en'de Türkçe sızıntısı) | done | p2 | M | medium |
| [T-032](T-032-save-ux-drive-sync.md) | Save teşviki + Google Drive yedekleme | done | p2 | L | medium |
| [T-033](T-033-vocab-search-ranking.md) | Sözlük arama ranking'i ("ma" gürültüsü) | done | p1 | S | high |
| [T-034](T-034-job-queue-control-panel.md) | Job kuyruğu kontrol paneli (görünürlük + cancel + boot onay) | done | p1 | L | medium |
| [T-035](T-035-srs-chat-language-stamp.md) | SRS arka yüz + chat dil damgası (T-031 artığı) | done | p2 | S | medium |
| [T-036](T-036-attribution-page.md) | Atıf/lisans sayfası (JMdict/Tanos/HSK…) | done | p2 | S | high |
| [T-037](T-037-vocab-index-eager-bundle.md) | Vocab index eager bundle (~1.8 MB her profilde) | done | p2 | M | high |
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

## Yol haritası (2026-07-22 sprint, rev2)

Kurallar öncekiyle aynı: adım = ayrı session, bitince main'e push;
paralel adımlar ayrı worktree + branch, küçük olan önce merge, ikinci
rebase eder. 2026-07-18 dersi geçerli: paralel başlamadan dosya kümesi
ayrıklığını DOĞRULA, varsayma.

Dalga 1 tamamlandı (T-033 + T-024 + T-027, 2026-07-22). Rev2: T-034
(job kuyruğu paneli — T-024'ün kalıcı çözümü) dalga 2'ye yerleşti.

Dalga 2 tamamlandı (T-034 + T-025 + T-028, 2026-07-22): 3 paralel izole
worktree agent (2a opus, 2b/2c sonnet), dosya kümeleri fiilen ayrık
çıktı, 3 merge de çakışmasız (sıra: 2c → 2b → 2a). Merged main'de tsc
temiz, 58/58 test, parity ALL PASS, build:static 5/5 (ilk 2 fail
transient çıktı — baseline'la karşılaştırılıp regresyon olmadığı
doğrulandı). Davranış değişikliği: boot'ta orphan queued job'lar artık
otomatik koşmuyor (pending_approval + panelde "devam et?"). Sıradaki:
adım 3 (T-031, SERİ).

| Adım | Ticket | Mod | Model | Not |
|---|---|---|---|---|
| 2a | T-034 | paralel ok | opus | **done** — Kuyruk paneli — core/jobs + yeni routes + iki UI yüzeyi + statik parite; L, mimari ağırlıklı. p1: token koruması, en erken slot |
| 2b | T-025 | paralel ok | sonnet | **done** — Onboarding Load/New — import akışını çağırır (T-024 done). DİKKAT: 2a client-api.ts'e dokunuyor; başlamadan kesişimi doğrula, T-025 import'u mevcut fonksiyon üzerinden çağırıp client-api'yi düzenlemesin |
| 2c | T-028 | paralel ok | sonnet | **done** — Ayarlar çipi — StatsHeader; 2a'nın Ayarlar-İÇİ paneliyle ayrı dosya, çakışmaz |
| 3 | T-031 | SERİ, tek başına | opus | **done** — İçerik dil izolasyonu; kapsam dışı kalan srs/chat sızıntısı → T-035 |
| ops-1 | — | blast bitince | — | `seed:grammar` + `seed:kanji` + `seed:vocab` re-export → commit → Pages deploy. Ticket AÇILMAZ (içerik üretimi = ops kuralı). tr kütüphanesi bununla tamamlanır |
| 4a | T-030 | paralel ok | opus | **REVERTED** — ja sözlük merge edildi, 2 fix turuna rağmen içerik kalitesi kabul edilemez (entry eşleşme hatası), söküldü. Yeniden deneme Burak kararına bağlı; önkoşul: Jisho-tarzı sunum prototipi onayı, sonra veri. ops-2 bununla düştü |
| 4b | T-032 | paralel ok | opus | **done** — Drive sync + save UX iki faz komple. Açık ops: Google Cloud client ID + gerçek bağla-yedekle-geri-yükle turu (Burak) |
| 4c | T-035 | paralel ok | opus | **done** — A şıkkı (lang kolonları), SAVE_SCHEMA_VERSION 7→8. Açık ops: v8 save re-export (Burak) |
| 4.5a | T-036 | paralel ok | sonnet | Atıf sayfası — SAAT İŞLİYOR: deploy JMdict alt kümesini (kanji lookup) hâlâ taşıyor, EDRDG atıf şartı ja sözlük söküldükten sonra da aktif. T-026'dan ÖNCE: tarama son hali görsün |
| 4.5b | T-037 | paralel ok | sonnet | Vocab index lazy import (~692 KB zh eager bundle) — kod değişikliği olduğu için T-026'dan önce bitmeli |
| 5 | T-026 | EN SON | opus | **done** — Security review tamam (aşağıda). |

### Dalga 5 sonucu (2026-07-22, T-026 security review)

Yöntem: 6 paralel read-only keşif agent'ı (8 saldırı yüzeyi) → her
actionable bulgu fable-verifier'dan geçti (görev: çürüt) → 2 empirik test
orchestrator'da koşuldu. Blast kapalı, testler scratchpad'de temp DB, ikinci
build/dev yok (mevcut `out/` okundu). Verdict'ler: bridge exploit zinciri +
save/key bulguları CONFIRMED/PLAUSIBLE olarak stamp'lendi.

Bulgu → ticket eşlemesi:
- **T-039** (p1, frame A, CONFIRMED) — Bridge CSRF quota-burn + DNS-rebinding
  exfil. Üç POST varyantı empirik ateşlendi, hepsi CLI'ya ulaştı. **Bugün
  exploit** (bridge çalıştıran kullanıcı için). Dalga 5.1 önerisi.
- **T-040** (p1, frame B) — Server modu auth boşluğu (export/import + tüm
  mutating route'lar auth'suz, tek global DB). Bugün exploit DEĞİL (deploy
  statik, server localhost); public pivot'un blocker'ı. "Go public"
  milestone'una gate'li, 5.1 değil.
- **T-041** (p2, frame A) — Save import: kötücül trigger post-swap çalışıyor
  (empirik, SQL-only, RCE yok) + statik import boyut cap yok + S2 magic-header.
- **T-042** (p3, frame A/B) — Save export raw_output → LLM key sızma yolu (yalnız
  custom/bridge endpoint Authorization echo'larsa).

Kabul edilen riskler (T-026'ya işlendi, ticket açılmadı): job route IDOR
(shipped build'lerde exploit değil), feedback screenshot uyarısı /settings'e
scoped (bugün güvenli, password-field masking), npm audit high'ları
(drizzle-orm SQLi erişilemez; esbuild/sharp/postcss dev/build-only).

CLEAN (bulgu yok, doğrulandı): statik `out/` sızıntı yok + owner-sub wiring
yok (import-graph + bundle grep); LLM çıktısı → UI XSS yok (react-markdown
rehype-raw'suz, hepsi React-escaped — payload testi empirik inert); Drive
OAuth (token memory-only, appdata scope, client-id/secret gömülü değil,
exfil yok).

Dalga 4 / blast birlikte yaşama notları (2026-07-22): blast aralıklı
koşuyor (başlat/kes), dalga 4'ü beklemiyor. (1) Kota: blast + opus
session'ları aynı Max aboneliğini paylaşır — aynı ana denk getirme.
(2) T-035 v8 migration'ı lokale uygulandı; blast'la çakışma kalmadı.
(3) ops-1 kısmi içerikle de yapılabilir (vocab 1400/4991 emsali) —
blast'ın bitmesini beklemek zorunda değil.

Lisans: bilinçli ertelendi (müşteri yok; lisanssız public = all rights
reserved). Tek kural: lisans kararından önce dış PR kabul etme. Public
tanıtım/ilk müşteri eşiğinde ticket açılacak (öneri: FSL-1.1-Apache-2.0).

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
3. ✅ (2026-07-18) `seed:grammar` + `seed:vocab` + `seed:kanji` (yeni —
   kanji için paketlenmiş seed altyapısı bu adımda eklendi) re-export →
   commit → Pages deploy. Vocab 1400/4991 ile gönderildi (bilinçli —
   kalan üretilince re-export yeter); kanji 2201, grammar 554 tam.

Sprint dışı (sıralanmadı): T-001, T-002, T-004, T-005.
