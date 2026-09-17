/* suchy-bieg-wake-locka.mjs — czy przełącznik NAPRAWDĘ trzyma blokadę ekranu.
 *
 * PO CO TO ISTNIEJE. Po zdjęciu trybu pełnoekranowego blokada wygaszania jest
 * JEDYNĄ funkcją przełącznika `.mp-wejscie`. Wiersz `Z1` pakietu integracyjnego
 * („wake lock — ekran nie gaśnie przy odliczaniu") od początku stoi niezmierzony:
 * wymaga fizycznego telefonu, a `http://localhost` dał tylko test podstawowy.
 * Ten przyrząd nie zastępuje telefonu i nie udaje, że zastępuje — telefon
 * odpowiada na pytanie „czy ekran faktycznie nie gaśnie", a przyrząd na pytanie
 * „czy maszyna stanów prosi i zwalnia wtedy, kiedy powinna". To drugie pytanie
 * jest tym, w którym mieszkają wszystkie cztery usterki, jakich się tu boimy,
 * i jedynym, na które da się odpowiedzieć bez ręki na ekranie.
 *
 * DLACZEGO API JEST PODSTAWIONE, A NIE PRAWDZIWE. Dwa powody, oba zmierzone.
 * Pierwszy: w tym Chromium `navigator.wakeLock` NIE ISTNIEJE natywnie (`typeof`
 * = `undefined`, sprawdzone 2026-09-17). Bez podstawki punkt 1 przechodziłby
 * zawsze i na wszystkim — także na skrypcie bez jednej linii obsługi — bo
 * mierzyłby brak API w przeglądarce, a nie reakcję na ten brak. Drugi: gałąź
 * ODMOWY jest przez prawdziwe API nieosiągalna na żądanie, a to właśnie ona
 * gasi przełącznik, którego nie ma czym podeprzeć.
 *
 * DLACZEGO PRAWDZIWY SERWER, A NIE `setContent`. `addInitScript` wchodzi przy
 * NAWIGACJI. Przy `setContent` na już wczytanym `about:blank` nawigacji nie ma,
 * więc podstawka nie wpinała się wcale — zmierzone tym samym przyrządem, zanim
 * został poprawiony. Do tego `sessionStorage` z punktu 7 wymaga prawdziwego
 * originu, a `about:blank` i `data:` mają origin nieprzezroczysty.
 *
 * Czego przyrząd NIE sprawdza, żeby nikt nie wziął zieleni za więcej, niż znaczy:
 * czy ekran fizycznie nie gaśnie (Z1, telefon), czy system operacyjny nie zwalnia
 * blokady z własnych powodów (bateria), i jak zachowa się Safari.
 *
 * Użycie:  node narzedzia/suchy-bieg-wake-locka.mjs [--plik narzedzia/mpwejscie-2.0.0.js]
 */
import fs from 'node:fs';
import http from 'node:http';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
  .catch(() => import('playwright'));
const PRZEGLADARKI = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'];

const I = process.argv.indexOf('--plik');
const PLIK = I > -1 ? process.argv[I + 1] : 'narzedzia/mpwejscie-2.0.0.js';
const STARY = 'archiwum/mpWejscie-1.3.3.js';
console.log(`\n═══ mpWejscie — blokada ekranu — ${PLIK} ═══`);

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

/* Strona próbna niesie DOKŁADNIE te dwa węzły, o które pyta `zbuduj()`, plus
   arkusz z progiem 479 px przepisany z bloku stopki. Gdyby próg w skrypcie
   i w arkuszu się rozjechał, przełącznik byłby w DOM-ie i niewidoczny —
   dlatego mierzymy też `display`, a nie samo istnienie węzła.

   Skrypt wchodzi TAGIEM ZE ŹRÓDŁA, nie przez `addScriptTag` po fakcie: dzięki
   temu ponowne wejście na adres jest prawdziwym nowym dokumentem, z pełnym
   startem skryptu, a nie doklejeniem drugiej kopii do żywego okna. Na tym
   stoi punkt 7. */
const strona = (plik) => `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<style>
  .mp-wejscie { display: none; }
  @media (max-width: 479px) { .mp-wejscie { display: flex; } }
</style></head><body>
<div class="recipe-steps__stack"><h2 class="recipe-steps__title">kroki</h2></div>
<script src="${plik}"></script>
</body></html>`;

/* Serwer na pętli zwrotnej. Potrzebny dla prawdziwego originu (sessionStorage,
   punkt 7) i dla prawdziwej nawigacji (bez niej `addInitScript` nie wchodzi). */
const PLIKI = {
  '/nowy.js': fs.readFileSync(PLIK, 'utf8'),
  '/stary.js': fs.existsSync(STARY) ? fs.readFileSync(STARY, 'utf8') : '/* brak */'
};
const serwer = http.createServer((zad, odp) => {
  const sciezka = zad.url.split('?')[0];
  if (PLIKI[sciezka]) {
    odp.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' });
    odp.end(PLIKI[sciezka]);
    return;
  }
  odp.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  odp.end(strona(sciezka === '/stary' ? '/stary.js' : '/nowy.js'));
});
await new Promise((ok) => serwer.listen(0, '127.0.0.1', ok));
const BAZA = `http://127.0.0.1:${serwer.address().port}`;

/* Podstawka. `tryb` rozstrzyga, co robi `request`:
     'zgoda'  — zwraca sentinel,
     'odmowa' — odrzuca z NotAllowedError,
     'brak'   — `navigator.wakeLock` nie istnieje w ogóle.
   Wszystko, co przeszło przez podstawkę, ląduje w `window.__wl`. */
function atrapa(tryb) {
  return `(() => {
    const log = window.__wl = { request: 0, release: 0, typy: [], odrzucenia: 0 };
    if (${JSON.stringify(tryb)} === 'brak') {
      try { Object.defineProperty(navigator, 'wakeLock', { get: () => undefined, configurable: true }); } catch (e) {}
      return;
    }
    const zrobSentinel = () => {
      const cele = new Set();
      const s = {
        type: 'screen', released: false,
        addEventListener: (n, f) => { if (n === 'release') cele.add(f); },
        removeEventListener: (n, f) => cele.delete(f),
        release() { if (s.released) return Promise.resolve(); s.released = true; log.release++;
                    cele.forEach((f) => f()); return Promise.resolve(); }
      };
      window.__ostatniSentinel = s;
      return s;
    };
    const api = { request: (t) => {
      log.request++; log.typy.push(t);
      if (window.__trybWL === 'odmowa') {
        log.odrzucenia++;
        const e = new Error('odmowa'); e.name = 'NotAllowedError';
        return Promise.reject(e);
      }
      return Promise.resolve(zrobSentinel());
    } };
    window.__trybWL = ${JSON.stringify(tryb)};
    try { Object.defineProperty(navigator, 'wakeLock', { get: () => api, configurable: true }); } catch (e) {}
  })();`;
}

async function karta(tryb, { szerokosc = 390, sciezka = '/' } = {}) {
  const kontekst = await przegladarka.newContext({ viewport: { width: szerokosc, height: 800 } });
  const k = await kontekst.newPage();
  await k.addInitScript(atrapa(tryb));
  await k.goto(BAZA + sciezka, { waitUntil: 'load' });
  await k.waitForTimeout(80);
  return { k, kontekst };
}

const stan = (k) => k.evaluate(() => ({
  jest: !!document.querySelector('.mp-wejscie'),
  widoczny: (() => { const e = document.querySelector('.mp-wejscie');
    return !!e && getComputedStyle(e).display !== 'none'; })(),
  checked: (() => { const e = document.querySelector('.mp-wejscie');
    return e && e.getAttribute('aria-checked'); })(),
  rola: (() => { const e = document.querySelector('.mp-wejscie');
    return e && e.getAttribute('role'); })(),
  /* Nazwa dostępna kontrolki mówi, CZYM jest przełącznik; co robi, mówi dopiero
     podtytuł. Bez wiązania obietnica nie dociera do osoby, która nie widzi ekranu,
     więc mierzymy nie obecność atrybutu, tylko to, czy wskazuje na żywy węzeł
     z właściwą treścią. */
  opis: (() => { const e = document.querySelector('.mp-wejscie');
    if (!e) return null;
    const id = e.getAttribute('aria-describedby');
    const c = id && document.getElementById(id);
    return { id: id, tresc: c && c.textContent };
  })(),
  slad: window.mpEkran, wl: window.__wl
}));

/* ── 1. Bez API przełącznik nie powstaje ─────────────────────────────────── */
console.log('\n1 · brak navigator.wakeLock');
{
  const { k, kontekst } = await karta('brak');
  const s = await stan(k);
  spr(!!s.wl, 'podstawka WESZŁA — bez tego punkt mierzyłby brak API w przeglądarce, nie reakcję na niego',
    JSON.stringify(s.wl));
  spr(s.jest === false, 'przełącznik NIE powstaje — kontrolka, która obiecuje i milczy, jest gorsza niż jej brak');
  spr(s.slad && s.slad.api === false, 'ślad mówi wprost, czego zabrakło', s.slad && s.slad.powod);
  await kontekst.close();
}

/* ── 2. Z API powstaje, wyłączony, jako switch ───────────────────────────── */
console.log('\n2 · przełącznik przy dostępnym API');
{
  const { k, kontekst } = await karta('zgoda');
  const s = await stan(k);
  spr(s.jest && s.widoczny, 'przełącznik jest w DOM-ie i jest widoczny przy 390 px');
  spr(s.rola === 'switch', 'niesie role="switch"', s.rola);
  spr(!!(s.opis && s.opis.id && s.opis.tresc), 'aria-describedby wskazuje na ISTNIEJĄCY węzeł opisu',
    JSON.stringify(s.opis));
  spr(!!(s.opis && /ekran nie ga/.test(s.opis.tresc || '')),
    'opis mówi, co przełącznik robi — bez tego czytnik ogłasza samą nazwę i stan',
    s.opis && s.opis.tresc);
  spr(s.checked === 'false', 'startuje wyłączony', s.checked);
  spr(s.wl.request === 0, 'BEZ prośby o blokadę przed kliknięciem — strona przepisu nie zabiera ekranu sama z siebie',
    `request: ${s.wl.request}`);
  await kontekst.close();
}

/* ── 3. Włączenie i wyłączenie ───────────────────────────────────────────── */
console.log('\n3 · włączenie, potem wyłączenie');
{
  const { k, kontekst } = await karta('zgoda');
  await k.click('.mp-wejscie');
  await k.waitForTimeout(60);
  let s = await stan(k);
  spr(s.wl.request === 1, 'jedno kliknięcie = jedna prośba', `request: ${s.wl.request}`);
  spr(s.wl.typy[0] === 'screen', 'prosimy o blokadę typu "screen"', s.wl.typy.join(','));
  spr(s.checked === 'true', 'aria-checked idzie na true', s.checked);
  spr(s.slad.trzyma === true, 'ślad potwierdza TRZYMANĄ blokadę, nie samą prośbę', JSON.stringify(s.slad));

  await k.click('.mp-wejscie');
  await k.waitForTimeout(60);
  s = await stan(k);
  spr(s.wl.release === 1, 'drugie kliknięcie zwalnia blokadę', `release: ${s.wl.release}`);
  spr(s.checked === 'false', 'aria-checked wraca na false', s.checked);
  spr(s.slad.trzyma === false, 'ślad przestaje twierdzić, że trzyma', JSON.stringify(s.slad));
  await kontekst.close();
}

/* ── 4. Odmowa gasi przełącznik ──────────────────────────────────────────── */
console.log('\n4 · odmowa (np. oszczędzanie baterii)');
{
  const { k, kontekst } = await karta('odmowa');
  await k.click('.mp-wejscie');
  await k.waitForTimeout(80);
  const s = await stan(k);
  spr(s.wl.odrzucenia === 1, 'prośba została odrzucona', `odrzucenia: ${s.wl.odrzucenia}`);
  spr(s.checked === 'false', 'przełącznik GASNIE — nie zostaje włączony bez blokady', s.checked);
  spr(s.slad.odmow === 1 && s.slad.powod === 'NotAllowedError',
    'ślad niesie powód odmowy, a nie samo „nie wyszło"', JSON.stringify(s.slad));
  spr(s.slad.trzyma === false, 'ślad nie twierdzi, że trzyma', JSON.stringify(s.slad));
  await kontekst.close();
}

/* ── 5. Powrót do karty prosi o blokadę PONOWNIE ─────────────────────────── */
/* Przeglądarka zwalnia blokadę sama, gdy karta znika. To udokumentowane
   zachowanie, nie usterka — więc odtwarzamy je wprost: zwalniamy sentinel
   i dopiero potem wracamy do widoczności. Bez ponownej prośby przełącznik
   zostaje włączony, a ekran zaczyna gasnąć: dokładnie ta usterka, której
   nikt nie zgłosi, bo wygląda jak zachowanie telefonu. */
console.log('\n5 · powrót z ukrytej karty');
{
  const { k, kontekst } = await karta('zgoda');
  await k.click('.mp-wejscie');
  await k.waitForTimeout(60);
  const przed = (await stan(k)).wl.request;

  await k.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true });
    if (window.__ostatniSentinel) window.__ostatniSentinel.release();
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await k.waitForTimeout(40);
  let s = await stan(k);
  spr(s.slad.trzyma === false, 'w ukrytej karcie ślad NIE twierdzi, że trzyma', JSON.stringify(s.slad));
  spr(s.wl.request === przed, 'w ukrytej karcie nie prosimy — pewna odmowa', `request: ${s.wl.request}`);

  await k.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await k.waitForTimeout(60);
  s = await stan(k);
  spr(s.wl.request === przed + 1, 'po powrocie prosimy PONOWNIE', `request: ${s.wl.request} (było ${przed})`);
  spr(s.slad.trzyma === true, 'blokada znów trzymana', JSON.stringify(s.slad));
  spr(s.checked === 'true', 'przełącznik przez cały czas pokazuje „włączony"', s.checked);
  await kontekst.close();
}

/* ── 6. Wyłączenie w trakcie oczekiwania na obietnicę ────────────────────── */
/* Gałąź `if (!chcemy) { b.release(); return; }`. Bez niej szybkie włącz-wyłącz
   zostawia blokadę żywą przy przełączniku pokazującym „wyłączony" — stan,
   w którym ekran nie gaśnie i nikt nie wie dlaczego. */
console.log('\n6 · wyścig: wyłączenie, zanim wróci obietnica');
{
  const { k, kontekst } = await karta('zgoda');
  await k.evaluate(() => {
    const api = navigator.wakeLock;
    const oryg = api.request.bind(api);
    api.request = (t) => new Promise((ok) => setTimeout(() => oryg(t).then(ok), 300));
  });
  await k.click('.mp-wejscie');
  await k.waitForTimeout(30);
  await k.click('.mp-wejscie');          /* zgaszone, zanim obietnica wróciła */
  await k.waitForTimeout(500);
  const s = await stan(k);
  spr(s.checked === 'false', 'przełącznik został wyłączony', s.checked);
  spr(s.wl.release === 1, 'spóźniona blokada została zwolniona, a nie osierocona', `release: ${s.wl.release}`);
  spr(s.slad.trzyma === false, 'ślad nie twierdzi, że trzyma', JSON.stringify(s.slad));
  await kontekst.close();
}

/* ── 7. Pamięć przeżywa przejście na inny przepis, ale nie kartę ─────────── */
console.log('\n7 · sessionStorage');
{
  const { k, kontekst } = await karta('zgoda');
  await k.click('.mp-wejscie');
  await k.waitForTimeout(60);

  /* „Inny przepis" = ten sam origin, NOWY dokument, ta sama karta. */
  await k.goto(BAZA + '/przepis-drugi', { waitUntil: 'load' });
  await k.waitForTimeout(100);
  const s = await stan(k);
  spr(s.checked === 'true', 'na kolejnym przepisie przełącznik wraca włączony', s.checked);
  spr(s.wl.request >= 1, 'i od razu prosi o blokadę', `request: ${s.wl.request}`);
  spr(s.slad.trzyma === true, 'blokada jest trzymana, a nie tylko zapamiętana', JSON.stringify(s.slad));

  /* Nowa karta = nowy sessionStorage. */
  const k2 = await kontekst.newPage();
  await k2.addInitScript(atrapa('zgoda'));
  await k2.goto(BAZA + '/', { waitUntil: 'load' });
  await k2.waitForTimeout(100);
  const s2 = await stan(k2);
  spr(s2.checked === 'false', 'w nowej karcie startuje wyłączony — pamięć nie przeżywa karty', s2.checked);
  spr(s2.wl.request === 0, 'i nie zabiera ekranu bez pytania', `request: ${s2.wl.request}`);
  await kontekst.close();
}

/* ── 8. Powyżej progu przełącznika nie ma ────────────────────────────────── */
console.log('\n8 · próg 479 px');
{
  const { k, kontekst } = await karta('zgoda', { szerokosc: 900 });
  const s = await stan(k);
  spr(s.jest === false, 'przy 900 px przełącznik nie powstaje', `jest: ${s.jest}`);
  spr(s.slad.powod === 'powyżej progu', 'ślad nazywa powód', s.slad.powod);
  await kontekst.close();
}

/* ── 9. Kontrola ujemna ──────────────────────────────────────────────────── */
/* Przyrząd, który przechodzi na każdym skrypcie, nie jest przyrządem. Puszczamy
   go na WERSJI 1.3.3 — tej, która otwierała overlay i nigdy nie dotykała
   `navigator.wakeLock`. Jeśli asercje zachowania nie spadną tam, nie mierzą
   zachowania, tylko obecność guzika. */
console.log('\n9 · KONTROLA UJEMNA — mpWejscie 1.3.3 (otwierał overlay, nie brał blokady)');
{
  if (!fs.existsSync(STARY)) {
    spr(false, `brak ${STARY} — kontrola ujemna nie ma na czym stanąć`);
  } else {
    const { k, kontekst } = await karta('zgoda', { sciezka: '/stary' });
    await k.waitForTimeout(400);
    const przed = await stan(k);
    await k.click('.mp-wejscie').catch(() => {});
    await k.waitForTimeout(250);
    const po = await stan(k);
    spr(przed.jest === true, 'stary skrypt też rysuje baner — więc odróżnia nas ZACHOWANIE, nie obecność węzła');
    spr(po.wl.request === 0, 'stary skrypt NIGDY nie prosi o blokadę — asercje z pkt 3 spadłyby na nim',
      `request: ${po.wl.request}`);
    await kontekst.close();
  }
}

await przegladarka.close();
serwer.close();
console.log(`\nzdane: ${zdane} · oblane: ${oblane}\n`);
process.exit(oblane ? 1 : 0);
