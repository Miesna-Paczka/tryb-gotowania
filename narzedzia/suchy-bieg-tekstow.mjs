/* suchy-bieg-tekstow.mjs — brzmienia dialogów S2 i S4 na WYRENDEROWANYM oknie,
 * nie na literałach w źródle. Powód jest zmierzony: błąd zgodności liczby
 * („postęp przepisu ZOSTANĄ ZAPAMIĘTANE", D-40.2) przeżył w produkcji, bo żadna
 * próba nie czytała treści dialogu — matryca mierzyła jego geometrię.
 *
 * Kontrola negatywna jest wpisana w asercję: obok formy poprawnej próba pyta
 * wprost o NIEOBECNOŚĆ formy błędnej. Sama zgodność z oczekiwanym napisem
 * spadłaby także wtedy, gdyby dialog w ogóle się nie otworzył — stąd osobne
 * pytanie o to, że dialog istnieje i ma tytuł.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-tekstow.mjs [--stary <plik.min.js>]
 */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
  .catch(() => import('playwright'));
const PRZEGLADARKI = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'];
const ARG = process.argv.indexOf('--stary');
const PLIK = ARG > -1 ? process.argv[ARG + 1] : 'tryb-gotowania.min.js';
const TRYB = fs.readFileSync(PLIK, 'utf8');
const strona = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>window.MP={zegar:{__t:1000000000000,teraz:function(){return this.__t}}};</script>
<script>${TRYB}</script></body>`;

const przegladarka = await (async () => {
  for (const s of PRZEGLADARKI) {
    try { return await chromium.launch({ executablePath: s, args: ['--no-sandbox', '--ignore-certificate-errors'] }); }
    catch (e) { /* następna */ }
  }
  throw new Error('nie znalazłem Chromium');
})();
const kontekst = await przegladarka.newContext({ viewport: { width: 390, height: 844 } });
const ADRES = 'https://proba.test/przepis';
await kontekst.route(ADRES, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: strona }));

let zdane = 0, oblane = 0;
const spr = (w, o, sz) => { if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (sz ? '\n      ' + sz : '')); } };

const MODEL = { skladniki: [], porcjeBazowe: 2, tytul: 'próba', czas: '30', meta: [], zamienniki: {}, bledy: [], pola: {},
  kroki: [{ tytul: 'x', tekst: 'x', tekstHtml: 'x', czas: null, minutnik: { sekundy: 300, nazwa: 'a' },
    kryterium: null, kryteriumHtml: 'k', skladniki: [], skladnikiTeraz: [], skladnikiDalej: [], skladnikiZuzyte: [] }] };

const k = await kontekst.newPage();
await k.goto(ADRES);
await k.evaluate((m) => { window.MP.tryb.otworz(m, { model: m, porcje: 2 }); }, MODEL);
await k.waitForTimeout(140);

const dialog = () => k.evaluate(() => ({
  rodzaj: window.MP.tryb.dialog.rodzaj(),
  tytul: String((document.querySelector('.mp-tryb__dialog-tytul') || {}).textContent || '').trim(),
  tresc: String((document.querySelector('.mp-tryb__dialog-tresc') || {}).textContent || '').trim(),
  cta: [].slice.call(document.querySelectorAll('.mp-tryb__dialog-cta,.mp-tryb__dialog-link')).map(e => e.textContent.trim()),
}));

console.log(`\n═══ brzmienia dialogów — ${PLIK} ═══`);

// ── S2 ──────────────────────────────────────────────────────────────────────
{
  await k.evaluate(() => window.MP.tryb.dialog.otworz('S2'));
  await k.waitForTimeout(200);
  const d = await dialog();
  console.log('\n[1] S2 — potwierdzenie wyjścia');
  spr(d.rodzaj === 'S2' && d.tytul === 'Przerwać gotowanie?', 'dialog otwarty, tytuł „Przerwać gotowanie?"', JSON.stringify(d));
  spr(d.tresc === 'Minutniki przestaną odliczać, a postęp przepisu zostanie zapamiętany do następnego razu.',
    'treść w poprawnej liczbie: „postęp … zostanie zapamiętany"', 'jest: ' + JSON.stringify(d.tresc));
  spr(!/zostaną zapamiętane/.test(d.tresc), 'brak formy niezgodnej: „zostaną zapamiętane" (D-40.2)');
  spr(d.cta.length === 2, 'dwa wyjścia z dialogu', JSON.stringify(d.cta));
  await k.evaluate(() => window.MP.tryb.dialog.zamknij());
  await k.waitForTimeout(150);
}
// ── S4 ──────────────────────────────────────────────────────────────────────
{
  await k.evaluate(() => window.MP.tryb.dialog.otworz('S4'));
  await k.waitForTimeout(200);
  const d = await dialog();
  console.log('\n[2] S4 — limit minutników');
  spr(d.rodzaj === 'S4' && d.tytul === 'Dwa minutniki naraz', 'dialog otwarty, tytuł „Dwa minutniki naraz"', JSON.stringify(d));
  spr(d.tresc === 'Zakończ jeden z odliczających, żeby zrobić miejsce na kolejny.',
    'treść bez zmian', 'jest: ' + JSON.stringify(d.tresc));
  await k.evaluate(() => window.MP.tryb.dialog.zamknij());
}
// ── kontrola na artefakcie ──────────────────────────────────────────────────
{
  console.log('\n[3] kontrola: forma niezgodna nie występuje w całym artefakcie');
  spr(!TRYB.includes('zostaną zapamiętane'), `brak „zostaną zapamiętane" w ${PLIK}`);
}

console.log(`\n───────────────────────────────\nzdane ${zdane} · oblane ${oblane}`);
await przegladarka.close();
process.exit(oblane ? 1 : 0);
