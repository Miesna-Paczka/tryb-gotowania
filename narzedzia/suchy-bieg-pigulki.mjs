/* suchy-bieg-pigulki.mjs — czy przyciski pigułki minutnika robią to, co rysunek.
 *
 * Wiersze I-33/I-34/I-35 (wprowadzone 2026-08-20 po odczycie Figmy `7211:10925`
 * i `7240:10918`). Do tego dnia runtime renderował „zatrzymaj" / „dodaj minutę" /
 * „uruchom ponownie" — TRZY etykiety, których nie ma w żadnej klatce — i miał
 * półzaimplementowaną pauzę bez wyjścia. Zmierzone wtedy na produkcji:
 * 13 z 15 kombinacji (stan × przycisk) martwych.
 *
 * MACIERZ: 2 stany (biegnie / 0:00) × 3 przyciski, plus kontrole.
 * CZAS WSTRZYKIWANY przez `MP.zegar.teraz` — istniejący hak, nie ułatwienie.
 *
 * KONTROLA NEGATYWNA jest częścią próby, nie dodatkiem: te same asercje puszczone
 * na minifikacie SPRZED naprawy muszą PAŚĆ. Bez tego „wszystko zielone" znaczyłoby
 * tylko tyle, że próba nie umie spaść.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-pigulki.mjs [--stary <plik.min.js>]
 */
import fs from 'node:fs';
/* Import tolerancyjny: na maszynie operatora playwright stoi pod ścieżką bezwzględną
   (tak importują pozostałe przyrządy w tym katalogu), w innych środowiskach — zwykle
   w `node_modules`. Próba nie ma prawa paść z powodu miejsca instalacji biblioteki. */
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
  .catch(() => import('playwright'));

/* Ta sama zasada dla binarki: repo używa przypiętej wersji, tu bywa alias. */
const PRZEGLADARKI = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'];

const ARG = process.argv.indexOf('--stary');
const PLIK = ARG > -1 ? process.argv[ARG + 1] : 'tryb-gotowania.min.js';
const TRYB = fs.readFileSync(PLIK, 'utf8');

const strona = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>window.MP={zegar:{__t:1000000000000,teraz:function(){return this.__t}}};</script>
<script>${TRYB}</script></body>`;

const przegladarka = await (async () => {
  for (const sciezka of PRZEGLADARKI) {
    try {
      return await chromium.launch({ executablePath: sciezka,
        args: ['--no-sandbox', '--ssl-version-max=tls1.2', '--ignore-certificate-errors'] });
    } catch (e) { /* następna */ }
  }
  throw new Error('nie znalazłem Chromium w: ' + PRZEGLADARKI.join(', '));
})();
const kontekst = await przegladarka.newContext({ viewport: { width: 390, height: 844 } });
const ADRES = 'https://proba.test/przepis';
await kontekst.route(ADRES, (r) =>
  r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: strona }));

let zdane = 0, oblane = 0;
const spr = (warunek, opis, szczegol) => {
  if (warunek) { zdane++; console.log('  ✓ ' + opis); }
  else { oblane++; console.log('  ✗ ' + opis + (szczegol ? '\n      ' + szczegol : '')); }
};

const MODEL = {
  skladniki: [], porcjeBazowe: 2, tytul: 'próba', czas: '30', meta: [], zamienniki: {}, bledy: [], pola: {},
  kroki: [{ tytul: 'usmaż kurczaka', tekst: 'x', tekstHtml: 'x', czas: null,
            minutnik: { sekundy: 300, nazwa: 'kurczak' }, kryterium: null, kryteriumHtml: 'kryterium',
            skladniki: [], skladnikiTeraz: [], skladnikiDalej: [], skladnikiZuzyte: [] }],
};

async function karta() {
  const k = await kontekst.newPage();
  await k.goto(ADRES);
  await k.evaluate((m) => { window.MP.tryb.otworz(m, { model: m, porcje: 2 }); }, MODEL);
  await k.evaluate(() => { window.MP.tryb.minutniki.uruchom({ nazwa: 'kurczak', sekundy: 300, podpowiedz: 'kryterium' }); });
  await k.waitForTimeout(120);
  return k;
}
const przewin = (k, ms) => k.evaluate((ms) => { window.MP.zegar.__t += ms; }, ms).then(() => k.waitForTimeout(320));

const czytaj = (k) => k.evaluate(() => {
  const wid = (e) => { if (!e) return false; const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden'; };
  const p = document.querySelector('.mp-tryb__pigulka');
  if (!p) return { pigulek: document.querySelectorAll('.mp-tryb__pigulka').length };
  const g = p.querySelectorAll('.mp-tryb__ghost');
  return {
    pigulek: document.querySelectorAll('.mp-tryb__pigulka').length,
    stan: p.getAttribute('data-stan'), forma: p.getAttribute('data-forma'),
    odl: p.querySelector('.mp-tryb__odliczanie').textContent,
    primary: { txt: p.querySelector('.mp-tryb__primary').textContent, wid: wid(p.querySelector('.mp-tryb__primary')) },
    ghost1: { txt: g[0].textContent, wid: wid(g[0]) },
    ghost2: { txt: g[1].textContent, wid: wid(g[1]) },
  };
});
const tapnij = (k, wzor) => k.evaluate((w) => {
  const b = [].slice.call(document.querySelectorAll('.mp-tryb__pigulka button'))
    .filter((e) => getComputedStyle(e).display !== 'none')
    .find((e) => new RegExp(w).test(e.textContent));
  if (!b) return 'brak widocznego przycisku: ' + w;
  b.click(); return 'ok';
}, wzor).then((r) => k.waitForTimeout(320).then(() => r));

console.log(`\n═══ pigułka minutnika — ${PLIK} ═══`);

// ── 1. BIEGNIE: skład i brzmienia ───────────────────────────────────────────
{
  const k = await karta(); const s = await czytaj(k);
  console.log('\n[1] biegnący minutnik — skład wg `7211:10925`');
  spr(s.primary.txt === '✓ kurczak gotowy', 'primary = „✓ kurczak gotowy"', `jest: ${JSON.stringify(s.primary.txt)}`);
  spr(s.ghost1.txt === 'wyłącz minutnik' && s.ghost1.wid, 'ghost1 = „wyłącz minutnik", widoczny', `jest: ${JSON.stringify(s.ghost1)}`);
  spr(!s.ghost2.wid, 'ghost2 ukryty w biegu (jeden ghost pełnej szerokości)', `jest: ${JSON.stringify(s.ghost2)}`);
  await k.close();
}
// ── 2. BIEGNIE: primary zamyka ──────────────────────────────────────────────
{
  const k = await karta();
  await tapnij(k, 'gotowy'); const s = await czytaj(k);
  console.log('\n[2] biegnący — primary „✓ … gotowy" zamyka minutnik (I-33)');
  spr(s.pigulek === 0, 'pigułka zniknęła', `pigułek: ${s.pigulek}`);
  await k.close();
}
// ── 3. BIEGNIE: „wyłącz minutnik" zamyka ────────────────────────────────────
{
  const k = await karta();
  await tapnij(k, 'wyłącz minutnik'); const s = await czytaj(k);
  console.log('\n[3] biegnący — „wyłącz minutnik" zamyka (I-34)');
  spr(s.pigulek === 0, 'pigułka zniknęła', `pigułek: ${s.pigulek}`);
  await k.close();
}
// ── 4. ZERO: skład i brzmienia ──────────────────────────────────────────────
{
  const k = await karta(); await przewin(k, 300000); const s = await czytaj(k);
  console.log('\n[4] minutnik na 0:00 — skład wg `7240:10918`');
  spr(s.stan === 'zero' && s.odl === '0:00', 'stan „zero", odliczanie 0:00', JSON.stringify({ stan: s.stan, odl: s.odl }));
  spr(s.primary.txt === '✓ kurczak gotowy', 'primary bez zmian: „✓ kurczak gotowy"', `jest: ${JSON.stringify(s.primary.txt)}`);
  spr(s.ghost1.txt === '+5 min' && s.ghost1.wid, 'ghost1 = „+5 min", widoczny', `jest: ${JSON.stringify(s.ghost1)}`);
  spr(s.ghost2.txt === 'od nowa' && s.ghost2.wid, 'ghost2 = „od nowa", widoczny', `jest: ${JSON.stringify(s.ghost2)}`);
  await k.close();
}
// ── 5. ZERO: „+5 min" ───────────────────────────────────────────────────────
{
  const k = await karta(); await przewin(k, 300000);
  await tapnij(k, '\\+5 min'); const s = await czytaj(k);
  await przewin(k, 3000); const s2 = await czytaj(k);
  console.log('\n[5] 0:00 — „+5 min" nastawia 5:00 i biegnie (I-34)');
  spr(s.odl === '5:00', 'zaraz po tapie: 5:00', `jest: ${s.odl}`);
  spr(s.stan !== 'zero', 'stan wyszedł z „zero"', `jest: ${s.stan}`);
  spr(s2.odl === '4:57', 'po 3 s: 4:57 — naprawdę odlicza', `jest: ${s2.odl}`);
  await k.close();
}
// ── 6. ZERO: „od nowa" ──────────────────────────────────────────────────────
{
  const k = await karta(); await przewin(k, 300000);
  await tapnij(k, 'od nowa'); const s = await czytaj(k);
  await przewin(k, 3000); const s2 = await czytaj(k);
  console.log('\n[6] 0:00 — „od nowa" restartuje pełny czas (I-35)');
  spr(s.odl === '5:00', 'zaraz po tapie: 5:00 (pełne 300 s)', `jest: ${s.odl}`);
  spr(s2.odl === '4:57', 'po 3 s: 4:57 — naprawdę odlicza', `jest: ${s2.odl}`);
  await k.close();
}
// ── 7. ZERO: primary zamyka ─────────────────────────────────────────────────
{
  const k = await karta(); await przewin(k, 300000);
  await tapnij(k, 'gotowy'); const s = await czytaj(k);
  console.log('\n[7] 0:00 — primary zamyka (I-33)');
  spr(s.pigulek === 0, 'pigułka zniknęła', `pigułek: ${s.pigulek}`);
  await k.close();
}
// ── 8. KONTROLA: brzmień, których nie ma w żadnej klatce, NIE MA w artefakcie ─
{
  console.log('\n[8] kontrola: brzmienia spoza klatek nie występują w artefakcie');
  for (const zle of ['zatrzymaj', 'dodaj minutę', 'uruchom ponownie', 'zamknij minutnik'])
    spr(!TRYB.includes(zle), `brak „${zle}" w ${PLIK}`);
}

console.log(`\n───────────────────────────────\nzdane ${zdane} · oblane ${oblane}`);
await przegladarka.close();
process.exit(oblane ? 1 : 0);
