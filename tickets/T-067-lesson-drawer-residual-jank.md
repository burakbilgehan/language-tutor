---
id: T-067
title: Ders drawer'ında kalan scroll jank'i — raster maliyeti (rounded clip / shadow şüphesi)
status: backlog
priority: p2
effort: S
confidence: medium
depends: []
created: 2026-07-31
---
2026-07-31 saha ölçümü (long-animation-frame, kullanıcının gerçek scroll'u):
ders drawer'ı açıkken kare başına ~80-100ms saf boyama vardı; script=0,
style/layout=0. İki fix push'landı ve belirgin iyileşme sağladı ama Burak
"daha iyi ama hâlâ smooth değil" dedi:

- `de7e32a`: LessonPlayer embedded sticky header'daki `backdrop-blur`
  kaldırıldı (scroller içindeki backdrop-filter kompozitör fast path'ini
  iptal ediyordu) + RoadmapView'da drawer açılış animasyonu
  `transition-[padding]` → `transition-transform` (padding her karede tüm
  haritayı relayout ediyordu).
- `20665d3` (ilgili ama ayrı): useLocalizeError kimlik stabilizasyonu —
  sonsuz render/fetch döngüsü (sekme ölümü) fixi.

## Kalan iş
Kalan jank ölçülemeden oturum kapandı. Sıradaki adaylar (test edilmedi):

1. Drawer scroller'ındaki `sm:rounded-l-3xl` köşe kırpması — rounded clip
   bazı durumlarda composited scroll'u engeller.
2. Drawer'daki `shadow-cozy` (büyük blurlu box-shadow).
3. StatsHeader'daki kalan `backdrop-blur` (map'te tek başına smooth, ama
   drawer açıkken etkileşimi doğrulanmadı).
4. Map'teki `animate-pulse-glow` (box-shadow keyframe animasyonu; sürekli
   repaint) — drawer açıkken de çalışıyor.

## Ölçüm yöntemi (hazır)
Sekme ÖN PLANDAYKEN (arka planda rAF 1fps'e kısılır, ölçüm çöp olur):
rAF kare-aralığı kaydedici + `long-animation-frame` observer kur; sayfada
canlı A/B için `panel.classList.remove("sm:rounded-l-3xl","shadow-cozy")`
uygula, kullanıcı scroll'uyla iki kaydı karşılaştır. Script/style süresi
sıfır çıkmaya devam ederse konu React değil raster'dır; "inefficient
render" aramak boşa (2026-07-31 ölçümü bunu bir kez kanıtladı).
