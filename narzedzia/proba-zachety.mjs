/* proba-zachety.mjs — czy zachęta do trybu gotowania robi to, co obiecuje,
 * ZANIM pojedzie dalej.
 *
 * ORACLE JEST ZEWNĘTRZNY i to jest cały sens tego przyrządu. Nie zaglądam do
 * własnego CSS-a i nie pytam, „czy kod robi to, co kod robi". Biorę prawdziwy
 * arkusz Webflow ze stagingu, prawdziwy fragment markupu WYCIĘTY z żywej strony,
 * prawdziwe DM Sans i silnik CSS Chromium — i pytam, co z tego wychodzi.
 *
 * OD 0.7.0 PYTANIE JEST INNE NIŻ WCZEŚNIEJ. Gradient tła nie należy już do
 * skryptu, tylko do klasy `.recipe-toggle` w Webflow. Przyrząd musi więc umieć
 * odróżnić „gradient jest, bo klasa go ma" od „gradient jest, bo skrypt go
 * dorysował" — i sprawdzić, że PRZEŻYWA zgaszenie zachęty. To jest ta jedna
 * asercja, która złapałaby skrót `background:` z 0.6.0.
 *
 * Długość serii jest metryką pierwszej kategorii: każdy blok melduje, ile
 * asercji się wypowiedziało, i porównuje to z zapisaną liczbą. Blok, który
 * umrze w połowie, zgłosi się sam, zamiast udawać sukces krótszą serią.
 *
 * Użycie:  node narzedzia/proba-zachety.mjs [wersja]     (domyślnie 0.7.0)
 *          ODSWIEZ=1 node narzedzia/proba-zachety.mjs    (fikstura na nowo)
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WERSJA = process.argv[2] || '0.7.0';
const FIX = path.join(KORZEN, '.tmp', 'fixture-zachety');
const STAGING = 'https://miesna-paczka-ea5c01.webflow.io';
const PRZEPIS = `${STAGING}/przepisy/kurczak-teriyaki-przepis`;

/* Wartości, których przyrząd pilnuje. Wszystkie mają nazwane źródło. */
/* Gradient zdjety, zostal plaski bez. Asercja pyta
   wiec o KOLOR TLA, nie o gradient — ale pytanie zostaje to samo: czy tlo
   nalezy do klasy i czy PRZEZYWA zgaszenie zachety. */
const TLO_PIGULKI = 'rgb(241, 236, 223)';        // #F1ECDF = --beige-light-bg
/* Pasmo w pomaranczu CTA od 0.9.0 — ten sam kolor, co obramowanie szyny
   przelacznika. Krycie bez zmian, zeby barwa byla jedyna zmienna. */
const PASMO_RGB       = '229,\\s*85,\\s*41';
const KRYCIE_PASMA    = '0.29';
const CYKL_POLYSKU    = '3.1s';                  // 4 s / 1,29 — czestotliwosc +29 %
const OCZEK_SERIE      = { kontrole: 9, brak: 7, domyslny: 18, stop: 6, wsuwanie: 8 };

/* ── 1. Fikstura: pobrana ze stagingu, nie wymyślona ────────────────────── */

async function pobierz(url, plik, binarny = false) {
  const cel = path.join(FIX, plik);
  if (fs.existsSync(cel) && !process.env.ODSWIEZ) return fs.readFileSync(cel, binarny ? null : 'utf8');
  const r = await fetch(url);
  if (!r.ok) throw new Error(`nie mam ${url} — HTTP ${r.status}`);
  fs.mkdirSync(path.dirname(cel), { recursive: true });
  if (binarny) { const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(cel, b); return b; }
  const t = await r.text(); fs.writeFileSync(cel, t); return t;
}

const html = await pobierz(PRZEPIS, 'przepis.html');

const mCta = html.match(/<div data-mp-gotowanie-cta=""[^>]*>[\s\S]*?<\/a><\/div>/);
if (!mCta) throw new Error('KONTROLA FIKSTURY: nie znalazłem [data-mp-gotowanie-cta] na żywej stronie — ' +
  'przyrząd nie ma czego mierzyć, a każda asercja o nieobecności efektu byłaby pusta');
const MARKUP = mCta[0].replace('class="recipe-toggle', 'class="recipe-toggle is-widoczny');

const mCss = html.match(/href="(https:\/\/cdn\.prod\.website-files\.com\/[^"]*\.webflow\.shared\.[^"]*\.css)"/);
if (!mCss) throw new Error('KONTROLA FIKSTURY: nie znalazłem arkusza Webflow w <head> strony');
let css = await pobierz(mCss[1], 'webflow.css');

const FONTY = [...css.matchAll(/url\((https:\/\/[^)]*DMSans-(Regular|Medium)\.woff2)\)/g)];
if (FONTY.length < 2) throw new Error('KONTROLA FIKSTURY: nie znalazłem DM Sans w arkuszu');
for (const [, url, waga] of FONTY) {
  await pobierz(url, `f/dmsans-${waga}.woff2`, true);
  css = css.split(url).join(`f/dmsans-${waga}.woff2`);
}
fs.writeFileSync(path.join(FIX, 'webflow-lokalny.css'), css);

/* Bloki <style> z custom code. BEZ NICH FIKSTURA KLAMIE: regula wsuwania
   `.recipe-toggle` mieszka w custom code WITRYNY, a nie w arkuszu Webflow,
   wiec przyrzad mierzyl swiat, w ktorym jej nie ma — i dlatego przegapil
   dwie regresje z rzedu. Kolejnosc zachowana, bo przy rownej specyficznosci
   rozstrzyga zrodlo. */
const STYLE = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
if (!STYLE.length) throw new Error('KONTROLA FIKSTURY: zero blokow <style> na zywej stronie — ' +
  'custom code nie zostalby zmierzony, a to w nim mieszka wsuwanie');
fs.writeFileSync(path.join(FIX, 'custom.css'), STYLE.join('\n/* --- */\n'));

const zrodlo = fs.readFileSync(path.join(KORZEN, 'narzedzia', `mpzachetatrybu-${WERSJA}.js`), 'utf8');
const i = zrodlo.search(/\(function\s*\(\)\s*\{/);   // 0.8.x pisze `(function () {` ze spacjami
if (i < 0) throw new Error(`KONTROLA FIKSTURY: nie widzę ciała skryptu w mpzachetatrybu-${WERSJA}.js`);
const CIALO = zrodlo.slice(i);
fs.writeFileSync(path.join(FIX, 'zacheta.js'), CIALO);

fs.writeFileSync(path.join(FIX, 'index.html'),
  `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="webflow-lokalny.css">
<link rel="stylesheet" href="custom.css">
<style>html.wymus .recipe-floating-cta{display:flex!important}</style>
</head><body class="body">${MARKUP}<script src="zacheta.js"></script></body></html>`);

/* ── 2. Serwer lokalny (przeglądarka w kontenerze nie wychodzi do sieci) ─── */

const TYPY = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const serwer = http.createServer((q, o) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const p = path.join(FIX, u === '/' ? 'index.html' : u);
  if (!p.startsWith(FIX) || !fs.existsSync(p)) { o.writeHead(404).end(); return; }
  o.writeHead(200, { 'content-type': TYPY[path.extname(p)] || 'application/octet-stream' });
  o.end(fs.readFileSync(p));
});
await new Promise((r) => serwer.listen(0, '127.0.0.1', r));
const BAZA = `http://127.0.0.1:${serwer.address().port}`;

/* ── 3. Pomiar ──────────────────────────────────────────────────────────── */

const b = await chromium.launch({ args: ['--no-proxy-server'] });
let padlo = 0, seria = 0;
const A = (warunek, opis, zmierzone) => {
  seria++;
  if (!warunek) { padlo++; console.log(`  ✗ ${opis}${zmierzone !== undefined ? ` — zmierzone: ${JSON.stringify(zmierzone)}` : ''}`); }
};
const blok = (nazwa, przed) => {
  const dl = seria - przed;
  const ocz = OCZEK_SERIE[nazwa];
  if (dl !== ocz) { padlo++; console.log(`  ✗ URWANIE w bloku „${nazwa}": ${dl} asercji zamiast ${ocz}`); }
  console.log(`  seria: ${dl}`);
};

async function odczyt(query, szerokosc = 320) {
  const k = await b.newContext({ viewport: { width: szerokosc, height: 800 } });
  const p = await k.newPage();
  await p.goto(`${BAZA}/${query}`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => document.documentElement.classList.add('wymus'));
  const stan = await p.evaluate(() => {
    const el = document.querySelector('.recipe-toggle');
    if (!el) return { brakElementu: true };
    const g = (pe) => { const s = getComputedStyle(el, pe); return {
      bgImage: s.backgroundImage, bgColor: s.backgroundColor, animName: s.animationName,
      animDur: s.animationDuration, animTF: s.animationTimingFunction, animDelay: s.animationDelay,
      content: s.content, rotate: s.rotate, translate: s.translate, opacity: s.opacity,
      width: s.width, height: s.height, borderRadius: s.borderRadius,
      position: s.position, overflow: s.overflow }; };
    return { kod: document.documentElement.getAttribute('data-z'), sonda: window.mpZacheta || null,
      pigulka: g(null), po: g('::after'),
      szerPigulki: el.getBoundingClientRect().width,
      styl: !!document.getElementById('mpz'), fontOk: document.fonts.check('16px "DM Sans"'),
      prawaKrawedz: el.getBoundingClientRect().right, okno: window.innerWidth };
  });
  return { stan, p, k };
}

const MA_TLO = (s) => s.pigulka.bgColor === TLO_PIGULKI && s.pigulka.bgImage === 'none';
const MA_POLYSK = (s) => s.po.content === '""' && s.po.animName === 'mpP';

console.log(`mpZachetaTrybu ${WERSJA} — ciało ${CIALO.length} znaków`);

console.log('\n=== KONTROLE PRZYRZĄDU (bez nich reszta nic nie znaczy) ===');
{
  const przed = seria;
  const { stan, k } = await odczyt('?zacheta=brak');
  A(!stan.brakElementu, 'fikstura ma .recipe-toggle');
  A(stan.pigulka.borderRadius === '100px', 'arkusz Webflow się wczytał (border-radius pigułki)', stan.pigulka.borderRadius);
  A(stan.fontOk, 'DM Sans wczytany — pomiar szerokości jest pomiarem, nie zastępnikiem', stan.fontOk);
  A(stan.sonda && stan.sonda.wersja === WERSJA, `sonda melduje wersję ${WERSJA}`, stan.sonda && stan.sonda.wersja);
  A(stan.kod === null, 'przy ?zacheta=brak atrybut data-z NIE jest ustawiony', stan.kod);
  A(stan.styl === false, 'przy ?zacheta=brak arkusz zachęty NIE jest wstrzykiwany', stan.styl);
  A(!MA_POLYSK(stan), 'KONTROLA ZERA: bez zachęty nie ma połysku', [stan.po.content, stan.po.animName]);
  /* SEDNO 0.7.0: gradient jest tu WYŁĄCZNIE zasługą klasy — skrypt się wyłączył. */
  A(MA_TLO(stan), 'tło JEST mimo wyłączonej zachęty — należy do klasy, nie do skryptu', [stan.pigulka.bgColor, stan.pigulka.bgImage]);
  A(stan.pigulka.bgColor === TLO_PIGULKI, 'tło to --beige-light-bg', stan.pigulka.bgColor);
  console.log(`  szerokość pigułki @320: ${stan.szerPigulki.toFixed(1)}px`);
  await k.close();
  blok('kontrole', przed);
}

console.log('\n=== ZACHĘTA WYŁĄCZONA NA STAŁE (?zacheta=brak, powrót bez parametru) ===');
{
  const przed = seria;
  const { stan, p, k } = await odczyt('?zacheta=brak');
  A(stan.kod === null, 'data-z zdjęty', stan.kod);
  await p.goto(`${BAZA}/`, { waitUntil: 'load' });
  const wrot = await p.evaluate(() => {
    const el = document.querySelector('.recipe-toggle');
    return { kod: document.documentElement.getAttribute('data-z'), styl: !!document.getElementById('mpz'),
      bg: getComputedStyle(el).backgroundColor, bgi: getComputedStyle(el).backgroundImage,
      po: getComputedStyle(el, '::after').content,
      sonda: window.mpZacheta && window.mpZacheta.wariant };
  });
  A(wrot.kod === null, 'po powrocie bez parametru zachęta nadal wyłączona', wrot.kod);
  A(wrot.styl === false, 'po powrocie arkusz nie wraca', wrot.styl);
  A(wrot.sonda === 'brak', 'wybór „brak" jest zapamiętany', wrot.sonda);
  A(wrot.po !== '""', 'po powrocie nadal brak połysku', wrot.po);
  A(wrot.bg === TLO_PIGULKI, 'po powrocie tło nadal jest', wrot.bg);
  A(wrot.bgi === 'none', 'tło jest płaskie, bez gradientu', wrot.bgi);
  await k.close();
  blok('brak', przed);
}

console.log('\n=== ZACHĘTA DOMYŚLNA (bez parametru, świeży użytkownik) ===');
let szerDomyslna = 0;
{
  const przed = seria;
  const { stan, p, k } = await odczyt('');
  A(stan.kod === '', 'data-z ustawiony (pusty)', stan.kod);
  A(stan.sonda && stan.sonda.wariant === 'domyslny', 'sonda melduje wariant domyślny', stan.sonda && stan.sonda.wariant);
  A(stan.styl, 'arkusz zachęty wstrzyknięty');
  A(MA_TLO(stan), 'tło z klasy PRZEŻYŁO wstrzyknięcie arkusza — skrypt nie rusza tła', [stan.pigulka.bgColor, stan.pigulka.bgImage]);
  A(stan.pigulka.bgColor === TLO_PIGULKI, 'podkład background-color nietknięty', stan.pigulka.bgColor);
  A(stan.pigulka.position === 'relative', 'pigułka ma position:relative', stan.pigulka.position);
  A(stan.pigulka.overflow === 'hidden', 'pigułka przycina pasmo', stan.pigulka.overflow);
  A(MA_POLYSK(stan), 'połysk jest', [stan.po.content, stan.po.animName]);
  A(stan.po.animDur === CYKL_POLYSKU, `cykl ${CYKL_POLYSKU} — czestotliwosc +29 % wobec 4 s`, stan.po.animDur);
  A(stan.po.animTF === 'linear', 'krzywa liniowa — bez niej przejazd trwa ułamek deklarowanego', stan.po.animTF);
  A(stan.po.animDelay === '1.4s', 'start opóźniony o 1,4 s', stan.po.animDelay);
  A(stan.po.width === '30px' && stan.po.height !== '0px', 'pasmo ma geometrię', [stan.po.width, stan.po.height]);
  A(stan.po.rotate === '-20deg', 'obrót w właściwości rotate, nie w klatkach', stan.po.rotate);
  A(new RegExp(`rgba\\(${PASMO_RGB},\\s*${KRYCIE_PASMA}\\)`).test(stan.po.bgImage),
    `pasmo w pomaranczu CTA przy kryciu ${KRYCIE_PASMA}`, stan.po.bgImage);
  /* Stan SPOCZYNKOWY pasma. Bez niego pasmo stoi widoczne przy lewej krawędzi
     przez 1,4 s opóźnienia i przy prefers-reduced-motion. */
  A(stan.po.translate === '-46px', 'pasmo spoczywa POZA pigułką (translate w regule bazowej)', stan.po.translate);
  A(stan.po.opacity === '0', 'pasmo spoczywa przezroczyste (opacity w regule bazowej)', stan.po.opacity);
  A(236 >= stan.szerPigulki, 'przejazd wychodzi poza prawą krawędź pigułki', [236, stan.szerPigulki]);
  A(stan.prawaKrawedz <= stan.okno, 'pigułka mieści się w oknie 320 px', [stan.prawaKrawedz, stan.okno]);
  szerDomyslna = stan.szerPigulki;
  await k.close();
  blok('domyslny', przed);
}

console.log('\n=== WARUNEK STOPU — i czy gradient go przeżywa ===');
{
  const przed = seria;
  const { p, k } = await odczyt('');
  await p.click('[data-mp-gotowanie-toggle]');
  const po = await p.evaluate(() => {
    const el = document.querySelector('.recipe-toggle');
    return { kod: document.documentElement.getAttribute('data-z'),
      pamiec: localStorage.getItem('mp-tryb-otwarty'),
      bg: getComputedStyle(el).backgroundColor, po: getComputedStyle(el, '::after').content };
  });
  A(po.kod === null, 'po kliknięciu data-z zdjęty', po.kod);
  A(po.pamiec === '1', 'po kliknięciu pamięć „już otwierał" zapisana', po.pamiec);
  A(po.po !== '""', 'po kliknięciu połysk znika', po.po);
  /* TA asercja złapałaby skrót `background:` z 0.6.0 — po zdjęciu data-z
     gradient wróciłby do `none` i pigułka zrobiłaby się płaska. */
  A(po.bg === TLO_PIGULKI, 'po kliknięciu tło ZOSTAJE — jest trwałe, nie jest częścią zachęty', po.bg);
  await p.goto(`${BAZA}/`, { waitUntil: 'load' });
  const wrot = await p.evaluate(() => {
    const el = document.querySelector('.recipe-toggle');
    return { styl: !!document.getElementById('mpz'), bg: getComputedStyle(el).backgroundColor };
  });
  A(wrot.styl === false, 'zachęta nie wraca przy kolejnym wejściu', wrot.styl);
  A(wrot.bg === TLO_PIGULKI, 'tło jest przy kolejnym wejściu', wrot.bg);
  await k.close();
  blok('stop', przed);
}

/* ── 3b. WSUWANIE ────────────────────────────────────────────────────────
   Ten blok istnieje, bo ta jedna rzecz psula sie DWA RAZY i nie miala wiersza.
   Deklaracje stanu ukrytego przenosily sie miedzy Designerem a custom code;
   za kazdym razem znikaly ciszej, niz ktokolwiek patrzyl. Zestaw byl przy tym
   caly czas zielony — bo nikt nie zapytal, czy pigulka W OGOLE sie przesuwa.

   Oracle jest zewnetrzny: `.recipe-toggle` bez `.is-widoczny` ma stac
   przesunieta o wlasna szerokosc w prawo, z nia — na zerze. Wartosci biore
   z macierzy `transform` wyliczonej przez Chromium, nie z deklaracji. */
console.log('\n=== WSUWANIE (regresja, ktora wracala dwa razy) ===');
{
  const przed = seria;
  const { stan, p, k } = await odczyt('?zacheta=brak');
  const tx = (m) => { const g = /matrix\(1,\s*0,\s*0,\s*1,\s*(-?[\d.]+),\s*0\)/.exec(m); return g ? parseFloat(g[1]) : NaN; };

  const widoczny = await p.evaluate(() => {
    const el = document.querySelector('.recipe-toggle');
    const s = getComputedStyle(el);
    return { transform: s.transform, opacity: s.opacity, transition: s.transitionProperty + ' | ' + s.transitionDuration + ' | ' + s.transitionTimingFunction, w: el.getBoundingClientRect().width };
  });
  /* Zdjecie klasy uruchamia 0,5-sekundowe przejscie. Odczyt natychmiastowy
     zwraca wartosc STARTOWA, nie docelowa — pierwsza wersja tego wiersza tak
     wlasnie padla, na dzialajacym produkcie. Czekamy na `transitionend`,
     z budzikiem na wypadek karty w tle, gdzie zdarzenie nie przyjdzie. */
  const ukryty = await p.evaluate(async () => {
    const el = document.querySelector('.recipe-toggle');
    await new Promise((gotowe) => {
      let zamkniete = false;
      const koniec = () => { if (!zamkniete) { zamkniete = true; gotowe(); } };
      el.addEventListener('transitionend', koniec, { once: true });
      setTimeout(koniec, 900);
      el.classList.remove('is-widoczny');
    });
    const s = getComputedStyle(el);
    return { transform: s.transform, opacity: s.opacity };
  });

  A(Math.abs(tx(widoczny.transform)) < 0.5, 'ze stanem widocznym pigulka stoi na zerze', widoczny.transform);
  A(widoczny.opacity === '1', 'ze stanem widocznym jest nieprzezroczysta', widoczny.opacity);
  A(Math.abs(tx(ukryty.transform) - widoczny.w) < 1,
    'BEZ stanu widocznego jest przesunieta o WLASNA SZEROKOSC w prawo (translateX(100%))',
    [ukryty.transform, widoczny.w]);
  A(ukryty.opacity === '0', 'bez stanu widocznego jest przezroczysta', ukryty.opacity);
  A(/transform/.test(widoczny.transition), 'transform jest w transition — bez tego pigulka SKACZE', widoczny.transition);
  A(/opacity/.test(widoczny.transition), 'opacity jest w transition', widoczny.transition);
  A(/0\.5s/.test(widoczny.transition), 'czas 0,5 s — ten sam co na /produkty', widoczny.transition);
  A(/cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/.test(widoczny.transition),
    'krzywa cubic-bezier(0.16, 1, 0.3, 1) — 1:1 z /produkty', widoczny.transition);
  await k.close();
  blok('wsuwanie', przed);
}

/* ── 4. Ekspozycja pasma w czasie ───────────────────────────────────────── */

console.log('\n=== EKSPOZYCJA POŁYSKU ===');
{
  const k = await b.newContext({ viewport: { width: 320, height: 800 } });
  const p = await k.newPage();
  await p.goto(`${BAZA}/`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => document.documentElement.classList.add('wymus'));

  /* Parametry ze stylu WYLICZONEGO, nie przepisane z mojego pliku. Klatkę
     zamraża Web Animations API; wersja przez `animation-delay:-Ts` + `paused`
     NIE działa i wygląda przy tym na działającą — opóźnienie tylko przesuwa
     fazę, a pauza łapie zegar ścienny. */
  const par = await p.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.recipe-toggle'), '::after');
    return { nazwa: s.animationName, cykl: parseFloat(s.animationDuration) * 1000,
             opoz: parseFloat(s.animationDelay) * 1000 };
  });
  const { nazwa, cykl: CYKL, opoz: OPOZ } = par;
  console.log(`  animacja ${nazwa}, cykl ${CYKL} ms, opóźnienie startu ${OPOZ} ms`);
  const zegar = (ms) => p.evaluate(([ms, nazwa]) => {
    const a = document.querySelector('.recipe-toggle').getAnimations({ subtree: true })
      .find((x) => x.animationName === nazwa);
    if (!a) return null;
    a.pause(); a.currentTime = ms;
    return a.currentTime;
  }, [ms, nazwa]);
  const kadr = async () => (await (await p.$('.recipe-toggle')).screenshot()).toString('base64');

  A((await zegar(OPOZ)) === OPOZ, 'animacja daje się zamrozić na zadanej chwili (WAAPI)', await zegar(OPOZ));
  await zegar(OPOZ + CYKL * 0.875);
  const spoczynek = await kadr();
  A((await kadr()) === spoczynek, 'KONTROLA DETERMINIZMU: ten sam stan → ten sam PNG');

  /* Okno OPÓŹNIENIA. Animacja bez `fill-mode` nie sięga wstecz, więc przez te
     1,4 s obowiązuje reguła bazowa — i to ona musi trzymać pasmo poza pigułką. */
  let widacWOpoznieniu = 0;
  for (let t = 0; t < OPOZ; t += 100) { await zegar(t); if ((await kadr()) !== spoczynek) widacWOpoznieniu++; }
  A(widacWOpoznieniu === 0, `KONTROLA ZERA: przez ${OPOZ} ms opóźnienia pasma NIE widać`, widacWOpoznieniu);

  const KROK = 25, N = Math.round(CYKL / KROK);
  let widac = 0; const fazy = [];
  for (let n = 0; n < N; n++) {
    const t = n * KROK;
    await zegar(OPOZ + t);
    if ((await kadr()) !== spoczynek) { widac++; fazy.push(t); }
  }
  const duty = (widac / N) * 100;
  console.log(`  widać w ${widac}/${N} próbek co ${KROK} ms → ${duty.toFixed(1)}% cyklu ${CYKL / 1000} s (${(widac * KROK / 1000).toFixed(2)} s ruchu)`);
  console.log(`  fazy: ${fazy.length ? `${fazy[0]} … ${fazy[fazy.length - 1]} ms` : '—'}`);
  A(widac > 0, 'KONTROLA DODATNIA: w którejś fazie pasmo w ogóle widać — inaczej mierzę pustkę', widac);
  await zegar(OPOZ + CYKL * 0.75);
  A((await kadr()) === spoczynek, 'KONTROLA ZERA: w fazie spoczynku kadr jest identyczny z odniesieniem');
  await k.close();
}

/* ── 5. Mutacje ─────────────────────────────────────────────────────────── */

console.log('\n=== MUTACJE (czy te asercje w ogóle umieją spaść) ===');
let mutacjeZle = 0;
async function mutacja(nazwa, query, psuj, pytaj, oczekiwane) {
  const k = await b.newContext({ viewport: { width: 320, height: 800 } });
  const p = await k.newPage();
  await p.goto(`${BAZA}/${query}`, { waitUntil: 'load' });
  await p.evaluate(psuj);
  const s = await p.evaluate(pytaj);
  const zabita = oczekiwane(s);
  if (!zabita) mutacjeZle++;
  console.log(`  ${zabita ? 'ZABITA     ' : 'TAUTOLOGIA '} · ${nazwa.padEnd(34)} → ${JSON.stringify(s)}`);
  await k.close();
}
await mutacja('arkusz zachęty usunięty', '',
  () => document.getElementById('mpz').remove(),
  () => ({ anim: getComputedStyle(document.querySelector('.recipe-toggle'), '::after').animationName,
           bg: getComputedStyle(document.querySelector('.recipe-toggle')).backgroundColor }),
  (s) => s.anim === 'none' && s.bg === 'rgb(241, 236, 223)');   // tlo zostaje: nie bylo skryptu

console.log(`\nszerokość pigułki @320: ${szerDomyslna.toFixed(1)}px`);
console.log(`asercji łącznie: ${seria} | padnięć: ${padlo} | mutacji nie zabitych: ${mutacjeZle}`);
await b.close();
serwer.close();
process.exit(padlo || mutacjeZle ? 1 : 0);
