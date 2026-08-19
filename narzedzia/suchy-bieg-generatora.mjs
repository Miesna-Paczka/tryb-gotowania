/* suchy-bieg-generatora.mjs — czy bramka `lancuch-html/` UMIE zaświecić na czerwono.
 *
 * Bramka, która przechodzi na wszystkim, nie jest bramką, tylko dekoracją.
 * Ten plik uszkadza prawdziwe źródło dokładnie tak, jak uszkadza je edytor
 * Webflow — KASUJĄC PUSTE LINIE — i sprawdza, że kontrola to widzi. Wszystkie
 * przypadki 1–3 odtwarzają uszkodzenia zastane 2026-08-19 `[V]`, nie wymyślone:
 * `kroki` w chili i gulaszu, `co-mozesz-zmienic` w pięciu przepisach,
 * `wskazowka` w czterech.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-generatora.mjs
 * Kod wyjścia 0 = każdy uszkodzony przypadek został złapany.
 */
import path from 'node:path';
import { czytajZrodlo, zapiszZrodlo, wczytajPlik } from '../lancuch-html/zrodlo.mjs';
import { zbuduj } from '../lancuch-html/generuj-html.mjs';
import { KATALOG_ZRODEL, idZrodel } from '../lancuch-html/wspolne.mjs';

const WZORZEC = idZrodel()[0];
if (!WZORZEC) { console.error('brak plików w przepisy/ — nie ma na czym uszkadzać'); process.exit(2); }
const CALY = wczytajPlik(path.join(KATALOG_ZRODEL, `${WZORZEC}.txt`));

let zdane = 0, oblane = 0;

/* Uszkadza pole i oczekuje BŁĘDU zawierającego dany fragment komunikatu. */
function przypadek(nazwa, uszkodz, oczekiwanyFragment) {
  const zrodlo = { meta: { ...CALY.meta }, pola: { ...CALY.pola } };
  uszkodz(zrodlo);
  /* GWARANCJA, ŻE PRZYPADEK COKOLWIEK MIERZY. Bez niej „uszkodzenie", które nic
     nie zmieniło (bo wzorzec nie ma akurat takiego kształtu — np. pole
     `przechowywanie` z jednym kafelkiem nie ma pustych linii do skasowania),
     przechodzi jako zielone i wygląda jak dowód. Ten warunek złapał dokładnie
     taki przypadek przy pisaniu tego pliku. */
  if (JSON.stringify(zrodlo.pola) === JSON.stringify(CALY.pola)) {
    oblane++;
    console.log(`✗ ${nazwa}\n    uszkodzenie NIC NIE ZMIENIŁO we wzorcu — ten przypadek nic nie mierzy`);
    return;
  }
  let bledy;
  try {
    bledy = zbuduj(WZORZEC, zrodlo).bledy;
  } catch (e) {
    bledy = [`WYJĄTEK: ${e.message}`];
  }
  const trafione = bledy.some((b) => b.includes(oczekiwanyFragment));
  if (trafione) { zdane++; console.log(`✓ ${nazwa}`); }
  else {
    oblane++;
    console.log(`✗ ${nazwa}`);
    console.log(`    oczekiwałem błędu z „${oczekiwanyFragment}"`);
    console.log(bledy.length ? bledy.map((b) => `    dostałem: ${b}`).join('\n') : '    dostałem: ZERO BŁĘDÓW');
  }
}

/* Wariant dla błędów formatu pliku — te lecą wyjątkiem z `czytajZrodlo`,
   bo bez poprawnego pliku nie ma czego budować. */
function przypadekFormatu(nazwa, tekst, oczekiwanyFragment) {
  let komunikat = '(bez wyjątku)';
  try { czytajZrodlo(tekst, 'próba.txt'); }
  catch (e) { komunikat = e.message; }
  if (komunikat.includes(oczekiwanyFragment)) { zdane++; console.log(`✓ ${nazwa}`); }
  else {
    oblane++;
    console.log(`✗ ${nazwa}\n    oczekiwałem „${oczekiwanyFragment}", dostałem: ${komunikat}`);
  }
}

/* TAK WŁAŚNIE USZKADZA EDYTOR WEBFLOW — separator akapitów ZNIKA, a wiersze
   sklejają się w jeden. Nie jest to zamiana pustej linii na zwykłą: gdyby tak
   było, markery `==` zostałyby na początku wierszy i objaw z 2026-08-19 („8 i 9
   markerów W ŚRODKU linii") nie mógłby powstać. Liczby się zgadzają: chili ma
   9 kroków i 8 markerów wylądowało w środku, czyli wszystkie poza pierwszym. */
const sklejAkapity = (s) => s.replace(/\n[ \t]*\n+/g, ' ');

console.log(`wzorzec: ${WZORZEC} (${CALY.meta.slug})\n`);

// --- 1–3: dokładnie to, co robi edytor Webflow ---------------------------
przypadek('kroki bez pustych linii (chili, gulasz — 2026-08-19)',
  (z) => { z.pola.kroki = sklejAkapity(z.pola.kroki); },
  'markerów „==" stoi W ŚRODKU wiersza');

przypadek('co-mozesz-zmienic bez pustych linii (5 przepisów — 2026-08-19)',
  (z) => { z.pola['co-mozesz-zmienic'] = sklejAkapity(z.pola['co-mozesz-zmienic']); },
  '#klucz poza początkiem wiersza');

/* Pola bez metadanych (`wskazowka`, `przechowywanie`) nie mają czego liczyć —
   ani #kluczy, ani „krótko:". Sklejenie widać w nich WYŁĄCZNIE po tym, że pytanie
   następnego kafelka wylądowało w odpowiedzi poprzedniego. To jedyny detektor
   i dlatego jest błędem, a nie ostrzeżeniem. */
przypadek('wskazowka bez pustych linii (4 przepisy — 2026-08-19)',
  (z) => { z.pola.wskazowka = sklejAkapity(z.pola.wskazowka); },
  'znak zapytania W ODPOWIEDZI');

/* `przechowywanie` bywa jednokafelkowe (tak jest we wzorcu), więc samo sklejenie
   nie miałoby czego skleić. Dokładamy drugi kafelek, żeby przypadek mierzył to,
   co ma mierzyć, zamiast przechodzić z braku materiału. */
przypadek('przechowywanie bez pustych linii',
  (z) => {
    z.pola.przechowywanie = sklejAkapity(
      z.pola.przechowywanie + '\n\nA czy da się to zamrozić?\nDa się, do 3 mies.');
  },
  'znak zapytania W ODPOWIEDZI');

przypadek('kafelek z pytaniem, ale bez odpowiedzi',
  (z) => { z.pola.przechowywanie += '\n\nA jak to zamrozić?'; },
  'bez odpowiedzi');

// --- 4: wycieki metadanych do HTML-u -------------------------------------
przypadek('marker kroku wklejony w treść zamiast w osobny wiersz',
  (z) => { z.pola.kroki = z.pola.kroki.replace(/^czas:/m, 'x czas:'); },
  'znacznik „czas:" 1× nie na początku wiersza');

przypadek('składnik bez #klucza',
  (z) => { z.pola.skladniki = z.pola.skladniki.replace(/^#\S+\s+/m, ''); },
  'nie zaczyna się od #klucza');

przypadek('dwa składniki w jednym wierszu',
  (z) => { z.pola.skladniki = z.pola.skladniki.replace('\n', ' '); },
  'drugi #klucz w tym samym wierszu');

// --- 5: kontrole, które robi parser --------------------------------------
przypadek('krok odsyła do nieistniejącego składnika',
  (z) => { z.pola.kroki = z.pola.kroki.replace(/^skladniki: .*/m, 'skladniki: nie-ma-takiego'); },
  'nieznanego składnika');

przypadek('składnik nieużyty w żadnym kroku',
  (z) => { z.pola.skladniki += '\n#sierota   1 szczypta soli'; },
  'nie jest użyty w żadnym kroku');

przypadek('minutnik bez czasu MM:SS',
  (z) => { z.pola.kroki = z.pola.kroki.replace(/^== /m, 'minutnik: zaraz\n== '); },
  'minutnik');

// --- 6: pola wartości -----------------------------------------------------
przypadek('wartości odżywcze bez dwukropka w członie',
  (z) => { z.pola['wartosci-porcja'] = z.pola['wartosci-porcja'].replace(':', ' '); },
  'człon bez dwukropka');

przypadek('wartości rozbite na wiersze',
  (z) => { z.pola['wartosci-odzywcze'] = z.pola['wartosci-odzywcze'].replace('; ', ';\n'); },
  'ma złamanie wiersza');

// --- 7: format pliku ------------------------------------------------------
const caly = zapiszZrodlo(CALY);
przypadekFormatu('CRLF zamiast LF', caly.replace(/\n/g, '\r\n'), 'CRLF');
przypadekFormatu('nieznana sekcja', caly.replace('[kroki]', '[krokii]'), 'nieznana sekcja');
przypadekFormatu('brak sekcji', caly.replace(/\[przechowywanie\][\s\S]*?(?=\n\[)/, ''), 'brak sekcji');
przypadekFormatu('sekcja dwa razy', caly + '\n[kroki]\nnic', 'drugi raz');
przypadekFormatu('tekst przed pierwszym nagłówkiem', 'luźne zdanie\n' + caly, 'przed pierwszym nagłówkiem');
przypadekFormatu('meta: liczba, która nie jest liczbą',
  caly.replace(/^porcje-bazowe: \d+$/m, 'porcje-bazowe: dwie'), 'ma być liczbą');
przypadekFormatu('meta: nieznany klucz', caly.replace('[meta]', '[meta]\nkolor: zielony'), 'nieznany klucz');

// --- 8: kontrola pozytywna — czysty plik NIE świeci -----------------------
{
  const w = zbuduj(WZORZEC, CALY);
  if (!w.bledy.length) { zdane++; console.log('✓ nieuszkodzony wzorzec przechodzi bez błędu'); }
  else { oblane++; console.log(`✗ nieuszkodzony wzorzec zgłasza błędy: ${w.bledy.join(' | ')}`); }
}

/* Kontrola pozytywna nr 2, bez której cała reszta niczego nie dowodzi:
   czy plik na dysku jest nienaruszony po tym, jak przejechaliśmy po nim
   kilkunastoma uszkodzeniami. Wszystkie robimy na KOPII obiektu — ale kopia
   płytka jest łatwa do zepsucia przy dopisywaniu przypadków. */
{
  const ponownie = wczytajPlik(path.join(KATALOG_ZRODEL, `${WZORZEC}.txt`));
  const nietkniety = JSON.stringify(ponownie.pola) === JSON.stringify(CALY.pola);
  if (nietkniety) { zdane++; console.log('✓ plik źródłowy nietknięty po suchym biegu'); }
  else { oblane++; console.log('✗ SUCHY BIEG ZMIENIŁ PLIK ŹRÓDŁOWY — przypadek mutuje wspólny obiekt'); }
}

console.log(`\nzdane: ${zdane} · oblane: ${oblane}`);
process.exit(oblane ? 1 : 0);
