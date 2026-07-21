---
id: T-028
title: Ayarlar butonu köşede kalsın ama amacını belli etsin
status: backlog
priority: p3
effort: S
confidence: high
depends: []
created: 2026-07-22
---
Sağ üstteki dişli çok küçük; Ayarlar önemli bir sayfa (LLM kurulumu,
save export/import, profil yönetimi hep orada). Karar (Burak): köşede
kalsın, nav sekmesi OLMASIN — ama küçük kalmasın ve amacını daha iyi
belirtsin.

İş (StatsHeader):
- Dişliyi header'daki diğer çiplerle ($0.00, ⌘K) aynı görsel ağırlığa
  getir: çip formu + "Ayarlar" etiketi (dar ekranda etiket düşer, ikon
  büyük kalır). Tap target ≥ 44px.
- LLM yapılandırılmamışken (useLlmStatus) çipe dikkat çeken bir durum
  ekle (nokta/renk) — yeni kullanıcının Ayarlar'ı bulamama problemi en
  çok o anda yaşanıyor.
- i18n: co-located S tablosu (tr/en), mevcut kalıp.

Doğrulama: masaüstü + mobil genişlikte görsel kontrol; LLM'siz temiz
profille açılışta çipin dikkat çektiğini gör.
