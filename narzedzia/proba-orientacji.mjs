/* proba-orientacji.mjs — w orientacji POZIOMEJ oczekiwanie jest ODWRÓCONE.
 *
 * `MATRYCA.md`, wiersz `E6`: w poziomie trafieniem ma być scrim „obróć telefon",
 * bo tam interfejs jest Z PROJEKTU niedostępny (`G11`; mechanizmem jest media
 * query, nie `screen.orientation.lock()`, ktorego iOS nie ma — WYMAGANIA §1).
 * Wiersz o trafialnosci checkboxa, ktory nie pyta o poziom, opisuje wiec tylko
 * polowe wymagania.
 *
 * KONTROLA W PIONIE JEST TU OBOWIAZKOWA. „Nie da sie kliknac w checkbox"
 * bylo by prawda takze wtedy, gdyby wiersza po prostu nie bylo, gdyby tryb sie
 * nie otworzyl albo gdyby wspolrzedne wypadly poza okno. Ta sama sonda w pionie
 * musi wiec dac wynik PRZECIWNY — i to ona nadaje sens calej reszcie.
 *
 * Uruchomienie: node narzedzia/proba-orientacji.mjs [--plik <runtime>]
 */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const PLIK = arg('--plik', 'tryb-gotowania.min.js');
const TRYB = fs.readFileSync(PLIK, 'utf8');

const S = (k, e) => ({ key: k, etykieta: e, tresc: e, nazwa: e, ilosc: null, iloscDo: null,
  jednostka: '', pin: false, produktSlug: null, produkt: null });
const A = S('a', '200 g soczewicy'), B = S('b', 'sól');
const ZAM = { a: { klucz: 'a', pytanie: '?', tekst: 'x', krotko: null } };
const MODEL = { tytul: 'p', czas: '30', meta: [], porcje: 2, fotoUrl: null, bledy: [], zamienniki: {},
  porcjeBazowe: 2, pola: {}, skladniki: [A, B],
  kroki: [{ tytul: 'k', tekst: 'x', tekstHtml: 'x', numer: 1, zIlu: 1, badge: 'bez minutnika',
    czas: null, minutnik: null, kryterium: null, kryteriumHtml: null, foto: null, fotoUrl: null,
    skladniki: ['a', 'b'], skladnikiTeraz: [A, B], skladnikiDalej: [], skladnikiZuzyte: [],
    zamiennikiWgKlucza: ZAM }] };

/* `land.` z matrycy to 844×390 i 667×375. Do tego 390×844 jako kontrola pionowa
   — ta sama przekatna, ta sama tresc, odwrotny wynik. */
const RAMKI = [
  { n: 'poziomo 844×390', w: 844, h: 390, poziomo: true },
  { n: 'poziomo 667×375', w: 667, h: 375, poziomo: true },
  { n: 'PION 390×844 (kontrola)', w: 390, h: 844, poziomo: false }
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
let zdane = 0, oblane = 0;
const dlugosci = [];

for (const R of RAMKI) {
  const ctx = await b.newContext({ viewport: { width: R.w, height: R.h }, isMobile: true, hasTouch: true });
  const ADRES = 'https://proba.test/x';
  await ctx.route(ADRES, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8',
    body: `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>window.MP={zegar:{__t:1e12,teraz:function(){return this.__t}}};<\/script>
<script>${TRYB}<\/script></body>` }));
  const p = await ctx.newPage();
  const bledy = [];
  p.on('pageerror', (e) => bledy.push(String(e)));
  await p.goto(ADRES);
  let seria = 0;
  const spr = (w, o, s) => { seria++; if (w) { zdane++; console.log('  ✓ ' + o); }
    else { oblane++; console.log('  ✗ ' + o + (s ? '\n        ' + s : '')); } };

  console.log(`\n═══ ${R.n} · ${PLIK} ═══`);
  await p.evaluate((m) => { window.MP.tryb.otworz(m, { model: m, porcje: 2 }); }, MODEL);
  await p.evaluate(() => window.MP.tryb.pokazKrok(1));
  await p.waitForTimeout(250);

  const st = await p.evaluate(() => {
    const w = [...document.querySelectorAll('.mp-tryb__wiersz')]
      .find((x) => x.getAttribute('data-mp-klucz') === 'a' && !x.closest('.mp-tryb__arkusz'));
    const sc = document.querySelector('.mp-tryb__scrim-poziom');
    const pt = w ? w.querySelector('.mp-tryb__ptaszek') : null;
    const cel = pt ? pt.querySelector('.mp-tryb__cel') : null;
    const mk = w ? w.querySelector('.mp-tryb__marker .mp-tryb__cel') : null;
    const sr = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    return { wiersz: !!w, otwarty: !!document.querySelector('#mp-tryb[data-otwarty]'),
      scrim: !!sc, scrimStyl: sc ? getComputedStyle(sc).display : 'brak',
      scrimTekst: sc ? sc.textContent.trim() : '',
      glif: pt ? String((pt.querySelector('.mp-tryb__ptaszek-glif') || {}).textContent || '').trim() : null,
      cel: sr(cel), mkCel: sr(mk) };
  });

  /* KONTROLA DODATNIA — wspolna dla obu orientacji. Bez niej „scrim przykrywa"
     i „nie da sie kliknac" byloby prawda takze na pustym ekranie. */
  spr(st.otwarty === true, 'tryb otwarty', String(st.otwarty));
  spr(st.wiersz === true, 'wiersz składnika JEST w drzewie (jest w co celować)', String(st.wiersz));
  spr(!!st.cel && !!st.mkCel, 'oba cele dotyku mają współrzędne', JSON.stringify({ c: st.cel, m: st.mkCel }));
  spr(st.glif === 'check_box_outline_blank', 'stan PRZED: glif niezaznaczony', 'glif: ' + st.glif);
  spr(st.scrim === true, 'scrim orientacji istnieje w drzewie', String(st.scrim));
  spr(st.scrimTekst === 'obróć telefon', 'scrim niesie brzmienie „obróć telefon"', st.scrimTekst);

  const wPunkcie = (q) => p.evaluate(([x, y]) => {
    const e = document.elementFromPoint(x, y);
    return { klasa: e ? String(e.className) : 'pusto',
      wScrimie: !!(e && e.closest && e.closest('.mp-tryb__scrim-poziom')),
      wPtaszku: !!(e && e.closest && e.closest('.mp-tryb__ptaszek')),
      wMarkerze: !!(e && e.closest && e.closest('.mp-tryb__marker')) };
  }, [q.x, q.y]);

  const tC = await wPunkcie(st.cel), tM = await wPunkcie(st.mkCel);

  if (R.poziomo) {
    spr(st.scrimStyl === 'flex', 'scrim JEST WIDOCZNY w poziomie (media query zadziałało)', 'display: ' + st.scrimStyl);
    spr(tC.wScrimie === true, 'ODWRÓCONE OCZEKIWANIE: w środku celu checkboxa leży SCRIM, nie ptaszek', JSON.stringify(tC));
    spr(tM.wScrimie === true, 'ODWRÓCONE OCZEKIWANIE: w środku celu markera też leży SCRIM', JSON.stringify(tM));
    await p.mouse.click(st.cel.x, st.cel.y);
    await p.waitForTimeout(120);
    const po = await p.evaluate(() => {
      const w = [...document.querySelectorAll('.mp-tryb__wiersz')]
        .find((x) => x.getAttribute('data-mp-klucz') === 'a' && !x.closest('.mp-tryb__arkusz'));
      const pt = w.querySelector('.mp-tryb__ptaszek');
      return { glif: String((pt.querySelector('.mp-tryb__ptaszek-glif') || {}).textContent || '').trim(),
        zbior: window.MP.tryb.zaznaczone().length };
    });
    spr(po.glif === 'check_box_outline_blank' && po.zbior === 0,
      'gest w tym punkcie NICZEGO nie przełącza — interfejs jest z projektu niedostępny', JSON.stringify(po));
  } else {
    spr(st.scrimStyl === 'none', 'KONTROLA: w pionie scrim jest UKRYTY', 'display: ' + st.scrimStyl);
    spr(tC.wPtaszku === true, 'KONTROLA PRZECIWNA: w pionie ten sam punkt trafia w PTASZKA', JSON.stringify(tC));
    spr(tM.wMarkerze === true, 'KONTROLA PRZECIWNA: w pionie punkt markera trafia w MARKER', JSON.stringify(tM));
    await p.mouse.click(st.cel.x, st.cel.y);
    await p.waitForTimeout(120);
    const po = await p.evaluate(() => {
      const w = [...document.querySelectorAll('.mp-tryb__wiersz')]
        .find((x) => x.getAttribute('data-mp-klucz') === 'a' && !x.closest('.mp-tryb__arkusz'));
      const pt = w.querySelector('.mp-tryb__ptaszek');
      return { glif: String((pt.querySelector('.mp-tryb__ptaszek-glif') || {}).textContent || '').trim(),
        zbior: window.MP.tryb.zaznaczone().length };
    });
    spr(po.glif === 'check_box' && po.zbior === 1,
      'KONTROLA PRZECIWNA: w pionie ten sam gest PRZEŁĄCZA', JSON.stringify(po));
  }

  spr(bledy.length === 0, 'zero błędów strony', bledy.join(' | '));
  console.log(`  ── seria ${seria}`);
  dlugosci.push(seria);
  await ctx.close();
}
await b.close();
console.log(`\n  serie: ${dlugosci.join(', ')}  (równe = brak urwań)`);
console.log(oblane === 0 ? `\n✓ ZERO PADNIĘĆ (zdane ${zdane})\n` : `\n✗ PADNIĘĆ: ${oblane}\n`);
process.exitCode = oblane ? 1 : 0;
