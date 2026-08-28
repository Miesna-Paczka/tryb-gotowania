/* suchy-bieg-ekranu-startowego.mjs — BUDŻET PIONOWY ekranu startowego.
 *
 * Pyta o jedno: czy selektor porcji — jedyna decyzja tego ekranu — mieści się NAD
 * paskiem dolnym, czy trzeba po niego przewinąć. Mierzy prawdziwy runtime na 16
 * prawdziwych przepisach, na trzech wysokościach ekranu.
 *
 * ZGIĘCIE JEST MIERZONE, NIE ZAKŁADANE. Belka i pasek dolny LEŻĄ NA TOP-ie
 * (`position:absolute`), więc pasmo widoczne bez przewijania kończy się na górnej
 * krawędzi paska, a nie na dole okna. Różnica to 132 px i decyduje o werdykcie.
 *
 * KROJE MUSZĄ BYĆ PRAWDZIWE. Wysokość tytułu zależy od tego, na ile wierszy rozłoży
 * się nazwa przepisu, a to zależy od metryk DM Serif Display. Zastępczy szeryf daje
 * inne zawijanie i inny werdykt. Pliki pobieramy z CDN witryny (raz, do `KESZ`),
 * a kontrola K1 porównuje szerokość napisu w DM Serif z szerokością w rodzinie
 * NIEISTNIEJĄCEJ — jeśli są równe, krój się nie wczytał i wynik idzie do kosza.
 * Kontrola na szerokości, nie na wysokości: wysokość akapitu jest skwantowana do
 * wierszy, więc dwa różne kroje potrafią dać tę samą liczbę wierszy i przepuścić
 * pomiar zrobiony nie tym krojem (pułapka złapana w przeb. 50).
 *
 * Uruchomienie: node narzedzia/suchy-bieg-ekranu-startowego.mjs [plik.min.js]
 * Bez argumentu mierzy `tryb-gotowania.min.js`; z argumentem — dowolny artefakt,
 * co daje porównanie „przed/po" tym samym przyrządem.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { parser } from '../odmiana-node.mjs';
import { zrodla } from '../lancuch-html/wspolne.mjs';

const KESZ = '/tmp/mp-fonty';
const CDN = 'https://cdn.prod.website-files.com/6983617613052dc9fe624303/';
const PLIKI = [
  ['69e1f7470be6473e636ba48f_DMSerifDisplay-Regular.woff2', 'DM Serif Display', 400],
  ['69e1f74739f63171bd862675_DMSans-Regular.woff2', 'DM Sans', 400],
  ['69e1f747ce96d4c53fd48400_DMSans-Medium.woff2', 'DM Sans', 500],
  ['69e1f74972ef94660945696c_DMSans-SemiBold.woff2', 'DM Sans', 600],
  ['69e1f7472f5c6273aad61998_DMSans-Bold.woff2', 'DM Sans', 700],
];
fs.mkdirSync(KESZ, { recursive: true });
for (const [nazwa] of PLIKI) {
  const cel = path.join(KESZ, nazwa);
  if (fs.existsSync(cel) && fs.statSync(cel).size > 1000) continue;
  execFileSync('curl', ['-sSL', CDN + nazwa, '-o', cel]);
}
const FONTY = PLIKI.map(([n, rodzina, waga]) =>
  `@font-face{font-family:"${rodzina}";font-weight:${waga};font-display:block;` +
  `src:url(data:font/woff2;base64,${fs.readFileSync(path.join(KESZ, n)).toString('base64')}) format("woff2")}`).join('');

const P = parser();
const PLIK = process.argv[2] || 'tryb-gotowania.min.js';
const TRYB = fs.readFileSync(PLIK, 'utf8');
const strona = `<!doctype html><meta charset="utf-8"><style>${FONTY}</style><body style="margin:0">
<script>window.MP={zegar:{__t:1000000000000,teraz:function(){return this.__t}}};</script>
<script>${fs.readFileSync('przepis-parser.min.js', 'utf8')}</script>
<script>${TRYB}</script></body>`;

const EKRANY = [
  { nazwa: '360×780 (klatka)', w: 360, h: 780 },
  { nazwa: '375×667 (iPhone SE)', w: 375, h: 667 },
  { nazwa: '390×844 (iPhone 14)', w: 390, h: 844 },
];
const ADRES = 'https://proba.test/przepis';
const przegladarka = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const wiersze = [];

for (const ekran of EKRANY) {
  const kontekst = await przegladarka.newContext({ viewport: { width: ekran.w, height: ekran.h } });
  await kontekst.route(ADRES, (r) =>
    r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: strona }));
  for (const { slug, zrodlo } of zrodla()) {
    const baza = zrodlo.meta['porcje-bazowe'];
    const skl = P._wewnetrzne.parsujSkladniki(zrodlo.pola.skladniki);
    const kroki = P._wewnetrzne.parsujKroki(zrodlo.pola.kroki, skl.map((s) => s.key));
    /* Model MUSI nieść zdjęcie i meta — bez nich mierzylibyśmy ekran bez dwóch
       najwyższych bloków (~266 px). Bajty zdjęcia nieistotne: wysokość daje CSS. */
    const model = { skladniki: skl, kroki, porcjeBazowe: baza, tytul: zrodlo.meta.nazwa,
      czas: String(zrodlo.meta['czas-minuty']), fotoUrl: 'https://proba.test/foto.jpg',
      meta: [{ glif: 'hourglass', wartosc: zrodlo.meta['czas-minuty'] + ' min' },
             { glif: 'local_dining', wartosc: '417 kcal' },
             { glif: 'leaderboard', wartosc: 'B24 W38 T10' }],
      zamienniki: {}, bledy: [], pola: {} };
    const karta = await kontekst.newPage();
    await karta.goto(ADRES);
    await karta.evaluate(async () => {
      await document.fonts.load('28px "DM Serif Display"');
      await document.fonts.load('16px "DM Sans"');
      await document.fonts.ready;
    });
    const w = await karta.evaluate(({ model, baza }) => {
      MP.tryb.otworz(MP.przepis.naPorcje(model, baza), { model, porcje: baza });
      const cz = MP.tryb.czesci(), top = cz.top;
      const korzen = MP.tryb.korzen().getBoundingClientRect();
      const porcje = top.querySelector('.mp-tryb__porcje').getBoundingClientRect();
      const tytul = top.querySelector('.mp-tryb__ekran-tytul');
      const szer = (rodzina) => { const s = document.createElement('span');
        s.style.cssText = 'position:absolute;white-space:nowrap;font-size:28px;font-family:' + rodzina;
        s.textContent = 'Spaghetti bolognese z wołowiną'; document.body.appendChild(s);
        const x = Math.round(s.getBoundingClientRect().width * 10) / 10; s.remove(); return x; };
      return {
        zgiecie: Math.round(cz.bottom.getBoundingClientRect().top - korzen.top),
        dolPorcji: Math.round(porcje.bottom - korzen.top),
        tytulH: Math.round(tytul.getBoundingClientRect().height),
        kolejnosc: [...top.children].filter((e) => !e.hidden)
          .map((e) => e.className.replace(/mp-tryb__/g, '').split(' ')[0]),
        krojSerif: szer('"DM Serif Display"'), krojNic: szer('"Nieistniejaca-XYZ"'),
      };
    }, { model, baza });
    await karta.close();
    wiersze.push({ ekran: ekran.nazwa, slug, tytul: zrodlo.meta.nazwa, ...w });
  }
  await kontekst.close();
}
await przegladarka.close();

const k1 = wiersze[0];
const krojOk = Math.abs(k1.krojSerif - k1.krojNic) > 1;
const przepisow = new Set(wiersze.map((w) => w.slug)).size;
console.log(`═══ budżet pionowy ekranu startowego — ${PLIK} (${Buffer.byteLength(TRYB)} B) ═══`);
console.log('K1 krój:', k1.krojSerif, 'px w DM Serif vs', k1.krojNic, 'px w rodzinie nieistniejącej —',
  krojOk ? 'WCZYTANY' : 'NIE WCZYTANY, WYNIK DO KOSZA');
console.log('K2 korpus:', przepisow, 'przepisów', przepisow === 16 ? '(OK)' : '(NIEZGODNE — oczekiwałem 16)');
console.log('K3 świeżość:', Buffer.byteLength(TRYB), 'B użyte ==', fs.statSync(PLIK).size, 'B na dysku',
  Buffer.byteLength(TRYB) === fs.statSync(PLIK).size ? '(OK)' : '(NIEZGODNE)');
if (!krojOk || przepisow !== 16) process.exit(2);
console.log('\nkolejność bloków TOP-u:', wiersze[0].kolejnosc.join(' → '));
let podRazem = 0;
for (const e of EKRANY) {
  const g = wiersze.filter((w) => w.ekran === e.nazwa);
  const pod = g.filter((w) => w.dolPorcji > w.zgiecie);
  podRazem += pod.length;
  console.log(`\n${e.nazwa}  zgięcie (górna krawędź paska dolnego) ${g[0].zgiecie} px`);
  console.log(`   selektor porcji POD ZGIĘCIEM: ${pod.length}/${g.length}` +
    (pod.length ? `  (o ${Math.min(...pod.map((w) => w.dolPorcji - w.zgiecie))}–${Math.max(...pod.map((w) => w.dolPorcji - w.zgiecie))} px)` : ''));
  const naj = g.slice().sort((a, b) => b.dolPorcji - a.dolPorcji)[0];
  console.log(`   najgłębiej: ${naj.dolPorcji} px (tytuł h${naj.tytulH} — ${naj.tytul})`);
}
console.log(`\nrazem pod zgięciem: ${podRazem}/${wiersze.length}`);
