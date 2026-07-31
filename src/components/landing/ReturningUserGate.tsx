// Anahtar direktifsiz modülden gelir: "use client" taşıyan visited-flag.ts'ten
// import edilseydi sunucuda `undefined` olurdu (bkz. visited-flag-key.ts).
import { VISITED_KEY } from "@/lib/visited-flag-key";

// T-054: dönen kullanıcıyı landing'i HİÇ görmeden /map'e yollar.
//
// Neden React effect değil de pre-paint inline script: bir useEffect gate'i
// mount'tan sonra çalışır, yani dönen kullanıcı her seferinde landing'in bir
// karesini görür. layout.tsx'teki tema script'i (dark flash'ı önleyen) aynı
// kalıbı zaten kullanıyor — bu onun eşi.
//
// `location.replace`: geçmişe kayıt bırakmaz, böylece /map'te geri tuşu
// landing'e düşüp yönlendirme döngüsü kurmaz.
//
// basePath notu: bugün production kök-göreli (NEXT_PUBLIC_BASE_PATH boş), ama
// withBase() makinesi duruyor. Inline script React ağacının dışında çalıştığı
// için withBase'i import edemez; prefix'i build zamanında enjekte ediyoruz.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// audit-routing.mjs ham navigasyonda çıplak "/..." literali arar; burada
// replace() + değişken prefix kullanılıyor, yani kural zaten sağlanıyor —
// niyet aynı: ham navigasyon her zaman basePath'i taşır.
const SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(
  VISITED_KEY
)})==="1"){location.replace(${JSON.stringify(BASE + "/map")})}}catch(e){}`;

export function ReturningUserGate() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
