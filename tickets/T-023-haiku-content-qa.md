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

**todo (2026-07-31)**: Vocab 4991/4991 doldu, vocab ayağı koşulabilir.
Not: seed re-export QA'dan ÖNCE yapıldı (2026-07-31 ops kararı; kütüphane
boş kalmasın diye). QA temiz çıkarsa iş bitti; hata bulunursa fix + blast
yeniden üretim sonrası `npm run seed:vocab` tekrar koşulup commit edilir.

Session promptu (yeni opus session'a ver):

> zh vocab içerik QA'sı (T-023 vocab ayağı). Kaynak: `data/app.db` →
> `vocab_entries`, `target_language='zh' AND status='ready'` (4991 kayıt).
> `content` kolonu `{tr: VocabContent}` dil-anahtarlı
> (`src/lib/llm/lang-content.ts`); şema `VocabContentSchema`
> (`src/lib/llm/schemas.ts`).
>
> Rastgele 100 kelime örnekle (HSK seviyelerine dengeli dağıt). Her kelimede
> LLM içeriğini (content.tr) statik referans kolonlarıyla çapraz kontrol et:
> `word`, `reading` (ton işaretli pinyin), `meanings_en`, `classifiers`.
> Kontrol listesi:
> 1. `meanings_tr` ↔ `meanings_en` tutarlı mı (çeviri farkı OK; başka anlam
>    kesin hata).
> 2. `examples` bracket pinyin'i (`学生[xuésheng]`) doğru mu ve cümle hedef
>    kelimeyi gerçekten içeriyor mu; `translation_tr` cümleyi doğru mu
>    çeviriyor.
> 3. `classifier_note_tr`, `classifiers` kolonuyla çelişiyor mu.
> 4. `chars` karakter kırılımındaki anlamlar uydurma mı.
> 5. `collocations` gerçek kullanımlar mı, uydurma kalıp mı.
>
> Eşik yüksek: yalnız KESİN hatalıyı (yanlış anlam, yanlış pinyin, kelimeyi
> içermeyen örnek) `status='error'` yap ki blast yeniden üretsin; emin
> olmadığını "şüpheli" listesine yaz, UPDATE etme. UPDATE'lerden önce
> blast'ın koşmadığını doğrula.
>
> Rapor: kesin hata oranı + kategori dökümü + şüpheli listesi. Oran %5'i
> geçerse karar önerisi getir (sonnet'le yeniden üretim / örneklem büyütme /
> prompt sıkılaştırma) — karar Burak'ın, uygulamadan turu bitir. Temiz
> çıkarsa veya fix'ler bitince `npm run seed:vocab` + commit hatırlat.
