---
id: T-021
title: Çekim cheatsheet'i — zh zayıf, nl boş; ja seviyesine getir
status: done
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

## Durum (2026-07-18)
Ticket açıldığından beri commit f587ab9 ("Bigger zh/nl cheatsheets,
browser TTS, verified nl strong table") bu kapsamı zaten kapatmış: zh
tarafında `ZH_ASPECT_GROUPS` 6 grup (aspect/negation/future-modal/
time-frames/structures/questions, ~40 satır), nl tarafında hem
`conjugateNl` motoru (zwak/sterk/onregelmatig, perfectum, ayrılabilir)
hem `NL_PATTERN_GROUPS` (connector/infinitive/er/word-order, 4 grup).
İkisi de view'larda generic map ile render ediliyor (ZhAspectView,
NlConjugatorView) — statik veri, LLM'siz. Ticket metni artık repoyla
eşleşmiyordu; ek iş gerekmedi, T-006 (aynı session) ayrı gerçek bug
olarak kaldı ve ayrıca çözüldü.
