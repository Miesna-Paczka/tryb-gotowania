/* proba-barwy-przejscia.mjs — czy barwa ducha przechodzi W LOCIE (`D-40.20`).
 *
 * Zgloszenie: pigulka jest bezowa, belka trybu biala, a kolor zmienial sie
 * dopiero PO wykonaniu przejscia, gwaltownie.
 *
 * DLACZEGO NIE MIERZYMY ZEGAREM. `mp-pomiar` §1.1: w karcie, ktora nie jest
 * renderowana, `requestAnimationFrame` i os czasu dokumentu stoja, wiec pomiar
 * animacji „odczekaj N ms i sprawdz" jest bezwartosciowy — i bywa zielony.
 * Zamiast tego PAUZUJEMY animacje i PRZEWIJAMY je (`currentTime`) do zadanych
 * chwil. Wynik przestaje zalezec od tego, czy karta jest renderowana.
 *
 * Uruchomienie: node narzedzia/proba-barwy-przejscia.mjs [--plik <runtime>]
 */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const PLIK = arg('--plik', 'tryb-gotowania.min.js');
const TRYB = fs.readFileSync(PLIK, 'utf8');
const BEZ = '#F1ECDF';           // beige-1, tlo pigulki na stronie
const BIALY = [255, 253, 251];   // --mp-bialy #FFFDFB

const S = (k, e) => ({ key: k, etykieta: e, tresc: e, nazwa: e, ilosc: null, iloscDo: null,
  jednostka: '', pin: false, produktSlug: null, produkt: null });
const A = S('a', '200 g soczewicy'), B = S('b', 'sól');
const MODEL = { tytul: 'p', czas: '30', meta: [], porcje: 2, fotoUrl: null, bledy: [], zamienniki: {},
  porcjeBazowe: 2, pola: {}, skladniki: [A, B],
  kroki: [{ tytul: 'k', tekst: 'x', tekstHtml: 'x', numer: 1, zIlu: 1, badge: 'bez minutnika',
    czas: null, minutnik: null, kryterium: null, kryteriumHtml: null, foto: null, fotoUrl: null,
    skladniki: ['a', 'b'], skladnikiTeraz: [A, B], skladnikiDalej: [], skladnikiZuzyte: [],
    zamiennikiWgKlucza: {} }] };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
/* `reducedMotion` USTAWIONE JAWNIE. Przy `reduce` runtime CELOWO schodzi na samo
   przenikanie i ducha NIE MA — wynik bylby wtedy „brak ducha", nie „barwa nie
   przechodzi". Bez tej linii pomiar zalezy od ustawien maszyny. */
const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, isMobile: true,
  hasTouch: true, reducedMotion: 'no-preference' });
const ADRES = 'https://proba.test/x';
await ctx.route(ADRES, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8',
  body: `<!doctype html><meta charset="utf-8"><body style="margin:0;height:2000px">
<a href="#" data-mp-gotowanie-toggle class="recipe-toggle"
   style="position:fixed;left:187px;top:700px;width:199px;height:48px;display:flex;
          align-items:center;gap:8px;padding:0 16px;box-sizing:border-box;
          background:${BEZ};border:1px solid #C5B18A;border-radius:100px">
  <span class="body-large">tryb gotowania</span>
  <span class="toggle" style="width:52px;height:26px;padding:3px;background:#C5B18A;border-radius:100px;display:flex">
    <span class="toggle__eye" style="width:20px;height:20px;background:#fff;border-radius:100px"></span>
  </span></a>
<script>window.MP={zegar:{__t:1e12,teraz:function(){return this.__t}}};<\/script>
<script>${TRYB}<\/script></body>` }));
const p = await ctx.newPage();
const bledy = [];
p.on('pageerror', (e) => bledy.push(String(e)));
await p.goto(ADRES);

let zdane = 0, oblane = 0, seria = 0;
const spr = (w, o, s) => { seria++; if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (s ? '\n        ' + s : '')); } };

console.log(`\n═══ barwa ducha w locie · ${PLIK} ═══`);

/* Otwieramy tryb i NATYCHMIAST pauzujemy wszystko, co animuje ducha. */
const start = await p.evaluate((m) => {
  window.MP.tryb.otworz(m, { model: m, porcje: 2 });
  const d = document.querySelector('.mp-tryb__duch');
  if (!d) return { brakDucha: true };
  const an = d.getAnimations();
  an.forEach((a) => a.pause());
  window.__duch = d; window.__an = an;
  return { brakDucha: false, ile: an.length,
    trwanie: an.length ? an[0].effect.getTiming().duration : -1 };
}, MODEL);
spr(start.brakDucha === false, 'duch przejścia powstał (pigułka wejściowa znaleziona)', JSON.stringify(start));
spr(start.ile >= 3, 'duch ma co najmniej trzy animacje (geometria, styl, barwa)', 'jest: ' + start.ile);
spr(start.trwanie === 1000, 'czas trwania przejścia = 1000 ms', String(start.trwanie));

/* Przewijanie: `currentTime` w ms. Offsety z choreografii × 1000. */
const probka = (ms) => p.evaluate((ms) => {
  window.__an.forEach((a) => { a.currentTime = ms; });
  const c = getComputedStyle(window.__duch).backgroundColor;
  const m = c.match(/rgba?\(([^)]+)\)/);
  const q = m ? m[1].split(',').map((x) => parseFloat(x)) : [];
  return { css: c, r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 };
}, ms);

const chwile = [0, 200, 300, 440, 600, 680, 760, 900];
const proby = [];
for (const ms of chwile) proby.push({ ms, ...(await probka(ms)) });
console.log('\n  przewinięcie → barwa ducha:');
proby.forEach((x) => console.log(`    ${String(x.ms).padStart(4)} ms (offset ${(x.ms / 1000).toFixed(2)})  ${x.css}`));

const bez = proby[0];
spr(Math.round(bez.r) === 241 && Math.round(bez.g) === 236 && Math.round(bez.b) === 223,
  'KONTROLA UJEMNA: w chwili 0 duch ma barwę pigułki (beż #F1ECDF)', bez.css);
const przy20 = proby[1];
spr(Math.round(przy20.r) === Math.round(bez.r) && Math.round(przy20.b) === Math.round(bez.b),
  'do .20 barwa STOI — pigułka nie rusza się i nie zmienia koloru', przy20.css);

const bialoSc = (x) => Math.round(x.r) === BIALY[0] && Math.round(x.g) === BIALY[1] && Math.round(x.b) === BIALY[2];
/* Pytamy o KSZTALT przejscia, a nie o wartosc w wymyslonej chwili. Pierwsza
   wersja zadala „w drodze az do .68" i padla na poprawnym produkcie: krzywa
   domowa zwalnia, wiec zaokraglona biel wypada juz okolo .60. To byla moja
   liczba, nie wlasnosc produktu. */
const wDrodze = proby.filter((x) => x.ms === 300 || x.ms === 440);
spr(wDrodze.every((x) => !bialoSc(x) && Math.round(x.b) > Math.round(bez.b)),
  'zaraz po ruszeniu (.30 i .44) barwa jest W DRODZE — ani beżowa, ani jeszcze biała',
  wDrodze.map((x) => x.ms + ':' + x.css).join('  '));
spr(Math.round(wDrodze[1].b) > Math.round(wDrodze[0].b),
  'i posuwa się MONOTONICZNIE ku bieli', wDrodze.map((x) => x.ms + ':' + Math.round(x.b)).join(' → '));

const pierwszaBiel = proby.find(bialoSc);
spr(!!pierwszaBiel && pierwszaBiel.ms < 760,
  'biel osiągnięta PRZED lądowaniem (.76) — „gdy dociera, jest już biały"',
  pierwszaBiel ? 'pierwsza biel w ' + pierwszaBiel.ms + ' ms' : 'nigdy nie osiągnięta');
console.log('        (pierwsza pełna biel: ' + (pierwszaBiel ? pierwszaBiel.ms + ' ms, offset ' + (pierwszaBiel.ms / 1000).toFixed(2) : '—') + ')');
spr(bialoSc(proby.find((x) => x.ms === 760)), 'w .76, czyli w chwili LĄDOWANIA, dalej biały',
  proby.find((x) => x.ms === 760).css);

/* Wymaganie osobne od barwy: duch NIE MOZE stac sie przezroczysty w locie,
   bo przez pigulke widac by bylo przewijajaca sie strone. */
spr(proby.every((x) => x.a === 1), 'przez CAŁY przelot duch pozostaje KRYJĄCY (alfa 1)',
  proby.map((x) => x.ms + ':' + x.a).join(' '));

spr(bledy.length === 0, 'zero błędów strony', bledy.join(' | '));
console.log(`\n  ── zdane ${zdane}, oblane ${oblane}, SERIA ${seria}`);
await b.close();
process.exitCode = oblane ? 1 : 0;
