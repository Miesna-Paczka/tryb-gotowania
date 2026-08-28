#!/usr/bin/env node
/* przyjmij-slugi-z-cms.mjs — CMS → repo dla pól NATYWNIE WEBFLOWYCH (`slug`, `nazwa`).
 *
 * KIERUNEK PRAWDY NIE JEST JEDEN DLA CAŁEGO PLIKU ŹRÓDŁOWEGO, i to jest sedno:
 *
 *   · pola treściowe (`skladniki`, `kroki`, `wskazowka`, …) — REPO PROWADZI.
 *     `wypchnij-do-cms.mjs` je generuje i zapisuje do CMS.
 *   · `slug` i `nazwa` — CMS PROWADZI. To pola natywnie webflowe (`zrodlo.mjs`),
 *     a łańcuch wypychający ICH NIE ZAPISUJE: `PATCH` wysyła wyłącznie
 *     `{ fieldData }` złożone z pól `*-html`, wartości pochodnych i `parser-url`
 *     (`wypchnij-do-cms.mjs`, sekcja 5). `slug` w ładunku `--przez-mcp` jest
 *     ETYKIETĄ do logu, nie zapisem.
 *
 * TO NARZĘDZIE POWSTAŁO Z POMYŁKI I WARTO, ŻEBY O TYM MÓWIŁO. 2026-08-23
 * zgłosiłem „minę": skoro `wypchnij-do-cms.mjs` buduje ładunek z polem `slug`,
 * to najbliższe wypchnięcie przeniesie żywy adres. To była nieprawda — czytałem
 * BUDOWĘ ładunku, a nie WYWOŁANIE zapisu, a zapis tego pola nie wysyła. Nic nie
 * groziło żadnemu adresowi.
 *
 * Prawdziwa usterka była cichsza i realna: **repo wskazywało adres, którego nie ma**.
 * `chicken-nuggets.txt` niósł `slug: chicken-nuggets`, a strona żyje pod
 * `/przepisy/domowe-nuggetsy` (item opublikowany 2026-08-21). Adres zmieniono
 * w Webflow — Webflow zostawia po takiej zmianie przekierowanie — a repo nie miało
 * jak się o tym dowiedzieć. Każdy, kto zbudował URL z pliku, dostawał 301 albo 404,
 * a `porownaj.mjs` tego nie łapie, bo paruje po `item:`, nie po slugu.
 *
 * CO ROBI: dla każdego źródła z `item:` porównuje `slug` z plikiem i ze zrzutem
 * kolekcji. Rozjazd → przepisuje `slug:` w pliku NA WERSJĘ Z CMS, zmienia nazwę
 * pliku (kontrola „nazwa pliku niezgodna ze slugiem" tego pilnuje) i dopisuje
 * wiersz do `lancuch-html/przeniesienia.log`, żeby historia przeprowadzek adresów
 * została w repo, a nie w cudzej pamięci.
 *
 * `nazwa` jest RAPORTOWANA, nie przyjmowana. Powód: zredagowano
 * tytuły w repo (małą literą, D-53.1), więc rozjazd na `nazwa` jest tam dziś
 * ZAMIERZONY i przyjęcie go z CMS cofnęłoby tę pracę. Ale ponieważ łańcuch NIE
 * zapisuje `name`, ta redakcja nie dojedzie na stronę sama — i właśnie ten raport
 * jest miejscem, w którym to widać.
 *
 * KONTROLA PUSTKI JEST WBUDOWANA. „Zero rozjazdów" da się dostać na dwa sposoby:
 * bo ich nie ma, albo bo nie porównano niczego. Narzędzie odmawia werdyktu, gdy
 * zrzut jest pusty albo gdy ani jedno źródło nie sparowało się z itemem.
 *
 * Użycie:
 *   node lancuch-html/przyjmij-slugi-z-cms.mjs <zrzut-cms.json>            # SUCHY BIEG
 *   node lancuch-html/przyjmij-slugi-z-cms.mjs <zrzut-cms.json> --wykonaj
 * Kod wyjścia: 0 = zgodne, 1 = są rozjazdy (suchy bieg) albo błąd, 0 po `--wykonaj`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { KORZEN, wczytajZrzut, zrodla } from './wspolne.mjs';

const argv = process.argv.slice(2);
const zrzutSciezka = argv.find((a) => !a.startsWith('--'));
const wykonaj = argv.includes('--wykonaj');
const LOG = path.join(KORZEN, 'lancuch-html', 'przeniesienia.log');

if (!zrzutSciezka) {
  console.error('podaj zrzut kolekcji: node lancuch-html/przyjmij-slugi-z-cms.mjs <zrzut.json> [--wykonaj]');
  process.exit(1);
}

const items = new Map(wczytajZrzut(zrzutSciezka).map((it) => [it.id, it]));
const zrodlaLista = [...zrodla()];

/* --- kontrola pustki, PRZED jakimkolwiek werdyktem ------------------------- */
const sparowane = zrodlaLista.filter((z) => z.item && items.has(z.item));
if (!items.size) { console.error(`${zrzutSciezka}: zrzut nie ma itemów — nie ma czego porównać`); process.exit(1); }
if (!sparowane.length) {
  console.error(`ani jedno źródło nie sparowało się z itemem ze zrzutu (${items.size} itemów, ` +
                `${zrodlaLista.length} źródeł) — to nie jest „zero rozjazdów", tylko zero pomiarów`);
  process.exit(1);
}

const rozjazdy = [];
for (const { item: id, zrodlo, plik } of sparowane) {
  const wCms = items.get(id).fieldData.slug;
  const wPliku = zrodlo.meta.slug;
  if (wCms && wCms !== wPliku) rozjazdy.push({ id, plik, wPliku, wCms });
}

const nazwy = sparowane
  .map(({ item: id, zrodlo }) => ({ w: items.get(id).fieldData.name, p: zrodlo.meta.nazwa }))
  .filter((x) => x.w && x.w !== x.p);

console.log(`porównane: ${sparowane.length} źródeł ze ${items.size} itemami w zrzucie`);
if (nazwy.length) {
  console.log(`\nNAZWA — rozjazd na ${nazwy.length} z ${sparowane.length} (RAPORT, nie przyjmuję):`);
  for (const n of nazwy.slice(0, 3)) console.log(`  w pliku „${n.p}"  ·  w CMS „${n.w}"`);
  if (nazwy.length > 3) console.log(`  … i ${nazwy.length - 3} więcej`);
  console.log('  Łańcuch wypychający NIE zapisuje pola `name` — ta redakcja nie dojedzie sama.');
}
if (!rozjazdy.length) { console.log('slugi zgodne — repo i CMS wskazują te same adresy'); process.exit(0); }

console.log(`\nROZJAZD SLUGA: ${rozjazdy.length}`);
for (const r of rozjazdy) {
  console.log(`  ${path.relative(KORZEN, r.plik)}`);
  console.log(`      w pliku: ${r.wPliku}`);
  console.log(`      w CMS:   ${r.wCms}   ← adres żywy, ten wygrywa`);
}

if (!wykonaj) {
  console.log('\nSUCHY BIEG — nic nie zmieniam. Uruchom z `--wykonaj`, żeby przyjąć adresy z CMS.');
  console.log('WYPYCHANIE DO CMS Z TYM ROZJAZDEM PRZENIOSŁOBY ŻYWE ADRESY.');
  process.exit(1);
}

/* --- zapis ----------------------------------------------------------------- */
const znacznik = new Date().toISOString().slice(0, 10);
const wpisy = [];
for (const r of rozjazdy) {
  /* `zrodla()` zwraca `plik` jako ŚCIEŻKĘ BEZWZGLĘDNĄ — `path.join` z katalogiem
     źródeł skleiłby ją w nieistniejącą ścieżkę i zapis poszedłby obok. */
  const stara = r.plik;
  const tresc = fs.readFileSync(stara, 'utf8');
  const nowaTresc = tresc.replace(/^slug:[ \t]*.+$/m, `slug: ${r.wCms}`);
  if (nowaTresc === tresc) { console.error(`✗ ${r.plik}: nie znalazłem wiersza „slug:" — nie ruszam`); process.exit(1); }
  const nowyPlik = `${r.wCms}.txt`;
  const nowa = path.join(path.dirname(stara), nowyPlik);
  if (fs.existsSync(nowa)) { console.error(`✗ ${nowyPlik} już istnieje — nie nadpisuję`); process.exit(1); }
  fs.writeFileSync(nowa, nowaTresc);
  fs.unlinkSync(stara);
  wpisy.push(`${znacznik}\t${r.id}\t${r.wPliku}\t→\t${r.wCms}`);
  console.log(`✓ ${path.basename(stara)} → ${nowyPlik}  (slug ${r.wPliku} → ${r.wCms})`);
}
fs.appendFileSync(LOG, wpisy.join('\n') + '\n');
console.log(`\ndopisane do ${path.relative(KORZEN, LOG)}: ${wpisy.length}`);
console.log('URUCHOM TERAZ PONOWNIE BEZ `--wykonaj` — powinno wyjść „slugi zgodne".');
