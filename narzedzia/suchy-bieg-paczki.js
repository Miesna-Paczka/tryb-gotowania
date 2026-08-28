/* suchy-bieg-paczki.js — siedem przypadków składania linku „dodaj do Paczki".
 *
 * `D-39.64`. Przypadki wzięte wprost z CR-a sesji treściowej, bo to on je nazwał —
 * a przypadek, którego nikt nie nazwał przed implementacją, zwykle nie powstaje po niej.
 *
 * Najważniejszy jest 6: wartość idzie z CMS-u prosto do `href`, więc jedyną barierą
 * między redakcją a `javascript:` jest walidacja bazy. To nie jest test „na wszelki
 * wypadek" — to jedyne miejsce, w którym ta bariera jest sprawdzana.
 *
 * Uruchomienie:  node narzedzia/suchy-bieg-paczki.js
 * Kod wyjścia: 0 = wszystkie zgodne, 1 = rozjazd.
 */
'use strict';
const path = require('path');

let wezly = [];
const pusty = {
  textContent: '', getAttribute: () => null, querySelector: () => null,
  querySelectorAll: () => [], setAttribute() {}, removeAttribute() {},
  appendChild: (x) => x, insertBefore: (x) => x, style: {}, children: []
};
const mkEl = () => Object.assign({}, pusty, { style: {}, classList: { add() {} } });
globalThis.document = {
  title: 'suchy bieg paczki',
  querySelector: () => null,
  querySelectorAll: (sel) => (sel === '[data-mp-produkt]' ? wezly : []),
  getElementById: () => null, createElement: mkEl,
  body: Object.assign({}, pusty, { appendChild: (x) => x, removeChild() {} }),
  documentElement: mkEl()
};
globalThis.location = { search: '', pathname: '/suchy-bieg-paczki' };
globalThis.window = globalThis;

require(path.join(__dirname, '..', 'przepis-parser.js'));
const W = globalThis.MP.przepis._wewnetrzne;

const BAZA = 'https://moja.miesnapaczka.pl/konfigurator';
const U = (n) => ('0000000' + n).slice(-8) + '-1111-4222-8333-444444444444';
const wezel = (url) => ({ getAttribute: (a) => (a === 'data-paczka-url' ? url : null) });
const zUuid = (n) => wezel(BAZA + '?addToCart=' + U(n));

function uruchom(w) {
  wezly = w;
  W.wyczyscBledy();
  const p = W.zbierzPaczke();
  return { p, ostrz: W.ostrzezeniaTeraz(), bledy: W.bledyTeraz() };
}

const przypadki = [
  { id: 1, opis: 'zero węzłów',
    wezly: [], ok: (r) => r.p.url === null && r.ostrz.length === 0 },

  { id: 2, opis: 'jeden węzeł — url identyczny z data-paczka-url',
    wezly: [zUuid(1)],
    ok: (r) => r.p.url === BAZA + '?addToCart=' + U(1) && r.ostrz.length === 0 },

  { id: 3, opis: 'trzy węzły — trzy parametry, baza z pierwszego',
    wezly: [zUuid(1), zUuid(2), zUuid(3)],
    ok: (r) => r.p.url === BAZA + '?addToCart=' + U(1) + '&addToCart=' + U(2) + '&addToCart=' + U(3)
      && r.ostrz.length === 0 },

  { id: 4, opis: 'sześć węzłów — pięć w linku, jeden pominięty, jedno ostrzeżenie',
    wezly: [1,2,3,4,5,6].map(zUuid),
    ok: (r) => r.p.idy.length === 5 && r.p.pominiete.length === 1
      && r.ostrz.length === 1 && /limit to 5/.test(r.ostrz[0]) },

  { id: 5, opis: 'dwa węzły, jeden bez atrybutu — jeden addToCart, jedno ostrzeżenie',
    wezly: [zUuid(1), wezel(null)],
    ok: (r) => r.p.idy.length === 1 && r.ostrz.length === 1
      && /nie ma czytelnego/.test(r.ostrz[0]) },

  { id: 6, opis: 'javascript: — odrzucony, url null',
    wezly: [wezel('javascript:alert(1)')],
    ok: (r) => r.p.url === null && r.p.idy.length === 0 },

  { id: 7, opis: 'dwa węzły z tym samym UUID — jeden addToCart',
    wezly: [zUuid(1), zUuid(1)],
    ok: (r) => r.p.idy.length === 1 && r.p.url === BAZA + '?addToCart=' + U(1) }
];

let zle = 0;
console.log('suchy bieg CTA „dodaj do Paczki" — siedem przypadków\n');
for (const p of przypadki) {
  const r = uruchom(p.wezly);
  const ok = p.ok(r) && r.bledy.length === 0;
  if (!ok) zle++;
  console.log(`${ok ? 'OK ' : 'ŹLE'}  ${p.id} · ${p.opis}`);
  console.log(`        url: ${r.p.url}`);
  r.ostrz.forEach((x) => console.log(`        ! ${x}`));
}
console.log(zle === 0 ? '\nWszystkie siedem zgodne.' : `\nROZJAZDÓW: ${zle}`);
process.exit(zle === 0 ? 0 : 1);
