---
id: T-052
title: Yūyake palet göçü — globals drop-in + moss/gold→indigo/amber taraması + info variant + Kumo mark (handoff task 1-4)
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-27
---
v2 handoff geldi (`design/okumo-yuyake/`, "Yūyake" — Samurai Champloo yönü);
v1 sky ailesi GEÇERSİZ (revert temiz: globals'ta sky kalıntısı yok, doğrulandı).
Palet: terracotta → **vermilyon** #c14a1d (dark #e07b3f), moss **silinir** →
**aizome indigo** ailesi (`--indigo-soft/-mid/--indigo/--indigo-deep`,
bilgi+başarı+durum), gold → **amber** #e8a13c (açık zeminde metin
`--amber-text` #b07414), zemin/surface/ink/danger yeni değerler. Fidelity:
high — globals.css drop-in hazır. Kaynak: `design/okumo-yuyake/README.md` +
DS v2 html (bölüm 01 tokenlar, 04 bileşen rolleri, 07 göç kılavuzu).

Handoff task 1-4 = bu ticket:
1. **`src/app/globals.css` komple değiştir** — `design/okumo-yuyake/globals.css`
   drop-in (README: `--header-h`, CJK kuralları, prose-cozy, animasyonlar
   korunmuş; renk + shadow + pulse-glow rengi + `.prose-cozy a` yeni; dark hem
   `.dark` hem prefers-color-scheme bloğunda). Değiştirmeden önce mevcutla
   DIFF al — handoff üretiminden sonra globals'a girmiş bir kural varsa
   kaybetme, dur ve raporla.
2. **Sınıf taraması moss/gold → indigo/amber** — eşleme README task 2'de.
   Bilinen yerler: LessonPlayer, RoadmapView, SrsSession, JobQueuePanel,
   StatsHeader, StrokeTrainer (cssVar fallback `"#c4643b"` → `"#c14a1d"`,
   ~167-168). Grep'le tamamını doğrula. ⚠️ `src/lib/conjugation/nl.ts:132`
   `gold` = Felemenkçe fiil (gelden), DOKUNMA.
3. **CozyButton `info` variant** — `info: "bg-indigo text-surface
   hover:brightness-110 shadow-cozy disabled:opacity-40"`; mevcut üç variant
   değişmez.
4. **StatsHeader Kumo mark** — başlığın soluna ~28px bulut SVG (README'de
   hazır markup), gap 10px, `var(--accent)` + `var(--indigo)` ile iki temada
   otomatik uyumlu.

Fence: globals.css + CozyButton + StatsHeader + task 2 tarama dosyaları.
Doğrulama: src'de moss/gold class kalıntısı yok (nl.ts hariç), sky token'ı
hiç yok, `tsc --noEmit` + `npm test` + `npm run build:static`. Görsel
dark/light kontrolü manuel kalır.

## Geçmiş
- v1 "sky" uygulaması 2026-07-27 merge + aynı gün revert (`1907e54`) — Burak
  dizaynı beğenmedi. v2 Yūyake handoff'uyla aynı gün yeniden kapsamlandı ve
  açıldı; v1 handoff klasörü silindi (git geçmişinde: `5ad0c88`).
- **Done 2026-07-27**: `13e2ed5` + `938eb26` (Kumo shrink-0), ff-merge main'e.
  Kanıt: globals handoff'la bayt-aynı (cmp), src'de moss/gold/sky sıfır
  (nl.ts fiili hariç), tsc temiz, 111/111 test, build:static worktree'de
  yeşil (19 sayfa, derlenmiş CSS'te indigo/amber kuralları doğrulandı).
  Görsel dark/light kontrolü manuel kaldı. Bilinçli kalıntı: StrokeTrainer
  `--ink`/`--surface-2` cssVar fallback hex'leri eski değerde (yalnız cssVar
  çözülemezse görünür, kozmetik).
