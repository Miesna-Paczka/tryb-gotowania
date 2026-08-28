/* suchy-bieg-szewronu.mjs — czy szewron pigułki minutnika obraca się tak, jak
 * zdecydował operator 2026-08-28 (D-40.2): W GÓRĘ przy zwiniętej, W DÓŁ przy
 * rozwiniętej — czyli PRZECIWNIE niż akordeon FAQ produktówki.
 *
 * UZASADNIENIE, KTÓRE TU RZĄDZI, i to ono jest treścią próby:
 *   „szewron powinien być zwrócony domyślnie do góry, a w wersji rozwiniętej
 *    do dołu. Wszak minutnik rozwija się DO GÓRY, a nie do dołu, jak FAQ."
 * Pigułka stoi przypięta do dołu ekranu i rośnie ku górze, więc reguła
 * „szewron pokazuje, dokąd to pojedzie" daje tu przeciwny znak niż w FAQ.
 *
 * DWIE POPRZEDNIE WERSJE TEJ PRÓBY, obie obalone tego samego dnia:
 *   D-40.1 (2026-08-20) — down zwinięty / up rozwinięty, wprost z FAQ.
 *   „bez obrotu"        — moja nadinterpretacja zgłoszenia „szewrony rozjechane
 *                         z projektem"; operator o zdjęcie obrotu NIE prosił.
 * Próba nie została skasowana ani razu: reguła bez asercji wraca.
 *
 * ZGODNOŚĆ Z PLIKIEM JEST 4/6 I TAK MA ZOSTAĆ — zapisane, żeby nikt nie
 * „naprawiał" jednej strony pod drugą bez decyzji. `7211:10925`, `7196:11059`,
 * `7196:11116`, `7196:11144` (rozwinięte, `down`) zgadzają się z regułą;
 * `7240:10900` (rozwinięta, `up`) i `7254:10903` (zwinięta, `down`) nie.
 *
 * KONTROLA NEGATYWNA jest częścią próby: te same asercje na artefakcie sprzed
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
  /* `rozwinieta: true` PODANE JAWNIE (D-49.2). Do D-47.1 minutnik rozwijał się
     domyślnie i ta próba na tym milcząco stała; odkąd startuje zwinięty, poleganie
     na domyślnej wartości mierzyłoby DOMYŚLNĄ FORMĘ, a nie szewron. Domyślną formę
     bramkuje `suchy-bieg-minutnikow.mjs` — tutaj stan ustawiamy sami, żeby każdy
     przypadek pytał wyłącznie o to, o co ma pytać. */
  await k.evaluate((p) => { window.MP.tryb.minutniki.uruchom(
    { nazwa: 'kurczak', sekundy: 300, rozwinieta: true,
      podpowiedz: p ? 'kryterium' : null }); }, !!zPodpowiedzia);
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

// ── 1. ROZWINIĘTA (pełna): szewron W DÓŁ, obrót zerowy ──────────────────────
{
  const k = await karta(true); const s = await czytaj(k);
  console.log('\n[1] pigułka rozwinięta pełna — szewron W DÓŁ');
  spr(s.forma === 'pelna', 'forma „pelna"', 'jest: ' + s.forma);
  spr(s.glif === 'keyboard_arrow_down', 'glif bazowy „keyboard_arrow_down"', 'jest: ' + s.glif);
  spr(s.kat === 0, 'obrót 0° → strzałka w dół, czyli „schowaj mnie z powrotem"', `jest: ${s.kat}° (${s.transform})`);
  spr(s.widoczny, 'szewron widoczny', JSON.stringify(s.rozmiar));
  spr(s.rozmiar === '16×22', 'metryka 16×22 z pliku', 'jest: ' + s.rozmiar);
  await k.close();
}
// ── 2. ZWINIĘTA: szewron W GÓRĘ — to jest cała decyzja D-40.2 ───────────────
/* Ten przypadek odróżnia D-40.2 od OBU poprzednich reguł naraz: D-40.1 dałoby
   tu 0° (down), wersja „bez obrotu" też 0°. Tylko D-40.2 daje 180°. */
{
  const k = await karta(true);
  await k.evaluate(() => { window.MP.tryb.minutniki.przelacz(window.MP.tryb.minutniki.lista()[0]); });
  await k.waitForTimeout(400);
  const s = await czytaj(k);
  console.log('\n[2] pigułka zwinięta — szewron W GÓRĘ (pigułka rośnie ku górze)');
  spr(s.forma === 'zwinieta', 'forma „zwinieta"', 'jest: ' + s.forma);
  spr(Math.abs(s.kat) === 180, 'obrót 180° → strzałka w górę', `jest: ${s.kat}° (${s.transform})`);
  spr(s.widoczny, 'szewron WIDOCZNY przy zwiniętej — inaczej obrotu nie widać', JSON.stringify(s));
  spr(s.glif === 'keyboard_arrow_down', 'ten sam glif, bez podmiany', 'jest: ' + s.glif);
  await k.close();
}
// ── 3. ROZWINIĘTA BEZ PODPOWIEDZI też ma szewron w dół ──────────────────────
/* Do D-49.1 ten przypadek dawał formę „krotka" — trzecią, wybieraną przy braku
   podpowiedzi. Forma została usunięta (nieosiągalna z treści od bramki D-48.1),
   więc minutnik bez podpowiedzi jest teraz zwyczajnie rozwinięty. Przypadek
   ZOSTAJE, bo pyta o co innego niż o nazwę formy: czy szewron zachowuje się tak
   samo, gdy kafel nie ma czego pokazać w akapicie. */
{
  const k = await karta(false); const s = await czytaj(k);
  console.log('\n[3] rozwinięta bez podpowiedzi — też w dół');
  spr(s.forma === 'pelna', 'forma „pelna" (po D-49.1 nie ma już „krotka")', 'jest: ' + s.forma);
  spr(s.kat === 0, 'obrót 0°', `jest: ${s.kat}°`);
  spr(s.widoczny, 'szewron widoczny', JSON.stringify(s.rozmiar));
  await k.close();
}
// ── 4. Przejście 280 ms na `transform` — wartości z produktówki ─────────────
/* Czas i własność zostają z FAQ, mimo że KIERUNEK się od FAQ odwrócił. To nie
   jest niekonsekwencja: 280 ms to tempo obrotu w tej witrynie, a znak obrotu
   wynika z tego, w którą stronę rośnie element. Dwie różne rzeczy. */
{
  const k = await karta(true); const s = await czytaj(k);
  console.log('\n[4] tempo przejścia 1:1 z akordeonem produktowym');
  spr(s.wlasnosc === 'transform', 'transition-property = transform', 'jest: ' + s.wlasnosc);
  spr(s.trwanie === '0.28s', 'transition-duration = 0.28s', 'jest: ' + s.trwanie);
  spr(/^8px 11px|center/.test(s.origin), 'transform-origin w środku pudełka', 'jest: ' + s.origin);
  await k.close();
}
// ── 5. reduced-motion wyłącza przejście, nie kierunek ───────────────────────
{
  const kk = await przegladarka.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await kk.route(ADRES, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: strona }));
  const k = await kk.newPage();
  await k.goto(ADRES);
  await k.evaluate((m) => { window.MP.tryb.otworz(m, { model: m, porcje: 2 }); }, MODEL);
  // `rozwinieta: true` jawnie, z tego samego powodu co w `karta()` — patrz D-49.2.
  await k.evaluate(() => { window.MP.tryb.minutniki.uruchom({ nazwa: 'k', sekundy: 300, rozwinieta: true, podpowiedz: 'x' }); });
  await k.waitForTimeout(140);
  const s = await czytaj(k);
  console.log('\n[5] prefers-reduced-motion: reduce');
  spr(s.trwanie === '0s', 'przejście wyłączone', 'jest: ' + s.trwanie);
  spr(s.kat === 0, 'rozwinięta NADAL w dół — znika animacja, nie kierunek', `jest: ${s.kat}°`);
  await kk.close();
}
// ── 6. Kontrole tekstowe na artefakcie ──────────────────────────────────────
/* Selektor jest POZYTYWNY (`[data-forma="zwinieta"]`), a nie negacją — i to jest
   sprawdzalne w tekście. Stary artefakt D-40.1 miał `:not([data-forma="zwinieta"])`,
   więc ta kontrola odróżnia dwa przeciwne kierunki, których sam `rotate(-180deg)`
   odróżnić nie potrafi: obie wersje go zawierają. */
{
  console.log('\n[6] kontrole tekstowe na artefakcie');
  spr(!/szewron[^;]{0,80}keyboard_arrow_up/.test(TRYB), 'brak przypisania `up` do szewronu');
  spr(/\[data-forma="zwinieta"\] \.mp-tryb__szewron\{transform:rotate\(-180deg\)/.test(TRYB),
      'obraca się forma ZWINIĘTA (selektor pozytywny)');
  spr(!/:not\(\[data-forma="zwinieta"\]\) \.mp-tryb__szewron\{transform/.test(TRYB),
      'nie ma już reguły D-40.1 (obrót przy rozwiniętej)');
}

console.log(`\n───────────────────────────────\nzdane ${zdane} · oblane ${oblane}`);
await przegladarka.close();
process.exit(oblane ? 1 : 0);
