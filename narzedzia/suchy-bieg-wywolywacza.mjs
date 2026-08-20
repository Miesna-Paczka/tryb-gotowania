/* suchy-bieg-wywolywacza.mjs — wywoływacz listy składników („zobacz pozostałe")
 * po ujednoliceniu z pigułką (D-40.3): jeden glif + obrót, nie dwa glify.
 *
 * Próba pyta o CZTERY rzeczy naraz, bo każda z osobna dałaby się oszukać:
 *   1) glif jest stały — a nie „akurat ten, który pasuje do stanu",
 *   2) obrót zależy od `aria-expanded`, czyli od stanu, który przycisk ogłasza
 *      czytnikom ekranu; rozjazd między nimi byłby błędem dostępności,
 *   3) wartości przejścia są TE SAME co w pigułce i w akordeonie produktówki,
 *   4) `keyboard_arrow_up` zniknął ze zbioru ligatur — bo zbiór ma opisywać
 *      UŻYCIE, nie katalog subsetu.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-wywolywacza.mjs [--stary <plik.min.js>]
 */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
  .catch(() => import('playwright'));
const ARG = process.argv.indexOf('--stary');
const PLIK = ARG > -1 ? process.argv[ARG + 1] : 'tryb-gotowania.min.js';
const TRYB = fs.readFileSync(PLIK, 'utf8');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
  .catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }));
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const ADRES = 'https://proba.test/x';
await ctx.route(ADRES, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8',
  body: `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>window.MP={zegar:{__t:1e12,teraz:function(){return this.__t}}};</script>
<script>${TRYB}</script></body>` }));
const p = await ctx.newPage(); await p.goto(ADRES);

let zdane = 0, oblane = 0;
const spr = (w, o, s) => { if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (s ? '\n      ' + s : '')); } };

/* Krok musi mieć składniki „teraz" ORAZ resztę — bez reszty `maReszte` jest
   fałszem i wywoływacz w ogóle nie powstaje (przycisk obiecywałby pustkę). */
const S = (t) => ({ tresc: t, ilosc: null, jednostka: null, nazwa: t, slug: t });
const MODEL = { skladniki: [S('sól'), S('pieprz'), S('olej')], porcjeBazowe: 2, tytul: 'p', czas: '30',
  meta: [], zamienniki: {}, bledy: [], pola: {},
  kroki: [{ tytul: 'x', tekst: 'x', tekstHtml: 'x', czas: null, minutnik: null, kryterium: null,
    kryteriumHtml: null, skladniki: [S('sól')], skladnikiTeraz: [S('sól')],
    skladnikiDalej: [S('pieprz'), S('olej')], skladnikiZuzyte: [] }] };
await p.evaluate((m) => { window.MP.tryb.otworz(m, { model: m, porcje: 2 }); }, MODEL);
await p.evaluate(() => window.MP.tryb.pokazKrok(1));
await p.waitForTimeout(220);

const czytaj = () => p.evaluate(() => {
  const w = document.querySelector('.mp-tryb__wiecej');
  if (!w) return { brak: true };
  const g = w.querySelector('.mp-tryb__wiecej-glif'), s = getComputedStyle(g);
  const m = s.transform.match(/matrix\(([^)]+)\)/);
  const kat = m ? Math.round(Math.atan2(parseFloat(m[1].split(',')[1]), parseFloat(m[1].split(',')[0])) * 180 / Math.PI) : 0;
  return { glif: (g.textContent || '').trim(), kat, aria: w.getAttribute('aria-expanded'),
    tekst: String((w.querySelector('.mp-tryb__wiecej-tekst') || {}).textContent || '').trim(),
    trwanie: s.transitionDuration, wlasnosc: s.transitionProperty,
    otwarta: window.MP.tryb.listaOtwarta() };
});

console.log(`\n═══ wywoływacz listy — ${PLIK} ═══`);
{
  const s = await czytaj();
  console.log('\n[1] lista zwinięta');
  spr(!s.brak, 'wywoływacz istnieje (krok ma resztę składników)', JSON.stringify(s));
  spr(s.glif === 'keyboard_arrow_down', 'glif bazowy „keyboard_arrow_down"', 'jest: ' + s.glif);
  spr(s.kat === 0, 'obrót 0° → strzałka w DÓŁ', s.kat + '°');
  spr(s.aria === 'false' && s.tekst === 'zobacz pozostałe', 'aria-expanded=false, etykieta „zobacz pozostałe"', JSON.stringify(s));
}
{
  await p.evaluate(() => document.querySelector('.mp-tryb__wiecej').click());
  await p.waitForTimeout(600);
  const s = await czytaj();
  console.log('\n[2] lista rozwinięta');
  spr(s.otwarta === true, 'lista faktycznie otwarta', String(s.otwarta));
  spr(s.glif === 'keyboard_arrow_down', 'TEN SAM glif — bez podmiany', 'jest: ' + s.glif);
  spr(Math.abs(s.kat) === 180, 'obrót 180° → strzałka w GÓRĘ', s.kat + '°');
  spr(s.aria === 'true' && s.tekst === 'zwiń', 'aria-expanded=true, etykieta „zwiń"', JSON.stringify(s));
}
{
  await p.evaluate(() => document.querySelector('.mp-tryb__wiecej').click());
  await p.waitForTimeout(600);
  const s = await czytaj();
  console.log('\n[3] powrót do zwiniętej');
  spr(s.kat === 0 && s.aria === 'false', 'obrót wraca do 0°, aria wraca do false', JSON.stringify(s));
}
{
  const s = await czytaj();
  console.log('\n[4] przejście 1:1 z pigułką i z akordeonem produktowym');
  spr(s.wlasnosc === 'transform', 'transition-property = transform', s.wlasnosc);
  spr(s.trwanie === '0.28s', 'transition-duration = 0.28s', s.trwanie);
}
{
  console.log('\n[5] zbiór ligatur opisuje UŻYCIE, nie katalog');
  const lig = await p.evaluate(() => window.MP.tryb.zbiorLigatur());
  spr(lig.indexOf('keyboard_arrow_up') === -1, '`keyboard_arrow_up` zniknął ze zbioru', JSON.stringify(lig));
  spr(lig.indexOf('keyboard_arrow_down') > -1, '`keyboard_arrow_down` w zbiorze został');
  spr(lig.length === 12, 'zbiór ma 12 pozycji', 'jest: ' + lig.length);
  const uzyte = await p.evaluate(() => [].slice.call(document.querySelectorAll('[data-mp-ligatura]'))
    .map((e) => e.getAttribute('data-mp-ligatura')));
  spr(uzyte.every((n) => lig.indexOf(n) > -1), 'każdy glif narysowany na ekranie jest w zbiorze', JSON.stringify(uzyte));
}
{
  console.log('\n[6] kontrola: podmiany glifu nie ma w artefakcie');
  spr(!/wiecej-glif[^;]{0,120}keyboard_arrow_up/.test(TRYB) && !TRYB.includes("?'keyboard_arrow_up'"),
    'brak warunkowego przypisania `keyboard_arrow_up`');
}
console.log(`\n───────────────────────────────\nzdane ${zdane} · oblane ${oblane}`);
await b.close();
process.exit(oblane ? 1 : 0);
