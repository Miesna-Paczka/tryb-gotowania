/* proba-stagingu.mjs — pomiar ZYWEJ strony stagingowej w prawdziwej przegladarce.
 *
 * Piaskownica sesji nie wypuszcza przegladarki do sieci (`net::ERR_CONNECTION_RESET`
 * na kazdym adresie, z proxy i bez), a `curl` wychodzi normalnie. Ten przyrzad
 * mostkuje te dwie rzeczy: KAZDE zadanie przegladarki jest pobierane `curl`-em
 * i podawane przez przechwycenie trasy. Mierzona jest wiec prawdziwa strona,
 * z prawdziwym HTML-em z CMS, prawdziwymi skryptami Webflow i prawdziwym
 * runtime'em spod adresu, ktory strona faktycznie deklaruje.
 *
 * CZEGO TO NIE ZASTEPUJE: pomiaru z maszyny, ktora ma normalna siec. Most
 * odtwarza tresc odpowiedzi, ale nie warunki sieciowe — nie zmierzy opoznien,
 * przekierowan po stronie CDN ani blokad CORS zaleznych od pochodzenia.
 *
 * Uruchomienie:
 *   node narzedzia/proba-stagingu.mjs                       # domyslny przepis z nagrania
 *   node narzedzia/proba-stagingu.mjs --url <adres>
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const URL_STRONY = arg('--url',
  'https://miesna-paczka-ea5c01.webflow.io/przepisy/pulpety-z-makaronem-w-kremowym-sosie-z-soczewicy-przepis');
/* 402 to szerokosc z nagrania. Skill `mp-design-system`: 479 NIE jest testem
   mobilnym — realne telefony maja 360-393 i tam wychodza elementy o stalej
   szerokosci. Mierz oprocz 402 takze 360. */
const SZER = Number(arg('--szer', '402'));
const CACHE = fs.mkdtempSync(path.join(os.tmpdir(), 'most-'));
let pobrane = 0, nieudane = 0;

const padly = [];
function przezCurl(url) {
  /* PONOWIENIA SA KONIECZNE, NIE OSTROZNOSCIOWE. Pojedyncze `Recv failure:
     Connection reset by peer` zdarza sie w tym srodowisku i przy `route.abort()`
     jest CICHE: jesli padnie akurat pobranie ladunku przepisu, model nie
     powstaje, tryb nie ma czego otworzyc, a wynik wyglada jak REGRESJA PRODUKTU.
     Zdarzylo sie dokladnie tak przy pierwszym pomiarze stagingu. Kazde padniete
     zadanie ladue w `padly` i jest wypisywane — zero, ktore nie ma dowodu, ze
     przyrzad zyl, nie jest wynikiem. */
  const f = path.join(CACHE, String(pobrane++) + '.bin');
  for (let proba = 0; proba < 3; proba++) {
    try {
      const typ = execFileSync('curl', ['-sSL', '--max-time', '30', '--retry', '2',
        '-o', f, '-w', '%{content_type}|%{http_code}', url],
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      const [ct, kod] = typ.split('|');
      return { body: fs.readFileSync(f), contentType: (ct || 'application/octet-stream').trim(),
               status: Number(kod) || 200 };
    } catch (e) { /* nastepna proba */ }
  }
  nieudane++; padly.push(url.slice(0, 90));
  return null;
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: SZER, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.route('**/*', (route) => {
  const u = route.request().url();
  if (!/^https?:/.test(u)) return route.continue();
  const o = przezCurl(u);
  if (!o) return route.abort();
  route.fulfill({ status: o.status, contentType: o.contentType, body: o.body });
});
const p = await ctx.newPage();
const bledy = [];
p.on('pageerror', (e) => bledy.push(String(e)));

let zdane = 0, oblane = 0, seria = 0;
const spr = (w, o, s) => { seria++; if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (s ? '\n        ' + s : '')); } };

console.log(`\n═══ STAGING · ${URL_STRONY.replace(/^https:\/\//, '').slice(0, 62)} · 402 px ═══`);
/* WARTOWNIK GOTOWOSCI, nie `setTimeout` na wyczucie. Pierwsza wersja czekala
   `domcontentloaded` + 4 s i zastawala strone, na ktorej skrypty rejestrowane
   jeszcze nie zdazyly sie wykonac: `window.mpGotowanie` bylo `undefined`,
   tryb nie dawal sie otworzyc, a wynik wygladal na REGRESJE RUNTIME'U.
   Wszystkie te skrypty wracaja z 200 — brakowalo wylacznie czekania. */
await p.goto(URL_STRONY, { waitUntil: 'load', timeout: 180000 });
await p.waitForFunction(() => window.MP && window.MP.tryb && window.MP.przepis
  && window.mpGotowanie && window.mpToggle && window.MP.model, null, { timeout: 60000 })
  .catch(() => console.log('        [UWAGA] wartownik gotowości nie doczekał — wynik niżej może opisywać stronę w połowie startu'));

// ── [0] KTORA WERSJA TU STOI ─────────────────────────────────────────────────
console.log('\n[0] która wersja runtime stoi na tej stronie');
const stan = await p.evaluate(() => ({
  tytul: document.title,
  skrypty: [...document.querySelectorAll('script[src]')].map((s) => s.src)
    .filter((s) => /tryb-gotowania|przepis-parser/.test(s)),
  maTryb: !!(window.MP && window.MP.tryb),
  maZaznaczone: typeof ((window.MP || {}).tryb || {}).zaznaczone === 'function',
  maToggle: !!document.querySelector('[data-mp-gotowanie-toggle]')
}));
console.log('        tytuł: ' + stan.tytul);
stan.skrypty.forEach((s) => console.log('        skrypt: ' + s.replace(/^https:\/\//, '')));
spr(stan.skrypty.length === 2, 'strona deklaruje dwa skrypty runtime', JSON.stringify(stan.skrypty));
spr(stan.maTryb === true, 'runtime wykonał się — `MP.tryb` istnieje', String(stan.maTryb));
const nowa = stan.maZaznaczone;
console.log(`        wersja: ${nowa ? 'NOWA (D-39.76+ — `MP.tryb.zaznaczone` obecne)' : 'STARA (sprzed D-39.76)'}`);

/* OKNO ZGODY NA COOKIES przykrywa CALA strone na domenie produkcyjnej
   (`#CybotCookiebotDialog`, `z-index: 2147483631`) — na subdomenie stagingowej
   sie nie pokazuje. Kazde `elementFromPoint` zwraca wtedy jego `DIV`, wiec pomiar
   TRAFIALNOSCI czegokolwiek jest bez sensu: mierzy banner, nie produkt.
   Prawdziwy uzytkownik banner zamyka — jedna albo druga odpowiedzia. Zdejmujemy
   go, zeby odtworzyc stan „banner zamkniety", i MELDUJEMY to, zamiast po cichu
   mierzyc inna strone niz opisana. NIE klikamy „akceptuj": wybor zgody nie jest
   nasz do podjecia, a do trafienia w checkbox nie jest potrzebny. */
const banner = await p.evaluate(() => {
  const d = document.getElementById('CybotCookiebotDialog');
  const o = document.getElementById('CybotCookiebotDialogBodyUnderlay');
  if (!d && !o) return null;
  /* UKRYWAMY, NIE KASUJEMY. Usuniecie wezlow wywolalo na produkcji
     `Uncaught TypeError: getComputedStyle ... parameter 1 is not of type 'Element'`
     — czyjs skrypt trzymal do nich referencje. Bledu NIE BYLO w przebiegu bez
     zdejmowania bannera, wiec pochodzil z przyrzadu i zafalszowalby wiersz
     „zero bledow strony". `display:none` zdejmuje go z trafien tak samo,
     a drzewo zostaje nietkniete. */
  [d, o].forEach((e) => { if (e) { e.style.setProperty('display', 'none', 'important');
    e.style.setProperty('pointer-events', 'none', 'important'); } });
  return true;
});
if (banner) console.log('        [PRZYRZĄD] zdjęte okno zgody na cookies — odtworzony stan „banner zamknięty"');

const uklad = await p.evaluate(() => ({
  clientWidth: document.documentElement.clientWidth,
  innerWidth: window.innerWidth,
  arkuszy: document.styleSheets.length,
  regul: [...document.styleSheets].reduce((a, s) => { try { return a + s.cssRules.length; } catch (e) { return a; } }, 0),
  scrollW: document.documentElement.scrollWidth
}));
console.log('        układ: clientWidth ' + uklad.clientWidth + ', innerWidth ' + uklad.innerWidth
  + ', scrollWidth ' + uklad.scrollW + ', arkuszy CSS ' + uklad.arkuszy + ', reguł ' + uklad.regul);
console.log('        most: pobrano ' + pobrane + ', nieudanych ' + nieudane);
spr(nieudane === 0, 'most pobrał WSZYSTKIE zasoby — bez tego czerwień niżej może być mostem, nie produktem',
  padly.join(' | '));
spr(uklad.clientWidth <= SZER, `strona renderuje się w szerokości okna (${SZER}) — CSS doszedł`,
  'clientWidth: ' + uklad.clientWidth + ', reguł CSS: ' + uklad.regul);

// ── [1] WEJSCIE W TRYB TA SAMA DROGA, CO W NAGRANIU ──────────────────────────
console.log('\n[1] wejście w tryb gotowania przełącznikiem');
spr(stan.maToggle === true, 'przełącznik trybu istnieje na stronie', String(stan.maToggle));
/* Przelacznik jest UKRYTY, dopoki gorna krawedz sekcji skladnikow nie siegnie
   polowy okna — tak dziala `mptogglegotowania` 1.1.0. Przewijanie DO PRZELACZNIKA
   (pierwsza wersja tego pliku) nie spelnia tego warunku, wiec przelacznik zastaje
   sie w pozycji sprzed wsuniecia (x=386 przy oknie 402) i wyglada na defekt
   ukladu. Przewijamy do KOTWICY, czyli do tego, od czego zalezy stan. */
const wsun = await p.evaluate(async () => {
  const k = document.querySelector('.section-recipe-ingredients');
  if (!k) return { brakKotwicy: true };
  k.scrollIntoView({ block: 'start' });
  window.scrollBy(0, -Math.round(window.innerHeight * 0.30));
  await new Promise((r) => setTimeout(r, 900));
  window.dispatchEvent(new Event('resize'));
  await new Promise((r) => setTimeout(r, 600));
  return { widoczny: !!(window.mpToggle && window.mpToggle.widoczny),
           przelaczen: window.mpToggle ? window.mpToggle.przelaczen : -1 };
});
spr(wsun.widoczny === true, 'przełącznik wsunął się po dojściu do sekcji składników (mpToggle.widoczny)',
  JSON.stringify(wsun));

const otw = await p.evaluate(() => {
  const t = document.querySelector('[data-mp-gotowanie-toggle]');
  if (!t) return { brak: true, trafia: false, sx: -9999, sy: -9999 };
  const r = t.getBoundingClientRect();
  const W = document.documentElement.clientWidth;
  const sx = r.x + r.width / 2, sy = r.y + r.height / 2;
  const e = (sx >= 0 && sx < W && sy >= 0) ? document.elementFromPoint(sx, sy) : null;
  return { sx, sy, x: Math.round(r.x), szer: Math.round(r.width), wystaje: Math.round(r.right - W),
    jestCta: t.hasAttribute('data-mp-gotowanie-cta') || !!t.closest('[data-mp-gotowanie-cta]'),
    trafia: !!(e && (t.contains(e) || e === t)), co: e ? (String(e.className) || e.tagName) : 'pusto' };
});
console.log('        przełącznik: x ' + otw.x + ', szerokość ' + otw.szer
  + ', wystaje poza okno o ' + otw.wystaje + ' px, jest CTA: ' + otw.jestCta);
spr(otw.wystaje <= 0, `przełącznik MIEŚCI SIĘ w oknie ${SZER} px`, 'wystaje o ' + otw.wystaje + ' px');
spr(otw.trafia === true, 'w geometrycznym środku przełącznika leży przełącznik (albo jego potomek)', JSON.stringify(otw));
/* `D-40.20` NA ŻYWEJ STRONIE — PRÓBKOWANIE PRZEJŚCIA, NIE PRZEWIJANIE GO.
   Pierwsza wersja pauzowała animacje ducha i przewijała je `currentTime`.
   Nie działa na żywej stronie i powód jest w `graj()`: czeka on na `finished`
   OSTATNIEJ animacji z listy, a ostatnie są animacje `top`/`bottom`, nie ducha.
   Pauzowanie ducha nie wstrzymuje więc sprzątania — duch bywa odłączony od
   dokumentu, zanim odczyt zdąży się wykonać, a `getComputedStyle` zwraca wtedy
   pustkę. (W `proba-barwy-przejscia.mjs` przewijanie działa, bo tam pauzujemy
   zanim cokolwiek zdąży dobiec.)
   Tu zbieramy PRAWDZIWY przebieg: obserwator łapie ducha przy wstawieniu
   i uruchamia próbnik, który zapisuje `currentTime` własnej animacji ducha razem
   z wyliczoną barwą. Oś czasu bierzemy z animacji, nie z zegara ściennego —
   gdyby karta nie renderowała, `currentTime` po prostu nie rośnie i widać to
   w wyniku, zamiast dostać ciszę udającą sukces. */
await p.evaluate(() => {
  window.__proby = []; window.__zlapany = false;
  const obs = new MutationObserver(() => {
    const d = document.querySelector('.mp-tryb__duch');
    if (!d || window.__zlapany) return;
    window.__zlapany = true; obs.disconnect();
    const an = d.getAnimations();
    window.__ileAnim = an.length;
    const id = setInterval(() => {
      if (!d.isConnected) { clearInterval(id); return; }
      const t = an.length ? an[an.length - 1].currentTime : null;
      window.__proby.push({ t: t == null ? -1 : Math.round(t),
                            css: getComputedStyle(d).backgroundColor });
    }, 25);
    setTimeout(() => clearInterval(id), 1600);
  });
  obs.observe(document.body, { childList: true, subtree: true });
});
if (otw.trafia) { await p.mouse.click(otw.sx, otw.sy); }
await p.waitForTimeout(1800);

const barwa = await p.evaluate(() => {
  const rozbierz = (c) => { const m = c.match(/rgba?\(([^)]+)\)/);
    const q = m ? m[1].split(',').map((v) => parseFloat(v)) : [];
    return { r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 }; };
  return { zlapany: !!window.__zlapany, ileAnim: window.__ileAnim || 0,
    proby: (window.__proby || []).filter((x) => x.css && /rgb/.test(x.css))
      .map((x) => ({ t: x.t, css: x.css, ...rozbierz(x.css) })) };
});

spr(barwa.zlapany === true, 'złapano ducha przejścia (D-40.20)', JSON.stringify(barwa).slice(0, 120));
spr(barwa.proby.length >= 8, 'próbnik zebrał serię z przelotu — oś czasu animacji biegła',
  'próbek: ' + barwa.proby.length);
if (barwa.proby.length >= 8) {
  const bialy = (x) => Math.round(x.r) === 255 && Math.round(x.g) === 253 && Math.round(x.b) === 251;
  const pierw = barwa.proby[0], ost = barwa.proby[barwa.proby.length - 1];
  console.log('        barwa w locie: ' + barwa.proby.filter((_, i) => i % 6 === 0)
    .map((x) => x.t + 'ms ' + x.css).join('  |  '));
  spr(!bialy(pierw), 'KONTROLA UJEMNA: na starcie duch NIE jest biały — ma barwę pigułki', pierw.css);
  spr(bialy(ost), 'na końcu przelotu duch JEST biały', ost.css);
  const posrednie = barwa.proby.filter((x) => !bialy(x) && Math.round(x.b) > Math.round(pierw.b));
  spr(posrednie.length >= 3,
    'barwa przechodzi STOPNIOWO — są stany pośrednie, nie skok beż → biel',
    'pośrednich próbek: ' + posrednie.length);
  const pierwszaBiel = barwa.proby.find(bialy);
  const ladowanie = barwa.proby.filter((x) => x.t >= 0 && x.t <= 760);
  spr(!!pierwszaBiel && pierwszaBiel.t > 0 && pierwszaBiel.t <= 760,
    'biel osiągnięta NAJPÓŹNIEJ w chwili lądowania (.76 = 760 ms)',
    pierwszaBiel ? 'pierwsza biel w ' + pierwszaBiel.t + ' ms' : 'nigdy');
  spr(barwa.proby.every((x) => x.a === 1), 'duch KRYJĄCY przez cały przelot (alfa 1)',
    'alfy: ' + [...new Set(barwa.proby.map((x) => x.a))].join(','));
  spr(ladowanie.length > 0, 'seria obejmuje przedział do lądowania', 'próbek do 760 ms: ' + ladowanie.length);
}
let otwarty = await p.evaluate(() => !!document.querySelector('#mp-tryb[data-otwarty]'));
spr(otwarty === true, 'tryb gotowania otwarty GESTEM w przełącznik — tą samą drogą, co w nagraniu', String(otwarty));
if (!otwarty) {
  console.log('        (otwieram tryb programowo — przedmiotem sekcji [2] jest checkbox, nie wejście)');
  await p.evaluate(() => {
    const c = document.querySelector('[data-mp-gotowanie-cta]') || document.querySelector('[data-mp-gotowanie-toggle]');
    if (c) c.click();
  });
  await p.waitForTimeout(1600);
  otwarty = await p.evaluate(() => !!document.querySelector('#mp-tryb[data-otwarty]'));
}
/* Zrzut POZA drzewem repozytorium. Pierwsza wersja pisala do katalogu roboczego
   i dwa pliki po ~700 kB wjechaly do commita — smiec w repo publicznym. */
const ZRZUT = arg('--zrzut', path.join(os.tmpdir(), 'staging-' + SZER + '.png'));
await p.screenshot({ path: ZRZUT, fullPage: false });
console.log('        zrzut: ' + ZRZUT);

// ── [2] GEST Z NAGRANIA NA ZYWEJ STRONIE ─────────────────────────────────────
console.log('\n[2] gest z nagrania na żywej stronie');
const dojdz = await p.evaluate(() => {
  const w = window.MP.tryb;
  const st = (window.MP.__widok) || null;
  // znajdz krok, na ktorym soczewica jest „w tym kroku"; korzystamy z API pomiarowego
  for (let n = 1; n <= 20; n++) {
    w.pokazKrok(n);
    const jest = [...document.querySelectorAll('.mp-tryb__wiersz')]
      .some((x) => x.getAttribute('data-mp-klucz') === 'soczewica'
        && x.getAttribute('data-stan') === 'teraz' && !x.closest('.mp-tryb__arkusz'));
    if (jest) return n;
  }
  return -1;
});
spr(dojdz > 0, 'znaleziono krok, na którym soczewica jest „w tym kroku"', 'krok: ' + dojdz);
await p.waitForTimeout(400);

const czytaj = () => p.evaluate(() => {
  const w = [...document.querySelectorAll('.mp-tryb__wiersz')]
    .find((x) => x.getAttribute('data-mp-klucz') === 'soczewica' && !x.closest('.mp-tryb__arkusz'));
  /* Wartownik takze w tej galezi — bez niego `sx` bylo `undefined`
     i `elementFromPoint` rzucalo, URYWAJAC serie zamiast dac padniecie. */
  if (!w) return { brak: true, glif: null, tag: null, maCel: false, dekoracja: 'brak',
                   etykieta: 'BRAK WIERSZA', sx: -9999, sy: -9999 };
  const pt = w.querySelector('.mp-tryb__ptaszek');
  const cel = pt ? pt.querySelector('.mp-tryb__cel') : null;
  const r = (cel || pt) ? (cel || pt).getBoundingClientRect() : null;
  return { glif: pt ? String((pt.querySelector('.mp-tryb__ptaszek-glif') || {}).textContent || '').trim() : null,
    tag: pt ? pt.tagName : null, maCel: !!cel,
    dekoracja: getComputedStyle(w.querySelector('.mp-tryb__nazwa-skl')).textDecorationLine,
    etykieta: w.querySelector('.mp-tryb__nazwa-skl').textContent,
    celW: (cel && r) ? Math.round(r.width) : -1, celH: (cel && r) ? Math.round(r.height) : -1,
    sx: r ? r.x + r.width / 2 : -9999, sy: r ? r.y + r.height / 2 : -9999 };
});
const przed = await czytaj();
spr(!przed.brak, 'wiersz soczewicy jest na ekranie', JSON.stringify(przed));
console.log('        etykieta: „' + przed.etykieta + '"  ·  ptaszek: ' + przed.tag + '  ·  własny cel dotyku: ' + przed.maCel);
spr(przed.glif === 'check_box_outline_blank', 'KONTROLA UJEMNA: przed stuknięciem glif to check_box_outline_blank', 'glif: ' + przed.glif);
/* `D-39.81` — cel poszerzony o 12 px w prawo. Mierzone na ZYWEJ stronie,
   bo o to zgloszenie chodzilo i tu ma byc widoczne. */
spr(przed.celW === 44, 'cel dotyku checkboxa ma 44 px szerokości (D-39.81)', 'szer. ' + przed.celW);
spr(przed.celH === 31 || przed.celH === 32, 'wysokość celu 31 albo 32 wg wysokości wiersza', 'wys. ' + przed.celH);

const traf = await p.evaluate(([x, y]) => {
  if (!isFinite(x) || !isFinite(y) || x < 0 || y < 0) return { ok: false, co: 'brak współrzędnych' };
  const e = document.elementFromPoint(x, y);
  const pt = e ? e.closest('.mp-tryb__ptaszek') : null;
  const w = e ? e.closest('.mp-tryb__wiersz') : null;
  return { ok: !!pt && w && w.getAttribute('data-mp-klucz') === 'soczewica',
           co: e ? (e.className || e.tagName) : 'pusto' };
}, [przed.sx, przed.sy]);
spr(traf.ok === true, 'w środku celu leży ptaszek soczewicy — jest w co trafić palcem', JSON.stringify(traf));

const ciag = [przed.glif];
for (let i = 0; i < 5; i++) { await p.mouse.click(przed.sx, przed.sy); await p.waitForTimeout(140); ciag.push((await czytaj()).glif); }
console.log('        ciąg glifów (soczewica ×5): ' + ciag.join(' → '));
const oczek = ['check_box_outline_blank', 'check_box', 'check_box_outline_blank', 'check_box', 'check_box_outline_blank', 'check_box'];
spr(ciag.join('|') === oczek.join('|'), 'pięć stuknięć daje pięć PRZEŁĄCZEŃ — to jest predykat, który w nagraniu padł', ciag.join(' → '));
const po = await czytaj();
spr(po.dekoracja.indexOf('line-through') > -1, 'nazwa przekreślona po odhaczeniu', po.dekoracja);
spr(po.dekoracja.indexOf('underline') === -1, 'bez kropkowanego podkreślenia (D-39.78)', po.dekoracja);

spr(bledy.length === 0, 'zero błędów strony', bledy.slice(0, 3).join(' | '));
console.log(`\n  most: pobrano ${pobrane} zasobów, nieudanych ${nieudane}`);
if (padly.length) console.log('  padły: ' + padly.join('\n         '));
console.log(`  ── zdane ${zdane}, oblane ${oblane}, SERIA ${seria}`);
await b.close();
fs.rmSync(CACHE, { recursive: true, force: true });
process.exitCode = oblane ? 1 : 0;
