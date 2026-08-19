/* wspolne.mjs — ścieżki i drobiazgi dzielone przez narzędzia łańcucha HTML. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wczytajPlik } from './zrodlo.mjs';

export const KORZEN = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const KATALOG_ZRODEL = path.join(KORZEN, 'przepisy');
export const KATALOG_DANYCH = path.join(KORZEN, 'dane');

/* Kolekcja `przepisy` w site `6983617613052dc9fe624303`. */
export const KOLEKCJA = '6a574b13929618407b161661';
export const SITE = '6983617613052dc9fe624303';

/* Baza adresów GitHub Pages. Ta sama, z której idą oba artefakty embedu
   (DEPLOY.md) — nie zakładamy drugiego hostingu dla danych, bo drugi hosting
   to drugi tryb awarii i drugi cache do zrozumienia.

   ZMIENIONA 2026-08-19 na host organizacji. Powód migracji: w adresie widocznym
   w produkcyjnym HTML stało imię i nazwisko operatora. Przy migracji przestawiono
   `parser-url` w CMS i tagi `<script>` w szablonie, ale TĘ STAŁĄ pominięto —
   wykryło to dopiero porównanie żywego CMS-u z repo (`porownaj-cms-z-repo.mjs`),
   które pokazało 16 różnic o jednej przyczynie. Rozjazd był cichy i groźny
   w jedną stronę: sam nic nie psuł, ale pierwsza regeneracja wepchnęłaby stary
   adres z powrotem do szesnastu rekordów — już po wygaszeniu tamtego hosta. */
export const BAZA_PAGES = 'https://miesna-paczka.github.io/tryb-gotowania';

/* Odpowiedź MCP bywa opakowana na kilka sposobów zależnie od tego, czym ją
   zapisano. Rozpakowujemy tolerancyjnie, bo to wejście operatorskie. */
export function wczytajZrzut(sciezka) {
  const j = JSON.parse(fs.readFileSync(sciezka, 'utf8'));
  const kandydaci = [
    j,
    j?.result,
    Array.isArray(j) ? j[0]?.result : null,
    Array.isArray(j) ? j[0] : null
  ];
  for (const k of kandydaci) {
    if (Array.isArray(k?.items)) return k.items;
    if (Array.isArray(k) && k[0]?.fieldData) return k;
  }
  throw new Error(`${sciezka}: nie znalazłem tablicy items w zrzucie`);
}

/* JEDYNE miejsce, które wie, jak nazywają się pliki źródłowe i skąd bierze się
   identyfikator itemu. Wcześniej wiedział o tym każdy skrypt z osobna — nazwa
   pliku BYŁA itemId — i każdy musiałby zostać poprawiony przy zmianie konwencji.

   Zwraca `{ slug, plik, item, zrodlo }`, posortowane po slugu. `item` bywa
   `null`: to przepis, który jeszcze nie ma miejsca w kolekcji.

   Sprawdza przy okazji zgodność nazwy pliku ze slugiem w `[meta]`. To nie jest
   pedanteria: rozjazd tych dwóch znaczy, że ktoś zmienił slug i nie przemianował
   pliku, więc CMS dostałby nowy adres strony, a ładunek zostałby pod starym. */
export function sprawdzNazwePliku(nazwaPliku, slugZMeta) {
  const slugPliku = nazwaPliku.replace(/\.txt$/, '');
  if (slugPliku !== slugZMeta) {
    throw new Error(`przepisy/${nazwaPliku}: nazwa pliku „${slugPliku}" nie zgadza się ze slugiem ` +
      `„${slugZMeta}" w [meta] — przemianuj plik albo popraw slug`);
  }
}

export function zrodla() {
  if (!fs.existsSync(KATALOG_ZRODEL)) return [];
  return fs.readdirSync(KATALOG_ZRODEL)
    .filter((f) => f.endsWith('.txt')).sort()
    .map((f) => {
      const plik = path.join(KATALOG_ZRODEL, f);
      const zrodlo = wczytajPlik(plik);
      const slugPliku = f.slice(0, -4);
      sprawdzNazwePliku(f, zrodlo.meta.slug);
      return { slug: slugPliku, plik, item: zrodlo.meta.item || null, zrodlo };
    });
}
