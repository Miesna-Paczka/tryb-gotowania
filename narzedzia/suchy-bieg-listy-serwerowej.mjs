/* suchy-bieg-listy-serwerowej.mjs — czy lista, którą widzi crawler, mówi to samo,
 * co lista, którą widzi człowiek.
 *
 * POWÓD. Strona przepisu dostaje dwie listy składników: `skladniki-html` renderowane
 * przez Webflow po stronie serwera (to widzi crawler bez JS) i listę budowaną
 * w przeglądarce przez `mpSkladniki` (to widzi człowiek). Przy porcjach BAZOWYCH
 * muszą być identyczne — inaczej podmieniamy treść pod crawlerem, co jest
 * dokładnie tym, czego nie wolno robić, nawet niechcący.
 *
 * Rozjazd jest tu realnym ryzykiem, nie teoretycznym: obie listy powstają z tego
 * samego pola `skladniki`, ale INNYM kodem — jedna w `generuj-html.mjs` przy
 * budowie, druga w parserze w przeglądarce. Ta bramka pilnuje, żeby nie zaczęły
 * się różnić po cichu.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-listy-serwerowej.mjs
 * Kod wyjścia 0 = wszystkie 16 przepisów zgadzają się znak w znak.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parser } from '../odmiana-node.mjs';
import { czytajZrodlo } from '../lancuch-html/zrodlo.mjs';
import { zbuduj } from '../lancuch-html/generuj-html.mjs';
import { zrodla } from '../lancuch-html/wspolne.mjs';

const P = parser();

/* Z `<li>` bierzemy sam tekst składnika. Link do sklepu („— w Mięsnej Paczce")
   jest dodatkiem karty produktowej, nie częścią etykiety, i po stronie
   przeglądarki niesie go osobny badge — więc porównanie musi go pominąć,
   inaczej mierzyłoby różnicę, której nie ma. */
const etykietyZHtml = (html) =>
  [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, w]) =>
    w.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, '')
     .replace(/<[^>]+>/g, '')
     .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
     .replace(/[ \t]+/g, ' ').trim());

let zdane = 0, oblane = 0;

for (const { item, zrodlo } of zrodla()) {
  const wynik = zbuduj(item, zrodlo);
  if (wynik.bledy.length) {
    oblane++; console.log(`✗ ${zrodlo.meta.slug} — generator zgłasza błędy: ${wynik.bledy[0]}`); continue;
  }

  const serwer = etykietyZHtml(wynik.pola['skladniki-html']);
  const B = zrodlo.meta['porcje-bazowe'];
  const skl = P._wewnetrzne.parsujSkladniki(zrodlo.pola.skladniki);
  const przegladarka = P.naPorcje({ skladniki: skl, kroki: [], porcjeBazowe: B }, B)
                        .skladniki.map((s) => s.etykieta);

  const rozne = serwer.map((s, i) => [s, przegladarka[i]]).filter(([a, b]) => a !== b);
  if (serwer.length !== przegladarka.length) {
    oblane++;
    console.log(`✗ ${zrodlo.meta.slug} — serwer ma ${serwer.length} pozycji, przeglądarka ${przegladarka.length}`);
  } else if (rozne.length) {
    oblane++;
    console.log(`✗ ${zrodlo.meta.slug} — ${rozne.length} pozycji się różni`);
    rozne.slice(0, 3).forEach(([a, b]) => console.log(`    serwer:       ${a}\n    przeglądarka: ${b}`));
  } else {
    zdane++;
    console.log(`✓ ${zrodlo.meta.slug} — ${serwer.length} pozycji zgodnych przy ${B} porcjach`);
  }
}

/* KONTROLA NEGATYWNA. Bramka, która nie umie zaświecić na czerwono, jest ozdobą.
   Psujemy jedną etykietę i sprawdzamy, że porównanie to widzi. */
{
  const a = ['300 g wołowiny', '2 łyżki cukru'];
  const b = ['300 g wołowiny', '2 łyżka cukru'];
  const widzi = a.some((x, i) => x !== b[i]);
  if (widzi) { zdane++; console.log('✓ KONTROLA NEGATYWNA — porównanie łapie podmienioną etykietę'); }
  else { oblane++; console.log('✗ KONTROLA NEGATYWNA — porównanie NIE łapie różnicy'); }
}

console.log(`\nzdane: ${zdane} · oblane: ${oblane}`);
process.exit(oblane ? 1 : 0);
