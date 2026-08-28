/* sprawdz-html-na-stronie.mjs — czy CMS niesie DZISIEJSZĄ treść ze źródła.
 *
 * `porownaj.mjs` bez zrzutu porównuje regenerację z ODCISKIEM, czyli z zamrożonym
 * pomiarem sprzed migracji. Gdy zaświeci, nie wiadomo jeszcze, która strona jest
 * stara: generator czy odcisk. To narzędzie rozstrzyga, bo pyta trzeciej strony —
 * opublikowanej strony, na którą Webflow wyrenderował zawartość pól.
 *
 * Bez tego pomiaru wymiana odcisku jest zgadywaniem. Z nim jest wnioskiem.
 *
 * Dwa pola porównujemy przez wycięcie bloku ze strony (mają własny znacznik
 * otwierający), trzy kartowe przez szukanie dosłownego wystąpienia — bo Webflow
 * wstawia je w kontenery, których kształtu nie chcemy tu zaszywać.
 *
 * DRUGA I TRZECIA GRUPA POWSTAŁY, GDY ŁAŃCUCH ICH JESZCZE NIE WYPYCHAŁ. Do 2026-08-24
 * `wypchnij-do-cms.mjs` zapisywał 11 pól i nie było wśród nich ani mikroskładni
 * odżywczej, ani trzech skalarów z `[meta]` — a wszystkie muszą stać w CMS, bo czyta je
 * szablon: embed odżywczy z `data-mp-odz-zrodlo-*`, tryb gotowania z `data-porcje-bazowe`
 * i `data-czas`. Utrzymywała je ręka. Od 2026-08-24 pisze je łańcuch (16 pól), więc ta
 * kontrola przestała być JEDYNĄ barierą — ale zostaje, i to z ważniejszego powodu niż
 * przedtem.
 *
 * Bo mierzy coś, czego nie mierzy nic innego: nie „czy zapis poszedł", tylko **czy to,
 * co dojechało na stronę, jest tym, co wypisuje dziś generator**. Odczyt zwrotny
 * w `wypchnij-do-cms.mjs` potwierdza zapis do CMS, `porownaj.mjs` porównuje regenerację
 * ze zrzutem — obie strony patrzą na CMS. Tutaj patrzymy na HTML PO renderze i PO
 * publikacji, czyli na ostatni odcinek, na którym nikt inny nie stoi.
 *
 * Cache-buster w adresie jest obowiązkowy z tego samego powodu, co w
 * `zmierz-jsonld-na-stagingu.mjs`: `cache: 'no-store'` nie rusza brzegu CDN.
 *
 * SKALA. Kolekcja ma iść w setki pozycji, więc pobieranie idzie pulą równoległą
 * (`--rownolegle`, domyślnie 8). Sekwencyjnie 300 przepisów to kilkanaście minut;
 * ósemką — nieco ponad minutę. Puli nie podkręcaj bez potrzeby: to jest ruch do
 * cudzego CDN-u, a jedyne, co zyskujesz, to sekundy.
 *
 * Wypisujemy WYŁĄCZNIE rozjazdy plus podsumowanie. Przy 300 pozycjach lista
 * zielonych wierszy jest szumem, w którym ginie ta jedna czerwona.
 *
 * DWA SPOSOBY, NA JAKIE TA KONTROLA MOGŁABY ŚWIECIĆ NA ZIELONO PRZY ZEPSUTYM ŚWIECIE
 * — oba zamknięte 2026-08-24, oba znalezione przez zapytanie „a co, jeśli nie ma czego
 * zmierzyć":
 *   1. ZERO POZYCJI. Pusta lista źródeł dawała „0 porównań · 0 rozjazdów" i `exit 0`.
 *      Dlatego liczba zmierzonych stron jest porównywana z OCZEKIWANĄ, a rozbieżność
 *      jest błędem — brak pomiaru to nie to samo, co pomiar bez zastrzeżeń.
 *   2. NIEUDANE POBRANIE. `HTTP 404` i błąd sieci wypisywały `✗`, ale nie zwiększały
 *      licznika rozjazdów, więc niedostępny staging dawał szesnaście czerwonych linii
 *      i `exit 0`. Dziś każde nieudane pobranie jest rozjazdem.
 *
 * Użycie:
 *   node narzedzia/sprawdz-html-na-stronie.mjs
 *   node narzedzia/sprawdz-html-na-stronie.mjs --baza https://…
 *   node narzedzia/sprawdz-html-na-stronie.mjs --rownolegle 4
 */
import fs from 'node:fs';
import path from 'node:path';
import { zbuduj } from '../lancuch-html/generuj-html.mjs';
import { KORZEN, zrodla } from '../lancuch-html/wspolne.mjs';

const argv = process.argv.slice(2);
const i = argv.indexOf('--baza');
const BAZA = i >= 0 ? argv[i + 1] : 'https://miesna-paczka-ea5c01.webflow.io';
const STEMPEL = Date.now().toString(36);
const j = argv.indexOf('--rownolegle');
const ROWNOLEGLE = Math.max(1, Math.min(16, j >= 0 ? Number(argv[j + 1]) || 8 : 8));

const LUSTRO = path.join(KORZEN, 'lancuch-html', 'pola-z-cms.json');
if (!fs.existsSync(LUSTRO)) throw new Error(`brak ${LUSTRO} — lustro pól CMS jest wejściem, nie opcją`);
const lustro = JSON.parse(fs.readFileSync(LUSTRO, 'utf8'));

const WZORY = {
  'skladniki-html': /<ul role="list">[\s\S]*?<\/ul>/,
  'kroki-html': /<ol role="list">[\s\S]*?<\/ol>/
};
const POLA = ['skladniki-html', 'kroki-html', 'wskazowki-html', 'zamienniki-html', 'przechowywanie-html'];

/* Mikroskładnia odżywcza: atrybut na stronie ↔ sekcja pliku źródłowego. */
const ODZYWCZE = [['data-mp-odz-zrodlo-100', 'wartosci-odzywcze'], ['data-mp-odz-zrodlo-porcja', 'wartosci-porcja']];
/* Skalary z `[meta]`: atrybut na stronie ↔ klucz meta. */
const SKALARY = [['data-porcje-bazowe', 'porcje-bazowe'], ['data-czas', 'czas-minuty'], ['data-mp-odz-zrodlo-waga', 'waga-porcji']];

const odEncji = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const zAtrybutu = (html, atr) => {
  const m = html.match(new RegExp(atr + '="([^"]*)"'));
  return m ? odEncji(m[1]).trim() : null;
};

const WSZYSTKIE = [...POLA, ...ODZYWCZE.map((o) => o[1]), ...SKALARY.map((o) => o[1])];
const zgodne = Object.fromEntries(WSZYSTKIE.map((p) => [p, 0]));
const rozjazd = Object.fromEntries(WSZYSTKIE.map((p) => [p, 0]));
let stron = 0;
let pobraniaNieudane = 0;

/* Jedna pozycja: pobranie + wszystkie porównania. Zwraca listę komunikatów,
   żeby wydruk z puli równoległej nie przeplatał się w połowie zdania. */
async function sprawdz(z) {
  const cms = lustro[z.item];
  if (!cms) return [`! ${z.slug}: itemu nie ma w pola-z-cms.json`];
  if (cms.isDraft) return [];

  const w = zbuduj(z.item, z.zrodlo);
  let html;
  try {
    const r = await fetch(`${BAZA}/przepisy/${cms.slug}?pomiar=${STEMPEL}`, { cache: 'no-store' });
    if (!r.ok) { pobraniaNieudane++; return [`✗ ${cms.slug}: HTTP ${r.status}`]; }
    html = await r.text();
  } catch (e) { pobraniaNieudane++; return [`✗ ${cms.slug}: sieć — ${e.message}`]; }
  stron++;

  const m = [];
  for (const pole of POLA) {
    const nasze = w.pola[pole];
    const ok = WZORY[pole]
      ? (html.match(WZORY[pole]) || [])[0] === nasze
      : nasze.length > 0 && html.includes(nasze);
    if (ok) zgodne[pole]++;
    else { rozjazd[pole]++; m.push(`✗ ${cms.slug} / ${pole}: strona ≠ regeneracja`); }
  }
  for (const [atr, sekcja] of ODZYWCZE) {
    const naStronie = zAtrybutu(html, atr);
    const wPliku = String(z.zrodlo.pola[sekcja]).trim();
    if (naStronie === null) { rozjazd[sekcja]++; m.push(`✗ ${cms.slug} / ${sekcja}: brak atrybutu ${atr} na stronie`); }
    else if (naStronie === wPliku) zgodne[sekcja]++;
    else {
      rozjazd[sekcja]++;
      m.push(`✗ ${cms.slug} / ${sekcja}\n    strona: ${naStronie.slice(0, 80)}\n    plik:   ${wPliku.slice(0, 80)}`);
    }
  }
  for (const [atr, klucz] of SKALARY) {
    const naStronie = zAtrybutu(html, atr);
    const wPliku = String(z.zrodlo.meta[klucz]).trim();
    if (naStronie === wPliku) zgodne[klucz]++;
    else { rozjazd[klucz]++; m.push(`✗ ${cms.slug} / ${klucz}: strona ${naStronie ?? '(brak atrybutu)'}, plik ${wPliku}`); }
  }
  return m;
}

/* Pula o stałej szerokości: N robotników zdejmuje pozycje ze wspólnej kolejki.
   Bez tego 300 pozycji naraz otworzyłoby 300 połączeń i część padłaby na timeout. */
const kolejka = zrodla().filter((z) => z.item);
let nastepny = 0, zrobione = 0;
await Promise.all(Array.from({ length: ROWNOLEGLE }, async () => {
  while (nastepny < kolejka.length) {
    const z = kolejka[nastepny++];
    for (const linia of await sprawdz(z)) console.log(linia);
    if (++zrobione % 50 === 0) console.log(`  … ${zrobione}/${kolejka.length}`);
  }
}));

console.log(`\nstron zmierzonych: ${stron}`);
console.log('pole                       zgodne / rozjazdy   kto zapisuje do CMS');
for (const p of WSZYSTKIE) {
  const kto = POLA.includes(p) ? 'łańcuch, pole pochodne' : 'łańcuch, wprost ze źródła';
  console.log(`  ${p.padEnd(25)} ${String(zgodne[p]).padStart(2)} / ${rozjazd[p]}       ${kto}`);
}
const suma = WSZYSTKIE.reduce((s, p) => s + rozjazd[p], 0);
console.log(`\nrazem porównań: ${stron * WSZYSTKIE.length} · rozjazdów: ${suma}`);

/* Bramka na sam POMIAR, nie na jego wynik. Bez niej „0 rozjazdów" znaczy raz
   „wszystko zgodne", a raz „nic nie sprawdziłem" — i nie da się ich odróżnić. */
const oczekiwane = kolejka.filter((z) => lustro[z.item] && !lustro[z.item].isDraft).length;
let bledyPomiaru = 0;
if (oczekiwane === 0) { bledyPomiaru++; console.log('✗ POMIAR: zero pozycji do zmierzenia — sprawdź pola-z-cms.json i przepisy/'); }
if (stron !== oczekiwane) {
  bledyPomiaru++;
  console.log(`✗ POMIAR: zmierzono ${stron} stron, a oczekiwano ${oczekiwane} — ${pobraniaNieudane} pobrań nieudanych`);
}
if (pobraniaNieudane) { bledyPomiaru++; console.log(`✗ POMIAR: ${pobraniaNieudane} nieudanych pobrań — wynik nie jest rozstrzygający`); }
process.exit(suma || bledyPomiaru ? 1 : 0);
