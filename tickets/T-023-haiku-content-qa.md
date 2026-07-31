---
id: T-023
title: Haiku üretimi içerik kalite denetimi (halüsinasyon taraması)
status: todo
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-18
---
Tüm cheatsheet içeriği (kanji/grammar/vocab) haiku ile üretiliyor; uydurma
kelime / yanlış okunuş / saçma anlam şüphesi var. Opus'lu ayrı bir session
`data/app.db`'den rastgele 100 ready örnek çekip (≈60 kanji / 20 vocab /
20 grammar) statik referans kolonlarıyla (onyomi/kunyomi, pinyin,
meanings_en) çapraz kontrol edecek; kesin hatalıları `status='error'`
yapacak ki `scripts/blast-generate.ts` sonraki koşuda yeniden üretsin.
Tam prompt backlog session'ında verildi (2026-07-18); özü yukarıda —
"kesin hatalı" eşiği yüksek, emin olunmayan "şüpheli" olarak sadece
listelenir, UPDATE'ler blast dururken yapılır.

Sonuca bağlı karar (backlog session'ında konuşulacak): hata oranı yüksekse
(a) hatalıları haiku ile yeniden üretmek yerine `LLM_MODEL_FAST=sonnet`
ile blast koşturmak, (b) örneklemi büyütmek, (c) prompt'ları sıkılaştırmak.

Sıralama: blast'ın içerik koşuları bittikten SONRA koş (yarım içerikte
örneklem çarpık olur); `seed:grammar`/`seed:vocab` re-export'ları QA
temiz çıkınca yapılır — bozuk içeriği seed'e paketlememek için.

**parked (2026-07-18)**: Kanji+grammar ayağı koşuldu (rapor:
scratchpad-kanji-audit-report.md — 78 kanji'de 2 kesin hata, ikisi TR gloss;
okunuşlar/gramer temiz). Vocab üretimi bitince SADECE vocab örneklemiyle
tekrar koşulacak; sonra seed export'lar.

**todo (2026-07-31, kapsam revize)**: İçerik tamamlandı (vocab 4991,
kanji 2211, grammar 298/184/72), seed'ler export edilip deploy edildi.
Burak kararları (2026-07-31): (1) denetim **SALT-OKUNUR** — DB'de,
seed'lerde, kodda HİÇBİR değişiklik yok; `status='error'` işaretleme
YOK, otomatik yeniden üretim tetiklenmez. (2) Kapsam sadece kanji/vocab
değil: tüm dillerin tüm içerik yüzeyleri (nl dahil; grammar + çekim
sayfaları da). (3) Tek çıktı = rapor dosyası
`tickets/T-023-audit-report.md`; hatalar orada notlanır, ne yapılacağına
sonra birlikte karar verilir.

Session promptu (yeni opus session'a ver):

> Çok dilli içerik kalite denetimi (T-023). **SALT-OKUNUR**: DB'ye, seed
> dosyalarına, koda hiçbir yazma yok; tek çıktı
> `tickets/T-023-audit-report.md` rapor dosyası (bir de INDEX'e dokunma).
> Kaynak: `data/app.db`. LLM içerik kolonları `{tr: payload}`
> dil-anahtarlı (`src/lib/llm/lang-content.ts`); şemalar
> `src/lib/llm/schemas.ts`.
>
> Örneklem (rastgele, seviyelere dengeli):
> - **zh vocab** (`vocab_entries`, ~4991 ready): 80 kelime. content.tr'yi
>   statik referanslarla (`reading` ton işaretli pinyin, `meanings_en`,
>   `classifiers`) çapraz kontrol et: meanings_tr anlam kayması, örnek
>   cümle bracket pinyin'i doğru mu + cümle kelimeyi içeriyor mu +
>   translation_tr doğru mu, classifier notu kolonla çelişiyor mu, chars
>   kırılımı ve collocations uydurma mı.
> - **ja kanji** (`kanji_entries`, ~2211 ready): 40 karakter. Onyomi/
>   kunyomi doğruluğu, anlam glossları, örnek kelimelerin okunuşları,
>   furigana bracket'ları (`漢字[かんじ]`).
> - **grammar** (`grammar_topics`): ja 25 + zh 25 + **nl 15** konu.
>   Açıklama doğruluğu, örnek cümlelerin gramere gerçekten örnek olması,
>   çeviriler, ja furigana / zh pinyin bracket doğruluğu; nl'de örnek
>   cümle dilbilgisi.
> - **çekim** (`src/lib/conjugation/{ja,zh,nl}.ts` — statik kod, LLM
>   değil): tablolardaki çekim formlarını dil bilginle doğrula (ja
>   masu/te/nai zincirleri, nl ayrılabilir fiiller + sterke werkwoorden,
>   zh partikel kullanımları).
>
> Sınıflandırma: **kesin hata** (yanlış okunuş/pinyin, yanlış anlam,
> kelimeyi içermeyen örnek, yanlış çekim formu) ve **şüpheli** (emin
> olunamayan) ayrı listeler. Rapor formatı: yüzey başına örneklem boyutu,
> kesin hata oranı, hata tablosu (kayıt anahtarı `word`/`char`/`slug` +
> alan + mevcut değer + doğrusu + kısa gerekçe), şüpheliler, sonuç özeti.
> Oran bir yüzeyde %5'i geçerse öneri yaz (yeniden üretim modeli /
> örneklem büyütme / prompt sıkılaştırma) ama HİÇBİRİNİ uygulama —
> karar Burak'ın. Raporu yaz, commit ET-ME, turu bitir.
