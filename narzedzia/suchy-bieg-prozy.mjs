/* suchy-bieg-prozy.mjs — czy reguła `D-57.4` („proza nie woła minutnika")
 * nadal UMIE SPAŚĆ, i czy któryś przepis ją łamie.
 *
 * PO CO OSOBNY BIEG, SKORO `kontrole.mjs` ma już fiksturę przy ładowaniu:
 * tamta pilnuje samego SŁOWNIKA. Ten bieg pilnuje CAŁEJ DROGI — słownika,
 * wpięcia w `kontrolujZrodlo`, zdejmowania klucza z linii dyrektywy i długości
 * serii. Fikstura przechodziłaby także wtedy, gdyby ktoś wypiął skan z
 * `kontrolujZrodlo` i zostawił sam słownik — czyli przy regule, która nie
 * ogląda już żadnego przepisu.
 *
 * Werdykty są cztery, nie dwa (dokumentacja zamknięta, katalog mutacji):
 *   ZABITA      — wstrzyknięte zdanie zostało zgłoszone; reguła działa
 *   PRZEŻYŁA    — wstrzyknięte zdanie przeszło; reguła jest dziurawa
 *   ZERO EFEKTU — zdanie czyste zostało zgłoszone; reguła łapie za szeroko
 *   URWANIE     — seria krótsza niż bazowa; skan przestał się wypowiadać
 *
 * Użycie:  node narzedzia/suchy-bieg-prozy.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kontrolujZrodlo } from '../lancuch-html/kontrole.mjs';
import { wczytajPlik } from '../lancuch-html/zrodlo.mjs';

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZRODLA = path.join(KORZEN, 'przepisy');
const POLA = ['kroki', 'wskazowka', 'co-mozesz-zmienic', 'przechowywanie'];
const MOJE = /proza woła/;

const nasze = (zrodlo) => kontrolujZrodlo(zrodlo).bledy.filter((b) => MOJE.test(b));

/* Długość serii jako metryka pierwszej kategorii: ile wierszy prozy w ogóle
   poszło pod skan. Jedna liczba dla wszystkich przebiegów = brak urwania. */
const dlugoscSerii = (z) => POLA.reduce((s, p) => s + String(z.pola[p] || '').split('\n').length, 0);

let padnietych = 0, wierszy = 0, plikow = 0;
const zgloszenia = [];
for (const f of fs.readdirSync(ZRODLA).filter((x) => x.endsWith('.txt')).sort()) {
  const z = wczytajPlik(path.join(ZRODLA, f));
  wierszy += dlugoscSerii(z);
  plikow++;
  for (const b of nasze(z)) { padnietych++; zgloszenia.push(`${f.replace('.txt', '')}: ${b}`); }
}

console.log(`przepisów: ${plikow} | wierszy prozy pod skanem: ${wierszy} | zgłoszeń: ${padnietych}`);
zgloszenia.forEach((g) => console.log('  ✗ ' + g));

/* Katalog mutacji. Każdy wpis ma NAZWANĄ własność do zepsucia. Wstrzykujemy do
   pliku, który jest czysty — gdyby był brudny, „zabita" znaczyłoby „coś padło",
   a nie „padło to, co wstrzyknąłem". */
const BAZA = wczytajPlik(path.join(ZRODLA, 'kurczak-teriyaki-przepis.txt'));
if (nasze(BAZA).length) {
  console.error('\nBŁĄD PRZYRZĄDU: plik bazowy mutacji sam łamie regułę — werdykty ' +
    'nie znaczyłyby tego, co mówią. Wybierz inny plik albo napraw przepis.');
  process.exit(2);
}

const KATALOG = [
  { nazwa: 'przyrząd nazwany wprost', zdanie: 'Odpal minutnik od nowa.', ma: true },
  { nazwa: 'sygnał przyrządu', zdanie: 'Po sygnale zdejmij z ognia.', ma: true },
  { nazwa: 'trwające odliczanie', zdanie: 'Jeśli po odliczeniu jest różowy, smaż dalej.', ma: true },
  { nazwa: 'połowa odliczania', zdanie: 'Zamieszaj raz w połowie odliczania.', ma: true },
  { nazwa: 'odmiana przyrządu', zdanie: 'Smaż partiami, z minutnikiem od nowa.', ma: true },
  /* Kontrole zera. Bez nich słownik `/./` przeszedłby cały katalog powyżej
     i zablokował redakcję na każdym zdaniu. */
  { nazwa: 'ZERO: instrukcja z czasem', zdanie: 'Odcedź je równo po trzech minutach.', ma: false },
  { nazwa: 'ZERO: liczenie osobno', zdanie: 'Smaż w dwóch partiach, licząc czas dla każdej osobno.', ma: false },
  { nazwa: 'ZERO: tryb imperatywny', zdanie: 'Odlicz pięć minut i przekrój największą sztukę.', ma: false },
  /* Kontrola składni: `minutnik:` jako DYREKTYWA ma przechodzić — inaczej każdy
     krok z minutnikiem byłby błędem i reguła nie dałaby się utrzymać. */
  { nazwa: 'ZERO: dyrektywa minutnik:', zdanie: 'minutnik: 5:00 kurczak', ma: false }
];

console.log('\nmutacje:');
let zle = 0;
for (const { nazwa, zdanie, ma } of KATALOG) {
  const kopia = { ...BAZA, pola: { ...BAZA.pola, kroki: BAZA.pola.kroki + '\n' + zdanie } };
  const seria = dlugoscSerii(kopia) - 1;          // +1 wiersz, który sami dodaliśmy
  const n = nasze(kopia).length;
  let werdykt;
  if (seria !== dlugoscSerii(BAZA)) werdykt = 'URWANIE';
  else if (ma) werdykt = n > 0 ? 'ZABITA' : 'PRZEŻYŁA';
  else werdykt = n === 0 ? 'ZABITA' : 'ZERO EFEKTU';
  if (werdykt !== 'ZABITA') zle++;
  console.log(`  ${werdykt.padEnd(11)} · ${nazwa.padEnd(28)} → ${n} zgłoszeń`);
}

const ok = padnietych === 0 && zle === 0;
console.log(`\n${ok ? 'OK' : 'ŹLE'}: ${padnietych} zgłoszeń w przepisach, ${zle} mutacji nie zabitych`);
process.exit(ok ? 0 : 1);
