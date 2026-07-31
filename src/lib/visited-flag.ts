"use client";

// T-054: dönen kullanıcı için HIZLI sinyal.
//
// Statik modda "profilim var mı?" sorusunun tek gerçek kaynağı IndexedDB'deki
// sql.js image'ı — ama onu okumak ~645KB WASM fetch+compile, IndexedDB açılışı
// ve ddl.ts'teki self-heal replay'i demek. Landing (`/`) artık pazarlama
// yüzeyi; oraya düşen ziyaretçinin bu bedeli ödemesi için hiçbir sebep yok.
//
// Çözüm iki katmanlı: profil oluşturan her UI yolu buraya senkron bir
// localStorage bayrağı yazar; landing bayrağı boyama öncesi okur ve varsa
// doğrudan /map'e gider. IndexedDB tek gerçek kaynak olarak KALIR — bayrak
// sadece bir kestirme, yetki değil.
//
// Bilinen takas: verisi olup bayrağı olmayan kullanıcı (bayrak eklenmeden önce
// oluşmuş profiller, localStorage temizliği, farklı tarayıcı profili) landing'i
// bir kez görür. Landing'deki "kayıtlı ilerlemeni sürdür" linki o kullanıcının
// çıkış yolu: tıklayınca tam profileData() yolunu koşturur ve bayrağı geri
// doldurur. Bu yüzden yavaş yol MOUNT'ta değil, TIKLAMADA çalışır.
// Anahtarın tek kaynağı direktifsiz modül — server component'ler oradan
// import etmek ZORUNDA (buradan alınca client reference olur, bkz. dosya).
export { VISITED_KEY } from "./visited-flag-key";
import { VISITED_KEY as KEY } from "./visited-flag-key";

/** Profil oluşturan her UI yolundan çağrılır. Idempotent; asla throw etmez. */
export function markVisited(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // private mode / kota — bayrak sadece bir kestirme, kaybı işlevsel değil.
  }
}

/** Bayrağı temizler (save import öncesi / profil silme gibi yollar için). */
export function clearVisited(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // yut
  }
}

export function hasVisited(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
