---
id: T-073
title: Vazgeç kalıcı olmalı — iptal edilen ders otomatik yeniden üretilmesin
status: todo
priority: p1
effort: S
confidence: high
depends: []
created: 2026-08-01
---

## Olay (2026-08-01 canlı)

Kullanıcı "hazırlanıyor" ekranında Vazgeç'e bastı; panel kapandı ve AYNI
SANİYE yeni bir üretim başladı (köprü logu: 16:10:13 iptal + 16:10:13 istek,
aynı job id). Kullanıcının açık iptali hiçe sayılıyor.

## Kök neden (kod okumasıyla doğrulandı)

1. `LessonPlayer.tsx` "generating" durumunda 3 sn'de bir `open()` poll'u
   kurar (satır ~271). Vazgeç iptal edip satırı "pending"e döndürünce,
   kurulu poll bir sonraki atışında `openNodeApi` → `needsGeneration` →
   `ensureLessonGen(urgent)` ile üretimi YENİDEN başlatır.
2. `client-api.ts openNodeApi`: "cancelled ise üretme" kontrolü
   `await ensureLessonGen`'den SONRA duruyor (satır ~1182) — iş işten geçmiş
   oluyor. Store'daki "cancelled" kaydı `running` olmadığı için
   `startLessonGen` yeni üretime izin veriyor.
3. `open()` unmount sonrası da çalışıyor: `stopped.current` yalnız
   `setData`'yı gate'liyor, `openNodeApi` çağrısını (yan etkili!) değil.

## İstenen davranış

- BİLE İSTEYE iptal edilen ders o OTURUMDA hiçbir otomatik yoldan (poll,
  T-068 penceresi, harita açılış tetiği) yeniden üretilmez. Yeniden üretim
  yalnız kullanıcının açık eylemi (dersi tekrar açmak / tekrar dene).
  Not: pencere hedef filtresi (`runLessonWindow` içindeki cancelled skip)
  zaten var; eksik olan openNodeApi + poll katmanları.
- Ders BİTİRİNCE yeni açılan node'lara otomatik prefetch atılması DOĞRU
  davranış, korunacak (`completeNodeApi` → runLessonWindow zinciri).

## Düzeltme krokisi (basit tutulmalı)

- `openNodeApi` needsGeneration dalında `lessonGenState(nodeId)?.kind ===
  "cancelled"` kontrolü ensureLessonGen'den ÖNCEYE; cancelled ise üretim
  başlatmadan `{status:"generating"}` yerine iptali temsil eden sonuç dön
  (çağıran haritaya dönüyor zaten).
- `open()` poll callback'i: `stopped.current` VEYA store "cancelled" ise
  openNodeApi'yi hiç çağırmadan çık; unmount cleanup'ında bekleyen
  setTimeout temizlensin.
