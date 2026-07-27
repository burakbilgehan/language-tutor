---
id: T-053
title: Yūyake kullanım kuralları — 5 ekrana uygula (vermilyon=aksiyon, indigo=bilgi/başarı/durum, amber=ödül)
status: in-progress
priority: p2
effort: M
confidence: medium
depends: [T-052]
created: 2026-07-27
---
T-052 palet göçü bitince README "Renk kullanım kuralları" + DS v2 bölüm 04
(bileşen renk rolleri) mevcut ekranlara uygulanır. v2'de v1'deki gibi ayrı
before/after mock DOSYASI YOK — token göçü + T-052 taraması mekaniği
halleder; bu ticket yargı işi (kör find-replace değil):

- **Vermilyon = yalnız eylem:** birincil buton, aktif sekme, açılabilir ders
  düğümü, ünite etiketi, kutlama. Sayfa başına max **BİR** baskın vermilyon
  odak — fazlası bilgi/durum işiyse indigo'ya çekilir.
- **İndigo = bilgi+başarı+durum:** tamamlanma işaretleri, progress, linkler,
  ipucu/info kutuları, seçili/focus hâli (1.5px `var(--indigo)` border + 4px
  `rgb(47 74 112 / .15)` ring), Kumo maskotu.
- **Amber = ödül:** XP, seri, rozet; açık zeminde metin `--amber-text`.
- Yeşil yok. Soluk pastel mavi yok.

Ekranlar (fence): Roadmap (`/map`), Lesson (`LessonPlayer`), Grammar
(`GrammarTopicView`/`GrammarTable`), Onboarding (`OnboardingWizard`),
Settings. T-052'nin dosyalarına (globals/CozyButton/StatsHeader) yalnız
kural gerektirirse ve T-052 merge edildikten sonra dokunulur. Kapsam dışı
ekranlar (vocab/çekim/SRS/kana/stroke/sınav/sohbet/about) token'lardan
otomatik güncellenir — orada kural ihlali görürsen DOKUNMA, raporla
(T-055 emsali: ayrı küçük ticket olur).

Referans: `design/okumo-yuyake/README.md` + DS v2 html bölüm 01/04.
Doğrulama: 5 ekran dark/light iki temada kural denetimi + `tsc` + test +
build. Görsel kontrol manuel kalır.

## Geçmiş
- v1 "sky" uygulaması 2026-07-27 merge + aynı gün revert (`244ec86`). v2
  Yūyake handoff'uyla yeniden kapsamlandı (mock-eşleme yerine kural-tabanlı).
