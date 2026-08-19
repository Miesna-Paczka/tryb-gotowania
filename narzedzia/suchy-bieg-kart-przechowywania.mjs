/* suchy-bieg-kart-przechowywania.mjs — czy grupa `przechowywanie` w szablonie
 * `detail_przepisy` rozdziela pytanie od odpowiedzi.
 *
 * POWÓD: 2026-08-19 operator zgłosił, że w wołowinie teriyaki nagłówek
 * „przechowywanie i odgrzewanie" jest sklejony z treścią akapitu. Dane były
 * czyste — objaw brał się z szablonu: grupa przechowywania jako jedyna z trzech
 * nie miała atrybutów, po których `mpKartyPrzepisu` poznaje kartę do rozdzielenia
 * (`data-mp-karty`, `data-mp-zrodlo`, `data-mp-karta-wzor`). Surowe pole szło
 * w jeden akapit, a złamanie wiersza między pytaniem a odpowiedzią znikało w HTML-u.
 *
 * CO TO MIERZY: prawdziwym skryptem strony (`narzedzia/mpkartyprzepisu-1.0.0.js`,
 * kopia z rejestru Webflow) na strukturze DOM zbudowanej w szablonie i na
 * WSZYSTKICH 16 polach `przechowywanie` z `przepisy/`.
 *
 * KONTROLA NEGATYWNA jest tu obowiązkowa i już raz zarobiła na siebie: pierwsza
 * wersja tej próby czytała pole wyrażeniem z flagą `m`, przez co `$` znaczyło
 * koniec WIERSZA i pole urywało się na pierwszym złamaniu. Szesnaście zielonych
 * ptaszków mierzyło wtedy pustą odpowiedź równą pustej odpowiedzi. Czerwona
 * kontrola negatywna była jedynym sygnałem, że próba nic nie mierzy.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-kart-przechowywania.mjs
 * Wymaga lokalnego Chromium — dlatego NIE stoi w bramce CI (`lancuch-html.yml`),
 * która chodzi na czystym runnerze bez przeglądarki.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const KAT = path.resolve('przepisy');
const SKRYPT = fs.readFileSync(new URL('./mpkartyprzepisu-1.0.0.js', import.meta.url), 'utf8');

/* UWAGA na flagę `m`: z nią `$` znaczy KONIEC WIERSZA, więc leniwe `[\s\S]*?`
   urywało pole na pierwszym złamaniu i całą próbę przechodziła treść jednowierszowa
   — czyli nic. Złapała to kontrola negatywna, nie przegląd kodu. Dlatego dzielimy
   plik na sekcje wprost, bez wyrażenia, które musi zgadywać, gdzie kończy się blok. */
function sekcja(tekst, nazwa) {
  const linie = tekst.split('\n');
  const start = linie.indexOf(`[${nazwa}]`);
  if (start < 0) return '';
  let koniec = start + 1;
  while (koniec < linie.length && !/^\[[a-z0-9-]+\]$/.test(linie[koniec])) koniec++;
  return linie.slice(start + 1, koniec).join('\n').replace(/\n+$/, '');
}

const przepisy = fs.readdirSync(KAT).filter((f) => f.endsWith('.txt')).map((f) => {
  const t = fs.readFileSync(path.join(KAT, f), 'utf8');
  return { id: path.basename(f, '.txt'),
           slug: (t.match(/^slug: (.+)$/m) || [, '?'])[1],
           przechowywanie: sekcja(t, 'przechowywanie') };
});

/* NOWA struktura — dokładnie ta, którą zbudowałem w `detail_przepisy`. */
const nowa = (surowe) => `
<div class="recipe-cards__group" data-mp-karty="przechowywanie">
  <div class="caption">przechowywanie i odgrzewanie</div>
  <div class="recipe-cards__card" data-mp-karta-wzor="">
    <div class="recipe-cards__icon"><span class="icon-recipe-card">ac_unit</span></div>
    <div class="recipe-cards__body">
      <p class="body-large recipe-cards__question" data-mp-karta-pytanie="">pytanie</p>
      <p class="body-large recipe-cards__answer" data-mp-karta-odpowiedz="">odpowiedź</p>
    </div>
  </div>
  <p class="recipe-cards__source" data-mp-zrodlo="">${surowe}</p>
</div>`;

/* STARA struktura — stan zastany, jeden związany akapit i żadnych atrybutów. */
const stara = (surowe) => `
<div class="recipe-cards__group">
  <div class="caption">przechowywanie i odgrzewanie</div>
  <div class="recipe-cards__card">
    <div class="recipe-cards__icon"><span class="icon-recipe-card">ac_unit</span></div>
    <div class="recipe-cards__body">
      <p class="body-large recipe-cards__answer" data-mp-przechowywanie="">${surowe}</p>
    </div>
  </div>
</div>`;

const strona = (html) => `<!doctype html><meta charset="utf-8">
<style>.recipe-cards__source{display:none}</style>
<body>${html}<script>${SKRYPT}</script></body>`;

const przegladarka = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const karta = await przegladarka.newPage();

let zdane = 0, oblane = 0;
const zle = (n, p) => { oblane++; console.log(`✗ ${n}\n    ${p}`); };
const ok  = (n) => { zdane++; console.log(`✓ ${n}`); };

for (const p of przepisy) {
  const oczekiwane = p.przechowywanie.split('\n').filter((l) => l.trim());
  const [pytanieZr, ...resztaZr] = oczekiwane;
  const odpowiedzZr = resztaZr.join(' ');

  await karta.setContent(strona(nowa(p.przechowywanie)));
  const wynik = await karta.evaluate(() => {
    const g = document.querySelector('[data-mp-karty="przechowywanie"]');
    const karty = g.querySelectorAll('[data-mp-karta]');
    return {
      ukryta: g.hasAttribute('hidden'),
      wzorZostal: !!g.querySelector('[data-mp-karta-wzor]'),
      liczba: karty.length,
      pytanie: karty[0] ? karty[0].querySelector('[data-mp-karta-pytanie]').textContent : null,
      odpowiedz: karty[0] ? karty[0].querySelector('[data-mp-karta-odpowiedz]').textContent : null,
      /* To, co realnie widzi czytelnik — źródło jest `display:none`. NIE sklejamy
         białych znaków: właśnie złamanie wiersza między akapitami odróżnia kartę
         rozdzieloną od sklejonej. Pierwsza wersja tej próby normalizowała `\s+`
         do spacji i tym samym kasowała jedyną cechę, którą miała mierzyć. */
      wiersze: g.innerText.split('\n').map((w) => w.trim()).filter(Boolean)
    };
  });

  const n = `${p.slug}`;
  if (wynik.ukryta)            zle(n, 'grupa ukryta — skrypt nie znalazł wpisów');
  else if (wynik.wzorZostal)   zle(n, 'wzór karty został na stronie — skrypt nie zadziałał');
  else if (wynik.liczba !== 1) zle(n, `kart: ${wynik.liczba}, oczekiwałem 1`);
  else if (wynik.pytanie !== pytanieZr)
    zle(n, `pytanie ≠ pierwszy wiersz pola\n    dostałem:  ${wynik.pytanie}\n    z pola:    ${pytanieZr}`);
  else if (wynik.odpowiedz !== odpowiedzZr)
    zle(n, `odpowiedź ≠ reszta pola\n    dostałem:  ${wynik.odpowiedz.slice(0, 90)}…`);
  else if (wynik.wiersze.some((w) => w.includes(pytanieZr) && w.includes(odpowiedzZr.slice(0, 25))))
    zle(n, 'pytanie i odpowiedź stoją w JEDNYM wierszu tekstu — nadal sklejone');
  else if (!wynik.wiersze.includes(pytanieZr))
    zle(n, 'pytanie nie stoi w osobnym wierszu');
  else ok(`${n} — pytanie i odpowiedź rozdzielone`);
}

/* --- kontrola negatywna: stara struktura MUSI świecić na czerwono --- */
{
  const p = przepisy.find((x) => x.slug.startsWith('wolowina-teriyaki'));
  await karta.setContent(strona(stara(p.przechowywanie)));
  const widoczne = await karta.evaluate(() =>
    document.querySelector('.recipe-cards__group').innerText);
  const [pyt, ...r] = p.przechowywanie.split('\n').filter((l) => l.trim());
  const sklejone = widoczne.split('\n').map((w) => w.trim())
    .some((w) => w.includes(pyt) && w.includes(r.join(' ').slice(0, 25)));
  if (sklejone) ok('KONTROLA NEGATYWNA — stara struktura sklejała pytanie z odpowiedzią');
  else zle('KONTROLA NEGATYWNA', 'stara struktura NIE skleiła — próba nic nie mierzy');
}

await przegladarka.close();
console.log(`\nzdane: ${zdane} · oblane: ${oblane}`);
process.exit(oblane ? 1 : 0);
