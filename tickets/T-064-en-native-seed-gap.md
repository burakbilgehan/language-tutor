---
id: T-064
title: İçerik fallback zinciri — LLM override → seed → oto-çeviri (MT) → dürüst boşluk
status: backlog
priority: p1
effort: L
confidence: medium
depends: []
created: 2026-07-27
---
T-056'da saptanan en-native boşluğunun çözümü, Burak'ın 2026-07-27 ruling'iyle
katmanlı fallback zincirine genişledi. **Bağlayıcı ilkeler (Burak):**
- Çeviri içerik YALNIZ gerçek içerik yokken gösterilir; gerçek içerikle asla
  eş tutulmaz.
- MT içerik her zaman kalıcı rozet + mesajla gelir: "otomatik çevrildi —
  içeriğimiz her geçen gün güncellenip düzenleniyor + kendi LLM'inle kendine
  özel isabetli içeriği her an üretebilirsin" (CTA → LlmSetupWizard).
- Kullanıcı LLM'iyle üretince MT sessizce değişir, rozet kalkar.

## Zincir (öncelik sırasıyla)
1. **LLM-generated** — profilin dilinde, kullanıcının kendi LLM'i (mevcut akış).
2. **Packaged seed** — gerçek içerik (bugün yalnız tr; `apply*Seed`).
3. **Build-time MT** *(yeni)* — tr seed'den bir kez, bizim tarafta çevrilip
   `public/grammar-seed/en.json` olarak paketlenir. Araç adayları: Argos
   Translate (offline/lokal) veya Workers AI m2m100. ÇALIŞMA ANINDA tarayıcı
   MT yok (Chrome Translator API vb. — Chrome'a özgü + kullanıcı başına model
   indirme + statik içerik için israf).
4. **Dürüst boşluk** — konu-başına "henüz hazır değil, her geçen gün
   güncelleniyor + LLM bağla" kopyası (hub'daki durumun konu seviyesine inişi).

## Kurallar / teknik
- Her katman yalnız BOŞ slotu doldurur (applyGrammarSeed kalıbı); LLM üretimi
  MT'nin üstüne her zaman yazar.
- Kaynak işareti (`source: "llm" | "seed" | "mt"`) JSON İÇİNDE taşınır —
  kolon eklenmez → SAVE_SCHEMA_VERSION bump yok. Zod şemaları ek alanı
  strip'lemesin (kontrol et).
- **Alan seviyesinde çeviri:** MT'ye yalnız açıklama prozu girer; hedef-dil
  cümleleri ve bracket notasyonu (`漢字[かんじ]`, pinyin) ASLA çevrilmez.
- **Başlıklar:** grammar index başlıkları tr-only — bir kez çevrilip endekse
  en başlık olarak commit edilir (algısal en deneyiminin en büyük parçası;
  kanji/vocab endekslerinde muadili kontrol edilir).
- Kapsam sırası: grammar önce; kanji/vocab aynı kalıpla ikinci faz.

## Kabul testi + devirme koşulu
10 konu MT spot-check (Burak göz atar). Kalite yetmezse aynı boru hattı
LLM-batch çeviriye döner (blast paneli, Max aboneliği — bir gece koşusu);
o durumda rozet metni "LLM ile çevrildi"ye iner ya da tamamen kalkar (o gün
karar).

## Fence
Seed export scriptleri + `apply*Seed` gate'leri (`nativeLanguage !== "tr"`
no-op'u "o dilde slot varsa uygula"ya evrilir) + `lang-content.ts` + rozet
UI + index başlık verisi. `schema.ts` kolonu YOK.
