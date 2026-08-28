/* suchy-bieg-przenikania.mjs — czy wejście i wyjście trybu przenikają tak,
 * jak zdecydowano 2026-08-28 („fade in trybu jest zbyt gwałtowny").
 *
 * DLACZEGO TA PRÓBA MA SENS AKURAT DZIŚ. Do zdjęcia pływającego CTA droga
 * `przenikanie` była drogą ZAPASOWĄ — wchodziło się w nią przy `reduce` albo gdy
 * pigułki nie było na ekranie. Odkąd baner wejściowy chowa `.recipe-floating-cta`
 * poniżej 480 px, `pigulkaWejsciowa()` nie ma czego znaleźć i to jest droga
 * GŁÓWNA na telefonie. Liczba, która przez to zaczęła ważyć, nie miała asercji.
 *
 * CZEGO NIE ROBIMY: nie mierzymy zegarem. `mp-pomiar` §1.1 — w karcie, która nie
 * jest renderowana, oś czasu dokumentu stoi, więc „odczekaj N ms i sprawdź" bywa
 * zielone bez powodu. Czytamy DEKLARACJĘ animacji (`getTiming`, `getKeyframes`),
 * czyli to, co runtime zamówił, a nie to, co zdążyło się narysować.
 *
 * KONTROLA NEGATYWNA: te same asercje na artefakcie sprzed zmiany muszą paść —
 * stary zamawiał 140 ms w obie strony i jedną krzywą. Podaje się go `--stary`.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-przenikania.mjs [--stary <plik.min.js>]
 */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
  .catch(() => import('playwright'));
const PRZEGLADARKI = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'];
const ARG = process.argv.indexOf('--stary');
const PLIK = ARG > -1 ? process.argv[ARG + 1] : 'tryb-gotowania.min.js';
const TRYB = fs.readFileSync(PLIK, 'utf8');

/* Strona CELOWO BEZ `a[data-mp-gotowanie-toggle]` — bez źródła lotu runtime
   schodzi na przenikanie, czyli dokładnie na drogę, o którą ta próba pyta.
   Gdyby pigułka tu stała, mierzylibyśmy przelot ducha i wynik byłby o czym innym. */
const strona = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>window.MP={zegar:{__t:1000000000000,teraz:function(){return this.__t}}};</script>
<script>${TRYB}</script></body>`;

const przegladarka = await (async () => {
  for (const s of PRZEGLADARKI) {
    try { return await chromium.launch({ executablePath: s, args: ['--no-sandbox'] }); }
    catch (e) { /* następna */ }
  }
  throw new Error('nie znalazłem Chromium w: ' + PRZEGLADARKI.join(', '));
})();
const kontekst = await przegladarka.newContext({ viewport: { width: 390, height: 844 },
  reducedMotion: 'no-preference' });
const ADRES = 'https://proba.test/przepis';
await kontekst.route(ADRES, (r) =>
  r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: strona }));

let zdane = 0, oblane = 0;
const spr = (w, o, sz) => { if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (sz ? '\n      ' + sz : '')); } };

const MODEL = { skladniki: [], porcjeBazowe: 2, tytul: 'próba', czas: '30', meta: [],
  zamienniki: {}, bledy: [], pola: {}, kroki: [{ tytul: 'x', tekst: 'x', tekstHtml: 'x',
    czas: null, minutnik: null, kryterium: null, kryteriumHtml: null,
    skladniki: [], skladnikiTeraz: [], skladnikiDalej: [], skladnikiZuzyte: [] }] };

/* Animacja jest tworzona SYNCHRONICZNIE wewnątrz `otworz()`, więc czytamy ją
   w tym samym `evaluate` — bez czekania, którego nie dałoby się obronić. */
const czytaj = (k, akcja) => k.evaluate(({ m, co }) => {
  const korzen = () => document.getElementById('mp-tryb');
  if (co === 'otworz') window.MP.tryb.otworz(m, { model: m, porcje: 2 });
  else window.MP.tryb.zamknij();
  const K = korzen();
  if (!K) return { brak: 'korzeń' };
  /* NIE `getAnimations()[0]`. Animacja wejścia ma `fill: 'both'` i po zakończeniu
     ZOSTAJE podpięta do korzenia — `sprzataj()` jej nie kasuje. Przy wyjściu na
     korzeniu stoją więc DWIE, a pierwsza z listy to ta stara. Pierwsze podejście
     tej próby czytało właśnie ją i meldowało „wyjście trwa 260 ms i idzie 0→1",
     czyli opisywało wejście sprzed sekundy. Bierzemy tę, która BIEGNIE. */
  const wsz = K.getAnimations();
  const a = wsz.filter((x) => x.playState === 'running').pop() || wsz.pop();
  if (!a) return { brak: 'animacja' };
  const t = a.effect.getTiming();
  const kl = a.effect.getKeyframes();
  return { czas: t.duration, wypelnienie: t.fill,
    easing: (kl[0] && kl[0].easing) || null,
    krycia: kl.map((x) => x.opacity), klatek: kl.length,
    kierunek: a.playbackRate };
}, { m: MODEL, co: akcja });

console.log(`\n═══ przenikanie wejścia i wyjścia — ${PLIK} ═══`);

// ── 1. WEJŚCIE ──────────────────────────────────────────────────────────────
{
  const k = await kontekst.newPage(); await k.goto(ADRES);
  const s = await czytaj(k, 'otworz');
  console.log('\n[1] wejście');
  spr(!s.brak, 'jest animacja na korzeniu', JSON.stringify(s));
  spr(s.czas === 260, 'czas 260 ms', 'jest: ' + s.czas);
  spr(s.easing === 'cubic-bezier(0, 0, 0.2, 1)',
      'krzywa wyhamowania na klatce otwierającej', 'jest: ' + s.easing);
  spr(String(s.krycia[0]) === '0' && String(s.krycia[s.krycia.length - 1]) === '1',
      'krycie idzie 0 → 1', JSON.stringify(s.krycia));
  spr(s.kierunek === 1, 'odtwarzane w przód, nie przez reverse()', 'jest: ' + s.kierunek);
  await k.close();
}
// ── 2. WYJŚCIE ──────────────────────────────────────────────────────────────
{
  const k = await kontekst.newPage(); await k.goto(ADRES);
  await czytaj(k, 'otworz');
  await k.waitForTimeout(400);            // wejście domknięte, sprzątanie zrobione
  const s = await czytaj(k, 'zamknij');
  console.log('\n[2] wyjście');
  spr(!s.brak, 'jest animacja na korzeniu', JSON.stringify(s));
  spr(s.czas === 160, 'czas 160 ms — KRÓTSZE niż wejście', 'jest: ' + s.czas);
  spr(s.easing === 'cubic-bezier(0.4, 0, 1, 1)',
      'krzywa rozpędu na klatce otwierającej', 'jest: ' + s.easing);
  spr(String(s.krycia[0]) === '1' && String(s.krycia[s.krycia.length - 1]) === '0',
      'krycie idzie 1 → 0', JSON.stringify(s.krycia));
  spr(s.kierunek === 1, 'klatki ułożone wprost, nie przez reverse()', 'jest: ' + s.kierunek);
  await k.close();
}
// ── 3. ASYMETRIA — jedna asercja, bo to jest cała decyzja ───────────────────
/* Symetria 140/140 nie była decyzją, tylko wygodą `reverse()`. Ten przypadek
   pilnuje, żeby nikt nie „posprzątał" jej z powrotem do jednej liczby. */
{
  console.log('\n[3] asymetria wejścia i wyjścia');
  /* Szukamy NAZWY POLA, nie liczby. `160` trafia w minifikacie w kilkanaście
     miejsc (szerokości, czasy, indeksy) i przechodziłoby też na starym
     artefakcie — czyli asercja byłaby zielona bez powodu. `-m` terser-a mangluje
     nazwy zmiennych, nie nazw właściwości, więc `przenikanieWyjscie` przeżywa. */
  spr(/przenikanieWyjscie:160/.test(TRYB), 'artefakt zna osobny czas wyjścia');
  spr(/krzywaWejscia/.test(TRYB) && /krzywaWyjscia/.test(TRYB),
      'artefakt zna dwie osobne krzywe');
}
// ── 4. Kontrola tekstowa: 140 ms już nie ma na tej drodze ───────────────────
{
  console.log('\n[4] kontrola tekstowa');
  spr(/przenikanie:260|przenikanie:\s*260/.test(TRYB), 'artefakt niesie 260');
  spr(!/przenikanie:140|przenikanie:\s*140/.test(TRYB), 'artefakt nie niesie już 140');
}

console.log(`\n───────────────────────────────\nzdane ${zdane} · oblane ${oblane}`);
await przegladarka.close();
process.exit(oblane ? 1 : 0);
