/* odmiana-node.mjs — most ESM do `przepis-parser.js` dla narzędzi budujących.
 *
 * ISTNIEJE PO TO, ŻEBY WIEDZA O ODMIANIE MIAŁA JEDNO MIEJSCE.
 * `generuj-html.mjs` (repo treści) renderuje listę składników przy porcjach
 * bazowych i musi wybrać formę pasującą do liczby: dla `3 goździk|…` poprawne
 * jest „3 goździki", czyli forma druga. Reguła wyboru (1 · 2–4 · 5+ · ułamek,
 * z wyjątkiem 12–14) żyje w `odmien()` w parserze. Przepisanie jej po tamtej
 * stronie zrobiłoby czwartą kopię wiedzy dzielonej — dokładnie tę klasę błędu,
 * którą `D-39.65` z parsera usunęło. Sesja treściowa odmówiła i miała rację
 * (zgłoszenie 2026-08-18, §2).
 *
 * Dlaczego most, a nie zwykły `import` z parsera: `przepis-parser.js` jest IIFE
 * dla przeglądarki i przypina API do `window`. Rozbijanie go na moduły ES byłoby
 * dużą zmianą w pliku, który jest w produkcji — most kosztuje dwadzieścia linii
 * i nie dotyka niczego, co działa.
 *
 * Dlaczego czyta ze ścieżki technicznej, a nie z kopii: decyzja operatora
 * 2026-08-18 — repo treści nie trzyma wykonywalnej kopii parsera, bo kopia,
 * która może się rozejść, rozejdzie się. Ten plik jest realizacją tej decyzji
 * dla generatora HTML, tak jak bramka jest dla walidacji.
 *
 * Użycie po stronie treści:
 *
 *   import { etykietaBazowa } from '../../tech/tryb-gotowania/odmiana-node.mjs';
 *   const tekst = etykietaBazowa('3 goździk|goździki|goździków|goździka');
 *   // → '3 goździki'
 *
 * UMOWA O ZBIORZE DZIELONYM (ta sama co dla `KLUCZE_KROKU`, rozszerzona
 * 2026-08-18 o składnię furtki): każda zmiana po jednej stronie idzie do drugiej
 * TEGO SAMEGO DNIA. Nierozpoznana składnia nie wywala się błędem, tylko po cichu
 * wycieka do treści — a objaw pojawia się u tego, kto składni nie zna.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KATALOG = path.dirname(fileURLToPath(import.meta.url));

/* Atrapa DOM-u wystarczająca, żeby parser się załadował. Nie udaje przeglądarki —
   udaje tyle, ile parser dotyka przy starcie. Ta sama konstrukcja co w suchych
   biegach; gdyby parser kiedyś zaczął przy starcie czegoś więcej wymagać,
   spadnie tutaj głośno, a nie w połowie generowania strony. */
function zaladujParser() {
  const pusty = {
    textContent: '', getAttribute: () => null, querySelector: () => null,
    querySelectorAll: () => [], setAttribute() {}, removeAttribute() {},
    appendChild: (x) => x, insertBefore: (x) => x, style: {}, children: []
  };
  const mkEl = () => Object.assign({}, pusty, { style: {}, classList: { add() {} } });
  const okno = {
    document: {
      title: '', querySelector: () => null, querySelectorAll: () => [],
      getElementById: () => null, createElement: mkEl,
      body: Object.assign({}, pusty, { appendChild: (x) => x, removeChild() {} }),
      documentElement: mkEl()
    },
    location: { search: '', pathname: '/' }
  };
  okno.window = okno;

  const zrodlo = fs.readFileSync(path.join(KATALOG, 'przepis-parser.js'), 'utf8');
  new Function('window', 'document', 'location', zrodlo)
    .call(okno, okno, okno.document, okno.location);

  if (!okno.MP || !okno.MP.przepis) {
    throw new Error('odmiana-node.mjs: przepis-parser.js nie wystawił MP.przepis — ' +
                    'sprawdź ścieżkę i to, czy plik nie jest zaślepką.');
  }
  return okno.MP.przepis;
}

const P = zaladujParser();

/* Treść wiersza składnika (BEZ `#klucza` i BEZ `@sluga`) → gotowy tekst przy
   porcjach bazowych. Zdejmuje klamrę, kreski i `=` przypięcia, i wybiera formę.
   Wiersz bez liczby („sól do smaku") wraca nietknięty. */
export const etykietaBazowa = (tresc) => P.etykietaBazowa(tresc);

/* Wąski helper: fraza (hasło z tabeli, `a|b|c|d` albo `{a|b|c|d}`) + liczba →
   właściwa forma. Używaj `etykietaBazowa`, jeśli masz cały wiersz — ta funkcja
   jest dla przypadków, w których liczbę znasz skądinąd. */
export const formaDlaLiczby = (fraza, n) => P.formaDlaLiczby(fraza, n);

/* Wystawione, żeby druga strona mogła zaasertować, że most żyje i widzi tabelę,
   zamiast dowiadywać się o rozjeździe z wyglądu strony. */
export const kolizjeOdmian = () => P.kolizjeOdmian();

/* `generuj-html.mjs` potrzebuje nie tylko odmiany, ale i CAŁEGO parsowania
   mikroskładni — składników, kroków i wpisów kartowych. Wystawiamy tu obiekt
   parsera zamiast pisać drugi loader w łańcuchu HTML: loader jest dokładnie tą
   wiedzą dzieloną, której ten plik pilnuje, a druga kopia atrapy DOM-u rozjechałaby
   się przy pierwszej zmianie w starcie parsera — po cichu i po jednej stronie.
   Ten eksport NIE poszerza kontraktu parsera: to, co wolno wołać, rozstrzyga
   `MP.przepis` i jego `_wewnetrzne` (nazwa mówi, na co się piszesz). */
export const parser = () => P;
