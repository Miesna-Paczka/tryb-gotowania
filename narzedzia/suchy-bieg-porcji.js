/* suchy-bieg-porcji.js — przelicza przykładowy przepis na 1 porcję, bazę i 2× bazę
 * i wypisuje etykiety obok siebie.
 *
 * POWSTAŁO Z KONKRETNEJ PORAŻKI, nie z chęci porządku. `D-39.50` (indeks odwrotny
 * form) było poprawną decyzją wdrożoną w DWÓCH z TRZECH miejsc wywołania —
 * `formatIlosc()` zostało pominięte. Objaw zapadał wyłącznie przy porcjach
 * PONIŻEJ bazowych, więc typowy sprawdzian „otwórz i zobacz, czy wygląda dobrze"
 * (robiony zwykle na bazie albo 2× bazie) go nie pokazywał. Znalazła to sesja
 * równoległa suchym biegiem na wartościach skrajnych.
 *
 * Wniosek, który to narzędzie utrwala: **przy każdej zmianie dotykającej ilości,
 * jednostek albo odmiany przelicz przepis na 1 / bazę / 2× bazę i porównaj kolumny.**
 * To wyłapuje pominięte miejsca wywołania, których nie widać ani w przeglądzie
 * kodu, ani na jednej liczbie porcji.
 *
 * Uruchomienie:  node narzedzia/suchy-bieg-porcji.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* Stub DOM wystarczający, żeby parser się załadował. Nie udaje przeglądarki —
   udaje tylko tyle, ile parser dotyka przy starcie. */
const pusty = {
  textContent: '', getAttribute: () => null, querySelector: () => null,
  querySelectorAll: () => [], setAttribute() {}, removeAttribute() {},
  appendChild: (x) => x, insertBefore: (x) => x, style: {}, children: []
};
const mkEl = () => Object.assign({}, pusty, { style: {}, classList: { add() {} } });
globalThis.document = {
  title: 'suchy bieg', querySelector: () => null, querySelectorAll: () => [],
  getElementById: () => null, createElement: mkEl,
  body: Object.assign({}, pusty, { appendChild: (x) => x, removeChild() {} }),
  documentElement: mkEl()
};
globalThis.location = { search: '', pathname: '/suchy-bieg' };

/* Parser eksportuje przez `global.MP`, ale `parsujSkladniki` i `naPorcje` są
   w `_wewnetrzne` albo w API — bierzemy z obu, żeby nie zależeć od jednego. */
const zrodlo = fs.readFileSync(path.join(__dirname, '..', 'przepis-parser.js'), 'utf8');
new Function('window', zrodlo).call(globalThis, globalThis);
const P = globalThis.MP.przepis;
const parsujSkladniki = P._wewnetrzne.parsujSkladniki;

/* PRZYKŁAD CELOWO ZŁOŚLIWY: jednostki ułamkowe w formie odmienionej (to właśnie
   pomijało `formatIlosc`), jednostka miary, sztuka policzalna, wpis bez liczby
   i zakres. Jeśli któreś z tych pól kiedyś się zepsuje, kolumna „1 porcja" pokaże
   to jako pierwsza. */
const PRZYKLAD = [
  '#oliwa 2 łyżki oliwy',
  '#cukier 1 łyżeczka cukru',
  '#mleko 1 szklanka mleka',
  '#czosnek 3 ząbki czosnku',
  '#jajka 4 jajka',
  '#maka 500 g mąki',
  '#sol sól do smaku',
  '#tymianek 2–3 gałązki tymianku'
].join('\n');

const BAZA = 4;

const skladniki = parsujSkladniki(PRZYKLAD);
const model = { skladniki: skladniki, kroki: [], porcjeBazowe: BAZA };

/* Nagłówek używa FURTKI `|` z rozdz. 3.1 hand-offu — „porcja" nie jest jednostką
   składnika, więc nie ma jej w tabeli odmian, a formy podaje się wprost. */
const kolumny = [1, BAZA, BAZA * 2];
const wiersze = kolumny.map((n) => P.naPorcje(model, n).skladniki.map((s) => s.etykieta));

const szer = Math.max(...wiersze.flat().map((t) => t.length), 12) + 2;
console.log('SUCHY BIEG PORCJI — baza ' + BAZA + '\n');
console.log(
  kolumny.map((n) => String(n + ' ' + P.odmien('porcja|porcje|porcji|porcji', n)).padEnd(szer)).join('| ')
);
console.log('-'.repeat(szer * kolumny.length + 4));
skladniki.forEach((_, i) => {
  console.log(wiersze.map((w) => String(w[i] || '').padEnd(szer)).join('| '));
});

const kolizje = P.kolizjeOdmian ? P.kolizjeOdmian() : [];
console.log('\nkolizje form w tabeli odmian:', kolizje.length ? kolizje.join(' · ') : 'brak');
