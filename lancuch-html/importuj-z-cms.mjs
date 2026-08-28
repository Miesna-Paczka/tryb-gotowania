/* importuj-z-cms.mjs — zrzut kolekcji `przepisy` → pliki `przepisy/<slug>.txt`.
 *
 * Narzędzie JEDNORAZOWE z założenia, ale nie z konstrukcji: po migracji źródłem
 * jest repo i ten kierunek się odwraca (`wypchnij-do-cms.mjs`). Zostaje w drzewie,
 * bo jest też awaryjnym „odtwórz plik z CMS-u", gdyby plik zginął — czyli tym,
 * czym w sesji CMS-owej było `napraw-z-cms.mjs`.
 *
 * NADPISUJE istniejące pliki tylko z `--nadpisz`. Bez tej flagi pominie każdy
 * plik, który już jest — bo domyślnie to CMS jest tu kopią, a nie źródłem, i
 * cichy import zniósłby poprawki zrobione w repo.
 *
 * Użycie:
 *   node lancuch-html/importuj-z-cms.mjs zrzut.json [--nadpisz] [--tylko <itemId>]
 *
 * Zrzut: odpowiedź `data_cms_tool > list_collection_items` zapisana do pliku
 * (most MCP zrzuca duże odpowiedzi na dysk sam i podaje ścieżkę — patrz README).
 */
import fs from 'node:fs';
import path from 'node:path';
import { zapiszZrodlo, SEKCJE } from './zrodlo.mjs';
import { KATALOG_ZRODEL, wczytajZrzut } from './wspolne.mjs';

const argv = process.argv.slice(2);
const sciezkaZrzutu = argv.find((a) => !a.startsWith('--'));
const nadpisz = argv.includes('--nadpisz');
const tylko = argv.includes('--tylko') ? argv[argv.indexOf('--tylko') + 1] : null;

if (!sciezkaZrzutu) {
  console.error('użycie: node lancuch-html/importuj-z-cms.mjs <zrzut.json> [--nadpisz] [--tylko <itemId>]');
  process.exit(2);
}

const items = wczytajZrzut(sciezkaZrzutu);
fs.mkdirSync(KATALOG_ZRODEL, { recursive: true });

let zapisane = 0, pominiete = 0, pozaZakresem = 0;

for (const it of items) {
  const d = it.fieldData || {};
  if (tylko && it.id !== tylko) continue;

  /* Kryterium zakresu: przepis ma komplet siedmiu pól źródłowych. Dwa itemy
     kolekcji (`stek-z-rostbefu-…`, `pieczone-nuggetsy-przepis`) mają je puste
     — to nie są przepisy w tym sensie, tylko strony, które nigdy nie przeszły
     na mikroskładnię. Migracja ich nie dotyczy, a wpisanie im pustych sekcji
     udawałoby, że dotyczy. */
  const brakujace = SEKCJE.filter((s) => !d[s]);
  if (brakujace.length) {
    pozaZakresem++;
    console.log(`— poza zakresem: ${d.slug || it.id} (brak pól: ${brakujace.join(', ')})`);
    continue;
  }

  const plik = path.join(KATALOG_ZRODEL, `${d.slug}.txt`);
  if (fs.existsSync(plik) && !nadpisz) { pominiete++; continue; }

  const meta = {
    nazwa: d.name ?? '',
    slug: d.slug ?? '',
    'porcje-bazowe': d['porcje-bazowe'] ?? 0,
    /* W DZISIEJSZEJ kolekcji NIE MA ŻADNEGO z tych dwóch pól — zmierzone odczytem
       schematu 2026-08-24 17:15 (31 pól, ani `liczba-porcji`, ani `liczba-porcji-2`).
       Jednego dnia pole skasowano, założono ponownie pod slugiem z sufiksem (Webflow
       trzyma slug skasowanego pola jako zajęty; te same blizny noszą `kuchnia-2`,
       `meta-description-2`, `certyfikat-2`), a potem skasowano i tamto, bo nie miało
       odbiorcy. Oba klucze zostają tu WYŁĄCZNIE dla starszych zrzutów: import ma
       działać na zrzucie sprzed każdej z tych trzech zmian. Ze świeżego zrzutu wyjdzie
       więc pusty łańcuch — i tak ma być. Wtedy walidator odrzuci plik, a widełki
       trzeba dopisać ręcznie; cicha wartość zastępcza wyglądałaby na odzyskaną.
       Klucz w PLIKU ŹRÓDŁOWYM pozostaje `liczba-porcji` i nie znika razem z polem. */
    'liczba-porcji': d['liczba-porcji-2'] ?? d['liczba-porcji'] ?? '',
    'waga-porcji': d['waga-porcji'] ?? 0,
    'czas-minuty': d['czas-minuty'] ?? 0
  };
  const pola = Object.fromEntries(SEKCJE.map((s) => [s, d[s]]));

  fs.writeFileSync(plik, zapiszZrodlo({ meta, pola }));
  zapisane++;
  console.log(`✓ ${d.slug}.txt  ${it.id}`);
}

console.log(`\nzapisane: ${zapisane} · pominięte (już są, bez --nadpisz): ${pominiete} · poza zakresem: ${pozaZakresem}`);
