/* suchy-bieg-mostu-produktow.js — cztery przypadki mostu `produkty-w-przepisie`.
 *
 * POWSTAŁO Z CR-2 SESJI TREŚCIOWEJ (2026-08-17). Parser zgłaszał ten sam błąd
 * („składnik #x odsyła do produktu, którego nie ma") w dwóch sytuacjach o zupełnie
 * różnym właścicielu: gdy w liście brakuje JEDNEGO sluga (wina treści, autor ma co
 * poprawić) i gdy ukryta Collection Lista nie renderuje ANI JEDNEGO węzła (wina
 * szablonu, w polu nie ma czego poprawiać). Objaw lądował u kogoś, kto nie miał
 * narzędzi, żeby go usunąć.
 *
 * Gałąź „zero węzłów" jest niewidoczna dla zwykłego sprawdzianu: na stronie, gdzie
 * most działa, nigdy się nie wykona, a na stronie, gdzie nie działa, nikt nie ma
 * jak porównać jej z pozostałymi trzema. Stąd suchy bieg.
 *
 * Przypadek D jest tym, który psuje się najłatwiej przy naiwnej implementacji:
 * większość przepisów nie ma ani jednego `@slug` i pusty most JEST wtedy stanem
 * normalnym. Sprawdzenie licznika musi stać ZA `if (!wiazane.length) return;`.
 *
 * Uruchomienie:  node narzedzia/suchy-bieg-mostu-produktow.js
 * Kod wyjścia: 0 = wszystkie cztery zgodne z oczekiwaniem, 1 = rozjazd.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* ---------------------------------------------------------------- stub DOM
   Udaje dokładnie tyle, ile parser dotyka przy starcie i w `podepnijProdukty`.
   `wezly` podmieniamy per przypadek — to jedyna zmienna wejściowa testu. */
let wezly = [];

const pusty = {
  textContent: '', getAttribute: () => null, querySelector: () => null,
  querySelectorAll: () => [], setAttribute() {}, removeAttribute() {},
  appendChild: (x) => x, insertBefore: (x) => x, style: {}, children: []
};
const mkEl = () => Object.assign({}, pusty, { style: {}, classList: { add() {} } });

globalThis.document = {
  title: 'suchy bieg mostu',
  querySelector: () => null,
  querySelectorAll: (sel) => (sel === '[data-mp-produkt]' ? wezly : []),
  getElementById: () => null,
  createElement: mkEl,
  body: Object.assign({}, pusty, { appendChild: (x) => x, removeChild() {} }),
  documentElement: mkEl()
};
globalThis.location = { search: '', pathname: '/suchy-bieg-mostu' };
globalThis.window = globalThis;

require(path.join(__dirname, '..', 'przepis-parser.js'));
const podepnij = globalThis.MP.przepis._wewnetrzne.podepnijProdukty;

/* Węzeł produktu taki, jaki renderuje ukryta Collection Lista. */
const wezel = (slug, gramatura) => ({
  getAttribute: (a) => ({
    'data-slug': slug,
    'data-nazwa': slug,
    'data-url': '/produkty/' + slug,
    'data-gramatura': gramatura == null ? '1 x 500 g' : gramatura
  })[a] || null
});

const skl = (key, slug) => ({ key, produktSlug: slug || null, produkt: undefined });

/* ---------------------------------------------------------------- przypadki */
const przypadki = [
  {
    id: 'A',
    opis: '0 węzłów, 2 składniki z @slug',
    wezly: [],
    skladniki: () => [skl('kurczak', 'filet-z-piersi-kurczaka'), skl('passata', 'passata-pomidorowa')],
    oczekiwanie: (b) => b.length === 1
      && /usterka SZABLONU/.test(b[0])
      && /NIE poprawiaj pola/.test(b[0])
      && /#kurczak, #passata/.test(b[0])
  },
  {
    id: 'B',
    opis: 'most działa, brakuje jednego produktu',
    wezly: [wezel('filet-z-piersi-kurczaka')],
    skladniki: () => [skl('kurczak', 'filet-z-piersi-kurczaka'), skl('passata', 'passata-pomidorowa')],
    oczekiwanie: (b) => b.length === 1
      && /składnik #passata odsyła do produktu/.test(b[0])
      && !/usterka SZABLONU/.test(b[0])
  },
  {
    id: 'C',
    opis: 'most działa, komplet produktów',
    wezly: [wezel('filet-z-piersi-kurczaka'), wezel('passata-pomidorowa')],
    skladniki: () => [skl('kurczak', 'filet-z-piersi-kurczaka'), skl('passata', 'passata-pomidorowa')],
    oczekiwanie: (b) => b.length === 0
  },
  {
    id: 'D',
    opis: 'przepis bez żadnego @slug, most pusty — stan NORMALNY',
    wezly: [],
    skladniki: () => [skl('oliwa'), skl('sol')],
    oczekiwanie: (b) => b.length === 0
  }
];

const W = globalThis.MP.przepis._wewnetrzne;

function uruchom(p) {
  wezly = p.wezly;
  W.wyczyscBledy();
  podepnij(p.skladniki());
  return W.bledyTeraz();
}

let zle = 0;
console.log('suchy bieg mostu produktów — cztery przypadki\n');
for (const p of przypadki) {
  const b = uruchom(p);
  const ok = p.oczekiwanie(b);
  if (!ok) zle++;
  console.log(`${ok ? 'OK ' : 'ŹLE'}  ${p.id} · ${p.opis}`);
  b.forEach((x) => console.log(`        → ${x}`));
  if (!b.length) console.log('        → (cisza)');
}
console.log(zle === 0 ? '\nWszystkie cztery zgodne.' : `\nROZJAZDÓW: ${zle}`);
process.exit(zle === 0 ? 0 : 1);
