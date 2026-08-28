/* suchy-bieg-intencji.mjs — S4 domyka pętlę (D-40.5).
 *
 * Do 2026-08-20 odmowa zabierała ze sobą INTENCJĘ: użytkownik prosił o minutnik,
 * dostawał okno „Zakończ jeden z odliczających, żeby zrobić miejsce na kolejny",
 * zwalniał miejsce — i musiał poprosić drugi raz. Okno obiecywało coś, czego nie
 * robiło. Teraz „zakończ" niesie obie połowy i mówi o tym w etykiecie.
 *
 * Ta próba pyta o OBIE strony kontraktu, bo sama „intencja działa" byłaby
 * niebezpieczna: pamięć, która przeżywa okno, jest gorsza niż jej brak —
 * użytkownik dostałby minutnik zamówiony trzy kroki wcześniej. Stąd cztery
 * drogi wyjścia z dialogu i asercja, że tylko JEDNA coś uruchamia.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-intencji.mjs [--stary <plik.min.js>]
 */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
  .catch(() => import('playwright'));
const ARG = process.argv.indexOf('--stary');
const PLIK = ARG > -1 ? process.argv[ARG + 1] : 'tryb-gotowania.min.js';
const TRYB = fs.readFileSync(PLIK, 'utf8');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
  .catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }));
const ADRES = 'https://proba.test/x';
const MODEL = { skladniki: [], porcjeBazowe: 2, tytul: 'p', czas: '30', meta: [], zamienniki: {}, bledy: [], pola: {},
  kroki: [{ tytul: 'x', tekst: 'x', tekstHtml: 'x', czas: null, minutnik: { sekundy: 300, nazwa: 'a' },
    kryterium: null, kryteriumHtml: 'k', skladniki: [], skladnikiTeraz: [], skladnikiDalej: [], skladnikiZuzyte: [] }] };

let zdane = 0, oblane = 0;
const spr = (w, o, s) => { if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (s ? '\n      ' + s : '')); } };

async function scena() {
  const ctx = await b.newContext({ viewport: { width: 320, height: 844 } });   // NAJWĘŻSZA ramka matrycy
  await ctx.route(ADRES, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8',
    body: `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>window.MP={zegar:{__t:1e12,teraz:function(){return this.__t}}};</script>
<script>${TRYB}</script></body>` }));
  const k = await ctx.newPage();
  await k.goto(ADRES);
  await k.evaluate((m) => { window.MP.tryb.otworz(m, { model: m, porcje: 2 }); }, MODEL);
  await k.evaluate(() => { window.MP.tryb.minutniki.uruchom({ nazwa: 'sos', sekundy: 360, podpowiedz: 'k' });
                           window.MP.tryb.minutniki.uruchom({ nazwa: 'ryż', sekundy: 900, podpowiedz: 'k' }); });
  await k.waitForTimeout(200);
  await k.evaluate(() => window.MP.tryb.minutniki.uruchom({ nazwa: 'kurczak', sekundy: 300, podpowiedz: 'złoty' }));
  await k.waitForTimeout(220);
  return { k, ctx };
}
const stan = (k) => k.evaluate(() => ({
  dialog: window.MP.tryb.dialog.rodzaj(),
  nazwy: [].slice.call(document.querySelectorAll('.mp-tryb__nazwa-min')).map((e) => e.textContent.trim()),
  etykiety: [].slice.call(document.querySelectorAll('.mp-tryb__dialog-min-koniec')).map((e) => e.textContent.trim()),
  /* Podpowiedź czytamy Z PIGUŁKI O DANEJ NAZWIE, nie pierwszą z brzegu:
     w stosie stoją dwa kafle i pierwszy `.mp-tryb__podpowiedz` należy do
     sąsiada, więc naiwny odczyt mierzyłby cudzy tekst. */
  podpowiedzKurczaka: (function () {
    var pig = [].slice.call(document.querySelectorAll('.mp-tryb__pigulka')).filter(function (x) {
      var n = x.querySelector('.mp-tryb__nazwa-min');
      return n && /kurczak/.test(n.textContent);
    })[0];
    var pp = pig && pig.querySelector('.mp-tryb__podpowiedz');
    return pp ? pp.textContent.trim() : null;
  })(),
}));

console.log(`\n═══ intencja S4 — ${PLIK} ═══`);

// ── 1. etykieta niesie konsekwencję ─────────────────────────────────────────
{
  const { k, ctx } = await scena(); const s = await stan(k);
  console.log('\n[1] okno odmowy — etykieta mówi, co się stanie');
  spr(s.dialog === 'S4', 'dialog S4 podniesiony', String(s.dialog));
  spr(s.etykiety.length === 2 && s.etykiety.every((t) => t === 'zakończ i włącz „kurczak"'),
    'oba wiersze: „zakończ i włącz „kurczak""', JSON.stringify(s.etykiety));
  /* Etykieta urosła, a najwęższa ramka matrycy to 320 px — pytamy o układ,
     nie tylko o brzmienie: przycisk nie może wyjść poza wiersz dialogu. */
  const miesci = await k.evaluate(() => {
    const w = document.querySelector('.mp-tryb__dialog-min');
    const btn = w.querySelector('.mp-tryb__dialog-min-koniec');
    const rw = w.getBoundingClientRect(), rb = btn.getBoundingClientRect();
    return { miesci: rb.right <= rw.right + 0.5 && rb.left >= rw.left - 0.5,
      wiersz: Math.round(rw.width), przycisk: Math.round(rb.width),
      przelewa: Math.round(rb.right - rw.right) };
  });
  spr(miesci.miesci, 'przycisk mieści się w wierszu przy 320 px', JSON.stringify(miesci));
  await ctx.close();
}
// ── 2. „zakończ i włącz" robi OBIE rzeczy ───────────────────────────────────
{
  const { k, ctx } = await scena();
  await k.evaluate(() => { const w = [].slice.call(document.querySelectorAll('.mp-tryb__dialog-min'))
      .find((x) => /sos/.test(x.textContent)); w.querySelector('.mp-tryb__dialog-min-koniec').click(); });
  await k.waitForTimeout(400);
  const s = await stan(k);
  console.log('\n[2] „zakończ i włącz" — obie połowy');
  spr(s.dialog === null, 'dialog zamknięty', String(s.dialog));
  spr(s.nazwy.indexOf('sos') === -1, '„sos" zakończony', JSON.stringify(s.nazwy));
  spr(s.nazwy.indexOf('kurczak') > -1, '„kurczak" URUCHOMIONY bez drugiej prośby', JSON.stringify(s.nazwy));
  spr(s.nazwy.length === 2, 'limit dwóch nadal trzyma', JSON.stringify(s.nazwy));
  spr(s.podpowiedzKurczaka === 'złoty', 'żądanie przeniesione w całości, z podpowiedzią', String(s.podpowiedzKurczaka));
  await ctx.close();
}
// ── 3. KAŻDE INNE wyjście gasi intencję ─────────────────────────────────────
for (const [opis, akcja] of [
  ['„wróć do gotowania"', (k) => k.evaluate(() => document.querySelector('.mp-tryb__dialog-cta').click())],
  ['API zamknijDialog()', (k) => k.evaluate(() => window.MP.tryb.dialog.zamknij())],
]) {
  const { k, ctx } = await scena();
  await akcja(k); await k.waitForTimeout(400);
  const s = await stan(k);
  console.log(`\n[3] wyjście przez ${opis} — intencja ma zginąć`);
  spr(s.dialog === null, 'dialog zamknięty', String(s.dialog));
  spr(s.nazwy.indexOf('kurczak') === -1, '„kurczak" NIE wystartował', JSON.stringify(s.nazwy));
  spr(s.nazwy.length === 2 && s.nazwy.indexOf('sos') > -1, 'oba poprzednie minutniki nietknięte', JSON.stringify(s.nazwy));
  await ctx.close();
}
// ── 4. dialog bez intencji zachowuje dawne brzmienie ────────────────────────
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(ADRES, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8',
    body: `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>window.MP={zegar:{__t:1e12,teraz:function(){return this.__t}}};</script>
<script>${TRYB}</script></body>` }));
  const k = await ctx.newPage(); await k.goto(ADRES);
  await k.evaluate((m) => { window.MP.tryb.otworz(m, { model: m, porcje: 2 }); }, MODEL);
  await k.evaluate(() => { window.MP.tryb.minutniki.uruchom({ nazwa: 'sos', sekundy: 360 }); });
  await k.evaluate(() => window.MP.tryb.dialog.otworz('S4'));   // BEZ intencji
  await k.waitForTimeout(200);
  const s = await stan(k);
  console.log('\n[4] dialog otwarty bez odmowy — brzmienie bez zmian');
  spr(s.etykiety.length > 0 && s.etykiety.every((t) => t === 'zakończ'),
    'etykieta to gołe „zakończ"', JSON.stringify(s.etykiety));
  await k.evaluate(() => { document.querySelector('.mp-tryb__dialog-min-koniec').click(); });
  await k.waitForTimeout(400);
  const s2 = await stan(k);
  spr(s2.nazwy.length === 0, 'zamyka minutnik i niczego nie uruchamia', JSON.stringify(s2.nazwy));
  await ctx.close();
}
console.log(`\n───────────────────────────────\nzdane ${zdane} · oblane ${oblane}`);
await b.close();
process.exit(oblane ? 1 : 0);
