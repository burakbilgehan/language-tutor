---
id: T-065
title: Yūyake kalıntıları — T-053 fence'i dışındaki ekranlarda focus/selected/token temizliği
status: backlog
priority: p3
effort: S
confidence: high
depends: [T-053]
created: 2026-07-28
---
T-053 rol denetimi 5 ekranla sınırlıydı; agent taraması kapsam dışı
ekranlarda şu kural ihlallerini raporladı (dokunulmadı). Hepsi mekanik —
T-053'ün yerleşik kalıplarını uygula (satır numaraları kayabilir, grep'le):

1. **Focus formülü** (`focus:border-indigo focus:ring-4 focus:ring-indigo/15`):
   - `focus:border-accent`: ChatPanel:169, ConjugatorView:166+182,
     NlConjugatorView:79
   - `focus:ring-accent-soft`: VocabSidebar:249+291
2. **Flash/selected → indigo** (T-053'te GrammarSidebar emsali):
   - flash `ring-accent`: StrokeTrainer:437, VocabSidebar:206
   - seçili satır/pill `bg-accent-soft`: VocabSidebar:209, StrokeTrainer:369+440,
     CommandPalette:230
3. **Token düzeltmeleri**: `bg-accent text-white` → `text-surface`:
   StrokeTrainer:322, ConjugatorView:145, NlConjugatorView:59;
   FloatingOverview:84 `text-white`.

Not: bu ekranlardaki aktif-tab/primary-aksiyon vermilyonları KALIR (kural:
vermilyon=aksiyon) — yalnız yukarıdaki focus/selected/token vakaları döner.
Doğrulama: tsc + test + build; ekran başına dark/light göz kontrolü manuel.
Referans: `design/okumo-yuyake/README.md` kuralları + T-053 diff'i (`25d813f`).
