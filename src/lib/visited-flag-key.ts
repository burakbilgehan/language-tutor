// T-054: bayrak anahtarı, DİREKTİFSİZ modülde — bilerek.
//
// `visited-flag.ts` "use client" taşıyor. Bir server component ondan sabit
// import ettiğinde Next sabiti değil bir CLIENT REFERENCE veriyor: değer
// sunucuda render anında `undefined` oluyor. ReturningUserGate tam olarak
// buna düştü — üretilen inline script `localStorage.getItem(undefined)`
// haline geldi ve kapı sessizce ölü doğdu (out/index.html'de yakalandı).
//
// Anahtar bu yüzden burada duruyor: hem server component (inline script'i
// string olarak kurar) hem client modülü aynı literali güvenle import etsin.
// Buraya "use client" EKLEME.
export const VISITED_KEY = "okumo:hasProfile";
