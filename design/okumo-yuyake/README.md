# Handoff: Okumo v2 — "Yūyake" palet göçü (Samurai Champloo yönü)

Target repo: `burakbilgehan/language-tutor` (branch `main`) — Next.js + Tailwind v4.

## Overview
Palet v2: doygunluk değil derinlik. Terracotta → **vermilyon** (#c14a1d), yosun yeşili **kaldırılıyor**, yerine **aizome indigo** ailesi (bilgi + başarı + durum), gold → **amber** (ödül). Zemin hafif ısınıyor. Uygulama token-tabanlı olduğu için ekranların çoğu otomatik güncellenir; yalnızca aşağıdaki sınıf taraması gerekir.

**Not:** Daha önceki "sky ailesi ekleme" handoff'u (v1) geçersiz. Uygulandıysa `--sky-*` tokenlarını ve `bg-sky*` kullanımlarını bu göç sırasında kaldır.

## About the Design Files
`Okumo Design System v2.dc.html` HTML ile yazılmış **tasarım referansıdır**, production kodu değildir. Tarayıcıda aç (`support.js` yanında dursun). Bölüm 01 tokenlar, 04 bileşen renk rolleri, 07 göç kılavuzu.

## Fidelity
**High-fidelity.** Tüm değerler kesindir; `globals.css` bu klasörde drop-in hazır.

## Tasks

### 1. `src/app/globals.css` — komple değiştir
Bu klasördeki `globals.css` dosyası drop-in replacement (gerçek kaynaktan üretildi: `--header-h`, CJK kuralları, prose-cozy, animasyonlar korunmuş; renk tokenları + shadow + pulse-glow rengi + `.prose-cozy a` yeni). Dark değerler `.dark` VE `prefers-color-scheme` bloğunda — ikisi de dosyada güncel.

Token değişim özeti:
- `--accent` #c4643b → **#c14a1d** (dark #d97e55 → #e07b3f)
- `--moss`, `--moss-soft` **silindi** → `--indigo-soft/-mid/--indigo/--indigo-deep` geldi
- `--gold` → **`--amber`** (#e8a13c) + `--amber-text` (#b07414 açıkta kontrast için; dark'ta #e8a13c)
- zemin: #f7f2e9 → #f6ead2, surface → #fdf6e7, ink → #251e18 (dark: #201b16 → #1c1712 ailesi)
- `--danger` #b2503f → #8f3116 (dark #d96a4a)

### 2. Sınıf taraması — moss/gold → indigo/amber
Eşleme: `bg-moss`→`bg-indigo` · `bg-moss-soft`→`bg-indigo-soft` · `border-moss`→`border-indigo` · `text-moss`→`text-indigo` · `bg-gold`→`bg-amber` · `text-gold`→`text-amber-text` · `ring-gold`→`ring-amber`.

Bilinen kullanım yerleri (grep ile doğrula):
- `LessonPlayer.tsx`: 388 (text-moss), 491 (bg-moss), 519 (border-moss bg-moss-soft), 636 (bg-moss-soft), 642 (text-gold)
- `RoadmapView.tsx`: 412 (bg-moss-soft), 456 (bg-moss text-surface), 472 (text-gold)
- `SrsSession.tsx`: 53 (bg-gold/15, hover /25), 54 (bg-moss-soft), 177 (bg-moss)
- `JobQueuePanel.tsx`: 104 (text-moss), 108 (text-gold), 189 (bg-gold/20 text-gold hover /30)
- `StatsHeader.tsx`: 86 (text-moss), 123 (bg-gold), 243 (text-gold)
- `StrokeTrainer.tsx`: 442 (bg-moss-soft), 483 (text-moss), 167–168 (cssVar fallback `"#c4643b"` → `"#c14a1d"`)

⚠️ `src/lib/conjugation/nl.ts:132`'deki `gold` Felemenkçe fiildir (gelden) — **dokunma**.

### 3. `src/components/shared/CozyButton.tsx` — `info` varyantı
```tsx
type Variant = "primary" | "ghost" | "soft" | "info";
// mevcut üç varyant aynen (renkleri token'dan gelir)
info: "bg-indigo text-surface hover:brightness-110 shadow-cozy disabled:opacity-40",
```

### 4. `src/components/shared/StatsHeader.tsx` — Kumo mark
Başlığın soluna, ~28px, `gap: 10px`:
```html
<svg viewBox="0 0 128 86" height="28" aria-hidden="true">
  <g fill="var(--accent)">
    <circle cx="40" cy="44" r="22"/><circle cx="68" cy="34" r="27"/>
    <circle cx="94" cy="47" r="18"/><rect x="18" y="44" width="94" height="22" rx="11"/>
  </g>
  <rect x="30" y="74" width="26" height="7" rx="3.5" fill="var(--indigo)"/>
  <rect x="64" y="74" width="42" height="7" rx="3.5" fill="var(--indigo)"/>
</svg>
```

## Renk kullanım kuralları
- **Vermilyon = eylem:** birincil buton, aktif sekme, açılabilir ders düğümü, ünite etiketi, kutlama. Sayfada en fazla **bir** baskın vermilyon odak.
- **İndigo = bilgi + başarı + durum:** tamamlanma işaretleri, ilerleme, linkler, ipuçları, odak hâli (border 1.5px `var(--indigo)` + ring `rgb(47 74 112 / .15)` 4px), Kumo maskotu.
- **Amber = ödül:** XP, seri, rozet. Açık zeminde metin `--amber-text`.
- Yeşil yok. Soluk pastel mavi yok.

## Kapsam notu
Mock'lanan ekranlar: harita, ders, gramer, onboarding, ayarlar (+ landing). Kapsanmayan ekranlar (vocab, çekim, tekrar/SRS, kana, stroke, pinyin, sınav, sohbet, about) token'lardan otomatik güncellenir; task 2'deki tarama bunların moss/gold kalıntılarını yakalar. Şüphede kalırsan referans: DS v2 bölüm 01 ve 04.

## Files in this bundle
- `globals.css` — drop-in replacement (task 1)
- `Okumo Design System v2.dc.html` — token + bileşen referansı
- `support.js` — .dc.html görüntüleme runtime'ı
