/* proba-produktow.mjs — czy zacheta na /produkty NIE RUSZA geometrii pigulki.
 *
 * PO CO OSOBNY PRZYRZAD. `proba-zachety.mjs` buduje fiksture z szablonu
 * przepisu i nie widzi drugiej powierzchni. Skutek zmierzony 2026-08-24:
 * `position:relative` z reguly bazowej NADPISALO `position:fixed` pigulki
 * na /produkty i wyrzucilo plywajacy przelacznik 108 px PONIZEJ dolnej
 * krawedzi ekranu — a zestaw byl caly czas zielony, bo pytal wylacznie
 * o przepisy. To nie byla luka w tescie, tylko brak testu.
 *
 * ORACLE JEST ROZNICOWY i to jest tu sedno: nie pytam „czy pigulka wyglada
 * dobrze" (nie wiem, jak ma wygladac), tylko „czy wyglada TAK SAMO jak bez
 * zachety". Strona bez skryptu jest wzorcem samej siebie. Jedyna dozwolona
 * roznica to `overflow`, ktory przycina pasmo.
 *
 * Lustro budowane z ZYWEGO stagingu, a skrypt sciagany z CDN-u Webflow —
 * mierzone sa bajty, ktore naprawde jada, nie plik z repozytorium.
 *
 * PULAPKA PRZYRZADU, ktora juz raz zafalszowala wynik: <link> do arkusza
 * niesie `integrity` policzone dla ORYGINALU. Po podmianie adresow fontow
 * plik ma inne bajty, SRI odrzuca arkusz i strona renderuje sie BEZ STYLOW —
 * a pomiar wyglada na poprawny. Stad `integrity` jest zdejmowane, a kontrola
 * `border-radius: 100px` pilnuje, ze arkusz naprawde zadzialal.
 *
 * Uzycie:  node narzedzia/proba-produktow.mjs
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(KORZEN, '.tmp', 'lustro-produktow');
const ZRODLO = 'https://miesna-paczka-ea5c01.webflow.io/produkty';

fs.mkdirSync(path.join(FIX, 'f'), { recursive: true });
const pobierz = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`); return r.text(); };

let html = await pobierz(`${ZRODLO}?cb=${process.pid}`);
const mCss = html.match(/href="(https:\/\/cdn\.prod\.website-files\.com\/[^"]*\.webflow\.shared\.[^"]*\.css)"/);
if (!mCss) throw new Error('KONTROLA FIKSTURY: brak arkusza Webflow w <head>');
let css = await pobierz(mCss[1]);
for (const m of css.matchAll(/url\((https:\/\/[^)]*DMSans-(\w+)\.woff2)\)/g)) {
  const cel = path.join(FIX, 'f', `dm-${m[2]}.woff2`);
  if (!fs.existsSync(cel)) fs.writeFileSync(cel, Buffer.from(await (await fetch(m[1])).arrayBuffer()));
  css = css.split(m[1]).join(`f/dm-${m[2]}.woff2`);
}
fs.writeFileSync(path.join(FIX, 'webflow.css'), css);

const mSkrypt = html.match(/src="(https:\/\/cdn\.prod\.website-files\.com\/[^"]*mpzachetatrybu-[\d.]+\.js)"/);
if (!mSkrypt) throw new Error('KONTROLA FIKSTURY: zachety nie ma na /produkty — nie ma czego mierzyc');
/* SKRYPT_Z_PLIKU=<wersja> podmienia bajty z CDN-u na plik z repozytorium.
   Po to, zeby dalo sie pokazac, ze te asercje UMIEJA SPASC: bieg na 0.8.1
   musi wywalic `position` i `prostokat`. Zielen bez takiego dowodu jest
   opisem, nie pomiarem. */
let skrypt, wersja;
if (process.env.SKRYPT_Z_PLIKU) {
  wersja = process.env.SKRYPT_Z_PLIKU + ' (z repozytorium)';
  const zr = fs.readFileSync(path.join(KORZEN, 'narzedzia', `mpzachetatrybu-${process.env.SKRYPT_Z_PLIKU}.js`), 'utf8');
  skrypt = zr.slice(zr.search(/\(function\s*\(\)\s*\{/));
} else {
  skrypt = await pobierz(mSkrypt[1]);
  wersja = (mSkrypt[1].match(/mpzachetatrybu-([\d.]+)\.js/) || [])[1];
}

html = html.replace(mCss[1], 'webflow.css')
  .replace(/(<link[^>]*href="webflow\.css"[^>]*?)\s*integrity="[^"]*"/, '$1')
  .replace(/(<link[^>]*href="webflow\.css"[^>]*?)\s*crossorigin="[^"]*"/, '$1')
  .replace(/<script[^>]*src="https:\/\/[^"]*"[^>]*><\/script>/g, '')
  .replace(/(<img[^>]*?)src="https:\/\/[^"]*"/g, '$1src=""');
fs.writeFileSync(path.join(FIX, 'bez.html'), html);
fs.writeFileSync(path.join(FIX, 'z.html'), html.replace('</head>', `<script>${skrypt}</script>\n</head>`));

const TYPY = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2' };
const serwer = http.createServer((q, o) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const p = path.join(FIX, u === '/' ? 'bez.html' : u);
  if (!p.startsWith(FIX) || !fs.existsSync(p)) { o.writeHead(404).end(); return; }
  o.writeHead(200, { 'content-type': TYPY[path.extname(p)] || 'application/octet-stream' });
  o.end(fs.readFileSync(p));
});
await new Promise((r) => serwer.listen(0, '127.0.0.1', r));
const BAZA = `http://127.0.0.1:${serwer.address().port}`;

const b = await chromium.launch({ args: ['--no-proxy-server'] });
async function zmierz(plik) {
  const k = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await k.newPage();
  await p.goto(`${BAZA}/${plik}`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => { const t = document.querySelector('.product-index__toolbar');
    if (t) t.classList.add('product-index__toolbar--visible'); });
  await p.waitForTimeout(500);
  const s = await p.evaluate(() => {
    const el = document.querySelector('.index-toggle-wrapper');
    if (!el) return { brak: true };
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), po = getComputedStyle(el, '::after');
    return { radius: cs.borderRadius, position: cs.position, display: cs.display, zIndex: cs.zIndex,
      overflow: cs.overflow, prostokat: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      okno: [innerWidth, innerHeight], pasmo: po.content, anim: po.animationName };
  });
  await k.close();
  return s;
}

let padlo = 0, seria = 0;
const A = (ok, opis, zm) => { seria++; if (!ok) { padlo++; console.log(`  ✗ ${opis}${zm !== undefined ? ` — ${JSON.stringify(zm)}` : ''}`); } };

const bez = await zmierz('bez.html');
const z = await zmierz('z.html');
console.log(`mpZachetaTrybu ${wersja} na /produkty — ${skrypt.length} znaków z CDN Webflow\n`);

A(!bez.brak && !z.brak, 'pigułka istnieje w obu przebiegach');
A(bez.radius === '100px', 'KONTROLA ARKUSZA: border-radius 100px — arkusz Webflow naprawdę zadziałał', bez.radius);
A(bez.pasmo === 'none' && z.pasmo === '""', 'KONTROLA RÓŻNICOWA: pasmo jest TYLKO z zachętą', [bez.pasmo, z.pasmo]);
A(z.anim === 'mpP', 'pasmo animowane', z.anim);

/* Sedno: wszystko poza `overflow` ma byc identyczne. */
A(z.position === bez.position, 'position NIETKNIĘTY przez zachętę', [bez.position, z.position]);
A(z.display === bez.display, 'display nietknięty', [bez.display, z.display]);
A(z.zIndex === bez.zIndex, 'z-index nietknięty', [bez.zIndex, z.zIndex]);
A(JSON.stringify(z.prostokat) === JSON.stringify(bez.prostokat),
  'PROSTOKĄT CO DO PIKSELA taki sam jak bez zachęty', { bez: bez.prostokat, z: z.prostokat });
A(z.overflow === 'hidden', 'overflow:hidden — jedyna dozwolona różnica, przycina pasmo', z.overflow);
A(z.prostokat[1] + z.prostokat[3] <= z.okno[1], 'pigułka mieści się nad dolną krawędzią ekranu',
  [z.prostokat[1] + z.prostokat[3], z.okno[1]]);

/* ── Czy POMIAR w ogole odpala ────────────────────────────────────────────
   Wysylka zdarzen jest oslonieta `if (!window.posthog)`, wiec skrypt, ktory
   nic nie mierzy, wyglada dokladnie tak samo jak skrypt, ktory mierzy dobrze.
   Podstawiamy atrape `posthog.capture` i patrzymy, co do niej wpada.
   Na produkcji posthog stoi za Cookiebotem — te zdarzenia beda sie odkladac
   tylko dla osob ze zgoda na statystyki, tak samo jak `$pageview`, wiec
   ILORAZ klikniec do pokazan zostaje wazny, a wartosci bezwzgledne nie. */
console.log('\n=== POMIAR ===');
{
  const k = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await k.newPage();
  await p.addInitScript(() => {
    window.__zlapane = [];
    window.posthog = { capture: (n, d) => window.__zlapane.push([n, d]) };
  });
  await p.goto(`${BAZA}/z.html`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);

  const przedPokazaniem = await p.evaluate(() => window.__zlapane.slice());
  A(przedPokazaniem.length === 0,
    'KONTROLA ZERA: dopoki przelacznik jest schowany, nic nie leci', przedPokazaniem);

  await p.evaluate(() => document.querySelector('.product-index__toolbar')
    .classList.add('product-index__toolbar--visible'));
  await p.waitForTimeout(300);
  const poPokazaniu = await p.evaluate(() => window.__zlapane.slice());
  A(poPokazaniu.length === 1 && poPokazaniu[0][0] === 'mp_toggle_shown',
    'pokazanie przelacznika wysyla mp_toggle_shown', poPokazaniu);
  A(poPokazaniu[0] && poPokazaniu[0][1] && poPokazaniu[0][1].powierzchnia === 'produkty',
    'zdarzenie niesie powierzchnia=produkty', poPokazaniu[0] && poPokazaniu[0][1]);
  A(poPokazaniu[0] && poPokazaniu[0][1] && poPokazaniu[0][1].zacheta === 'polysk',
    'zdarzenie niesie zacheta=polysk', poPokazaniu[0] && poPokazaniu[0][1]);

  /* Toolbar chowa sie i wraca — mianownik ma sie NIE zwiekszyc. */
  await p.evaluate(() => { const t = document.querySelector('.product-index__toolbar');
    t.classList.remove('product-index__toolbar--visible');
    t.classList.add('product-index__toolbar--visible'); });
  await p.waitForTimeout(200);
  const poOscylacji = await p.evaluate(() => window.__zlapane.length);
  A(poOscylacji === 1, 'schowanie i ponowne pokazanie NIE liczy sie drugi raz — ' +
    'inaczej mianownik mierzylby przewijanie, nie ekspozycje', poOscylacji);

  await p.click('.index-toggle-wrapper');
  await p.waitForTimeout(200);
  const poKlikniciu = await p.evaluate(() => ({
    zlapane: window.__zlapane.slice(), pamiec: localStorage.getItem('mp-index-uzyty') }));
  A(poKlikniciu.zlapane.length === 2 && poKlikniciu.zlapane[1][0] === 'mp_toggle_clicked',
    'klikniecie wysyla mp_toggle_clicked', poKlikniciu.zlapane.map((x) => x[0]));
  A(poKlikniciu.pamiec === '1', 'klikniecie zapisuje pamiec „juz uzyl"', poKlikniciu.pamiec);
  console.log(`  wyslane: ${poKlikniciu.zlapane.map((x) => x[0]).join(', ')}`);
  console.log(`  wlasciwosci: ${JSON.stringify(poKlikniciu.zlapane[0] && poKlikniciu.zlapane[0][1])}`);
  await k.close();
}

console.log(`  bez zachęty: ${JSON.stringify(bez.prostokat)}  position=${bez.position}`);
console.log(`  z zachętą  : ${JSON.stringify(z.prostokat)}  position=${z.position}`);
console.log(`\nasercji: ${seria} | padnięć: ${padlo}`);
await b.close(); serwer.close();
process.exit(padlo ? 1 : 0);
