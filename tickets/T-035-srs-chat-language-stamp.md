---
id: T-035
title: SRS kart arkası + chat geçmişi dil damgası (T-031 kapsam dışı kalanlar)
status: backlog
priority: p2
effort: S
confidence: medium
depends: []
created: 2026-07-22
---
T-031 kapanışında bilinçli kapsam dışı bırakılan son iki tr-sızıntısı
(Burak kararı: aynı sınıf, ayrı ticket):

1. **`srs_cards.back`**: native metin, dil damgası yok; dedupe
   `(profileId, itemType, front)`. tr'de kart biriktirip en'e geçen
   kullanıcı /review'da Türkçe arka yüz görür (`onConflictDoNothing`
   üzerine yazmaz). Kartları GİZLEMEK yanlış — SRS zamanlaması bozulur;
   çözüm gösterim/veri katmanında.
2. **`chat_messages.content`**: geçmiş hoca mesajları üretildiği dilde
   kalır.

Tasarım çatalı (implement'te karar, ikisi de meşru):
- **A. Şema damgası**: `srs_cards.lang` kolonu → SAVE_SCHEMA_VERSION
  7→8 (v7 bu sprintte yeni yandı; ikinci bump eski save'leri bir tur
  daha küstürür — maliyeti bil). Yanlış-dil kart arkası görüntülenirken
  translations cache üzerinden çevrilir (cache T-031'den beri
  native_language-anahtarlı), kart verisi bozulmaz.
- **B. Şemasız**: damga yok; review UI'da arka yüzü her zaman
  translations cache'ten geçir (aynı dilse cache hit/no-op garantisi
  için önce dil tespiti gerekir — CJK/latin ayrımı kaba ama tr↔en için
  yetersiz). B'nin tespit zayıflığı gerçek; A daha temiz, bump'a değer
  mi kararı implement anına.

Chat için öneri: geçmişe dokunma (konuşma kaydıdır); mesaj balonuna
üretim dili etiketi + yeni mesajların zaten doğru dilde aktığının
teyidi yeter. Silme/çevirme yok.

Doğrulama: tr kartlı profil → en'e geç → /review arka yüzler en
görünür (çeviri cache'ten, LLM çağrısı sadece ilk sefer); tr'ye dön →
orijinal metin; SRS due sayıları hiç değişmez; chat geçmişi bozulmadan
etiketli.
