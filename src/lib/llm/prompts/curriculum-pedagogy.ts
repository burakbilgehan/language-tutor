import type { profiles } from "@/db/schema";
import { schemeFor } from "@/lib/curriculum/levels";
import { languageName, nativeLanguageName } from "@/lib/profile-options";

type Profile = typeof profiles.$inferSelect;

// T-079 stage 1: the META-PROMPT. Instead of hand-writing per-language
// guardrail blocks (which generalized badly: Dutch inherited CJK-shaped
// curricula with alphabet units and pronunciation-check nodes), we ask the
// deep tier to WRITE the pedagogical body of the curriculum prompt for one
// (target language, native language) pair. Code then wraps that body with the
// fixed data contract in `chapterPrompt`.
//
// The division of labour is load-bearing and stated inside the meta-prompt
// itself: the generated body owns PEDAGOGY ONLY. Everything structural (JSON
// shape, unit/node counts, xp ranges, output language) stays in the wrapper.
// If the body also emitted contract rules it would contradict the wrapper and
// produce intermittent schema drift, the worst possible failure mode here.

/**
 * Reference material handed to the meta-prompt: the guardrail knowledge that
 * was previously hardcoded per language. This is deliberately framed as
 * EXAMPLES OF THE KIND OF THINKING WANTED, not as rules to copy. For ja/zh it
 * carries forward the specifics we learned the hard way (counters, the full
 * kosoado system, kanji volume, measure words, tone notation) so quality does
 * not regress when those languages move onto this pipeline.
 */
const REFERENCE_MATERIAL = `Aşağıdakiler, BAŞKA dil çiftleri için yazılmış iyi pedagoji notlarından örneklerdir. Bunları kopyalama; hedef dil için AYNI DERİNLİKTE ve o dile gerçekten özgü notlar yaz.

Japonca örneği (bu dilin gerçek zorlukları):
- Sayaçlar (助数詞: 〜つ, 〜人, 〜本, 〜枚, 〜時...) seviyeye uygun kapsamda mutlaka işlenir; JLPT bunları yoğun sınar ve müfredatlar bunu sürekli atlar.
- İşaret sistemi bütün öğretilir: これ/それ/あれ tek başına yetmez; ここ/そこ/あそこ/どこ ve この/その/あの da kapsanmalı.
- Kanji ertelenmez: en temel kanjiler ilk ünitelerden itibaren kademeli tanıtılır ve sonraki ünitelerde doğal olarak kullanılır; seviyenin kanji setinin çekirdeği müfredat İÇİNDE öğretilir.
- Dilbilgisi iddiaları teknik olarak doğru olmalı (ör. い-sıfatı geçmişi 〜かった'dır, でした ile birleşmez).

Çince örneği:
- Ölçü sözcükleri (量词: 个, 本, 张, 只, 条, 杯...) seviyeye uygun kapsamda mutlaka işlenir; HSK bunları yoğun sınar.
- Her yeni kelime ve örnek pinyin + ton işaretiyle verilir; ton ayrımları (mā/má/mǎ/mà) YAZILI olarak vurgulanır.
- Hanzi ertelenmez; pinyin bir geçiş aracıdır, hedefin kendisi değil.
- 了'nın tamamlanma ve durum-değişimi kullanımları karıştırılmaz; 不/没 ayrımı doğru anlatılır.

Hollandaca örneği (ana dili Türkçe olan biri için):
- Her isim artikeliyle (de/het) birlikte öğretilir; de/het ayrımı Türkçede cins olmadığı için gerçek bir zorluktur ve seviyelere yayılarak düzenli işlenir.
- V2 kelime sırası, ayrılabilir fiiller ve "er" kullanımı Türkçe konuşan için sezgisel değildir; erken ve tekrar tekrar işlenir.
- Latin alfabesi zaten biliniyor: ALFABE ÜNİTESİ KURULMAZ. Dile özgü yazım özellikleri (ij, ui, çift sesliler) gerçek kelimeler üzerinden, en fazla tek bir düğümde işlenir.`;

export interface PedagogyPromptInput {
  profile: Profile;
}

/**
 * Builds the meta-prompt: asks the deep tier to write the pedagogical body of
 * this profile's curriculum prompt. Called once per profile (per language
 * pair); the result is persisted on `profiles.curriculum_pedagogy` and reused
 * by every chapter generation.
 */
export function curriculumPedagogyPrompt({ profile }: PedagogyPromptInput) {
  const lang = languageName(profile.targetLanguage);
  const native = nativeLanguageName(profile.nativeLanguage);
  const scheme = schemeFor(profile.targetLanguage);

  const levelText: Record<string, string> = {
    zero: "hiç bilmiyor, sıfırdan başlıyor",
    beginner: "çok az biliyor (birkaç kelime/selamlaşma)",
    elementary: "temel seviyede (basit cümleler kurabiliyor)",
    intermediate: "orta seviyede",
  };

  const system = `Sen bir uygulamalı dilbilimci ve müfredat metodologusun. Görevin ders üretmek DEĞİL; başka bir modelin müfredat üretirken kullanacağı PEDAGOJİ TALİMATINI yazmak. Belirli bir (hedef dil, ana dil) çifti için, o çifte gerçekten özgü olan zorlukları ve öğretim sırasını bilen bir uzman gibi düşün. Sadece istenen JSON'u döndür.`;

  const prompt = `Bir dil öğrenme uygulaması için müfredat üreten bir prompt hazırlıyoruz. Senden bu promptun PEDAGOJİ GÖVDESİNİ yazmanı istiyoruz.

DİL ÇİFTİ:
- Hedef dil: ${lang}
- Öğrencinin ana dili: ${native}
- Seviye şeması: ${scheme.name} (${scheme.levels.join(" → ")})

ÖĞRENCİ:
- Başlangıç seviyesi: ${levelText[profile.selfLevel] ?? profile.selfLevel}
- Haftalık ayırabileceği süre: ${profile.minutesPerWeek} dakika
- Hedefleri: ${profile.goals.join(", ")}
- İlgi alanları: ${profile.interests.join(", ")}
- Motivasyonu (kendi sözleriyle): "${profile.motivation}"

UYGULAMANIN GERÇEKLERİ (pedagoji bunlara uymak zorunda):
- Uygulama METİN tabanlıdır: dersler okuma, yazma, açıklama ve alıştırmadan oluşur.
- Şu an SES YOK, ancak yakında seslendirme (TTS) gelecek. Bu yüzden telaffuz KONUSU yasak değildir: telaffuz/ses bilgisi bir dersin veya ünitenin meşru parçası olabilir ve gerçek içerikle (ör. hangi harf birleşimi nasıl okunur, hangi sesler ana dilde yok) öğretilebilir.
- YASAK OLAN tek şey şudur: cevabı YAZIMDAN okunabilen sahte telaffuz SORULARI ("hangi kelimede 'r' sesi yok?", "bu harfin adı ne?"). Bunlar dil değil, harf ayıklama ölçer.
- Öğrenci ana dilini (${native}) okuyup yazabiliyor; hedef dil Latin alfabesi kullanıyorsa alfabeyi baştan öğretmeye gerek yoktur.

SENDEN İSTENEN:
"pedagogy" alanına, müfredat üretecek modele verilecek TALİMAT METNİNİ yaz. Bu metin şunları içermeli:
1. Bu hedef dilin, ÖZELLİKLE bu ana dili konuşan biri için gerçek zorlukları nelerdir (ana dilde karşılığı olmayan yapılar, yanlış dost olan benzerlikler, sözdizimi farkları). Ana dili görmezden gelme: aynı hedef dil, farklı ana dil için farklı bir müfredat gerektirir.
2. Erken öğretilmesi gerekenler ve neden; ertelenmesi gerekenler ve neden.
3. Bu dile özgü, atlanması sık görülen ama sınavlarda/gerçek kullanımda kritik olan konular.
4. Bu dil için hangi alıştırma/soru tipleri anlamlıdır, hangileri boştur (yazımdan okunabilen sorular gibi).
5. Yazı sistemi metin tabanlı bir uygulamada nasıl ele alınmalı (hedef dilin yazı sistemi ana dilinkinden farklıysa; değilse bu maddeyi kısa geç).
6. Öğrencinin ilgi alanları ve hedefleri temalara nasıl bağlanmalı.

BİÇİM VE SINIRLAR (çok önemli):
- Metni doğrudan müfredat üretecek modele HİTAP EDEN talimat kipinde yaz ("...öğret", "...erteleme", "...kurma"). Bana açıklama yapma, giriş/kapanış cümlesi ekleme.
- Madde işaretli, yoğun ve SOMUT olsun; genel geçer pedagoji lafı ("öğrenci merkezli olsun") yazma. Her madde bu dil çiftine özgü bir bilgi taşısın; hedef dilin gerçek örneklerini (kelime, ek, yapı) kullan.
- Metin ${native} dilinde olsun.
- SADECE pedagoji yaz. Şunları KESİNLİKLE YAZMA: JSON/şema talimatı, alan adları, ünite veya düğüm SAYISI, xp değerleri, "sadece JSON döndür" gibi ifadeler, çıktı dilinin ne olacağı. Bunların hepsi ayrı bir katmanda zaten var; senin yazdığın metin oraya gömülecek ve çelişki üretirse müfredat bozulur.
- Uzunluk: yaklaşık 250-450 kelime.

${REFERENCE_MATERIAL}

Sadece şemaya uygun JSON döndür: { "pedagogy": "..." }`;

  return { system, prompt };
}
