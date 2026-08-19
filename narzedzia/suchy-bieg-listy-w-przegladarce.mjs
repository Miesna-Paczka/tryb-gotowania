/* suchy-bieg-listy-w-przegladarce.mjs — czy `mpSkladniki@2.0.0` liczy listę tak
 * samo jak tryb gotowania, na wszystkich 16 przepisach i wszystkich porcjach 1–7.
 *
 * Mierzy PRAWDZIWYM artefaktem (`przepis-parser.min.js` z repo) w prawdziwej
 * przeglądarce, na DOM-ie odwzorowującym szablon `detail_przepisy`. Nie udaje
 * parsera i nie powtarza jego logiki — powtórzenie logiki jest właśnie tym
 * błędem, który ten skrypt likwiduje.
 *
 * KONTROLA NEGATYWNA: ten sam DOM przejechany starym `mpSkladniki@1.2.0` MUSI
 * dać rozjazd. Bez tego zielone znaczyłoby tylko „nic nie porównałem".
 *
 * Uruchomienie: node narzedzia/suchy-bieg-listy-w-przegladarce.mjs
 * Wymaga lokalnego Chromium, więc nie stoi w bramce CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { parser } from '../odmiana-node.mjs';

const P = parser();
const KAT = path.resolve('przepisy');
const PARSER = fs.readFileSync('przepis-parser.min.js', 'utf8');
const NOWY = fs.readFileSync('narzedzia/mpskladniki-2.0.1.js', 'utf8');
const KOPIUJ = fs.readFileSync('narzedzia/mpkopiujliste-1.0.0.js', 'utf8');
const STARY = fs.readFileSync('narzedzia/mpskladniki-1.2.0.js', 'utf8');

function sekcja(tekst, nazwa) {
  const linie = tekst.split('\n'); const s = linie.indexOf(`[${nazwa}]`);
  if (s < 0) return '';
  let k = s + 1; while (k < linie.length && !/^\[[a-z0-9-]+\]$/.test(linie[k])) k++;
  return linie.slice(s + 1, k).join('\n').trim();
}

/* Odwzorowanie szablonu: te same atrybuty, ten sam układ zagnieżdżeń ORAZ TE SAME
   KLASY. Klasy nie są tu dekoracją: `mpKopiujListe` adresuje wiersze przez
   `.recipe-ing__row` i `.recipe-ing__text`, więc harness bez klas milczy tam,
   gdzie strona działa — i pierwsza wersja tej próby wpadła dokładnie w to. */
const strona = (skl, kroki, baza, silnik) => `<!doctype html><meta charset="utf-8"><body>
<h1>próbny przepis</h1>
<div id="mp-tryb-gotowania" data-tytul="próba" data-porcje-bazowe="${baza}" data-czas="30"></div>
<script type="text/plain" id="mp-skladniki">${skl}</script>
<script type="text/plain" id="mp-kroki">${kroki}</script>
<div class="recipe-ing__stack">
  <div class="recipe-ing__portions">
    <div data-mp-porcje-minus><span>−</span></div>
    <div class="recipe-ing__count" data-mp-porcje-etykieta></div>
    <div data-mp-porcje-plus><span>+</span></div>
  </div>
  <div class="recipe-ing__list" data-mp-skladniki-lista>
    <div data-mp-skladniki-html><ul><li>lista serwerowa</li></ul></div>
    <div class="recipe-ing__source" data-mp-skladniki style="display:none">${skl}</div>
    <div class="recipe-ing__row" data-mp-skladnik-wzor>
      <div class="recipe-ing__text" data-mp-skladnik-tekst>wzór</div>
      <a class="recipe-ing__badge" data-mp-skladnik-badge target="_blank" rel="noopener">w Mięsnej Paczce</a>
    </div>
  </div>
  <div class="recipe-ing__source" data-mp-porcje-bazowe style="display:none">${baza}</div>
  <div data-mp-kopiuj-slot><button>kopiuj listę</button></div>
</div>
<script>window.__zapisy=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){window.__zapisy.push(t);return Promise.resolve()}},configurable:true});</script>
<script>${PARSER}</script><script>${silnik}</script><script>${KOPIUJ}</script></body>`;

const czytaj = () => ({
  ukrytaSerwerowa: !!document.querySelector('[data-mp-skladniki-html]').hidden,
  etykieta: document.querySelector('[data-mp-porcje-etykieta]').textContent,
  wiersze: [].slice.call(document.querySelectorAll('[data-mp-wiersz]')).map((w) => ({
    tekst: w.querySelector('[data-mp-skladnik-tekst]').textContent,
    href: w.querySelector('[data-mp-skladnik-badge]').getAttribute('href'),
    badgeUkryty: w.querySelector('[data-mp-skladnik-badge]').style.display === 'none'
  }))
});

const przegladarka = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const kontekst = await przegladarka.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const karta = await kontekst.newPage();
let zdane = 0, oblane = 0;
const zle = (n, p) => { oblane++; console.log(`✗ ${n}\n    ${p}`); };

const FORMY = { 1: 'porcja', 2: 'porcje', 3: 'porcje', 4: 'porcje', 5: 'porcji', 6: 'porcji', 7: 'porcji' };

for (const plik of fs.readdirSync(KAT).filter((f) => f.endsWith('.txt'))) {
  const t = fs.readFileSync(path.join(KAT, plik), 'utf8');
  const slug = (t.match(/^slug: (.+)$/m) || [, '?'])[1];
  const baza = parseInt((t.match(/^porcje-bazowe: (\d+)$/m) || [, '2'])[1], 10);
  const skl = sekcja(t, 'skladniki'), kroki = sekcja(t, 'kroki');
  const model = { skladniki: P._wewnetrzne.parsujSkladniki(skl), kroki: [], porcjeBazowe: baza };

  await karta.setContent(strona(skl, kroki, baza, NOWY));
  let bledy = [];

  for (let n = 1; n <= 7; n++) {
    if (n > 1) await karta.click('[data-mp-porcje-plus]');
    else for (let i = baza; i > 1; i--) await karta.click('[data-mp-porcje-minus]');
    const stan = await karta.evaluate(czytaj);
    const oczek = P.naPorcje(model, n).skladniki;

    if (!stan.ukrytaSerwerowa) bledy.push(`porcje ${n}: lista serwerowa NIE została ukryta`);
    if (stan.wiersze.length !== oczek.length)
      bledy.push(`porcje ${n}: wierszy ${stan.wiersze.length}, oczekiwałem ${oczek.length}`);
    else oczek.forEach((o, i) => {
      if (stan.wiersze[i].tekst !== o.etykieta)
        bledy.push(`porcje ${n}: „${stan.wiersze[i].tekst}" ≠ „${o.etykieta}"`);
      const chce = o.produktSlug ? 'https://miesnapaczka.pl/produkty/' + o.produktSlug : null;
      if (chce && stan.wiersze[i].href !== chce) bledy.push(`porcje ${n}: zły adres badge'a: ${stan.wiersze[i].href}`);
      if (!chce && !stan.wiersze[i].badgeUkryty) bledy.push(`porcje ${n}: badge widoczny przy składniku bez produktu`);
    });
    if (stan.etykieta !== `${n} ${FORMY[n]}`)
      bledy.push(`porcje ${n}: etykieta „${stan.etykieta}", oczekiwałem „${n} ${FORMY[n]}"`);
  }

  if (bledy.length) zle(slug, bledy.slice(0, 4).join('\n    '));
  else { zdane++; console.log(`✓ ${slug} — 7 × ${model.skladniki.length} etykiet zgodnych z parserem`); }
}

/* --- kontrola negatywna: stary silnik MUSI się rozjechać --- */
{
  const t = fs.readFileSync(path.join(KAT, 'wolowina-teriyaki-z-brokulami-przepis.txt'), 'utf8');
  const skl = sekcja(t, 'skladniki'), kroki = sekcja(t, 'kroki'), baza = 2;
  const model = { skladniki: P._wewnetrzne.parsujSkladniki(skl), kroki: [], porcjeBazowe: baza };
  await karta.setContent(strona(skl, kroki, baza, STARY));
  await karta.click('[data-mp-porcje-minus]');            // 2 → 1 porcja
  const stan = await karta.evaluate(czytaj);
  const oczek = P.naPorcje(model, 1).skladniki.map((o) => o.etykieta);
  const rozne = stan.wiersze.filter((w, i) => w.tekst !== oczek[i]).length;
  if (rozne > 0) { zdane++; console.log(`✓ KONTROLA NEGATYWNA — stary silnik rozjeżdża się na ${rozne} etykietach`); }
  else zle('KONTROLA NEGATYWNA', 'stary silnik NIE rozjechał się — próba nic nie mierzy');
}

/* --- kolizja słuchaczy na przycisku „kopiuj listę" ---
   `mpKopiujListe` obsługuje ten przycisk od 2026-08-14 i czyta WYRENDEROWANE
   wiersze. Gdyby `mpSkladniki` podpiął własny słuchacz, oba pisałyby do schowka
   przy jednym kliknięciu, a wygrywałby losowy. Ta próba pilnuje, że w schowku
   ląduje payload z nagłówkiem — czyli ten od `mpKopiujListe`, jeden. */
{
  const t = fs.readFileSync(path.join(KAT, 'wolowina-teriyaki-z-brokulami-przepis.txt'), 'utf8');
  const skl = sekcja(t, 'skladniki'), kroki = sekcja(t, 'kroki'), baza = 2;
  const model = { skladniki: P._wewnetrzne.parsujSkladniki(skl), kroki: [], porcjeBazowe: baza };
  await karta.setContent(strona(skl, kroki, baza, NOWY));
  await karta.click('[data-mp-porcje-minus]');            // 2 → 1 porcja
  await karta.click('[data-mp-kopiuj-slot] button');
  await karta.waitForFunction(() => /skopiowano|nie udało/.test(document.querySelector('[data-mp-kopiuj-slot] button').textContent), null, { timeout: 4000 });
  const zapisy = await karta.evaluate(() => window.__zapisy);
  const schowek = zapisy[0] || '';
  const oczek = P.naPorcje(model, 1).skladniki.map((o) => o.etykieta);
  const braki = oczek.filter((e) => !schowek.includes('- ' + e));

  if (zapisy.length !== 1)
    zle('kopiowanie', `do schowka pisano ${zapisy.length}× przy jednym kliknięciu — kolizja słuchaczy`);
  else if (!schowek.startsWith('Lista zakupów'))
    zle('kopiowanie', `w schowku nie ma nagłówka mpKopiujListe — kto inny nadpisał: ${JSON.stringify(schowek.slice(0, 60))}`);
  else if (!schowek.includes('1 porcja'))
    zle('kopiowanie', 'w schowku nie ma odmienionej liczby porcji');
  else if (braki.length)
    zle('kopiowanie', `w schowku brakuje ${braki.length} etykiet, np. „${braki[0]}"`);
  else { zdane++; console.log('✓ kopiowanie — jeden payload, z nagłówkiem i odmienionymi etykietami'); }
}

/* KONTROLA NEGATYWNA dla kolizji: dokładamy drugiego słuchacza (czyli dokładnie
   to, co robiła wersja 2.0.0 tego skryptu) i sprawdzamy, że licznik zapisów to
   widzi. Bez tego „jeden payload" byłoby zdaniem, którego nic nie sprawdza. */
{
  const t = fs.readFileSync(path.join(KAT, 'wolowina-teriyaki-z-brokulami-przepis.txt'), 'utf8');
  const skl = sekcja(t, 'skladniki'), kroki = sekcja(t, 'kroki');
  const drugiSluchacz = NOWY + `\n;(function(){var K=document.querySelector('[data-mp-kopiuj-slot]');`
    + `if(K)K.addEventListener('click',function(){navigator.clipboard.writeText('drugi')})})();`;
  await karta.setContent(strona(skl, kroki, 2, drugiSluchacz));
  await karta.click('[data-mp-kopiuj-slot] button');
  await karta.waitForFunction(() => window.__zapisy.length > 0, null, { timeout: 4000 });
  const ile = (await karta.evaluate(() => window.__zapisy)).length;
  if (ile === 2) { zdane++; console.log('✓ KONTROLA NEGATYWNA — licznik zapisów wykrywa drugiego słuchacza'); }
  else zle('KONTROLA NEGATYWNA kolizji', `zapisów ${ile}, oczekiwałem 2 — licznik nic nie mierzy`);
}

await przegladarka.close();
console.log(`\nzdane: ${zdane} · oblane: ${oblane}`);
process.exit(oblane ? 1 : 0);
