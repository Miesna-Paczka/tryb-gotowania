/* suchy-bieg-kodu-qr.mjs — czy kod QR da się zeskanować z ekranu 96 px.
 *
 * POWSTAŁO Z USTERKI, KTÓRA STAŁA NA PRODUKCJI I NIKT JEJ NIE WIDZIAŁ.
 * Zmierzone 2026-09-17 na opublikowanej stronie przepisu: `div[data-mp-qr]`
 * renderuje się na desktopie pod nagłówkiem „gotuj z telefonem w ręku", a
 * `MP.przepis.rysujQR()` NIE JEST WOŁANE PRZEZ NIKOGO — `grep rysujQR` na
 * wyrenderowanym HTML dawał zero trafień. Slot stał pusty. Wywołanie dokłada
 * `mpKodQR 1.0.0`; ten przyrząd pilnuje drugiej połowy problemu, czyli tego,
 * czy kod, który się wreszcie narysuje, nadaje się do zeskanowania.
 *
 * CZEGO PILNUJE, W DWÓCH PYTANIACH:
 *
 * (1) Czy `adresQR()` nie odrósł o ogon. Do 2026-09-17 doklejał
 *     `?tryb=gotowanie` — parametr dla runtime'u overlaya, który zszedł
 *     z serwisu. Gdyby ktoś dokleił cokolwiek podobnego, adres rośnie,
 *     a kod przeskakuje wersję. Pytamy o to WYWOŁANIEM, nie grepem: grep na
 *     literał `'?tryb=gotowanie'` przeszedłby obok każdego innego parametru.
 *
 * (2) Czy któryś przepis nie wypycha kodu poza wersję, która mieści się
 *     czytelnie w slocie. Slot `.recipe-qr__code` ma 96×96 px z `overflow:hidden`
 *     (`--_dimensions---cards-c--qr-size`), a `QR_ROZMIAR` w parserze to 96.
 *     Przy `QR_CELA` = 4 i marginesie 8 bok viewBoxa to `4n + 16`, więc moduł
 *     na ekranie ma `96 / (4n + 16) * 4` px CSS. Komentarz przy `QR_ROZMIAR`
 *     mówi wprost, że ~2,1 px jest wartością GRANICZNĄ na wyświetlaczu 1×.
 *     Stąd próg: 41 modułów (v6) to ostatnia wersja, którą przepuszczamy.
 *
 * KONTROLA UJEMNA JEST CZĘŚCIĄ PRZEBIEGU, nie ozdobą. Przyrząd liczy moduły
 * także dla adresu Z dawnym parametrem i wymaga, żeby wynik był WIĘKSZY dla
 * przynajmniej jednego przepisu. Bez tego „wszystkie kody mieszczą się w v6"
 * byłoby zdaniem, które przechodzi także wtedy, gdy `modulyKodu` zwraca stałą.
 *
 * Liczbę modułów daje PRAWDZIWA biblioteka przez `MP.przepis._wewnetrzne.modulyKodu`,
 * a nie tabela pojemności przepisana tutaj — tabela byłaby drugą kopią wiedzy,
 * a jej rozjazd oznaczałby zieleń na kodzie, którego nie da się zeskanować.
 *
 * Użycie:  node narzedzia/suchy-bieg-kodu-qr.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parser } from '../odmiana-node.mjs';

const KORZEN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = parser();

/* Próg wzięty z geometrii slotu, nie z upodobania. 41 modułów → viewBox 180 →
   moduł 96/180*4 ≈ 2,13 px CSS. 45 modułów (v7) dałoby już ≈ 1,96 px. */
const MAX_MODULOW = 41;
const OGON_HISTORYCZNY = '?tryb=gotowanie';

let bledy = 0;
const zdanie = (ok, opis, szczegol) => {
  if (!ok) bledy++;
  console.log(`${ok ? '  ok ' : '  ✗  '} ${opis}${szczegol == null ? '' : `  → ${szczegol}`}`);
};

/* ── (1) adres bez ogona ──────────────────────────────────────────────────── */
/* Most podaje `location.pathname = '/'`, więc `adresQR()` zwraca sam origin —
   dokładnie to, czego potrzeba, żeby złapać DOKLEJENIE czegokolwiek. */
const origin = P.adresQR();
console.log('\nadres');
zdanie(origin.indexOf('?') === -1, 'adresQR() nie niesie zapytania', origin);
zdanie(origin.indexOf('#') === -1, 'adresQR() nie niesie kotwicy', origin);
zdanie(origin.startsWith('https://miesnapaczka.pl'),
  'adresQR() stoi na originie produkcyjnym (staging dałby kod do *.webflow.io)', origin);

/* ── (2) każdy przepis mieści się w progu ─────────────────────────────────── */
const slugi = fs.readdirSync(path.join(KORZEN, 'przepisy'))
  .filter((f) => f.endsWith('.txt'))
  .map((f) => f.slice(0, -4))
  .sort();

zdanie(slugi.length > 0, 'są źródła przepisów do zmierzenia', `${slugi.length} plików`);

const rozklad = new Map();
let najgorszy = null;
let choc_raz_krocej = false;

for (const slug of slugi) {
  const adres = `${origin}/przepisy/${slug}`;
  const n = P._wewnetrzne.modulyKodu(adres);
  rozklad.set(n, (rozklad.get(n) || 0) + 1);
  if (!najgorszy || n > najgorszy.n) najgorszy = { n, slug, dlugosc: adres.length };
  if (P._wewnetrzne.modulyKodu(adres + OGON_HISTORYCZNY) > n) choc_raz_krocej = true;
  if (n > MAX_MODULOW) {
    zdanie(false, `slug wypycha kod poza ${MAX_MODULOW} modułów: ${slug}`,
      `${n} modułów, adres ${adres.length} zn.`);
  }
}

console.log('\nrozkład modułów');
for (const n of [...rozklad.keys()].sort((a, b) => a - b)) {
  const px = (96 / (4 * n + 16)) * 4;
  console.log(`  ${String(n).padStart(2)} modułów  ${String(rozklad.get(n)).padStart(3)} przepisów` +
    `  moduł ≈ ${px.toFixed(2)} px CSS`);
}

console.log('\nprogi');
zdanie(najgorszy.n <= MAX_MODULOW,
  `najdłuższy adres mieści się w progu ${MAX_MODULOW} modułów`,
  `${najgorszy.slug} — ${najgorszy.dlugosc} zn., ${najgorszy.n} modułów`);

/* Kontrola ujemna: przyrząd musi UMIEĆ zobaczyć różnicę, którą mierzy. */
zdanie(choc_raz_krocej,
  'kontrola ujemna: dawny ogon `?tryb=gotowanie` podnosi liczbę modułów — ' +
  'czyli pomiar reaguje na długość adresu, a nie zwraca stałej');

console.log(bledy ? `\nSPADŁO: ${bledy}\n` : '\nwszystko przeszło\n');
process.exit(bledy ? 1 : 0);
