---
id: T-068
title: Ders prefetch penceresi — "aktif ders n ise n+2'ye kadar hazır" invariant'ı (her iki mod)
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-07-31
---

## Sorun

2026-07-31 canlı (okumo.dev, static mod): Burak "Aile Terimleri"ni bitirip
haritadan sıradaki derse tıkladığında "Dersin hazırlanıyor" ekranı yedi.
Defalarca istenen davranış: dersler arkadan buffer'lanmalı, sıradaki ders
açıldığında HAZIR olmalı.

Kök neden: open-time prefetch server modda var (`/api/nodes/[id]/open` →
`prefetchSuccessorLessons(nodeId, 3)`), static modda HİÇ yazılmamış
(`openNodeApi` static dalı, `client-api.ts` ~1005). Static sadece
complete anında doğrudan ardılı üretiyor; tamamlama→tıklama arası 5-10 sn,
üretim 1-3 dk — pencere hep kaçıyor.

## Spesifikasyon (Burak, 2026-07-31)

Invariant: aktif ders n ise n+1 ve n+2 içerikli olmalı.
- Son açılan ders 5 → 6 ve 7 arkada üretilir.
- Ertesi gün siteye giriş: 6-7 hazırsa SIFIR yeni üretim.
- 5 bitip aktif ders 6 olduğu anda 8'e kadar kontrol; 7 hazır → sadece 8 üretilir.
- Hızlıca 7'ye geçilirse aktif 7 → 8-9 çekilir.

## Tasarım (2026-07-31 analizi, onaylı)

- Çekirdek: `src/core/`'a saf fonksiyon `lessonWindowTargets(db, activeNodeId, k=2)`
  — prereq zincirini main tipli node'lar üzerinden ileri yürür, içeriği
  olmayanların id'lerini döner (status `error` olanlar HARİÇ: otomatik
  retry yok, bozuk prompt arka planda sonsuz harcamasın). Her şey hazırsa
  boş liste = sıfır LLM çağrısı. Parity harness'e girer.
- Üç tetik (iki modda aynı):
  1. Ders açılışı: `targets(n)`.
  2. Ders tamamlama: `targets(yeni aktif = ardıl)`.
  3. Uygulama/harita açılışı: frontier'dan (ilk tamamlanmamış main node)
     bir kez — static'te sekme kapanınca ölen in-flight üretimi sessizce
     toparlar; pencere doluysa no-op ("revisit'te çekme" kuralı korunur).
- Yürütücü mod başına tek satır: server `forEach(ensureLessonJob)`,
  static `forEach(id => void ensureLessonGen(id))`. Dedup iki tarafta mevcut.
- Server'daki depth-3 open prefetch bu spec'e (k=2) çekilir.
- Auto-extend davranışı değişmez; zincir sonunda pencere kısalır.

## Kapsam dışı

- Pencerenin seviye sınırında erken chapter tetiklemesi.
- Static'te kalıcı job kaydı / resume (T-069'un dünyasında çözülür;
  buradaki açılış tetiği pratik telafi).
