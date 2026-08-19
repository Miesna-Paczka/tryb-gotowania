/* zrodlo.mjs — format pliku `przepisy/<itemId>.txt` i jego czytanie/zapisywanie.
 *
 * PO CO TEN FORMAT ISTNIEJE. Mikroskładnia przepisu używa PUSTEJ LINII jako
 * separatora bloków — kroków w `kroki`, kafelków w `wskazowka`,
 * `co-mozesz-zmienic` i `przechowywanie`. Pola źródłowe w Webflow są typu
 * PlainText, a edytor Webflow puste linie KASUJE `[V 2026-08-19]`. Skutek
 * zastany tego dnia: w dwóch przepisach `kroki` straciły wszystkie separatory
 * i regeneracja dała jeden `<li>` z widocznym „== odcedź fasolę" w treści dla
 * czytelnika; w pięciu przepisach `co-mozesz-zmienic` zlało kafelki i klucz
 * `#kolendra` wyciekł na stronę. Nikt tego nie zgłosił — wyszło przypadkiem.
 * W pliku tekstowym każde z tych uszkodzeń jest jednolinijkowym diffem.
 *
 * DLACZEGO JEDEN PLIK NA PRZEPIS, A NIE SIEDEM. Redakcja pisze przepis, nie
 * pola. Rozbicie na pliki-pola robiłoby z jednej zmiany siedem miejsc do
 * otwarcia i pozwalało zapisać połowę przepisu.
 *
 * DLACZEGO NAGŁÓWEK `[nazwa-pola]`, A NIE YAML/TOML/JSON. Trzy powody, wszystkie
 * o cenie pomyłki:
 *   1. Zawartość pól jest surowym tekstem z pustymi liniami, cudzysłowami,
 *      dwukropkami i `#`. Każdy format z cytowaniem wymagałby ucieczek —
 *      czyli wprowadzałby drugą składnię DO ŚRODKA tekstu, który redakcja pisze.
 *      Tu tekst leży dosłownie, bajt w bajt tak, jak trafi do CMS-u.
 *   2. Nazwa sekcji JEST slugiem pola w Webflow. Nie ma tabeli mapowania,
 *      więc nie ma czego rozjechać.
 *   3. Wiersz `[cokolwiek]` samotny w linii nie występuje w żadnym z 16 zastanych
 *      przepisów `[V 2026-08-19]`, a walidator sprawdza to przy każdym przebiegu
 *      i mówi wprost, gdy ktoś taki wiersz napisze.
 *
 * Format:
 *
 *     [meta]
 *     nazwa: Kurczak teriyaki
 *     slug: kurczak-teriyaki-przepis
 *     porcje-bazowe: 2
 *     liczba-porcji: 2 porcje
 *     waga-porcji: 225
 *     czas-minuty: 30
 *
 *     [skladniki]
 *     #kurczak   300 g piersi z kurczaka   @filet-z-piersi-kurczaka
 *     ...
 *
 * Puste linie NA POCZĄTKU i NA KOŃCU sekcji są zdejmowane, wewnętrzne zostają
 * nietknięte. Wolno to zrobić, bo w CMS żadne z 112 pól nie zaczyna się ani nie
 * kończy białym znakiem `[V 2026-08-19]`, a puste linie wewnątrz są nośnikiem
 * znaczenia. Dzięki temu plik da się rozstrzelić wizualnie bez zmiany wyniku.
 */
import fs from 'node:fs';

/* Sekcje treściowe — nazwa = slug pola w kolekcji `przepisy`. Kolejność jest
   kolejnością zapisu i kolejnością czytania przepisu przez człowieka. */
export const SEKCJE = [
  'skladniki', 'kroki', 'wskazowka', 'co-mozesz-zmienic',
  'przechowywanie', 'wartosci-odzywcze', 'wartosci-porcja'
];

/* Klucze `[meta]`. `nazwa` i `slug` są LUSTREM pól natywnie webflowych — plik
   ich nie posiada i nie wypycha do CMS-u, ma je po to, żeby dało się otworzyć
   `6a57649e2c911147dc2602d9.txt` i wiedzieć, co się otworzyło. `porownaj.mjs`
   zgłasza rozjazd; źródłem prawdy jest wtedy CMS.

   `liczba-porcji` SIEDZI TU JAKO ŹRÓDŁO, a nie jako pole pochodne, wbrew
   handoffowi §4 — i to jest pomiar, nie preferencja. Handoff zakładał, że da się
   je wyliczyć z `porcje-bazowe` + odmiana. Nie da się: `[V 2026-08-19]` przy
   `porcje-bazowe: 3` CMS ma raz „3 porcje" (chili), raz „2–3 porcje" (udziec
   z indyka), a przy `4` raz „4 porcje" (pierś), raz „3–4 porcje" (wędlina).
   Widełki niosą informację redakcyjną, której w liczbie bazowej nie ma —
   5 z 16 przepisów `[V]`. Generator sprawdza tylko, czy `porcje-bazowe` mieści
   się w tym, co napisano, i ostrzega, gdy nie. */
export const KLUCZE_META = [
  'nazwa', 'slug', 'porcje-bazowe', 'liczba-porcji', 'waga-porcji', 'czas-minuty', 'item'
];

/* `item` JEST OPCJONALNY I TO JEST CAŁY SENS TEJ ZMIANY (2026-08-19).

   Do dziś identyfikator itemu w Webflow był NAZWĄ PLIKU (`przepisy/<itemId>.txt`),
   przez co przepis nie mógł powstać, zanim nie powstał item w CMS. Redakcyjny
   przebieg jest odwrotny: najpierw piszemy przepis, potem zakładamy mu miejsce
   w kolekcji. Plik nazywa się więc slugiem, a `item` dochodzi w chwili, gdy item
   naprawdę istnieje.

   Konsekwencja jest zamierzona: źródło bez `item` przechodzi walidację, ale NIE
   dostaje ładunku i NIE idzie do CMS-u — bo nie ma dokąd. Generator mówi o tym
   wprost zamiast milczeć. */
const META_OPCJONALNE = ['item'];

const META_LICZBOWE = ['porcje-bazowe', 'waga-porcji', 'czas-minuty'];

/* Identyfikator Webflow to 24 znaki hex. Sprawdzamy kształt, bo literówka w nim
   nie objawia się nigdzie poza 404 na produkcji. */
const RE_ITEM = /^[0-9a-f]{24}$/;

const NAGLOWEK = /^\[([a-z0-9-]+)\]$/;

class BladZrodla extends Error {
  constructor(plik, wiersz, komunikat) {
    super(`${plik}:${wiersz}: ${komunikat}`);
    this.plik = plik; this.wiersz = wiersz; this.komunikat = komunikat;
  }
}

/* Tekst → { meta, pola }. Rzuca `BladZrodla` ze WSKAZANIEM WIERSZA: plik jest
   pisany ręcznie, więc komunikat bez numeru wiersza kosztowałby szukanie. */
export function czytajZrodlo(tekst, plik = '<pamięć>') {
  if (tekst.includes('\r')) {
    throw new BladZrodla(plik, 1, 'plik ma końce linii CRLF — zapisz go z LF; ' +
      'CR wjechałby do PlainText w CMS i nie byłoby go widać nigdzie poza diffem');
  }
  const linie = tekst.split('\n');
  const sekcje = new Map();
  let biezaca = null, odWiersza = 0;

  const domknij = () => {
    if (!biezaca) return;
    sekcje.set(biezaca, { linie: przytnij(sekcje.get(biezaca).linie), odWiersza });
  };

  for (let i = 0; i < linie.length; i++) {
    const m = NAGLOWEK.exec(linie[i]);
    if (m) {
      domknij();
      biezaca = m[1];
      odWiersza = i + 2;
      if (sekcje.has(biezaca)) {
        throw new BladZrodla(plik, i + 1, `sekcja [${biezaca}] występuje drugi raz`);
      }
      if (biezaca !== 'meta' && !SEKCJE.includes(biezaca)) {
        throw new BladZrodla(plik, i + 1, `nieznana sekcja [${biezaca}]; ` +
          `dozwolone: [meta], ${SEKCJE.map((s) => `[${s}]`).join(', ')}`);
      }
      sekcje.set(biezaca, { linie: [] });
      continue;
    }
    if (!biezaca) {
      if (linie[i].trim() !== '') {
        throw new BladZrodla(plik, i + 1, 'tekst przed pierwszym nagłówkiem sekcji');
      }
      continue;
    }
    sekcje.get(biezaca).linie.push(linie[i]);
  }
  domknij();

  if (!sekcje.has('meta')) throw new BladZrodla(plik, 1, 'brak sekcji [meta]');
  const meta = czytajMeta(sekcje.get('meta'), plik);

  const pola = {};
  for (const s of SEKCJE) {
    if (!sekcje.has(s)) throw new BladZrodla(plik, 1, `brak sekcji [${s}]`);
    pola[s] = sekcje.get(s).linie.join('\n');
  }
  return { meta, pola, wierszSekcji: Object.fromEntries([...sekcje].map(([k, v]) => [k, v.odWiersza])) };
}

function przytnij(linie) {
  let a = 0, b = linie.length;
  while (a < b && linie[a].trim() === '') a++;
  while (b > a && linie[b - 1].trim() === '') b--;
  return linie.slice(a, b);
}

function czytajMeta(blok, plik) {
  const meta = {};
  blok.linie.forEach((linia, idx) => {
    if (linia.trim() === '') return;
    const m = /^([a-z0-9-]+):[ \t]*(.*)$/.exec(linia);
    if (!m) throw new BladZrodla(plik, blok.odWiersza + idx, `[meta]: wiersz nie jest „klucz: wartość" — ${JSON.stringify(linia)}`);
    const [, k, v] = m;
    if (!KLUCZE_META.includes(k)) {
      throw new BladZrodla(plik, blok.odWiersza + idx, `[meta]: nieznany klucz „${k}"; dozwolone: ${KLUCZE_META.join(', ')}`);
    }
    if (k in meta) throw new BladZrodla(plik, blok.odWiersza + idx, `[meta]: klucz „${k}" drugi raz`);
    if (k === 'item' && !RE_ITEM.test(v.trim())) {
      throw new BladZrodla(plik, blok.odWiersza + idx,
        `[meta]: „item" ma być 24-znakowym identyfikatorem Webflow, jest ${JSON.stringify(v)}`);
    }
    if (META_LICZBOWE.includes(k)) {
      if (!/^\d+$/.test(v.trim())) {
        throw new BladZrodla(plik, blok.odWiersza + idx, `[meta]: „${k}" ma być liczbą całkowitą, jest ${JSON.stringify(v)}`);
      }
      meta[k] = Number(v.trim());
    } else {
      meta[k] = v.trim();
    }
  });
  for (const k of KLUCZE_META) {
    if (META_OPCJONALNE.includes(k)) continue;
    if (!(k in meta)) throw new BladZrodla(plik, blok.odWiersza, `[meta]: brak klucza „${k}"`);
  }
  return meta;
}

/* { meta, pola } → tekst pliku. Jedyna droga zapisu — żeby układ pliku był
   funkcją danych, a nie tego, kto go ostatnio dotykał. */
export function zapiszZrodlo({ meta, pola }) {
  const czesci = ['[meta]'];
  for (const k of KLUCZE_META) if (meta[k] != null && meta[k] !== '') czesci.push(`${k}: ${meta[k]}`);
  for (const s of SEKCJE) {
    czesci.push('', `[${s}]`, pola[s]);
  }
  return czesci.join('\n') + '\n';
}

export const wczytajPlik = (sciezka) =>
  czytajZrodlo(fs.readFileSync(sciezka, 'utf8'), sciezka);

/* `wartosci-odzywcze` / `wartosci-porcja`: „klucz: wartość; klucz: wartość".
   Kolejność członów jest kolejnością z pola — jest to kolejność z etykiety
   produktu spożywczego i nie wolno jej sortować.

   Mieszka TUTAJ, a nie w generatorze, bo czytają to dwie strony: generator
   (buduje HTML) i kontrole (sprawdzają, czy zbudowany HTML da się przeczytać
   po zdjęciu znaczników). Druga kopia tej samej wiedzy rozeszłaby się. */
export function parsujWartosci(txt) {
  return String(txt).split(';').map((p) => p.trim()).filter(Boolean).map((p) => {
    const i = p.indexOf(':');
    if (i < 0) return { klucz: p, wartosc: '', blad: `„${p}" nie ma dwukropka` };
    return { klucz: p.slice(0, i).trim(), wartosc: p.slice(i + 1).trim() };
  });
}

export { BladZrodla };
