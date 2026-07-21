---
id: T-024
title: Save dosyasına job kuyruğu sızmasın (import edilen save token yakıyor)
status: backlog
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-22
---
Kök neden (2026-07-22 backlog session'ında bulundu): batch üretim ("tümünü
indir") ortasında save export alınırsa `generation_jobs` tablosundaki
`queued`/`running` satırlar snapshot'a gömülüyor. Save'i import eden her
session `recoverStaleJobs`'un sahipsiz-queued-iş evlat edinme adımına
(`src/lib/jobs.ts:76`) takılıyor ve kuyruğu kendiliğinden koşturmaya
başlıyor — kullanıcının haberi olmadan LLM token'ı yanıyor. Crash
recovery için doğru olan davranış, import edilmiş save için yanlış.

Not: canlı (statik) modda job tablosu kullanılmıyor — batch tarayıcı
belleğinde inline koşuyor, sekme kapanınca durur. Sızıntı yalnızca server
modu export'larından gelir.

Karar (Burak): bilgi save dosyasına hiç yazılmasın — temizlik export
tarafında.

İş:
1. **Export'ta temizlik** (`src/lib/save/export.ts`): `serialize()` sonrası
   buffer'ı ikinci bir better-sqlite3 bağlantısıyla aç (buffer'dan
   deserialize; gerekirse temp dosya üzerinden), `DELETE FROM
   generation_jobs WHERE status IN ('queued','running')`, yeniden
   serialize et. Canlı DB'ye DOKUNMA — süren batch ölmesin.
2. **Import'ta kemer** (`src/lib/save/import.ts`): tek UPDATE ile gelen
   dosyadaki queued/running işleri iptal işaretle. Vahşi doğada temizlik
   öncesi alınmış save'ler var; export fix'i onları kurtarmaz. Bedava
   sigorta.
3. **Alt karar (implement'te netleştir)**: kanji liste GET'indeki
   auto-fill kuyruğu, seed kapsamayan seviyelerde import edilmiş save'le de
   kendiliğinden LLM'e gidebiliyor. Vocab/grammar gibi user-triggered'a
   çekmek tutarlı olur; ama bilinçli bir özellik — kaldırmadan önce
   davranış değişikliğini not düş.

Doğrulama: batch ortasında export al → dosyayı sqlite3 ile aç,
generation_jobs'ta queued/running satır olmadığını gör; eski (kirli) bir
save'i import et → boot'ta hiçbir job'ın kendiliğinden koşmadığını logdan
doğrula.
