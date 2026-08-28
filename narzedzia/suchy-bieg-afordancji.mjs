/* suchy-bieg-afordancji.mjs — checkbox na kroku jako KONTROLKA (`D-39.76`)
 * plus geometria celów dotyku (`D-39.77`) i zdjęte podkreślenie (`D-39.78`).
 *
 * DLACZEGO TEN PRZYRZĄD NIE WOŁA `.click()` NA REFERENCJI.
 * `MATRYCA.md` przy `F2b` zapisuje zmierzony przypadek: asercja wołająca
 * `element.click()` świeciła zielono przez trzydzieści przebiegów, gdy przycisk
 * był fizycznie nieklikalny — bo `.click()` OMIJA trafianie w punkt. Pytanie
 * brzmi „czy da się w to trafić palcem", nie „czy handler jest podpięty".
 * Stąd wszędzie: `elementFromPoint` w geometrycznym środku celu → sprawdzenie,
 * CO tam leży → `mouse.click` w TE SAME współrzędne, czyli zdarzenie wskaźnika,
 * a nie wywołanie metody.
 *
 * KONTROLA UJEMNA JEST OBOWIĄZKOWA, NIE OZDOBNA. Stan PRZED gestem jest
 * sprawdzany osobno przy każdym przejściu. Bez tego asercja „po kliknięciu jest
 * check_box" przechodziłaby także wtedy, gdyby glif był `check_box` od zawsze —
 * a dokładnie tak wyglądałby produkt, w którym przełącznik nie działa.
 *
 * DŁUGOŚĆ SERII JEST METRYKĄ, NIE OZDOBNIKIEM. Każda ramka melduje, ile asercji
 * się wypowiedziało. Różne długości = urwanie, zanim ktokolwiek spojrzy na wynik.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-afordancji.mjs [--plik <runtime.js>]
 */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
  .catch(() => import('playwright'));

const ARG = process.argv.indexOf('--plik');
const PLIK = ARG > -1 ? process.argv[ARG + 1] : 'tryb-gotowania.js';
const TRYB = fs.readFileSync(PLIK, 'utf8');
const RA = process.argv.indexOf('--ramki');
/* Zawężenie ramek istnieje WYŁĄCZNIE dla przebiegów mutacyjnych, gdzie pytanie
   brzmi „czy ten wiersz umie spaść", a nie „czy produkt jest zgodny na siedmiu
   szerokościach". Przebieg zgodnościowy uruchamiaj BEZ tego argumentu. */
const RAMKI = RA > -1 ? process.argv[RA + 1].split(',').map(Number) : [320, 360, 390, 440, 480];

/* Nazwa REALISTYCZNIE NAJKRÓTSZA, nie jednoznakowa. Do przeb. 86 stało tu `i`
   — przypadek, który nie odpowiada niczemu w treści: pomiar 84 wierszy
   z markerem we wszystkich 21 ładunkach `dane/` dał najciaśniejszy prześwit
   62 px („4 limonki"). Jednoznakowa nazwa produkowała sztuczne 2 px i wymuszała
   asercję o liczbie, która nic nie pilnowała.
   Granicy pilnuje teraz ASERCJA NA PROGU (niżej), liczona z żywej geometrii. */
const S = (key, etykieta) => ({ key, etykieta, tresc: etykieta, nazwa: etykieta,
  ilosc: null, iloscDo: null, jednostka: '', pin: false, produktSlug: null, produkt: null });
const SOCZ = S('soczewica', '200 g soczewicy');
const I = S('krotka', 'sól');
const CZOS = S('czosnek', '2 ząbki czosnku');
const SOL = S('sol', 'sól morska');
const K = (nr, teraz, dalej, zuzyte, zam) => ({
  tytul: 'krok ' + nr, tekst: 'x', tekstHtml: 'x', numer: nr, zIlu: 3, badge: 'bez minutnika',
  czas: null, minutnik: null, kryterium: null, kryteriumHtml: null, foto: null, fotoUrl: null,
  skladniki: teraz.map((s) => s.key), skladnikiTeraz: teraz, skladnikiDalej: dalej,
  skladnikiZuzyte: zuzyte, zamiennikiWgKlucza: zam || {} });
const ZAM = { krotka: { klucz: 'krotka', pytanie: 'czym zastąpić?', tekst: 'czymkolwiek', krotko: null },
  soczewica: { klucz: 'soczewica', pytanie: 'czym zastąpić soczewicę?', tekst: 'fasolą', krotko: null } };
const MODEL = { tytul: 'p', czas: '30', meta: [], porcje: 2, fotoUrl: null, bledy: [],
  zamienniki: {}, porcjeBazowe: 2, pola: {}, skladniki: [SOCZ, I, CZOS, SOL],
  kroki: [K(1, [SOCZ, I, CZOS, SOL], [], [], ZAM), K(2, [SOCZ, CZOS], [], [], {}), K(3, [CZOS], [], [SOCZ], {})] };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
  .catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }));

let globOblane = 0;
const dlugosci = [];

for (const szer of RAMKI) {
  const ctx = await b.newContext({ viewport: { width: szer, height: 844 } });
  const ADRES = 'https://proba.test/x';
  await ctx.route(ADRES, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8',
    body: `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>window.MP={zegar:{__t:1e12,teraz:function(){return this.__t}}};<\/script>
<script>${TRYB}<\/script></body>` }));
  const p = await ctx.newPage();
  const bledyKonsoli = [];
  p.on('pageerror', (e) => bledyKonsoli.push(String(e)));
  await p.goto(ADRES);
  await p.waitForTimeout(300);

  /* KOMPENSACJA FONTU IKON — i powód, dla którego jest nazwana, a nie ukryta.
     Font ikon wisi na CDN Webflow, nieosiągalnym z tego środowiska. Bez niego
     ligatura `check_box_outline_blank` renderuje się jako DOSŁOWNY TEKST, który
     przy `overflow:visible` wylewa się z pudełka 16×16 na ~200 px w prawo. Ptaszek
     ma `z-index:1`, więc ten wylew leży NAD markerem i kradnie mu trafienia —
     zmierzone: `elementFromPoint` w środku celu markera zwracał `ptaszek-glif`.
     To artefakt harnessu, nie produktu: na produkcji ligatura ma dokładnie 16 px.
     ALE JEST TEŻ USTALENIEM O PRODUKCIE, poza zakresem tej zmiany: gdyby font nie
     wczytał się u użytkownika, marker przestałby być trafialny. Zgłoszone osobno. */
  /* KOMPENSACJI HARNESSU JUŻ TU NIE MA — i to jest zmiana na lepsze.
     Do przeb. 82 przyrząd sam dokładał `overflow:hidden`, żeby wylew ligatury nie
     kradł trafień markerowi. Mierzył przez to PROTEZĘ, nie produkt. Od `D-39.79`
     tnie sam runtime, więc harness nie dokłada nic, a wylew stał się MIERZALNYM
     WARUNKIEM: sekcja [14] sprawdza najpierw, że tekst faktycznie przerasta pudełko
     (kontrola dodatnia — bez niej asercja o trafialności byłaby prawdą pustą przy
     wczytanym foncie), a dopiero potem, że marker mimo to jest osiągalny. */

  let zdane = 0, oblane = 0, seria = 0;
  const spr = (w, o, s) => { seria++; if (w) { zdane++; console.log('  ✓ ' + o); }
    else { oblane++; globOblane++; console.log('  ✗ ' + o + (s ? '\n        ' + s : '')); } };

  const otworz = () => p.evaluate((m) => { window.MP.tryb.otworz(m, { model: m, porcje: 2 }); }, MODEL);
  const krok = (n) => p.evaluate((n) => window.MP.tryb.pokazKrok(n), n);

  await otworz(); await krok(1); await p.waitForTimeout(200);

  console.log(`\n═══ ramka ${szer} px — ${PLIK} ═══`);

  /* Odczyt jednego wiersza. Zwraca WARTOWNIKI zamiast `null`, gdy węzła nie ma:
     `brak: true` przewraca każdą asercję niżej, zamiast rzucić wyjątkiem i uciąć
     serię. Urwanie byłoby gorsze od padnięcia — nie jest ani zielone, ani czerwone. */
  const czytaj = (klucz) => p.evaluate((klucz) => {
    const BRAK = { x: -9999, y: -9999, w: -1, h: -1, sx: -9999, sy: -9999 };
    const w = [...document.querySelectorAll('.mp-tryb__wiersz')]
      .find((x) => x.getAttribute('data-mp-klucz') === klucz && !x.closest('.mp-tryb__arkusz'));
    if (!w) return { brak: true, klucz };
    const pt = w.querySelector('.mp-tryb__ptaszek');
    const nazwa = w.querySelector('.mp-tryb__nazwa-skl');
    const cel = pt ? pt.querySelector('.mp-tryb__cel') : null;
    const mk = w.querySelector('.mp-tryb__marker');
    const mkCel = mk ? mk.querySelector('.mp-tryb__cel') : null;
    const rc = (e) => { const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: Math.round(r.width), h: Math.round(r.height),
               sx: r.x + r.width / 2, sy: r.y + r.height / 2 }; };
    return {
      tag: pt ? pt.tagName : null,
      rola: pt ? pt.getAttribute('role') : null,
      aria: pt ? pt.getAttribute('aria-checked') : null,
      ukryty: pt ? pt.getAttribute('aria-hidden') : null,
      glif: pt ? String((pt.querySelector('.mp-tryb__ptaszek-glif') || {}).textContent || '').trim() : null,
      odhaczony: w.hasAttribute('data-odhaczony'),
      stan: w.getAttribute('data-stan'),
      dekoracja: nazwa ? getComputedStyle(nazwa).textDecorationLine : null,
      zamiennik: w.hasAttribute('data-mp-zamiennik'),
      etykieta: nazwa ? nazwa.textContent : null,
      /* WARTOWNIK zamiast `null`, gdy celu nie ma. Powód jest zmierzony: przy
         mutacji usuwającej `.mp-tryb__cel` odczyt `s.cel.sx` rzucał wyjątkiem
         i URYWAŁ serię — 51 asercji zamiast 57. Wiersz, który nie zabrał głosu,
         nie jest ani zielony, ani czerwony; jest niemy, a podsumowanie wygląda
         wtedy jak sukces. Współrzędne −9999 leżą poza dokumentem, więc
         `elementFromPoint` zwraca `null` i KAŻDA asercja o trafieniu wychodzi
         FAŁSZ; `w:-1, h:-1` przewracają wszystkie asercje o wymiarze, bo żaden
         oczekiwany wymiar nie jest ujemny. Nic tu nie może przejść przypadkiem. */
      cel: cel ? rc(cel) : BRAK, mkCel: mkCel ? rc(mkCel) : BRAK,
      wiersz: rc(w)
    };
  }, klucz);

  /* Gest: co leży w punkcie, i czy to należy do oczekiwanego przodka. */
  const wPunkcie = (x, y) => p.evaluate(([x, y]) => {
    const e = document.elementFromPoint(x, y);
    if (!e) return { pusto: true };
    const pt = e.closest('.mp-tryb__ptaszek'), mk = e.closest('.mp-tryb__marker');
    const w = e.closest('.mp-tryb__wiersz');
    return { tag: e.tagName, klasa: e.className || '', wPtaszku: !!pt, wMarkerze: !!mk,
      ptaszekTag: pt ? pt.tagName : null,
      klucz: w ? w.getAttribute('data-mp-klucz') : null };
  }, [x, y]);

  // ── [1] STAN PRZED GESTEM — kontrola ujemna dla wszystkiego niżej ────────────
  console.log('\n[1] stan PRZED gestem (kontrola ujemna)');
  let s = await czytaj('soczewica');
  spr(!s.brak, 'wiersz „soczewica" istnieje na kroku 1', JSON.stringify(s));
  spr(s.tag === 'BUTTON', 'checkbox na kroku jest <button>, nie <span>', 'tag: ' + s.tag);
  spr(s.rola === 'checkbox', 'ma role="checkbox"', 'rola: ' + s.rola);
  spr(s.ukryty === null, 'NIE jest aria-hidden — element, który przełącza, musi być ogłaszany', 'aria-hidden: ' + s.ukryty);
  spr(s.aria === 'false', 'aria-checked="false" PRZED gestem', 'aria-checked: ' + s.aria);
  spr(s.glif === 'check_box_outline_blank', 'glif PRZED gestem = check_box_outline_blank', 'glif: ' + s.glif);
  spr(s.odhaczony === false, 'brak [data-odhaczony] PRZED gestem', String(s.odhaczony));
  spr(s.dekoracja === 'none', 'nazwa BEZ przekreślenia PRZED gestem', 'dekoracja: ' + s.dekoracja);

  // ── [2] GEOMETRIA CELÓW (D-39.77) ───────────────────────────────────────────
  console.log('\n[2] geometria celów dotyku');
  spr(s.cel.w > 0, 'checkbox MA własny cel dotyku (.mp-tryb__cel)', JSON.stringify(s.cel));
  spr(s.cel.w === 44, 'cel checkboxa ma 44 px szerokości (D-39.81: +12 w prawo wobec 32)',
    'szer. ' + s.cel.w);
  /* Lewy nawis MA ZOSTAC 8 px — rosnie wylacznie prawa krawedz. Bez tego wiersza
     „44 px szerokosci" przeszloby takze przy celu rozszerzonym symetrycznie,
     czyli przy zmianie, ktorej nikt nie zamawial. */
  spr(Math.round(s.cel.x - s.wiersz.x) === -8, 'lewy nawis celu BEZ ZMIAN (8 px w lewo od wiersza)',
    'nawis: ' + Math.round(s.cel.x - s.wiersz.x));
  /* Wysokość celu to WYSOKOŚĆ WIERSZA + 12, a nie stała 31. Wiersz z markerem ma
     20 px (kółko `i` jest wyższe od interlinii 19), bez markera 19. Pierwsza wersja
     tego wiersza żądała 31 wszędzie i padała na wierszu z markerem — poprawnie:
     to reguła w kodzie była zbudowana na jednej wysokości zamiast na obu. */
  spr(s.cel.w > 0 && s.cel.h === s.wiersz.h + 12,
    'wysokość celu checkboxa = wysokość wiersza + 12 (po połowie interlinii z każdej strony)',
    s.cel ? 'cel ' + s.cel.h + ' przy wierszu ' + s.wiersz.h : 'brak');
  spr(s.zamiennik === true, '„soczewica" ma zamiennik, więc marker powstał', String(s.zamiennik));
  spr(s.mkCel.w === 40, 'cel markera ma 40 px szerokości (2× kółko 20)',
    s.mkCel ? 'szer. ' + s.mkCel.w : 'brak');
  spr(s.mkCel.w > 0 && s.mkCel.h === s.wiersz.h + 12, 'wysokość celu markera = wysokość wiersza + 12',
    s.mkCel ? 'cel ' + s.mkCel.h + ' przy wierszu ' + s.wiersz.h : 'brak');
  const plaski = await czytaj('sol');
  spr(plaski.cel.w > 0 && plaski.wiersz.h === 19 && plaski.cel.h === 31,
    'KONTROLA PRZECIWNA: wiersz BEZ markera ma 19 px, a jego cel 31 — reguła zależy od wiersza, nie jest stałą',
    plaski.cel ? 'wiersz ' + plaski.wiersz.h + ', cel ' + plaski.cel.h : 'brak');
  spr(s.mkCel.w > 0 && s.mkCel.w < s.wiersz.w, 'cel markera JEST węższy od wiersza — U-7 uchylone',
    s.mkCel ? s.mkCel.w + ' vs wiersz ' + s.wiersz.w : 'brak');

  // ── [3] PRZEŚWIT W NAJGORSZYM PRZYPADKU ─────────────────────────────────────
  console.log('\n[3] prześwit i PRÓG zachodzenia — najkrótsza realna nazwa');
  const si = await czytaj('krotka');
  spr(!si.brak && si.cel.w > 0 && si.mkCel.w > 0, 'wiersz „sól" ma oba cele', JSON.stringify(si.cel) + ' / ' + JSON.stringify(si.mkCel));
  const przeswit = si.cel.w > 0 && si.mkCel.w > 0 ? Math.round(si.mkCel.x - (si.cel.x + si.cel.w)) : -999;
  spr(przeswit > 0, 'cele NIE zachodzą na siebie przy najkrótszej realnej nazwie', 'prześwit: ' + przeswit + ' px');
  console.log('        (prześwit przy nazwie „' + si.etykieta + '": ' + przeswit + ' px)');

  /* PRÓG, NIE PRZEŚWIT. Pytanie „ile jest luzu" zależy od treści i nic nie pilnuje;
     pytanie „przy jak wąskiej nazwie cele zaczną zachodzić" zależy WYŁĄCZNIE od
     dwóch marginesów (ptaszka 8 i przed markerem 8) oraz od szerokości obu celów.
     Wyprowadzenie: lewa krawędź celu markera = 22 + szerokość_nazwy, prawa krawędź
     celu checkboxa = 36, więc próg = szerokość_nazwy − prześwit = 14.
     Ta asercja pada, gdy ktokolwiek tknie którąkolwiek z tych liczb — czyli
     dokładnie wtedy, gdy komentarz o „6 px" albo „62 px" przestaje być prawdziwy. */
  const nazwaSzer = await p.evaluate((klucz) => {
    const w = [...document.querySelectorAll('.mp-tryb__wiersz')]
      .find((x) => x.getAttribute('data-mp-klucz') === klucz && !x.closest('.mp-tryb__arkusz'));
    return w ? Math.round(w.querySelector('.mp-tryb__nazwa-skl').getBoundingClientRect().width) : -1;
  }, 'krotka');
  const prog = nazwaSzer > 0 && przeswit > -999 ? nazwaSzer - przeswit : -999;
  spr(prog === 14,
    'PRÓG ZACHODZENIA = 14 px szerokości nazwy — niżej cele zaczęłyby na siebie wchodzić',
    'nazwa ' + nazwaSzer + ' − prześwit ' + przeswit + ' = ' + prog);

  // ── [4] GEST W CHECKBOX ─────────────────────────────────────────────────────
  console.log('\n[4] gest: elementFromPoint → mouse.click w TE SAME współrzędne');
  const t = await wPunkcie(s.cel.sx, s.cel.sy);
  spr(t.wPtaszku === true, 'w środku celu checkboxa leży ptaszek (albo jego potomek)', JSON.stringify(t));
  spr(t.ptaszekTag === 'BUTTON', 'trafiony ptaszek jest przyciskiem', 'tag: ' + t.ptaszekTag);
  spr(t.klucz === 'soczewica', 'trafienie należy do WŁAŚCIWEGO wiersza', 'klucz: ' + t.klucz);
  await p.mouse.click(s.cel.sx, s.cel.sy);
  await p.waitForTimeout(120);

  console.log('\n[5] stan PO geście');
  let s2 = await czytaj('soczewica');
  spr(s2.glif === 'check_box', 'glif zmienił się na check_box', 'glif: ' + s2.glif);
  spr(s2.aria === 'true', 'aria-checked="true"', 'aria-checked: ' + s2.aria);
  spr(s2.odhaczony === true, 'wiersz dostał [data-odhaczony]', String(s2.odhaczony));
  spr(s2.dekoracja.indexOf('line-through') > -1, 'nazwa dostała przekreślenie (D-39.25)', 'dekoracja: ' + s2.dekoracja);
  spr(s2.dekoracja.indexOf('underline') === -1, 'i NIE dostała podkreślenia (D-39.78)', 'dekoracja: ' + s2.dekoracja);
  const zb = await p.evaluate(() => window.MP.tryb.zaznaczone());
  spr(zb.length === 1 && zb[0] === 'soczewica', 'zbiór modułu zna dokładnie ten jeden klucz', JSON.stringify(zb));

  // ── [6] ODZNACZENIE — dowód, że to PRZEŁĄCZNIK, a nie zapadka ───────────────
  console.log('\n[6] powtórny gest odznacza');
  await p.mouse.click(s.cel.sx, s.cel.sy);
  await p.waitForTimeout(120);
  let s3 = await czytaj('soczewica');
  spr(s3.glif === 'check_box_outline_blank', 'glif wrócił do check_box_outline_blank', 'glif: ' + s3.glif);
  spr(s3.odhaczony === false, '[data-odhaczony] zdjęty', String(s3.odhaczony));
  spr(s3.dekoracja === 'none', 'przekreślenie zdjęte', 'dekoracja: ' + s3.dekoracja);

  // ── [7] BRAK MARTWEJ STREFY MIĘDZY WIERSZAMI (D-39.77: styczność co do piksela) ──
  console.log('\n[7] styczność celów — skan co 0,1 px na WSZYSTKICH kombinacjach wysokości');
  /* Skan co 1 px był TAUTOLOGIĄ Z PRÓBKOWANIA: szczelina 1 px między wierszami
     20-px leżała na współrzędnej połówkowej (255,5) i żaden punkt całkowity w nią
     nie wpadał. Wiersz meldował „zero martwych" przy istniejącej martwej strefie.
     Krok 0,1 px i trzy kombinacje (20–20, 20–19, 19–19) zamykają tę lukę. */
  const skan = await p.evaluate(() => {
    const rc = (e) => { const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, sx: r.x + r.width / 2, sy: r.y + r.height / 2 }; };
    const ws = [...document.querySelectorAll('.mp-tryb__wiersz')]
      .filter((w) => w.querySelector('.mp-tryb__ptaszek .mp-tryb__cel'));
    const opis = ws.map((w) => ({ klucz: w.getAttribute('data-mp-klucz'),
      wys: Math.round(w.getBoundingClientRect().height),
      cel: rc(w.querySelector('.mp-tryb__ptaszek .mp-tryb__cel')) }));
    const pary = [];
    for (let i = 0; i + 1 < opis.length; i++) {
      const a = opis[i], bb = opis[i + 1];
      const x = a.cel.sx; const martwe = [];
      for (let y = a.cel.sy; y <= bb.cel.sy + 0.001; y += 0.1) {
        const yy = Math.round(y * 100) / 100;
        const e = document.elementFromPoint(x, yy);
        if (!e || !e.closest('.mp-tryb__ptaszek')) martwe.push(yy);
      }
      pary.push({ para: a.klucz + '→' + bb.klucz, wys: a.wys + '–' + bb.wys,
        skok: Math.round((bb.cel.sy - a.cel.sy) * 10) / 10,
        celA: Math.round(a.cel.h * 10) / 10, celB: Math.round(bb.cel.h * 10) / 10,
        martwe: martwe.length, przyklad: martwe.slice(0, 3) });
    }
    return { opis: opis.map((o) => o.klucz + ':' + o.wys + '/' + Math.round(o.cel.h)), pary };
  });
  console.log('        wysokości wiersz/cel: ' + skan.opis.join('  '));
  const kombinacje = new Set(skan.pary.map((x) => x.wys));
  spr(kombinacje.size >= 2, 'próba obejmuje RÓŻNE wysokości wierszy, nie jedną',
    'kombinacje: ' + [...kombinacje].join(', '));
  /* Pętla po STAŁEJ liczbie miejsc, nie po tym, ile par akurat znaleziono.
     Zmierzone: przy mutacji usuwającej `.mp-tryb__cel` lista par wychodziła pusta
     i `forEach` nie wypowiadał się ANI RAZU — seria spadała z 57 na 51, a sześć
     wierszy stawało się niemych zamiast czerwonych. Brak pary jest tu PADNIĘCIEM
     o nazwanym miejscu, bo zastępnik ma `martwe:-1`, czego żadna asercja nie
     przepuści, i etykietę mówiącą, której pary zabrakło. */
  const OCZEK_PAR = 3;
  spr(skan.pary.length === OCZEK_PAR, `zmierzono dokładnie ${OCZEK_PAR} pary sąsiadów`,
    'jest: ' + skan.pary.length);
  for (let i = 0; i < OCZEK_PAR; i++) {
    const x = skan.pary[i] || { para: 'PARA ' + (i + 1) + ' NIE POWSTAŁA', wys: '?', skok: -1,
      celA: -1, celB: -1, martwe: -1, przyklad: [] };
    spr(x.martwe === 0, `${x.para} (${x.wys}, skok ${x.skok}): ZERO martwych punktów`,
      x.martwe + ' martwych, np. ' + x.przyklad.join(', '));
    spr(x.celA > 0 && Math.abs(x.skok - (x.celA + x.celB) / 2) < 0.01,
      `${x.para}: odległość środków = suma półwysokości celów (styczność co do piksela)`,
      'skok ' + x.skok + ' vs ' + ((x.celA + x.celB) / 2));
  }

  // ── [8] PODKREŚLENIE ZDJĘTE (D-39.78) ───────────────────────────────────────
  console.log('\n[8] kropkowane podkreślenie zdjęte');
  spr(s3.zamiennik === true, 'KONTROLA DODATNIA: wiersz z zamiennikiem istnieje i jest oznaczony',
    'gdyby nie istniał, asercja niżej byłaby prawdą pustą');
  spr(s3.dekoracja.indexOf('underline') === -1, 'nazwa w wierszu [data-mp-zamiennik] BEZ podkreślenia',
    'dekoracja: ' + s3.dekoracja);

  // ── [9] MARKER DALEJ TRAFIALNY ──────────────────────────────────────────────
  console.log('\n[9] marker po zwężeniu celu wciąż trafialny');
  const tm = await wPunkcie(s3.mkCel.sx, s3.mkCel.sy);
  spr(tm.wMarkerze === true, 'w środku celu markera leży marker (albo jego potomek)', JSON.stringify(tm));
  await p.mouse.click(s3.mkCel.sx, s3.mkCel.sy);
  await p.waitForTimeout(160);
  const tt = await p.evaluate(() => !!document.querySelector('.mp-tryb__tooltip'));
  spr(tt === true, 'gest w marker OTWIERA tooltip', String(tt));
  await p.mouse.click(s3.mkCel.sx, s3.mkCel.sy);
  await p.waitForTimeout(160);

  // ── [10] PRZEŻYWA PRZEJŚCIE KROKU (D12) ─────────────────────────────────────
  console.log('\n[10] odhaczenie przeżywa przejście krok → krok');
  await p.mouse.click(s3.cel.sx, s3.cel.sy);
  await p.waitForTimeout(120);
  const przed = await czytaj('soczewica');
  spr(przed.odhaczony === true, 'KONTROLA UJEMNA: odhaczone PRZED zmianą kroku', String(przed.odhaczony));
  await krok(2); await p.waitForTimeout(200);
  const po = await czytaj('soczewica');
  spr(!po.brak, 'ten sam składnik jest na kroku 2', JSON.stringify(po));
  spr(po.odhaczony === true && po.glif === 'check_box',
    'odhaczenie PRZEŻYŁO przejście kroku (stan w module, klucz s.key)', JSON.stringify(po));

  // ── [11] WIERSZ „WYKORZYSTANY" NIE DAJE SIĘ ODZNACZYĆ (D-39.26) ─────────────
  console.log('\n[11] wiersz „wykorzystany" nie jest kontrolką');
  await krok(3); await p.waitForTimeout(200);
  const sz = await czytaj('soczewica');
  spr(sz.stan === 'zuzyty', 'KONTROLA DODATNIA: wiersz jest w stanie zuzyty', 'stan: ' + sz.stan);
  spr(sz.tag === 'SPAN', 'zuzyty NIE jest przyciskiem', 'tag: ' + sz.tag);
  spr(sz.rola === null, 'zuzyty nie ma role="checkbox"', 'rola: ' + sz.rola);
  spr(sz.ukryty === 'true', 'zuzyty jest aria-hidden (nie ogłasza się jako kontrolka)', 'aria-hidden: ' + sz.ukryty);
  spr(sz.cel.w === -1, 'zuzyty NIE ma celu dotyku', JSON.stringify(sz.cel));
  spr(sz.glif === 'check_box', 'zuzyty pokazuje kwadrat zaznaczony', 'glif: ' + sz.glif);

  // ── [12] NIE PRZEŻYWA ZAMKNIĘCIA TRYBU (D-39.76, D-39.27 uchylone) ──────────
  console.log('\n[12] odhaczenie NIE przeżywa zamknięcia trybu');
  const zbPrzed = await p.evaluate(() => window.MP.tryb.zaznaczone());
  spr(zbPrzed.length > 0, 'KONTROLA UJEMNA: zbiór NIEPUSTY przed zamknięciem', JSON.stringify(zbPrzed));
  await p.evaluate(() => window.MP.tryb.zamknij());
  await p.waitForTimeout(200);
  const zbPo = await p.evaluate(() => window.MP.tryb.zaznaczone());
  spr(zbPo.length === 0, 'zbiór wyzerowany przy zamknięciu', JSON.stringify(zbPo));
  await otworz(); await krok(1); await p.waitForTimeout(200);
  const wroc = await czytaj('soczewica');
  spr(wroc.odhaczony === false && wroc.glif === 'check_box_outline_blank',
    'po ponownym otwarciu wiersz jest NIEODHACZONY', JSON.stringify(wroc));
  const zap = await p.evaluate(() => { try { return Object.keys(localStorage)
    .map((k) => localStorage.getItem(k)).join('|'); } catch (e) { return 'BRAK'; } });
  spr(zap.indexOf('zaznaczone') === -1, 'zapis sesji NIE niesie pola `zaznaczone`', zap.slice(0, 160));

  // ── [13] ARKUSZ BEZ KONTROLKI (D-39.58 w mocy) ──────────────────────────────
  console.log('\n[13] arkusz startowy dalej bez kontrolki');
  const ark = await p.evaluate(() => {
    const a = document.querySelector('.mp-tryb__arkusz');
    if (!a) return { brak: true };
    return { punktory: a.querySelectorAll('.mp-tryb__punktor').length,
             ptaszki: a.querySelectorAll('.mp-tryb__ptaszek').length };
  });
  if (ark.brak) spr(true, 'arkusz niewywołany w tym przebiegu — pozycja pominięta świadomie', 'brak arkusza');
  else spr(ark.ptaszki === 0 && ark.punktory > 0, 'arkusz ma punktory i ZERO checkboxów', JSON.stringify(ark));

  // ── [14] WYLEW GLIFU NIE KRADNIE TRAFIEŃ (D-39.79) ──────────────────────────
  console.log('\n[14] glif nie wylewa się poza pudełko i nie kradnie trafień');
  await krok(1); await p.waitForTimeout(200);
  const g = await czytaj('soczewica');
  const glif = await p.evaluate(() => {
    const e = document.querySelector('.mp-tryb__ptaszek-glif');
    return e ? { scroll: e.scrollWidth, box: e.offsetWidth,
                 przyc: getComputedStyle(e).overflow } : null; });
  spr(!!glif, 'glif istnieje', JSON.stringify(glif));
  /* KONTROLA DODATNIA. Bez niej cała sekcja byłaby prawdą pustą w środowisku
     z wczytanym fontem: „marker trafialny" przechodzi trywialnie, gdy nie ma
     żadnego wylewu do przycięcia. Ten wiersz mówi, czy warunek w ogóle zachodzi. */
  const wylew = glif && glif.scroll > glif.box;
  if (wylew) console.log(`        KONTROLA DODATNIA: font ikon NIEWCZYTANY, tekst ${glif.scroll} px w pudełku ${glif.box} px — warunek zachodzi`);
  else console.log('        UWAGA: font ikon wczytany, wylewu nie ma — ta sekcja NIE mierzy dziś tego, po co powstała');
  spr(glif && glif.przyc === 'hidden', 'glif ma overflow:hidden', glif ? glif.przyc : 'brak');
  spr(glif && glif.box === 16, 'pudełko glifu trzyma zadeklarowane 16 px', glif ? String(glif.box) : 'brak');
  const tm2 = await wPunkcie(g.mkCel.sx, g.mkCel.sy);
  spr(tm2.wMarkerze === true,
    'mimo wylewu tekstu marker JEST trafialny w geometrycznym środku swojego celu',
    JSON.stringify(tm2));
  const tp2 = await wPunkcie(g.cel.sx, g.cel.sy);
  spr(tp2.wPtaszku === true, 'checkbox pozostaje trafialny po przycięciu glifu', JSON.stringify(tp2));

  spr(bledyKonsoli.length === 0, 'konsola czysta', bledyKonsoli.join(' | '));

  console.log(`\n  ── ramka ${szer}: zdane ${zdane}, oblane ${oblane}, SERIA ${seria}`);
  dlugosci.push({ szer, seria, zdane, oblane });
  await ctx.close();
}

await b.close();

console.log('\n═══ długość serii na ramkę — kontrola urwania ═══');
dlugosci.forEach((d) => console.log(`  ${d.szer}: seria ${d.seria}  (zdane ${d.zdane}, oblane ${d.oblane})`));
const rozne = new Set(dlugosci.map((d) => d.seria));
if (rozne.size !== 1) {
  console.log(`\n  ⚠ URWANIE: serie różnej długości (${[...rozne].join(', ')}).`);
  console.log('    Wiersz, który nie zabrał głosu, NIE JEST zielony — jest niemy.');
  process.exitCode = 1;
} else {
  console.log(`\n  ✓ wszystkie ramki wypowiedziały się ${[...rozne][0]} razy — brak urwań`);
}
console.log(globOblane === 0 ? '\n✓ ZERO PADNIĘĆ\n' : `\n✗ PADNIĘĆ: ${globOblane}\n`);
if (globOblane > 0) process.exitCode = 1;
