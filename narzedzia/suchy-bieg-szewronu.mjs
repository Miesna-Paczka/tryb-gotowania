/* suchy-bieg-szewronu.mjs — czy szewron pigułki minutnika powtarza schemat
 * akordeonu z produktówki (D-40.1).
 *
 * WZORZEC ZMIERZONY NA ŻYWEJ STRONIE 2026-08-20, nie przyjęty z pamięci:
 * `https://miesnapaczka.pl/produkty/...` → `.mp-faq-item__heading .icon-text.is-faq`
 *   zwinięty   `keyboard_arrow_down`  rotate(0deg)     → strzałka w DÓŁ
 *   rozwinięty ten sam glif           rotate(-180deg)  → strzałka w GÓRĘ
 *   przejście  `transform 280ms`, `prefers-reduced-motion: reduce` → brak
 *
 * KONTROLA NEGATYWNA jest częścią próby: te same asercje na artefakcie SPRZED
 * zmiany muszą paść. Artefakt sprzed zmiany podaje się przez `--stary`.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-szewronu.mjs [--stary <plik.min.js>]
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
    try { return await chromium.launch({ executablePath: s,
      args: ['--no-sandbox', '--ssl-version-max=tls1.2', '--ignore-certificate-errors'] }); }
    catch (e) { /* następna */ }
  }
  throw new Error('nie znalazłem Chromium w: ' + PRZEGLADARKI.join(', '));
})();
const kontekst = await przegladarka.newContext({ viewport: { width: 390, height: 844 } });
const ADRES = 'https://proba.test/przepis';
await kontekst.route(ADRES, (r) =>
  r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: strona }));

let zdane = 0, oblane = 0;
const spr = (w, o, sz) => { if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (sz ? '\n      ' + sz : '')); } };

const MODEL = { skladniki: [], porcjeBazowe: 2, tytul: 'próba', czas: '30', meta: [],
  zamienniki: {}, bledy: [], pola: {}, kroki: [{ tytul: 'x', tekst: 'x', tekstHtml: 'x',
    czas: null, minutnik: { sekundy: 300, nazwa: 'kurczak' }, kryterium: null,
    kryteriumHtml: 'kryterium', skladniki: [], skladnikiTeraz: [], skladnikiDalej: [], skladnikiZuzyte: [] }] };

async function karta(zPodpowiedzia) {
  const k = await kontekst.newPage();
  await k.goto(ADRES);
  await k.evaluate((m) => { window.MP.tryb.otworz(m, { model: m, porcje: 2 }); }, MODEL);
  await k.evaluate((p) => { window.MP.tryb.minutniki.uruchom(
    { nazwa: 'kurczak', sekundy: 300, podpowiedz: p ? 'kryterium' : null }); }, !!zPodpowiedzia);
  await k.waitForTimeout(140);
  return k;
}

/* Kąt liczony z macierzy, nie z tekstu `rotate(...)`: `getComputedStyle` zwraca
   macierz i porównywanie napisów dałoby fałszywe padnięcie przy tym samym obrocie. */
const czytaj = (k) => k.evaluate(() => {
  const e = document.querySelector('.mp-tryb__szewron');
  if (!e) return { brak: true };
  const s = getComputedStyle(e), r = e.getBoundingClientRect();
  const m = s.transform.match(/matrix\(([^)]+)\)/);
  const kat = m ? Math.round(Math.atan2(parseFloat(m[1].split(',')[1]), parseFloat(m[1].split(',')[0])) * 180 / Math.PI) : 0;
  return { glif: (e.textContent || '').trim(), kat, transform: s.transform,
    trwanie: s.transitionDuration, wlasnosc: s.transitionProperty, origin: s.transformOrigin,
    widoczny: s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0,
    rozmiar: Math.round(r.width) + '×' + Math.round(r.height),
    forma: document.querySelector('.mp-tryb__pigulka').getAttribute('data-forma') };
});

console.log(`\n═══ szewron pigułki — ${PLIK} ═══`);

// ── 1. ROZWINIĘTA (pełna): w górę ───────────────────────────────────────────
{
  const k = await karta(true); const s = await czytaj(k);
  console.log('\n[1] pigułka rozwinięta pełna — szewron W GÓRĘ');
  spr(s.forma === 'pelna', 'forma „pelna"', 'jest: ' + s.forma);
  spr(s.glif === 'keyboard_arrow_down', 'glif bazowy „keyboard_arrow_down"', 'jest: ' + s.glif);
  spr(s.kat === 180 || s.kat === -180, 'obrót 180° → strzałka w górę', `jest: ${s.kat}° (${s.transform})`);
  spr(s.widoczny, 'szewron widoczny', JSON.stringify(s.rozmiar));
  await k.close();
}
// ── 2. ZWINIĘTA: w dół, i szewron NADAL WIDOCZNY ────────────────────────────
{
  const k = await karta(true);
  await k.evaluate(() => { window.MP.tryb.minutniki.przelacz(window.MP.tryb.minutniki.lista()[0]); });
  await k.waitForTimeout(400);
  const s = await czytaj(k);
  console.log('\n[2] pigułka zwinięta — szewron W DÓŁ i widoczny (R10 zdjęte)');
  spr(s.forma === 'zwinieta', 'forma „zwinieta"', 'jest: ' + s.forma);
  spr(s.kat === 0, 'obrót 0° → strzałka w dół', `jest: ${s.kat}° (${s.transform})`);
  spr(s.widoczny, 'szewron WIDOCZNY przy zwiniętej — inaczej obrotu nie widać', JSON.stringify(s));
  spr(s.glif === 'keyboard_arrow_down', 'ten sam glif, bez podmiany', 'jest: ' + s.glif);
  await k.close();
}
// ── 3. ROZWINIĘTA KRÓTKA (bez podpowiedzi) też ma szewron w górę ────────────
{
  const k = await karta(false); const s = await czytaj(k);
  console.log('\n[3] rozwinięta krótka (bez podpowiedzi) — też w górę');
  spr(s.forma === 'krotka', 'forma „krotka"', 'jest: ' + s.forma);
  spr(Math.abs(s.kat) === 180, 'obrót 180°', `jest: ${s.kat}°`);
  spr(s.widoczny, 'szewron widoczny', JSON.stringify(s.rozmiar));
  await k.close();
}
// ── 4. Przejście 280 ms na `transform` — wartości z produktówki ─────────────
{
  const k = await karta(true); const s = await czytaj(k);
  console.log('\n[4] przejście 1:1 z akordeonem produktowym');
  spr(s.wlasnosc === 'transform', 'transition-property = transform', 'jest: ' + s.wlasnosc);
  spr(s.trwanie === '0.28s', 'transition-duration = 0.28s', 'jest: ' + s.trwanie);
  spr(/^8px 11px|center/.test(s.origin), 'transform-origin w środku pudełka', 'jest: ' + s.origin);
  await k.close();
}
// ── 5. reduced-motion wyłącza przejście, nie obrót ──────────────────────────
{
  const kk = await przegladarka.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await kk.route(ADRES, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: strona }));
  const k = await kk.newPage();
  await k.goto(ADRES);
  await k.evaluate((m) => { window.MP.tryb.otworz(m, { model: m, porcje: 2 }); }, MODEL);
  await k.evaluate(() => { window.MP.tryb.minutniki.uruchom({ nazwa: 'k', sekundy: 300, podpowiedz: 'x' }); });
  await k.waitForTimeout(140);
  const s = await czytaj(k);
  console.log('\n[5] prefers-reduced-motion: reduce');
  spr(s.trwanie === '0s', 'przejście wyłączone', 'jest: ' + s.trwanie);
  spr(Math.abs(s.kat) === 180, 'obrót NADAL jest — znika animacja, nie kierunek', `jest: ${s.kat}°`);
  await kk.close();
}
// ── 6. Kontrola: podmiany glifu nie ma w artefakcie ─────────────────────────
{
  console.log('\n[6] kontrola: pigułka nie podmienia glifu szewronu');
  spr(!/szewron[^;]{0,80}keyboard_arrow_up/.test(TRYB), 'brak przypisania `up` do szewronu');
}

console.log(`\n───────────────────────────────\nzdane ${zdane} · oblane ${oblane}`);
await przegladarka.close();
process.exit(oblane ? 1 : 0);
