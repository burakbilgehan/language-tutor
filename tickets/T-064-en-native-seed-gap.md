---
id: T-064
title: İçerik fallback zinciri — LLM override → seed → oto-çeviri (MT) → dürüst boşluk
status: done
priority: p1
effort: L
confidence: medium
depends: []
created: 2026-07-27
closed: 2026-07-27
---
**Kapanış (2026-07-27, grammar fazı):** 4 katmanlı zincir merge edildi
(`c321b36` + review fix `4b3ebcf`). MT motoru: Argos denendi, kanıtla
reddedildi (uzun cümlede sessiz yan-cümle düşürme) — ticket'taki devirme
koşulu erken tetiklendi, boru hattı kendi LLM provider'ımıza (fast tier,
Max sub) döndü; iki motor da `scripts/mt/engine.ts` `TranslateEngine`
arayüzü arkasında. Commit'li gerçek çıktı: `public/grammar-seed/ja.en.json`
(7 konu) + `src/lib/grammar-index/titles.{ja,zh,nl}.en.json` (ja 20/20
gerçek koşu). Kalanlar:
- **Burak kararı bekliyor:** rozet metni "otomatik çevrildi" — motor LLM
  olduğu için "LLM ile çevrildi"ye inebilir/kalkabilir; 10-konu spot-check
  sonrası. Tam seed koşusu (`npx tsx scripts/mt-grammar-seed.ts --all`)
  spot-check onayından sonra.
- **İkinci faz (ayrı iş):** kanji/vocab MT — index'leri zaten en gloss
  taşıyor, muhtemelen yalnız content MT gerekir.
- **Bilinçli bırakılan:** `seed-strip.ts` MT (en) yarılarını strip'lemiyor
  (israf byte, veri kaybı değil); tarayıcı/manuel UI testi yapılmadı.
- **Bilinen kalite boşluğu (Burak gördü, "kalsın" dedi, 2026-07-27):**
  tablo alanları (`column_headers`, `tables[].rows`) CJK'yı korumak için
  MT'den toptan hariç — karma alanlardaki Türkçe proz ("Satır", "boş
  ünsüz") en seed'inde çevrilmeden kalıyor. İstenirse fix: protect.ts
  tripwire'ı hücre içinde uygulanıp yalnız Latin kısım çevrilir (S efor).
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
