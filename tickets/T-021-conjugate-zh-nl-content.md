---
id: T-021
title: Çekim cheatsheet'i — zh zayıf, nl boş; ja seviyesine getir
status: backlog
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-18
---
ja çekim sayfası beğenildi (referans kalite). zh tarafı zayıf
(`ZhAspectView.tsx` 96 satır — aspect partikülleriyle sınırlı), nl boş
denecek durumda (`NlConjugatorView.tsx` var ama içerik hissi vermiyor).
Veri dosyaları: `src/lib/conjugation/{ja,zh,nl}.ts` + `ja-charts.ts`.

Kapsam:
- **zh**: fiil çekimi yok ama ja'daki "chart" kalıbının karşılığı var:
  aspect/partikül sistemi (了/过/着/在/正在), yön tümleçleri, sonuç
  tümleçleri, 把/被 yapıları, soru/olumsuzlama kalıpları (不/没),
  yardımcılar (会/能/可以/要/想). Her biri örnekli tablo — ja-charts
  formatında deterministik statik veri.
- **nl**: gerçek çekim dili — şimdiki/geçmiş (zwak/sterk/onregelmatig),
  perfectum (hebben/zijn seçimi), ayrılabilir fiiller (T-006 ile temas:
  o ticket'ın zayıf-fiil listesi buradan beslenebilir), modal fiiller,
  imperatief. `nl.ts`'deki mevcut motoru genişlet + chart görünümü.
- İçerik ja'daki gibi **statik kod** olmalı (LLM'siz, deterministik) —
  grammar cheatsheet felsefesiyle aynı.

`conjugation-nl.test.ts` mevcut — yeni fiil sınıfları test eklenerek girer.
ja-charts.ts formatı önce okunup birebir taklit edilmeli.

Bağımlılık yok; T-006 (nl zayıf ayrılabilir fiiller) ile aynı dosyalara
dokunur — aynı session'da ele almak çakışmayı önler.
