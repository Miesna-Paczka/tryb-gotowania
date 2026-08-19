/* suchy-bieg-ladunku.mjs — czy strona karmiona ŁADUNKIEM Z PAGES pokazuje to samo,
 * co strona karmiona mikroskładnią z CMS-u.
 *
 * To jest próba przed zdjęciem mikroskładni ze strony. Pytanie brzmi wprost:
 * jeśli usuniemy embedy `#mp-*` i bloki `[data-mp-zrodlo]`, a dane przyjdą
 * z `parser-url`, czy czytelnik zobaczy dokładnie to samo? Odpowiedź „powinien"
 * nie wystarcza, bo to zmiana, po której nie ma odwrotu bez republikacji.
 *
 * Mierzy w Chromium, prawdziwym `przepis-parser.min.js`, na 16 przepisach:
 *   1. karty (wskazówka · co możesz zmienić · przechowywanie) — NOWY tor
 *      (mpLadunek + mpKartyPrzepisu@2.0.0, DOM BEZ surowych pól) postawiony obok
 *      STAREGO (mpKartyPrzepisu@1.0.0 czytający `[data-mp-zrodlo]`);
 *   2. lista składników przy porcjach 1–7 — mpSkladniki@3.0.0 karmiony `MP.model`
 *      kontra etykiety liczone przez parser w Node.
 *
 * Kontrole negatywne, bez których to nic nie znaczy:
 *   – ładunek nieosiągalny (404) MUSI zostawić stronę na treści serwerowej,
 *   – ładunek podmieniony MUSI dać rozjazd, którego porównanie nie przegapi.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-ladunku.mjs   (wymaga lokalnego Chromium)
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { parser } from '../odmiana-node.mjs';
import { zrodla } from '../lancuch-html/wspolne.mjs';
import { zbuduj } from '../lancuch-html/generuj-html.mjs';

const P = parser();
const PARSER = fs.readFileSync('przepis-parser.min.js', 'utf8');
const LADUNEK = fs.readFileSync('narzedzia/mpladunek-1.0.0.js', 'utf8');
const KARTY2 = fs.readFileSync('narzedzia/mpkartyprzepisu-2.0.0.js', 'utf8');
const KARTY1 = fs.readFileSync('narzedzia/mpkartyprzepisu-1.0.0.js', 'utf8');
const SKLAD3 = fs.readFileSync('narzedzia/mpskladniki-3.0.0.js', 'utf8');
const START16 = fs.readFileSync('narzedzia/mpgotowaniestart-1.6.0.js', 'utf8');

const POLA_KART = ['wskazowka', 'co-mozesz-zmienic', 'przechowywanie'];
/* Adres MUSI być unikalny per przepis — dokładnie jak w produkcji, gdzie niesie
   hash zawartości. Pierwsza wersja tej próby wołała jeden adres dla wszystkich
   szesnastu i przeglądarka podawała z cache'u ładunek POPRZEDNIEGO przepisu.
   Objawiło się to jako szesnaście rozjazdów i jedna zepsuta kontrola negatywna,
   czyli wyglądało na defekt kodu, którym nie było. */
const BAZA_TEST = 'https://przyklad.test/dane/';

const grupa = (nazwa, surowe) => `
<div class="recipe-cards__group" data-mp-karty="${nazwa}">
  <div class="recipe-cards__card" data-mp-karta-wzor="">
    <div class="recipe-cards__body">
      <p data-mp-karta-pytanie="">pytanie</p><p data-mp-karta-odpowiedz="">odpowiedź</p>
    </div>
  </div>${surowe == null ? '' : `
  <div class="recipe-cards__source" data-mp-zrodlo="">${surowe}</div>`}
</div>`;

const listaDom = () => `
<div class="recipe-ing__stack">
  <div><div data-mp-porcje-minus><span>−</span></div>
  <div class="recipe-ing__count" data-mp-porcje-etykieta></div>
  <div data-mp-porcje-plus><span>+</span></div></div>
  <div class="recipe-ing__list" data-mp-skladniki-lista>
    <div data-mp-skladniki-html><ul><li>lista serwerowa</li></ul></div>
    <div class="recipe-ing__row" data-mp-skladnik-wzor>
      <div class="recipe-ing__text" data-mp-skladnik-tekst>wzór</div>
      <a class="recipe-ing__badge" data-mp-skladnik-badge></a>
    </div>
  </div>
</div>`;

/* NOWY tor: zero mikroskładni w DOM — ani embedów, ani `[data-mp-zrodlo]`.
   Jedyne wejście to adres ładunku. */
const stronaNowa = (z, adres) => `<!doctype html><meta charset="utf-8"><body>
<h1>${z.meta.nazwa}</h1>
<div id="mp-tryb-gotowania" data-tytul="${z.meta.nazwa}" data-porcje-bazowe="${z.meta['porcje-bazowe']}" data-czas="${z.meta['czas-minuty']}"></div>
<a data-mp-ladunek href="${adres}" style="display:none"></a>
<div data-mp-gotowanie-cta><button>gotuj ze mną</button></div>
<script>window.MP=window.MP||{};window.MP.tryb={otworz:function(w,o){window.__otwarte={porcje:o.porcje,tytul:w.tytul,pierwszy:w.skladniki[0].etykieta,krokow:w.kroki.length}}};</script>
${POLA_KART.map((p) => grupa(p, null)).join('')}
${listaDom()}
<script>${PARSER}</script><script>${LADUNEK}</script>
<script>${KARTY2}</script><script>${SKLAD3}</script><script>${START16}</script></body>`;

/* STARY tor: mikroskładnia w DOM, bez ładunku. Wzorzec porównania. */
const stronaStara = (z) => `<!doctype html><meta charset="utf-8"><body>
${POLA_KART.map((p) => grupa(p, z.pola[p])).join('')}
<script>${KARTY1}</script></body>`;

const czytajKarty = () => {
  const out = {};
  document.querySelectorAll('[data-mp-karty]').forEach((g) => {
    out[g.getAttribute('data-mp-karty')] = {
      ukryta: g.hasAttribute('hidden'),
      wzorZostal: !!g.querySelector('[data-mp-karta-wzor]'),
      karty: [...g.querySelectorAll('[data-mp-karta]')].map((k) => ({
        pytanie: k.querySelector('[data-mp-karta-pytanie]').textContent,
        odpowiedz: k.querySelector('[data-mp-karta-odpowiedz]').textContent,
        klucz: k.getAttribute('data-mp-klucz'),
        krotko: k.getAttribute('data-mp-krotko')
      }))
    };
  });
  return out;
};

const przegladarka = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const kontekst = await przegladarka.newContext();

/* KAŻDY PRZYPADEK DOSTAJE WŁASNĄ KARTĘ, i to nie jest ostrożność na wyrost.
   `page.setContent()` przepisuje dokument, ale NIE tworzy nowego kontekstu JS:
   `window.MP` przeżywa. Pierwsza wersja tej próby robiła szesnaście przepisów
   na jednej karcie i `mpKartyPrzepisu` rysowało karty z modelu POPRZEDNIEGO
   przepisu, zanim doszedł nowy ładunek. Wyglądało to na defekt skryptu, którym
   nie było — model w każdym przebiegu był poprawny, stary był tylko moment
   rysowania. Świeża karta zamyka tę klasę pomyłek. */
const nowaKarta = async () => kontekst.newPage();

let ladunekDoOddania = null, statusDoOddania = 200;
await kontekst.route(BAZA_TEST + '**', (route) => {
  if (process.env.MP_DEBUG) console.log(`    [route] ${route.request().url().split('/').pop()} → ${JSON.parse(ladunekDoOddania || '{}').slug || '(brak)'}`);
  return (
  statusDoOddania === 200
    ? route.fulfill({ status: 200, contentType: 'application/json',
                      headers: { 'cache-control': 'no-store' }, body: ladunekDoOddania })
    : route.fulfill({ status: statusDoOddania, headers: { 'cache-control': 'no-store' }, body: 'nie ma' }));
});

let zdane = 0, oblane = 0;
const zle = (n, p) => { oblane++; console.log(`✗ ${n}\n    ${p}`); };

const FORMY = { 1: 'porcja', 2: 'porcje', 3: 'porcje', 4: 'porcje', 5: 'porcji', 6: 'porcji', 7: 'porcji' };

for (const { slug, item, zrodlo } of zrodla()) {
  const w = zbuduj(item, zrodlo);
  ladunekDoOddania = w.ladunek.tresc; statusDoOddania = 200;
  const adres = BAZA_TEST + w.ladunek.plik;
  const bledy = [];

  // --- wzorzec: stary tor, karty z surowego tekstu ---
  const stara = await nowaKarta();
  await stara.setContent(stronaStara(zrodlo));
  const wzorzec = await stara.evaluate(czytajKarty);
  await stara.close();

  // --- nowy tor: wszystko z ładunku ---
  const karta = await nowaKarta();
  await karta.setContent(stronaNowa(zrodlo, adres));
  await karta.waitForFunction(() => window.MP && window.MP.ladunek && window.MP.ladunek.stan !== 'pobieram', null, { timeout: 8000 })
    .catch(() => bledy.push('ładunek nie doszedł do stanu końcowego'));
  const stanLadunku = await karta.evaluate(() => window.MP.ladunek.stan);
  if (stanLadunku !== 'gotowy') bledy.push(`stan ładunku „${stanLadunku}"`);
  await karta.waitForFunction(() => window.mpKartyPrzepisu && window.mpSkladniki, null, { timeout: 8000 })
    .catch(() => bledy.push('skrypty kart lub listy nie ruszyły'));

  const nowe = await karta.evaluate(czytajKarty);
  if (process.env.MP_DEBUG) {
    const d = await karta.evaluate(() => ({ url: MP.ladunek.url, stan: MP.ladunek.stan,
      pyt: MP.model && MP.model.pola && MP.model.pola.wskazowka && MP.model.pola.wskazowka[0].pytanie }));
    console.log(`    [strona] url=${d.url.split('/').pop()} stan=${d.stan}\n             model.pytanie=${String(d.pyt).slice(0,60)}`);
  }
  for (const pole of POLA_KART) {
    if (JSON.stringify(nowe[pole]) !== JSON.stringify(wzorzec[pole])) {
      bledy.push(`karty „${pole}" różnią się\n      z ładunku: ${JSON.stringify(nowe[pole]).slice(0, 150)}\n      z pola:    ${JSON.stringify(wzorzec[pole]).slice(0, 150)}`);
    }
  }

  // --- lista składników 1–7 ---
  const baza = zrodlo.meta['porcje-bazowe'];
  const model = { skladniki: P._wewnetrzne.parsujSkladniki(zrodlo.pola.skladniki), kroki: [], porcjeBazowe: baza };
  for (let n = 1; n <= 7; n++) {
    if (n > 1) await karta.click('[data-mp-porcje-plus]');
    else for (let i = baza; i > 1; i--) await karta.click('[data-mp-porcje-minus]');
    const stan = await karta.evaluate(() => ({
      etykieta: document.querySelector('[data-mp-porcje-etykieta]').textContent,
      wiersze: [...document.querySelectorAll('[data-mp-wiersz] [data-mp-skladnik-tekst]')].map((e) => e.textContent),
      serwerowaUkryta: document.querySelector('[data-mp-skladniki-html]').hidden
    }));
    const oczek = P.naPorcje(model, n).skladniki.map((o) => o.etykieta);
    if (!stan.serwerowaUkryta) bledy.push(`porcje ${n}: lista serwerowa nieukryta`);
    if (JSON.stringify(stan.wiersze) !== JSON.stringify(oczek)) {
      const i = oczek.findIndex((x, j) => x !== stan.wiersze[j]);
      bledy.push(`porcje ${n}: „${stan.wiersze[i]}" ≠ „${oczek[i]}"`);
    }
    if (stan.etykieta !== `${n} ${FORMY[n]}`) bledy.push(`porcje ${n}: etykieta „${stan.etykieta}"`);
  }

  /* Tryb gotowania to trzeci konsument modelu. Bez tej próby zmiana wyglądałaby
     na skończoną, a CTA otwierałby przepis pusty — po cichu, bo `zaladuj()` bez
     źródeł nie rzuca wyjątkiem, tylko zwraca model bez składników. */
  await karta.click('[data-mp-gotowanie-cta] button');
  const tryb = await karta.evaluate(() => window.__otwarte || null);
  const oczekTryb = P.naPorcje({ skladniki: P._wewnetrzne.parsujSkladniki(zrodlo.pola.skladniki), kroki: [], porcjeBazowe: baza }, 7).skladniki[0].etykieta;
  if (!tryb) bledy.push('CTA trybu gotowania nie otworzyło niczego');
  else if (tryb.porcje !== 7) bledy.push(`tryb gotowania otwarty na ${tryb.porcje} porcjach, oczekiwałem 7`);
  else if (tryb.pierwszy !== oczekTryb) bledy.push(`tryb gotowania: „${tryb.pierwszy}" ≠ „${oczekTryb}"`);
  else if (tryb.tytul !== zrodlo.meta.nazwa) bledy.push(`tryb gotowania: tytuł „${tryb.tytul}"`);

  await karta.close();
  if (bledy.length) zle(slug, bledy.slice(0, 3).join('\n    '));
  else { zdane++; console.log(`✓ ${slug} — karty i lista identyczne bez mikroskładni w DOM`); }
}

/* --- kontrola negatywna 1: ładunek nieosiągalny --- */
{
  const { zrodlo } = zrodla()[0];
  statusDoOddania = 404;
  const karta = await nowaKarta();
  await karta.setContent(stronaNowa(zrodlo, BAZA_TEST + 'nie-ma-takiego.deadbeef.json'));
  await karta.waitForFunction(() => window.MP && window.MP.ladunek && window.MP.ladunek.stan !== 'pobieram', null, { timeout: 8000 }).catch(() => {});
  const stan = await karta.evaluate(() => ({
    ladunek: window.MP.ladunek.stan,
    serwerowaWidoczna: !document.querySelector('[data-mp-skladniki-html]').hidden,
    kartyPuste: [...document.querySelectorAll('[data-mp-karta]')].length === 0
  }));
  if (stan.ladunek === 'blad-pobrania' && stan.serwerowaWidoczna && stan.kartyPuste) {
    zdane++; console.log('✓ KONTROLA NEGATYWNA — 404 zostawia stronę na treści serwerowej i zgłasza błąd');
  } else zle('KONTROLA NEGATYWNA 404', JSON.stringify(stan));
  await karta.close();
  statusDoOddania = 200;
}

/* --- kontrola negatywna 2: ładunek podmieniony --- */
{
  const { zrodlo, item } = zrodla()[0];
  const w = zbuduj(item, zrodlo);
  const podmieniony = JSON.parse(w.ladunek.tresc);
  podmieniony.przechowywanie = 'Czy to w ogóle jest przepis?\nNie, to podmieniony ładunek.';
  ladunekDoOddania = JSON.stringify(podmieniony);
  statusDoOddania = 200;

  const a = await nowaKarta();
  await a.setContent(stronaStara(zrodlo));
  const wzorzec = await a.evaluate(czytajKarty);
  await a.close();
  const b = await nowaKarta();
  await b.setContent(stronaNowa(zrodlo, BAZA_TEST + 'podmieniony.00000000.json'));
  await b.waitForFunction(() => window.mpKartyPrzepisu, null, { timeout: 8000 }).catch(() => {});
  const nowe = await b.evaluate(czytajKarty);
  await b.close();
  if (process.env.MP_DEBUG) {
    const d = await karta.evaluate(() => ({ url: MP.ladunek.url, stan: MP.ladunek.stan,
      pyt: MP.model && MP.model.pola && MP.model.pola.wskazowka && MP.model.pola.wskazowka[0].pytanie }));
    console.log(`    [strona] url=${d.url.split('/').pop()} stan=${d.stan}\n             model.pytanie=${String(d.pyt).slice(0,60)}`);
  }
  const widzi = JSON.stringify(nowe.przechowywanie) !== JSON.stringify(wzorzec.przechowywanie);
  if (widzi) { zdane++; console.log('✓ KONTROLA NEGATYWNA — porównanie łapie podmieniony ładunek'); }
  else zle('KONTROLA NEGATYWNA podmiany', 'porównanie NIE zauważyło podmiany — nic nie mierzy');
}

await przegladarka.close();
console.log(`\nzdane: ${zdane} · oblane: ${oblane}`);
process.exit(oblane ? 1 : 0);
