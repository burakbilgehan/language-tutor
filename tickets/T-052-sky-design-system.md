---
id: T-052
title: Sky renk ailesi + Kumo mark + info variant (design handoff task 1-3)
status: backlog
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-27
---
Claude design handoff'u (`design/okumo-sky/`, "Okumo — Sky" ailesi) geldi.
Bu ticket = handoff'un ATOMİK task 1-3'ü (görsel sistem temeli). Fidelity
doğrulandı: token blokları projedeki `src/app/globals.css` ile 1:1
(`:root`, `.dark`, `@media...:root:not(.light)`, `@theme inline`, `.prose-cozy`
hepsi mevcut, `--accent` #c4643b eşleşiyor). Kaynak: `design/okumo-sky/README.md`.

Sky = **bilgi/state rengi** (link, ipucu, progress, seçili/focus, Kumo maskot);
terracotta = **aksiyon rengi** (kalır). Mevcut token'lar DEĞİŞMEZ, sadece ekleme.

1. **`src/app/globals.css` — sky ailesi ekle** (`globals-sky-additions.css`):
   `:root`, `.dark` VE `@media (prefers-color-scheme: dark){:root:not(.light)}`
   bloklarının HEPSİNE (dark iki yerde tanımlı — ikisine de) + `@theme inline`
   token'lar + `.prose-cozy a` (link rengi = sky-deep). Dark'ta skala kasıtlı
   ters döner (sky-deep en açık olur — koyu üstü metin için).
2. **`src/components/shared/CozyButton.tsx` — `info` variant:** `Variant`'a
   `"info"` ekle, `info: "bg-sky text-surface hover:brightness-110 shadow-cozy
   disabled:opacity-40"`. Mevcut üç variant değişmez.
3. **`src/components/shared/StatsHeader.tsx` — Kumo mark:** app başlığının
   soluna ~28px bulut SVG (README'de hazır markup), `var(--accent)` +
   `var(--sky-light)` ile dark-mode otomatik uyumlu, gap 10px.

Fence: `globals.css` + `CozyButton.tsx` + `StatsHeader.tsx` (3 dosya, dar).
Kod büyük ölçüde handoff'ta hazır — mekanik. Doğrulama: dark/light ikisinde
token'lar çözülüyor + Kumo mark iki temada da okunur (beyaz-cream'de bulut
görünmez kuralı — mark accent kullanıyor, sorun yok). `npm run build:static`
(ELLE — build izni olan session'da).
