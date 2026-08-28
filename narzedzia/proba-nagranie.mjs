/* proba-nagranie.mjs — odtworzenie GESTU Z NAGRANIA na PRAWDZIWYM ladunku przepisu.
 *
 * Nagranie sesji 2026-08-25 13:35 UTC, iPhone 402 px, przepis „pulpety z makaronem
 * w kremowym sosie z soczewicy": dziesiec stukniec w ptaszki (soczewica x5, cebula x1,
 * czosnek x4), `$rageclick`, rezygnacja na kroku 7 z 15. Autocapture zapisal
 * `check_box_outline_blank` przy KAZDYM z dziesieciu — stan nie drgnal ani razu.
 *
 * Ten przyrzad odtwarza te sekwencje i pyta, czy glif przelacza sie przy KAZDYM
 * stuknieciu. Jest wiec bezposrednia falsyfikacja zmierzonego defektu, a nie
 * sprawdzianem „czy kod robi to, co kod robi".
 *
 * CZYM ROZNI SIE OD `suchy-bieg-afordancji.mjs`: tamten mierzy geometrie i stany
 * na modelu SYNTETYCZNYM, dobranym pod przypadki brzegowe. Ten bierze ladunek
 * produkcyjny z `dane/` i pyta o jeden konkretny przebieg uzytkownika. Oba sa
 * potrzebne — syntetyczny lapie przypadki, ktorych w tym przepisie nie ma,
 * a ten lapie to, czego model syntetyczny nie odwzorowuje (15 krokow, sekcje
 * `dalej`/`wykorzystane`, prawdziwe klucze i etykiety po przeliczeniu porcji).
 *
 * TRZY WADY, KTORE TEN PLIK MIAL W PIERWSZEJ WERSJI — wszystkie dawaly falszywy wynik:
 *   1. klikal we wspolrzedne BEZ sprawdzenia trafienia; wiersze sekcji `dalej`
 *      stoja w DOM-ie w ZWINIETEJ liscie, wiec maja prostokat i nie da sie w nie
 *      trafic. Brak zmiany wygladal na defekt kontrolki;
 *   2. przy `czosnek x4` pytal o STAN KONCOWY, a ten przy parzystej liczbie
 *      stukniec rowna sie poczatkowemu takze wtedy, gdy kontrolka jest martwa —
 *      wiersz swiecil zielenia niezaleznie od produktu. Dzis asercja obejmuje
 *      CALY CIAG glifow;
 *   3. porownywal ZNAKI (`String.length`) z BAJTAMI (`wc -c`); plik nie jest ASCII,
 *      wiec padal o 129 na poprawnym artefakcie.
 *
 * Uruchomienie:
 *   node narzedzia/proba-nagranie.mjs                      # artefakt lokalny
 *   node narzedzia/proba-nagranie.mjs --plik <sciezka>     # np. kopia pobrana z CDN
 */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const PLIK = arg('--plik', 'tryb-gotowania.min.js');
const PARSER = arg('--parser', 'przepis-parser.min.js');
const LADUNEK = arg('--ladunek', 'dane/6a5764168326a96c1e226c85.7cffe4e2.json');
const sur = JSON.parse(fs.readFileSync(LADUNEK, 'utf8'));
const P = { nazwa: sur.nazwa, skladniki: sur.skladniki, kroki: sur.kroki };
/* ZNAKI, nie bajty. Plik nie jest ASCII (polskie komentarze i napisy), wiec
   `wc -c` i `String.length` roznia sie o 129 — pierwsza wersja tego wiersza
   porownywala jedno z drugim i padala na poprawnym artefakcie. Oczekiwana
   wartosc liczy sie z artefaktu w REPO, nie z pobranego pliku: porownanie
   pobranego z samym soba byloby tautologia. */
/* ZNAKI, nie bajty — plik nie jest ASCII. Wartosc liczona z artefaktu, ktory
   strona ma wykonac; sonda w stronie mierzy to samo ta sama miara. */
const ZRODLO = fs.readFileSync(PLIK, 'utf8');
const OCZEK_ZNAKOW = ZRODLO.length;
const BAZA = 'https://mp.test/artefakt';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const ADRES = 'https://proba.test/przepis';
await ctx.route(ADRES, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8',
  body: `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script src="${BAZA}/przepis-parser.min.js"><\/script>
<script src="${BAZA}/tryb-gotowania.min.js"><\/script></body>` }));
/* Pliki podawane lokalnie pod stalym adresem. Zeby zmierzyc artefakt z CDN,
   pobierz go i wskaz `--plik` — sonda swiezosci porowna wtedy dlugosc tresci
   wykonanej przez strone z dlugoscia pliku wskazanego w argumencie. */
for (const [adr, sc] of [['przepis-parser.min.js', PARSER], ['tryb-gotowania.min.js', PLIK]])
  await ctx.route(BAZA + '/' + adr, (r) => r.fulfill({ status: 200,
    contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(sc) }));
const p = await ctx.newPage();
const bledy = [];
p.on('pageerror', (e) => bledy.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') bledy.push('console: ' + m.text()); });
await p.goto(ADRES, { waitUntil: 'load' });
await p.waitForFunction(() => window.MP && window.MP.przepis && window.MP.tryb, null, { timeout: 30000 });

let zdane = 0, oblane = 0, seria = 0;
const spr = (w, o, s) => { seria++; if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (s ? '\n        ' + s : '')); } };

console.log(`\n═══ ${PLIK} · przepis „${P.nazwa}" · 402 px (jak w nagraniu) ═══`);

// ── [0] ŚWIEŻOŚĆ — bez tego cała reszta jest pomiarem nieznanej wersji ────────
console.log('\n[0] czy mierzę BIEŻĄCY artefakt');
const swiez = await p.evaluate(() => {
  const e = performance.getEntriesByType('resource')
    .find((x) => /tryb-gotowania\.min\.js/.test(x.name));
  return { bajty: e ? e.decodedBodySize : null, adres: e ? e.name : null,
           maZaznaczone: typeof (window.MP.tryb || {}).zaznaczone === 'function' };
});
/* `decodedBodySize` jest ZERO, gdy odpowiedz podaje przechwycona trasa — to
   artefakt przyrzadu, nie produktu. Mierzalna zostaje DLUGOSC tresci, pobrana
   w stronie spod tego samego adresu; przechodzi przez te sama trase, wiec
   opisuje bajty, ktore strona faktycznie wykonala. */
const dlug = await p.evaluate(async (u) => (await (await fetch(u)).text()).length, swiez.adres);
spr(dlug === OCZEK_ZNAKOW, `treść runtime'u pod tym adresem ma ${OCZEK_ZNAKOW} znaków — tyle co artefakt w repo`,
  'jest: ' + dlug);
spr(swiez.maZaznaczone === true,
  '`MP.tryb.zaznaczone` istnieje — funkcji tej NIE BYŁO przed D-39.76, więc stara wersja by tu padła',
  String(swiez.maZaznaczone));

// ── [1] MODEL Z PRAWDZIWEGO ŁADUNKU ──────────────────────────────────────────
console.log('\n[1] prawdziwy ładunek przechodzi przez parser');
const info = await p.evaluate((P) => {
  const m = window.MP.przepis.zaladuj({ skladniki: P.skladniki, kroki: P.kroki });
  window.__m = m;
  const w = window.MP.przepis.naPorcje(m, 4);
  window.__w = w;
  return { bledy: m.bledy ? m.bledy.length : -1, kroki: w.kroki.length,
           skladniki: w.skladniki.length,
           klucze: w.skladniki.map((s) => s.key) };
}, P);
spr(info.bledy === 0, 'parser bez błędów na prawdziwym ładunku', JSON.stringify(info.bledy));
spr(info.kroki === 15, 'przepis ma 15 kroków — tyle, co w nagraniu', 'jest: ' + info.kroki);
spr(['soczewica', 'cebula', 'czosnek'].every((k) => info.klucze.indexOf(k) > -1),
  'składniki z nagrania (soczewica, cebula, czosnek) są w modelu', JSON.stringify(info.klucze));

// ── [2] ODTWORZENIE GESTU Z NAGRANIA ─────────────────────────────────────────
console.log('\n[2] gest z nagrania: stuknięcia w ptaszki na kroku');
await p.evaluate(() => window.MP.tryb.otworz(window.__w, { model: window.__m, porcje: 4 }));
await p.waitForTimeout(300);

/* Krok dobrany DANYMI, nie numerem: pierwszy, na ktorym `soczewica` stoi
   w „w tym kroku" i nie jest jeszcze zuzyta. Numer kroku z nagrania nie jest
   tu oracle'em — uzytkownik przechodzil kroki, a my chcemy tego samego WIERSZA. */
const krokZ = await p.evaluate(() => {
  for (let n = 1; n <= window.__w.kroki.length; n++) {
    const k = window.__w.kroki[n - 1];
    if ((k.skladnikiTeraz || []).some((s) => s.key === 'soczewica')) return n;
  }
  return -1;
});
spr(krokZ > 0, 'znaleziono krok, na którym soczewica jest „w tym kroku"', 'krok: ' + krokZ);
await p.evaluate((n) => window.MP.tryb.pokazKrok(n), krokZ);
await p.waitForTimeout(250);

const czytaj = (klucz) => p.evaluate((klucz) => {
  const w = [...document.querySelectorAll('.mp-tryb__wiersz')]
    .find((x) => x.getAttribute('data-mp-klucz') === klucz && !x.closest('.mp-tryb__arkusz'));
  if (!w) return { brak: true };
  const pt = w.querySelector('.mp-tryb__ptaszek');
  const cel = pt ? pt.querySelector('.mp-tryb__cel') : null;
  const r = cel ? cel.getBoundingClientRect() : null;
  return { glif: pt ? String((pt.querySelector('.mp-tryb__ptaszek-glif') || {}).textContent || '').trim() : null,
    aria: pt ? pt.getAttribute('aria-checked') : null,
    odhaczony: w.hasAttribute('data-odhaczony'),
    dekoracja: getComputedStyle(w.querySelector('.mp-tryb__nazwa-skl')).textDecorationLine,
    etykieta: w.querySelector('.mp-tryb__nazwa-skl').textContent,
    /* WARTOWNIK zamiast `null`: bez celu dotyku (tak wygladal produkt przed
       D-39.76) odczyt `null` przewracal `mouse.click` wyjatkiem i URYWAL serie —
       19 asercji zamiast 19, ale reszta niema. Wspolrzedne -9999 leza poza
       dokumentem, wiec kliknięcie jest bezskuteczne, a KAZDA asercja o trafieniu
       i o przelaczeniu wychodzi FALSZ. Padniecie zamiast milczenia. */
    sx: r ? r.x + r.width / 2 : -9999, sy: r ? r.y + r.height / 2 : -9999,
    celWH: r ? [Math.round(r.width), Math.round(r.height)] : [-1, -1] };
}, klucz);

/* Sekcja „dalej" stoi w DOM-ie, ale w ZWINIETEJ liscie — jej wiersze maja
   prostokat, a nie da sie w nie trafic. Pierwsza wersja tego testu klikala
   w takie wspolrzedne i brala brak zmiany za defekt kontrolki. Rozwijamy liste,
   a przed KAZDYM kliknieciem sprawdzamy trafienie. */
await p.evaluate(() => window.MP.tryb.lista(true));
await p.waitForTimeout(600);

const trafia = (x, y, klucz) => p.evaluate(([x, y, klucz]) => {
  const e = document.elementFromPoint(x, y);
  const pt = e ? e.closest('.mp-tryb__ptaszek') : null;
  const w = e ? e.closest('.mp-tryb__wiersz') : null;
  return { ok: !!pt && w && w.getAttribute('data-mp-klucz') === klucz,
           co: e ? (e.className || e.tagName) : 'pusto',
           czyj: w ? w.getAttribute('data-mp-klucz') : null };
}, [x, y, klucz]);

const przed = await czytaj('soczewica');
spr(!przed.brak, 'wiersz soczewicy istnieje na tym kroku', JSON.stringify(przed));
console.log('        etykieta na 4 porcje: „' + przed.etykieta + '"');
spr(przed.glif === 'check_box_outline_blank',
  'KONTROLA UJEMNA: przed stuknięciem glif to check_box_outline_blank — dokładnie to, co autocapture zapisał dziesięć razy',
  'glif: ' + przed.glif);

/* Nagranie: soczewica ×5. Wtedy autocapture zapisal
   `check_box_outline_blank` przy KAZDYM z pieciu. Teraz ma sie zmieniac. */
const tS = await trafia(przed.sx, przed.sy, 'soczewica');
spr(tS.ok === true, 'w środku celu soczewicy leży JEJ ptaszek — kliknięcie ma w co trafić', JSON.stringify(tS));
const glify = [przed.glif];
for (let i = 0; i < 5; i++) {
  await p.mouse.click(przed.sx, przed.sy);
  await p.waitForTimeout(90);
  glify.push((await czytaj('soczewica')).glif);
}
console.log('        ciąg glifów po kolejnych stuknięciach: ' + glify.join(' → '));
spr(glify.join('|') === ['check_box_outline_blank', 'check_box', 'check_box_outline_blank',
  'check_box', 'check_box_outline_blank', 'check_box'].join('|'),
  'pięć stuknięć daje pięć PRZEŁĄCZEŃ — w nagraniu nie zmieniło się nic', glify.join(' → '));

const po5 = await czytaj('soczewica');
spr(po5.odhaczony === true && po5.aria === 'true', 'po nieparzystej liczbie stuknięć wiersz jest odhaczony', JSON.stringify(po5));
spr(po5.dekoracja.indexOf('line-through') > -1, 'nazwa przekreślona', po5.dekoracja);
spr(po5.dekoracja.indexOf('underline') === -1, 'i bez kropkowanego podkreślenia (D-39.78)', po5.dekoracja);
/* Szerokosc 44 od `D-39.81` (+12 w prawo wobec 32); wysokosc to wysokosc wiersza
   + 12, wiec 31 w wierszu bez markera i 32 w wierszu z markerem. */
spr(String(po5.celWH) === '44,31' || String(po5.celWH) === '44,32',
  'cel dotyku checkboxa = 44 × (31 albo 32 wg wysokości wiersza) — D-39.81', String(po5.celWH));

// cebula ×1 i czosnek ×4 — reszta sekwencji z nagrania
/* Asercja na CALYM CIAGU glifow, nie na punkcie koncowym. Przy parzystej
   liczbie stukniec „stan koncowy = poczatkowy" jest prawda takze wtedy, gdy
   kontrolka jest martwa — pierwsza wersja tego testu swiecila z tego powodu
   zielenia na czosnku (x4) i nie wykryla, ze klikniecie w ogole nie trafialo. */
for (const [klucz, ile] of [['cebula', 1], ['czosnek', 4]]) {
  const st = await czytaj(klucz);
  spr(!st.brak, `wiersz „${klucz}" jest w drzewie`, JSON.stringify(st));
  const tr = await trafia(st.sx, st.sy, klucz);
  spr(tr.ok === true, `w środku celu „${klucz}" leży JEGO ptaszek`, JSON.stringify(tr));
  const ciag = [st.glif];
  for (let i = 0; i < ile; i++) { await p.mouse.click(st.sx, st.sy); await p.waitForTimeout(90); ciag.push((await czytaj(klucz)).glif); }
  const oczek = [st.glif];
  for (let i = 1; i <= ile; i++) oczek.push(i % 2 ? 'check_box' : 'check_box_outline_blank');
  console.log(`        „${klucz}" ×${ile}: ` + ciag.join(' → '));
  spr(ciag.join('|') === oczek.join('|'),
    `„${klucz}" ×${ile}: glif przełącza się przy KAŻDYM stuknięciu`,
    'oczekiwano ' + oczek.join(' → '));
}

spr(bledy.length === 0, 'zero błędów strony i konsoli', bledy.join(' | '));

console.log(`\n  ── zdane ${zdane}, oblane ${oblane}, SERIA ${seria}`);
await b.close();
process.exitCode = oblane ? 1 : 0;
