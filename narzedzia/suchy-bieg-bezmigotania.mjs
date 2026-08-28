/* suchy-bieg-bezmigotania.mjs — czy `mpBezMigotania 1.4.1` chowa to, co ma chowac,
 * NIE chowa daty, i czy jego zawor nie odpala, gdy embedy wstaly.
 *
 * PO CO TA PROBA POWSTALA. Zdjecie `mpDataPl` ze strony i zdjecie reguly
 * `visibility:hidden` z `mpBezMigotania` to JEDEN ruch, nie dwa — i drugi jest
 * warunkiem pierwszego. Warunek zaworu brzmial:
 *     if(!kroki || !window.mpSkladniki || !window.mpDataPl)
 * Po usunieciu `mpDataPl` ze strony `window.mpDataPl` jest ZAWSZE undefined, wiec
 * warunek bylby ZAWSZE prawdziwy, a zawor odpalalby na KAZDYM wejsciu po 8 s:
 * zdjalby `mp-js` i odslonil zrodlowa liste krokow OBOK wyrenderowanej.
 * To dokladnie ta awaria, ktora raz juz przeszla za stan normalny i kosztowala
 * dwie wersje embedu doczepiane do listy, ktorej uzytkownik nie widzi.
 * Wiersz [3] jest po to, zeby to nie przeszlo drugi raz.
 *
 * KONTROLA NEGATYWNA: te same asercje na 1.4.0 musza PASC — tamta wersja chowa
 * date i jej zawor pyta o `mpDataPl`. Podaje sie ja przez `--stary`.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-bezmigotania.mjs [--stary <plik.js>]
 */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
  .catch(() => import('playwright'));
const PRZEGLADARKI = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'];
const I = process.argv.indexOf('--stary');
const PLIK = I > -1 ? process.argv[I + 1] : 'narzedzia/mpbezmigotania-1.4.1.js';
const SKRYPT = fs.readFileSync(PLIK, 'utf8');
console.log(`\n═══ mpBezMigotania — ${PLIK} ═══`);

const przegladarka = await (async () => {
  for (const s of PRZEGLADARKI) {
    try { return await chromium.launch({ executablePath: s, args: ['--no-sandbox'] }); }
    catch (e) { /* następna */ }
  }
  throw new Error('nie znalazłem Chromium');
})();
let zdane = 0, oblane = 0;
const spr = (w, o, sz) => { if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (sz ? '\n      ' + sz : '')); } };

/* Strona próbna niesie DOKŁADNIE te węzły, o które pyta reguła — plus datę.
   `embedyWstaly` decyduje, czy udajemy stronę, na której renderery ruszyły. */
const strona = (embedyWstaly) => `<!doctype html><meta charset="utf-8"><body>
<div data-mp-kroki-html>zrodlowa lista krokow</div>
<div data-mp-skladniki-html>zrodlowe skladniki</div>
<div data-mp-karta-grupa>karta</div>
<div class="recipe-hero__byline"><div data-mp-zaktualizowano>19.08.2026</div></div>
<div class="mp-krok__row">wyrenderowany krok</div>
${embedyWstaly ? '<script>window.mpKrokiEmbed={};window.mpSkladniki={};<\/script>' : ''}
<script>${SKRYPT}<\/script></body>`;

const ADRES = 'https://proba.test/przepis';
async function karta(embedyWstaly) {
  const ctx = await przegladarka.newContext({ viewport: { width: 393, height: 850 } });
  await ctx.route(ADRES, (r) => r.fulfill({ status: 200,
    contentType: 'text/html; charset=utf-8', body: strona(embedyWstaly) }));
  const k = await ctx.newPage();
  await k.goto(ADRES);
  return { k, ctx };
}
const czytaj = (k) => k.evaluate(() => {
  const w = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const c = getComputedStyle(e), q = e.getBoundingClientRect();
    return { display: c.display, visibility: c.visibility,
      widoczny: c.display !== 'none' && c.visibility !== 'hidden' && q.width > 0 }; };
  return { mpJs: document.documentElement.classList.contains('mp-js'),
    kroki: w('[data-mp-kroki-html]'), skladniki: w('[data-mp-skladniki-html]'),
    karta: w('[data-mp-karta-grupa]'), data: w('[data-mp-zaktualizowano]'),
    render: w('.mp-krok__row') };
});

// ── 1. Chowa to, co ma chowac ───────────────────────────────────────────────
{
  const { k, ctx } = await karta(true); const s = await czytaj(k);
  console.log('\n[1] wezly zrodlowe schowane, render widoczny');
  spr(s.mpJs, '`mp-js` zalozone na <html>');
  spr(!s.kroki.widoczny, 'zrodlowa lista krokow schowana', JSON.stringify(s.kroki));
  spr(!s.skladniki.widoczny, 'zrodlowe skladniki schowane', JSON.stringify(s.skladniki));
  spr(!s.karta.widoczny, 'karta schowana', JSON.stringify(s.karta));
  spr(s.render.widoczny, 'wyrenderowany krok WIDOCZNY', JSON.stringify(s.render));
  await ctx.close();
}
// ── 2. NIE chowa daty — to jest cala tresc zmiany 1.4.1 ─────────────────────
/* Asercja pyta o `visibility`, nie o `display`: reguła 1.4.0 uzywala wlasnie
   `visibility`, a element `visibility:hidden` ma `display:block` i pelna
   szerokosc. Sonda pytajaca o `display` przepuscilaby ten stan jako zielony —
   raz juz tak sie stalo przy diagnozie belki. */
{
  const { k, ctx } = await karta(true); const s = await czytaj(k);
  console.log('\n[2] data NIE jest chowana');
  spr(s.data.visibility !== 'hidden', 'visibility ≠ hidden', JSON.stringify(s.data));
  spr(s.data.widoczny, 'data widoczna od pierwszej klatki', JSON.stringify(s.data));
}
// ── 3. Zawor NIE odpala, gdy embedy wstaly ──────────────────────────────────
/* Najwazniejszy wiersz tej proby — patrz naglowek pliku. */
{
  const { k, ctx } = await karta(true);
  await k.waitForTimeout(8600);
  const s = await czytaj(k);
  console.log('\n[3] po 8 s przy WSTALYCH embedach zawor MILCZY');
  spr(s.mpJs, '`mp-js` NADAL zalozone — zrodlo zostaje schowane', JSON.stringify({ mpJs: s.mpJs }));
  spr(!s.kroki.widoczny, 'zrodlowa lista krokow NADAL schowana', JSON.stringify(s.kroki));
  await ctx.close();
}
// ── 4. Zawor ODPALA, gdy embedy nie wstaly ──────────────────────────────────
{
  const { k, ctx } = await karta(false);
  await k.waitForTimeout(8600);
  const s = await czytaj(k);
  console.log('\n[4] po 8 s przy MARTWYCH embedach zawor odslania zrodlo');
  spr(!s.mpJs, '`mp-js` zdjete', JSON.stringify({ mpJs: s.mpJs }));
  spr(s.kroki.widoczny, 'zrodlowa lista krokow odsloniona', JSON.stringify(s.kroki));
  await ctx.close();
}
// ── 5. Kontrola tekstowa ────────────────────────────────────────────────────
{
  console.log('\n[5] kontrole tekstowe na artefakcie');
  const kod = SKRYPT.split('*/').slice(1).join('*/');   // bez naglowka komentarza
  spr(!/zaktualizowano/.test(kod), 'w KODZIE nie ma juz `zaktualizowano`');
  spr(!/mpDataPl/.test(kod), 'w KODZIE nie ma juz `mpDataPl`');
}

console.log(`\n───────────────────────────────\nzdane ${zdane} · oblane ${oblane}`);
await przegladarka.close();
process.exit(oblane ? 1 : 0);
