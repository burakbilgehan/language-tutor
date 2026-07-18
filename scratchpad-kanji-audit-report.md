# Kalite kontrol raporu — haiku üretimi içerik (data/app.db)

Tarih: 2026-07-18. Örneklem: `status='ready'` satırlardan random 100 hedeflendi;
gerçek dağılım **78 kanji + 2 vocab + 20 grammar** (vocab'da yalnız 2 ready satır var → hedef 20 imkânsız, kanjiye kaydırıldı).

Denetim: Opus kendi ja/zh/nl bilgisiyle + adversarial verifier ikinci geçiş. Kesin hata eşiği yüksek tutuldu.

## (a) Özet

| Kategori | n | Kesin hata | Şüpheli | Temiz | Not |
|----------|---|-----------|---------|-------|-----|
| kanji    | 78 | **2** | 4 | 72 | tüm okunuşlar (onyomi/kunyomi) doğru; hatalar TR gloss katmanında |
| grammar  | 20 | 0 | 0 | 20 | ja/zh/nl örnek + pinyin + çeviri hepsi gerçek/doğru |
| vocab    | 2  | 0 | 0 | 2 | temiz — ama n=2, **istatistiki sinyal yok**, vocab "doğrulandı" denemez |

**Genel hüküm:** Bu bir **çeviri-katmanı kalite sorunu**, "model Japonca bilmiyor" sorunu DEĞİL.
Örneklemdeki her kana okunuşu, her örnek kelime yapısı, tüm gramer/pinyin doğru çıktı;
iki hatanın ikisi de Türkçe gloss hatası (biri uydurma anlam, biri yanlış çeviri). Bu tam olarak
fast tier'ı sonnet'e çekmenin düzelttiği hata tipidir.

**Oran / karar için:**
- Kesin hata (kanji): 2/78 ≈ **%2.6**. n=78 → güven aralığı geniş (~%0.3–9). Nokta tahmin 1932 kanji'de ~50 bozuk; dürüst aralık onlarca ila ~170.
- "Bozuk VEYA zayıf/garip gloss" dahil edilirse kanji oranı ~%4–5'e çıkıyor (aşağıdaki şüpheliler) → ~80–100 kanji kaydı. Bu **%5 eşiğinin tam üstünde**; regenerate-vs-sonnet kararının belirleyici bölgesi.
- grammar belirgin şekilde temiz; vocab örneklemi anlamsız (sadece 2 kayıt mevcut).

## (b) Kesin hatalılar (verifier onaylı)

1. **郡** (id `dEF1dV0DSNV3YD6MTbZoK`): `meanings_tr` içinde `"Gün (Eski Asya)"` var — 郡 hiçbir okunuşta "gün/day" anlamına gelmez; yalnızca ilçe/idari bölge. Uydurma anlam.
   - Not: örnek kelimeleri (郡市/郡道/郡役所) gerçek — sadece gloss listesi bozuk.
2. **扇** (id `V5OR4sqlwXyoRDNvNv7Bn`): 扇子(せんす) `meaning_tr = "Uçkur"` — 扇子 = katlanır el yelpazesi (folding fan); "uçkur" (pantolon bağı) tamamen alakasız. Aynı hata `note_tr`'de de tekrarlanıyor ("扇子 ise uçkur anlamına gelir") — tek seferlik typo değil, sistematik.

## (c) Şüpheliler (DOKUNULMADI — bilgi için)

Kesin hata eşiğini geçmeyenler:
- **窃** (id `rWWJiM1bIIRl9fy4YUpxg`): 窃盗 glossu `"Hırsızlık, tırnakla hırsızlık"` — "tırnakla hırsızlık" anlamsız ek (ana anlam doğru). 窃む→ぬすむ nonstandard (yaygını 盗む).
- **締** (id `H_CnedZFx_oUfuCQqpFKh`): ドアを締める→"kapıyı kapatmak" — standart yazım 閉める. 締 "shut/lock" anlamı taşıdığı için sınırda, sözlük hatası değil.
- **峰** (id `BarwD3TdUYwjrLMjDwVfN`): 奥峰(おくみね) standart sözlük başlığı değil; büyük olasılıkla yalnız yer/özel isim. (峰々 gerçek, sorun yok.)
- **酬** (id `n_LoFK2d2RbexdHL0fmqS`): 酬宴(しゅうえん) standart ziyafet kelimesi değil (gerçekleri 祝宴/酒宴/饗宴). Okunuş tutarlı; uydurma olduğu kanıtlanamadı.

奥峰 ve 酬宴 için elde offline 国語辞典 yok — gerçek sözlük API'siyle doğrulanırsa "nadir ama gerçek" tarafına geçebilirler.

## (d) UPDATE SQL — KOŞULMADI (kullanıcı "sadece analiz" dedi)

Onay verilirse, önce `pgrep -f blast-generate` ile üretim koşmadığını doğrula, sonra:

```sql
-- Kesin hatalıları 'error' yap → sonraki blast-generate koşusu yeniden üretir
UPDATE kanji_entries SET status='error' WHERE id IN (
  'dEF1dV0DSNV3YD6MTbZoK',  -- 郡: "Gün (Eski Asya)" uydurma anlam
  'V5OR4sqlwXyoRDNvNv7Bn'   -- 扇: 扇子="Uçkur" yanlış çeviri
);
```

Alternatif (yeniden üretmeden nokta düzeltme): 郡'dan "Gün (Eski Asya)" glossunu çıkar; 扇 content'inde 扇子 meaning_tr + note_tr'yi "katlanır el yelpazesi" yap.

## (e) Sonraki adım kararı (kullanıcıya)

- Kesin hata %2.6, ama zayıf gloss dahil ~%4-5 → eşiğin üstünde.
- Hata tipi gloss kalitesi olduğu için **fast tier → sonnet** (`LLM_MODEL_FAST=sonnet ile blast`) muhtemelen bunları temizler, ~2-3x yavaş.
- Alternatif: sadece 2 kesin hatalıyı error'la, spot-fix; ama zayıf-gloss kuyruğu kalır.
