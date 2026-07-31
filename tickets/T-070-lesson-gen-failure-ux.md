---
id: T-070
title: Ders üretim hatası kara deliği — köprü 180s timeout + yutulan hata + iptalsiz/retry'sız "hazırlanıyor"
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-08-01
---

## Olay (2026-08-01 canlı, okumo.dev static mod)

Burak "Sayaçlar" dersini açtı; köprü logunda `HATA: claude zaman aşımı (180s)`.
Sitede sonsuz "Dersin hazırlanıyor": hata görünmüyor, iptal yok, retry yok,
kuyrukta da görünmüyor. Köprü restart'ları da durumu değiştirmedi.

## Kök neden zinciri (hepsi kod okuma + fable-verifier ile CONFIRMED)

1. **Köprü default timeout 180s, ders üretiminin dağılımının İÇİNDE.**
   `scripts/llm-bridge.mjs:62` default 180s → SIGKILL (:197) → HTTP 500
   (:373). Uygulama ders üretimine `timeoutMs=300_000` veriyor
   (`core/llm-gen.ts:149`). Sahibin `llm_calls` verisi (lesson+lesson-retry
   balanced, n=80): **%20'si 180s üstü**, %48'i 150s üstü, max 255s. Yani
   default köprüyle her 5 dersten 1'i ölür. Wizard'ın kurulum komutu
   (`LlmSetupWizard.tsx:757`) `--timeout` geçmiyor; herkes 180s'de.

2. **Drawer kapalıyken gelen hata TAMAMEN yutuluyor.**
   `LessonPlayer.tsx:244-247`: `catch { if (!stopped.current) setError }`.
   "Kapat (üretim arkada sürer)" ile kapatınca 500ms sonra unmount
   (`RoadmapView.tsx:240-247`), reject geldiğinde hata hiçbir yüzeye
   çıkmıyor: harita `getRoadmap` lesson status'u hiç SELECT etmiyor
   (`core/roadmap.ts`), toast sistemi yok, `genError` sadece curriculum
   yolu, `useLlmStatus` config'e bakıyor sonuca değil, static'te job
   tablosu yok. Ders satırı `status:"error"` yazılıyor ama `openNode`
   error'u pending'den ayırt etmiyor (`core/lesson.ts:88-92`) → tekrar
   açışta sessizce YENİ 3 dakikalık (yine 180s'de ölecek) üretim başlıyor.
   Kullanıcı perspektifi: sonsuz "hazırlanıyor". Aynı node hâlâ in-flight
   ise `ensureLessonGen` (client-api.ts:159) aynı promise'i paylaşır,
   köprüye yeni istek de gitmez.

3. **Hata ekranı gösterildiğinde bile retry yok** (`LessonPlayer.tsx:288-298`
   sadece çıkış butonu; aynı dosyada grade-error bloğu :685-705 retry+skip'i
   zaten yapıyor).

4. **Timeout 500'ü generic mesaja düşüyor.** Köprü ayakta olduğundan
   `classifyGenerationFailure` `local_up_other_cause` döner; 500 body'sindeki
   `claude zaman aşımı (180s)` metni kullanıcıya hiç ulaşmıyor
   (`browser-provider.ts:157` LlmError, LlmTimeoutError değil).

5. **Öncelik yok:** kullanıcının açtığı ders, prefetch üretimleriyle aynı
   concurrency=1 kuyruğunda `urgent`'sız bekler (`browser-provider.ts:66`,
   `llm-gen.ts:143`); ayrıca köprünün kendi serialize()'ı önceliksiz.
   T-068 boot/açılış prefetch'leri ekleyince bu belirginleşir.

## Fix planı (T-068 ile aynı dalgada)

- **A. Köprü:** ders/curriculum çağrıları için timeout'u isteğe göre uzat —
  ya default'u 300s+ yap ya da app istekle `X-Bridge-Timeout`/body alanı
  geçirsin; timeout yanıtı ayırt edilebilir olsun (ör. 504 + `{error:
  {type:"timeout"}}`) → browser-provider `LlmTimeoutError` fırlatır,
  diagnosis doğru mesajı basar. Wizard komutu/`--timeout` docs güncellenir.
  (Köprü sürüm uyumsuzluğu: eski köprüde davranış değişmemeli.)
- **B. Hata yüzeyi:** üretim sonucu component ömrüne bağlanmaz —
  `ensureLessonGen` sonucu (ready/error+mesaj) modül-level bir
  store/event'e yazılır; LessonPlayer mount olduğunda son durumu okur,
  drawer kapalıyken biten hata haritada node üstünde/badge'de görünür.
  `openNode` `lessonStatus:"error"`'u ayrı döner: otomatik sessiz retry
  YOK, "üretim başarısız — tekrar dene" ekranı (mesaj + retry butonu).
- **C. Hazırlanıyor ekranı:** geçen süre göstergesi + iptal (AbortController
  ensureLessonGen'e sızdırılır) + hata durumunda diagnosis mesajı ve
  "Tekrar dene".
- **D. Öncelik:** kullanıcı açışı `urgent:true` (prefetch değil);
  T-068 executor'ı prefetch'leri urgent'sız enqueue eder.
- **E. Görünürlük (T-034'ün static ayağı, minimum):** in-flight browser
  üretimleri (lessonGenInFlight + kuyruk) küçük bir yüzeyde listelenir;
  T-069 kalıcı job kaydını getirene kadar bellek-içi yeter.

## Kapsam dışı

- Static'te kalıcı job/resume (T-069).
- Prefetch penceresi invariant'ının kendisi (T-068; birlikte koşulur).
