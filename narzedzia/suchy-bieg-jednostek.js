/* suchy-bieg-jednostek.js — matryca KLAS JEDNOSTEK przez siedem liczb porcji.
 *
 * POWSTAŁO Z KONKRETNEJ LUKI, nie z chęci porządku. `suchy-bieg-porcji.js` bada
 * TRZY kolumny (1 / baza / 2× bazę) na ośmiu składnikach dobranych pod `D-39.50`.
 * Zmiany z 2026-08-18 (`D-39.65`…`D-39.69`) wprowadziły trzy klasy jednostek
 * zamiast dwóch i drabinę miar, których tamten zestaw NIE DOTYKA ani jednym
 * wierszem: nie ma tam garści, nie ma przedmiotu połówkowego, a jedyny zakres
 * stoi na jednostce niedzielnej. Zieleń tamtego biegu po tych zmianach nie niosła
 * informacji — przechodził identycznie przed i po, co sprawdzono `[V]`.
 *
 * Ten plik dokłada BRAKUJĄCE stany, po jednym wierszu na rozstrzygnięcie:
 *   · miara dzielna z ułamkiem      → „½ garści", nie „0,5 garści"          (§5a)
 *   · przedmiot połówkowy           → „½ cytryny", nie „0,3 cytryny"        (§5b)
 *   · przedmiot całkowity           → „1 jajko", nigdy „½ jajka"            (§5b)
 *   · słowo z partii I tabeli odmian→ „1 polędwica", nie „0,3 polędwica"    (§3–4)
 *   · awans w górę na dokładnej krotności → 3 łyżeczki ⇒ 1 łyżka            (§5c)
 *   · degradacja w dół na pełnej łyżeczce → ⅓ łyżki ⇒ 1 łyżeczka           (§5c)
 *   · zakres o ułamkowym dolnym końcu → „½–1 cytryny", nie „½–1 cytryna"    (D-39.69)
 *
 * Uruchomienie:  node narzedzia/suchy-bieg-jednostek.js
 * Kod wyjścia: 1, gdy którakolwiek asercja spadnie — nadaje się na bramkę.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const pusty = {
  textContent: '', getAttribute: () => null, querySelector: () => null,
  querySelectorAll: () => [], setAttribute() {}, removeAttribute() {},
  appendChild: (x) => x, insertBefore: (x) => x, style: {}, children: []
};
const mkEl = () => Object.assign({}, pusty, { style: {}, classList: { add() {} } });
globalThis.document = {
  title: 'suchy bieg jednostek', querySelector: () => null, querySelectorAll: () => [],
  getElementById: () => null, createElement: mkEl,
  body: Object.assign({}, pusty, { appendChild: (x) => x, removeChild() {} }),
  documentElement: mkEl()
};
globalThis.location = { search: '', pathname: '/suchy-bieg-jednostek' };

const zrodlo = fs.readFileSync(path.join(__dirname, '..', 'przepis-parser.js'), 'utf8');
new Function('window', zrodlo).call(globalThis, globalThis);
const P = globalThis.MP.przepis;
const parsujSkladniki = P._wewnetrzne.parsujSkladniki;

const BAZA = 4;
const KOLUMNY = [1, 2, 3, 4, 6, 8, 12];

const PRZYKLAD = [
  '#garsc 1 garść pietruszki',
  '#szczypta 1 szczypta soli',
  '#cytryna 1 cytryna',
  '#cebula 2 cebule',
  '#jajko 1 jajko',
  '#czosnek 1 ząbek czosnku',
  '#poledwica 300 g polędwicy wieprzowej',
  '#lisc 1 liść laurowy',
  '#gozdzik 2 goździki',
  '#cukier 1 łyżeczka cukru',
  '#oliwa 1 łyżka oliwy',
  '#zakres 2–3 cytryny',
  '#pomarancza 1 pomarańcza',
  '#dymka 1 dymka',
  /* furtka klamrowa — fraza wielowyrazowa z czterema formami całej frazy */
  '#czerwona 1 {czerwona cebula|czerwone cebule|czerwonych cebul|czerwonej cebuli}',
  '#pory 2 {mały por|małe pory|małych porów|małego pora} (lub 1 duży)',
  /* stara furtka bez klamry — musi działać dalej, jest w migrowanych przepisach */
  '#stara 3 goździk|goździki|goździków|goździka'
].join('\n');

const skladniki = parsujSkladniki(PRZYKLAD);
const model = { skladniki: skladniki, kroki: [], porcjeBazowe: BAZA };
const wg = {};
KOLUMNY.forEach((n) => {
  const w = P.naPorcje(model, n).skladniki;
  wg[n] = {};
  w.forEach((s) => { wg[n][s.key] = s.etykieta; });
});

const szer = Math.max(...KOLUMNY.flatMap((n) => Object.values(wg[n]).map((t) => t.length)), 10) + 2;
console.log('SUCHY BIEG JEDNOSTEK — baza ' + BAZA + '\n');
console.log(KOLUMNY.map((n) => String(n + ' p.').padEnd(szer)).join('|'));
console.log('-'.repeat(szer * KOLUMNY.length));
skladniki.forEach((s) => {
  console.log(KOLUMNY.map((n) => String(wg[n][s.key] || '').padEnd(szer)).join('|'));
});

/* ——— asercje ————————————————————————————————————————————————————————————
   Każda nazwana stanem, w którym ma spaść, a nie „czy działa". Wartość
   wyliczam ręcznie z definicji klasy, nie kopiuję z wyjścia — inaczej test
   zapisuje bieżące zachowanie zamiast wymagania. */
const spadki = [];
function rowne(kolumna, key, oczek, po_co) {
  const jest = wg[kolumna][key];
  if (jest !== oczek) spadki.push(po_co + '\n    ' + kolumna + ' porcji · #' + key +
    '\n    oczekiwano: „' + oczek + '"\n    jest:       „' + jest + '"');
}

// §5a — garść i szczypta są dzielne, więc MUSZĄ renderować się znakiem ułamka.
rowne(2, 'garsc', '½ garści pietruszki', '§5a · garść omija formatUlamek → „0,5 garści"');
rowne(2, 'szczypta', '½ szczypty soli', '§5a · szczypta omija formatUlamek → „0,5 szczypty"');
rowne(6, 'garsc', '1½ garści pietruszki', '§5a · garść przy krotności ułamkowej powyżej 1');

// §5b — połówkowe kwantyzują się do ½ w GÓRĘ, nie do dowolnego ułamka i nie do całości.
rowne(2, 'cytryna', '½ cytryny', '§5b · cytryna niepołówkowa → „1 cytryna" (nadmiar) albo „0,5 cytryny"');
rowne(3, 'cytryna', '1 cytryna', '§5b · 0,75 kwantyzuje się w GÓRĘ do 1, nie w dół do ½');
rowne(6, 'cebula', '3 cebule', '§5b · całość zostaje całością, gdy wynik jest całkowity');
rowne(2, 'cebula', '1 cebula', '§5b · 1,0 nie może wyjść jako „1 cebule"');
rowne(3, 'cebula', '1½ cebuli', '§5b · 1,5 → dopełniacz l. poj. przy ułamku');

// §5b — przedmiot całkowity NIE dostaje połówki, choćby matematyka o nią prosiła.
rowne(2, 'jajko', '1 jajko', '§5b · jajko wpadło do POŁÓWKOWE → „½ jajka"');
rowne(2, 'czosnek', '1 ząbek czosnku', '§5b · ząbek wpadł do POŁÓWKOWE → „½ ząbka"');
rowne(6, 'gozdzik', '3 goździki', '§4 · goździk poza tabelą → „3 goździk"');

// §3–4 — partia I tabeli odmian.
rowne(1, 'lisc', '1 liść laurowy', '§4 · „1 liść laurowe" — odmiana przy jednej sztuce');
rowne(12, 'lisc', '3 liście laurowy', '§4 · odmiana liścia przy krotności 3');

/* `D-39.71` · RODZINA MIĘSNA POZA TABELĄ. Główne mięso liczy się w gramach,
   więc „polędwica" po liczbie ma dostać OSTRZEŻENIE, a nie cichą odmianę.
   Ten wiersz sprawdza, że gramatura skaluje się normalnie mimo wyjęcia hasła. */
rowne(2, 'poledwica', '150 g polędwicy wieprzowej', '§3 · gramatura mięsa przestała się skalować');
rowne(8, 'poledwica', '600 g polędwicy wieprzowej', '§3 · gramatura w górę');

// §4 partii II — dwa hasła z pomiaru na przepisie #4.
rowne(2, 'pomarancza', '½ pomarańczy', 'partia II · pomarańcza poza tabelą → „0,5 pomarańczy"');
rowne(2, 'dymka', '½ dymki', 'partia II · dymka poza tabelą → „0,5 dymki"');
rowne(12, 'pomarancza', '3 pomarańcze', 'partia II · odmiana pomarańczy przy krotności 3');

/* `D-39.70` · FURTKA KLAMROWA. Fraza odmienia się w CAŁOŚCI, a klasę bierzemy
   z głowy frazy — inaczej „czerwona cebula" byłaby miarą i wyszłoby „0,5". */
rowne(4, 'czerwona', '1 czerwona cebula', 'D-39.70 · klamra nie została zdjęta albo fraza się nie odmienia');
rowne(2, 'czerwona', '½ czerwonej cebuli', 'D-39.70 · ułamek frazy → dopełniacz l. poj. całej frazy');
rowne(12, 'czerwona', '3 czerwone cebule', 'D-39.70 · odmiana frazy przy krotności 3');
rowne(8, 'pory', '4 małe pory (lub 1 duży)', 'D-39.70 · nazwa po klamrze zostaje nietknięta');
rowne(2, 'pory', '1 mały por (lub 1 duży)', 'D-39.70 · klasa z głowy frazy: „por" jest połówkowy, 1,0 to całość');

/* Stara furtka `|` bez klamry — działa dalej I dostaje poprawną klasę.
   Przed D-39.70 wpadała w gałąź „spoza tabeli" i dawała „0,75 goździka". */
rowne(12, 'stara', '9 goździków', 'D-39.70 · stara furtka przestała działać');
rowne(1, 'stara', '1 goździk', 'D-39.70 · stara furtka wpada w klasę „miara" → „0,75 goździka"');

// §5c — drabina. W GÓRĘ tylko na krotnościach ½ łyżki, w DÓŁ tylko na pełnych łyżeczkach.
rowne(4, 'cukier', '1 łyżeczka cukru', '§5c · drabina ruszyła przy porcjach BAZOWYCH (mnożnik 1)');
rowne(12, 'cukier', '1 łyżka cukru', '§5c · 3 łyżeczki nie awansowały do 1 łyżki');
rowne(8, 'cukier', '2 łyżeczki cukru', '§5c · 2 łyżeczki awansowały, choć 2/3 łyżki jest gorsze');
rowne(2, 'oliwa', '½ łyżki oliwy', '§5c · ½ łyżki zdegradowane — 1,5 łyżeczki NIE jest pełną łyżeczką');

/* Degradacja w dół ma osobny model, bo wymaga mnożnika ⅓, a ten nie wypada przy
   żadnej całkowitej liczbie porcji nad bazą 4. Tu baza wynosi 3, więc 1 porcja
   daje dokładnie ⅓ łyżki — jedyny przypadek, w którym degradacja jest bezstratna. */
const modelTrzy = { skladniki: parsujSkladniki('#oliwa 1 łyżka oliwy'), kroki: [], porcjeBazowe: 3 };
const trzyNaJeden = P.naPorcje(modelTrzy, 1).skladniki[0].etykieta;
const trzyNaDwa = P.naPorcje(modelTrzy, 2).skladniki[0].etykieta;
console.log('\ndegradacja (baza 3): 1 p. → „' + trzyNaJeden + '" · 2 p. → „' + trzyNaDwa + '"');
if (trzyNaJeden !== '1 łyżeczka oliwy') {
  spadki.push('§5c · ⅓ łyżki nie zdegradowało się do 1 łyżeczki\n    oczekiwano: „1 łyżeczka oliwy"\n    jest:       „' + trzyNaJeden + '"');
}
if (trzyNaDwa !== '2 łyżeczki oliwy') {
  spadki.push('§5c · ⅔ łyżki nie zdegradowało się do 2 łyżeczek\n    oczekiwano: „2 łyżeczki oliwy"\n    jest:       „' + trzyNaDwa + '"');
}

// D-39.69 — zakres o ułamkowym dolnym końcu bierze dopełniacz l. poj.
rowne(1, 'zakres', '½–1 cytryny', 'D-39.69 · „½–1 cytryna" — odmiana po górnym końcu kłamie o całości');
rowne(8, 'zakres', '4–6 cytryn', 'D-39.69 · zakres całkowity dalej odmienia się po górnym końcu');

/* ——— niezmienniki między tabelami ————————————————————————————————————————
   Asercje na przykładach nie wyłapią literówki w kluczu `POŁÓWKOWE`: słowo
   z błędem spada do klasy „sztuka" i wygląda identycznie jak przed dopisaniem.
   Te trzy sprawdzenia pytają o STRUKTURĘ, więc spadają dokładnie w tym stanie. */
const K = P._wewnetrzne.klasyJednostek();
Object.keys(K.POŁÓWKOWE).forEach((w) => {
  if (!K.ODMIANY[w]) spadki.push('niezmiennik · „' + w + '" jest w POŁÓWKOWE, ale nie ma go w ODMIANY — ' +
    'kwantyzacja do ½ nigdy się nie odezwie, bo bazaJednostki() zwróci null');
  if (K.DZIELNE[w]) spadki.push('niezmiennik · „' + w + '" jest naraz w DZIELNE i POŁÓWKOWE — ' +
    'kwantyzuj() rozstrzyga kolejnością gałęzi, czyli po cichu');
});
Object.keys(K.DZIELNE).forEach((w) => {
  if (!K.ODMIANY[w]) spadki.push('niezmiennik · „' + w + '" jest w DZIELNE, ale nie ma go w ODMIANY');
});

/* ——— ostrzeżenia ——————————————————————————————————————————————————————————
   Ostrzeżenie jest wyzwalaczem obiegu wzrostu tabeli, więc jego CISZA tam,
   gdzie powinno paść, jest usterką tej samej wagi co fałszywy alarm. */
const W = P._wewnetrzne;
function ostrzezenia(pole) {
  W.wyczyscBledy();
  W.parsujSkladniki(pole);
  return W.ostrzezeniaTeraz().join('\n');
}
function zawiera(pole, frag, po_co) {
  const o = ostrzezenia(pole);
  if (o.indexOf(frag) < 0) spadki.push(po_co + '\n    nie znalazłem „' + frag + '" w: ' + (o || '(cisza)'));
}
function milczy(pole, po_co) {
  const o = ostrzezenia(pole);
  if (o) spadki.push(po_co + '\n    a odezwało się: ' + o);
}

zawiera('#p 1 polędwica wieprzowa', 'polędwica',
  'D-39.71 · „1 polędwica" nie dostało ostrzeżenia — wyjęcie z tabeli miało je włączyć');
zawiera('#p 2 podudzia z kurczaka', 'podudzia',
  'D-39.71 · „2 podudzia" nie dostało ostrzeżenia (cena zapłacona świadomie, ale ma być słyszalna)');
zawiera('#p 1 cebula|cebule', 'zamiast czterech',
  'D-39.70 · niepełna furtka (2 formy) przeszła w ciszy');
milczy('#p 1 {czerwona cebula|czerwone cebule|czerwonych cebul|czerwonej cebuli}',
  'D-39.70 · kompletna furtka klamrowa nie może podnosić ostrzeżenia');
milczy('#p 300 g polędwicy wieprzowej',
  'D-39.71 · gramatura mięsa nie może podnosić ostrzeżenia — to zapis poprawny');
milczy('#p 3 goździk|goździki|goździków|goździka',
  'D-39.70 · stara furtka bez klamry nie może podnosić ostrzeżenia');

/* ——— `D-39.73` · powierzchnia dla generatora HTML ————————————————————————
   `etykietaBazowa()` ma drugiego konsumenta w innym repo, więc jej regresja
   psuje stronę, a nie tryb gotowania — i nie pokaże się w żadnym wierszu
   matrycy wyżej. Cztery znaczniki maszynowe, z których `skladnikiHtml()`
   zdejmowało zero, plus wybór formy i reguła 12–14. */
function bazowa(wejscie, oczek, po_co) {
  const jest = P.etykietaBazowa(wejscie);
  if (jest !== oczek) spadki.push(po_co + '\n    wejście:    „' + wejscie + '"' +
    '\n    oczekiwano: „' + oczek + '"\n    jest:       „' + jest + '"');
}
bazowa('3 goździk|goździki|goździków|goździka', '3 goździki',
  'D-39.73 · wybór formy: „3 goździk" to pierwsza forma, a liczba wymaga drugiej');
bazowa('12 goździk|goździki|goździków|goździka', '12 goździków',
  'D-39.73 · wyjątek 12–14 — „12 goździki" byłoby regułą bez wyjątku');
bazowa('1 {czerwona cebula|czerwone cebule|czerwonych cebul|czerwonej cebuli}', '1 czerwona cebula',
  'D-39.73 · klamra nie zdjęta w etykietaBazowa');
bazowa('5 {mały por|małe pory|małych porów|małego pora}', '5 małych porów',
  'D-39.73 · klamra + forma dla 5+');
bazowa('2 {mały por|małe pory|małych porów|małego pora} (lub 1 duży)', '2 małe pory (lub 1 duży)',
  'D-39.73 · tekst po klamrze zjedzony albo przestawiony');
bazowa('=1 łyżeczka cukru', '1 łyżeczka cukru',
  'D-39.73 · znak przypięcia „=" wyciekł do tekstu widocznego');
bazowa('2 łyżka oleju roślinnego', '2 łyżki oleju roślinnego',
  'D-39.73 · zapis w mianowniku l.poj. z pola surowego nie został naprawiony');
bazowa('2–3 gałązka tymianku', '2–3 gałązki tymianku', 'D-39.73 · zakres przy porcjach bazowych');
bazowa('sól do smaku', 'sól do smaku', 'D-39.73 · wiersz bez liczby ma wracać nietknięty');
bazowa('300 g wołowiny gulaszowej z udźca', '300 g wołowiny gulaszowej z udźca',
  'D-39.73 · gramatura ma wracać nietknięta');

if (P.formaDlaLiczby('{goździk|goździki|goździków|goździka}', 5) !== 'goździków') {
  spadki.push('D-39.73 · formaDlaLiczby nie zdejmuje klamry');
}

const kolizje = P.kolizjeOdmian ? P.kolizjeOdmian() : [];
if (kolizje.length) spadki.push('kolizje form w tabeli odmian: ' + kolizje.join(' · '));

console.log('\nkolizje form w tabeli odmian:', kolizje.length ? kolizje.join(' · ') : 'brak');

/* Most ESM sprawdzamy OSOBNO i na końcu, bo to inny sposób ładowania parsera.
   Sam fakt, że API działa w tym pliku, nie mówi nic o tym, czy `generuj-html.mjs`
   zdoła je zaimportować — a to jest właśnie ten stan, w którym strona treści
   zostaje bez narzędzia i dowiaduje się o tym z wyjątku w trakcie budowania. */
import('../odmiana-node.mjs').then((most) => {
  const przezMost = most.etykietaBazowa('3 goździk|goździki|goździków|goździka');
  if (przezMost !== '3 goździki') {
    spadki.push('D-39.73 · most ESM zwraca co innego niż API: „' + przezMost + '"');
  }
  console.log('most ESM (odmiana-node.mjs): „3 goździk|…" → „' + przezMost + '"');
}).catch((e) => {
  spadki.push('D-39.73 · most ESM się nie ładuje — generuj-html.mjs go nie zaimportuje\n    ' + e.message);
}).then(() => {
  if (spadki.length) {
    console.log('\nSPADŁO ' + spadki.length + ':\n');
    spadki.forEach((s, i) => console.log('  ' + (i + 1) + '. ' + s + '\n'));
    process.exit(1);
  }
  console.log('\nwszystkie asercje przeszły.');
});
