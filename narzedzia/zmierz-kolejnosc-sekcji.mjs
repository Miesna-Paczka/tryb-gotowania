/* zmierz-kolejnosc-sekcji.mjs — kolejnosc sekcji strony przepisu w ukladzie
 * jednokolumnowym (<= 991 px) i dwukolumnowym.
 *
 * CO MIERZY: `getComputedStyle(...).order` i `getBoundingClientRect()` kazdego
 * dziecka `.main.is-dynamic`, posortowane po `y` — czyli kolejnosc NARYSOWANA,
 * a nie zadeklarowana. Sprawdza tez, czy arkusz ze skryptu `mpKolejnoscSekcji`
 * jest w DOM i czy tag skryptu nie zostal przepisany na `text/plain`
 * (bramkowanie Cookiebota).
 *
 * DLACZEGO ISTNIEJE: kolejnosc sekcji ustawiaja DWA zrodla naraz — regula
 * w bloku kodu strony i arkusz wstrzykiwany skryptem rejestrowanym. Drugi musi
 * wygrac kaskade, wiec ma wyzsza specyficznosc (`.main.is-dynamic .section-...`).
 * Tego nie da sie sprawdzic czytaniem kodu — trzeba zmierzyc, ktora regula
 * faktycznie zadzialala na zywej stronie.
 *
 * CZEGO NIE MIERZY: most przez `curl` odtwarza tresc odpowiedzi, nie warunki
 * sieciowe — nie powie nic o migotaniu ani o kolejnosci ladowania. Stan koncowy.
 *
 * Uruchomienie:
 *   node narzedzia/zmierz-kolejnosc-sekcji.mjs --url <adres>
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const URL_STRONY = arg('--url', 'https://miesna-paczka-ea5c01.webflow.io/przepisy/kotlety-mielone-z-indyka');
const CACHE = fs.mkdtempSync(path.join(os.tmpdir(), 'kolejnosc-'));
let pobrane = 0;
const padly = [];

/* Piaskownica sesji nie wypuszcza przegladarki do sieci; `curl` wychodzi.
   Kazde zadanie idzie wiec przez `curl` i wraca przechwyceniem trasy.
   Ponowienia sa konieczne, nie ostroznosciowe — pojedyncze `Connection reset`
   zdarza sie i przy `route.abort()` jest CICHE. */
/* CACHE CDN POTRAFI PODAC HTML SPRZED PUBLIKACJI — i to na GOLYM adresie, bo
   dokladnie ten adres rozgrzewa sie pomiarami kontroli negatywnej. Zdarzylo sie
   DWA RAZY: raz pomiar po publikacji pokazal stara kolejnosc, raz „sam CSS nie
   trzyma" — oba razy produkt byl w porzadku, klamal przyrzad. Dlatego SAM
   DOKUMENT idzie przez `curl` z doklejonym parametrem (obiekt w cache jest
   keyowany dokladnym adresem, wiec parametr go omija). Przegladarka nawiguje
   pod adres czysty, wiec `location.href` zostaje bez smiecia, a podzasoby ida
   normalnie, zeby nie mielic CDN-u bez potrzeby. */
const BEZ_ZAPYTANIA = (u) => u.split('?')[0];
const CB = 'mpcb=' + Date.now();
function przezCurl(url) {
  if (BEZ_ZAPYTANIA(url) === BEZ_ZAPYTANIA(URL_STRONY)) {
    url += (url.includes('?') ? '&' : '?') + CB;
  }
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
  padly.push(url.slice(0, 90));
  return null;
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

async function zmierz(w, h, mobile) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1,
                                   isMobile: mobile, hasTouch: mobile });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (!/^https?:/.test(u)) return route.continue();
    const o = przezCurl(u);
    if (!o) return route.abort();
    route.fulfill({ status: o.status, contentType: o.contentType, body: o.body });
  });
  const p = await ctx.newPage();
  await p.goto(URL_STRONY, { waitUntil: 'load', timeout: 180000 });
  await p.waitForTimeout(2500);
  const out = await p.evaluate(() => {
    const styl = document.querySelector('style[data-mp-kolejnosc]');
    const tagi = [...document.querySelectorAll('script')]
      .filter((s) => (s.src || '').includes('mpkolejnoscsekcji'))
      .map((s) => ({ type: s.type || '(brak atrybutu type)', zgoda: s.getAttribute('data-cookieconsent') }));
    const rodzic = document.querySelector('.main.is-dynamic');
    const sekcje = rodzic ? [...rodzic.children].map((el, i) => {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      return { klasa: el.className || el.tagName.toLowerCase(), dom: i, order: cs.order,
               display: cs.display, y: Math.round(r.top + window.scrollY), h: Math.round(r.height) };
    }).filter((s) => s.display !== 'none') : [];
    sekcje.sort((a, b2) => a.y - b2.y);
    return { stylWstrzykniety: !!styl, tagiSkryptu: tagi,
             rodzic: rodzic ? getComputedStyle(rodzic).display + ' / ' + getComputedStyle(rodzic).flexDirection : '(brak)',
             sekcje };
  });
  await ctx.close();
  return out;
}

let zdane = 0, oblane = 0;
const spr = (w, o, s) => { if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (s ? '\n        ' + s : '')); } };

for (const [w, h, mob] of [[393, 852, true], [1440, 900, false]]) {
  const r = await zmierz(w, h, mob);
  console.log(`\n═══ ${w} px · ${URL_STRONY.replace(/^https:\/\//, '').slice(0, 58)} ═══`);
  console.log(`        rodzic .main.is-dynamic: ${r.rodzic}`);
  console.log(`        style[data-mp-kolejnosc] w DOM: ${r.stylWstrzykniety}`);
  console.log(`        tag skryptu: ${JSON.stringify(r.tagiSkryptu)}`);
  r.sekcje.forEach((s, i) => console.log(
    `        ${String(i + 1).padStart(2)}. ${s.klasa.padEnd(26)} order=${String(s.order).padEnd(3)} dom=${String(s.dom).padStart(2)}  y=${String(s.y).padStart(5)}  h=${s.h}`));

  const naz = r.sekcje.map((s) => s.klasa);
  const iR = naz.indexOf('section-recipe-rail');
  const iK = naz.indexOf('section-recipe-carousel');
  const iC = naz.indexOf('section-recipe-cards');
  const iO = naz.indexOf('section-recipe-nutrition');
  if (w <= 991) {
    /* STAN DOCELOWY: kolejnosc trzyma CSS w bloku stopki, a skryptu `mpKolejnoscSekcji`
       NIE MA. Skrypt byl obejsciem na czas, gdy API nie przyjmowalo zapisu bloku
       (HTTP 406 na tresci z `<script>`); operator wpisal regule Designerem, wiec
       obejscie zdjeto. Ta asercja pilnuje, zeby nie wrocilo tylnymi drzwiami —
       dwa zrodla jednej kolejnosci to dokladnie ten dlug, ktory tu splacono. */
    spr(!r.stylWstrzykniety && r.tagiSkryptu.length === 0,
        'kolejność trzyma sam CSS — po obejściu `mpKolejnoscSekcji` nie ma śladu',
        `arkusz=${r.stylWstrzykniety} tagów=${r.tagiSkryptu.length}`);
    spr(iR > -1 && iK > -1 && iK === iR + 1, 'rail stoi BEZPOŚREDNIO nad karuzelą', `rail=${iR} karuzela=${iK}`);
    spr(iC > -1 && iR === iC + 1, 'karty przepisów są NAD railem (rail już nie pod tabelą)', `cards=${iC} rail=${iR}`);
    spr(iO > -1 && iC === iO + 1, 'tabela wartości odżywczych → karty przepisów', `nutrition=${iO} cards=${iC}`);
  } else {
    /* KONTROLA NEGATYWNA: w dwukolumnowym nic nie wolno ruszyc. Regula siedzi
       w `@media (max-width:991px)`, wiec tu wszystkie `order` maja byc zerowe. */
    spr(r.sekcje.every((s) => s.order === '0'), 'układ dwukolumnowy nietknięty — wszystkie order=0',
        JSON.stringify(r.sekcje.filter((s) => s.order !== '0')));
  }
}
await b.close();
console.log(`\n        nieudanych żądań mostu: ${padly.length}${padly.length ? ' — ' + padly.join(', ') : ''}`);
console.log(`\n═══ ${zdane} zdanych, ${oblane} oblanych ═══`);
process.exit(oblane ? 1 : 0);
