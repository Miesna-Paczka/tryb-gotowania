/* matryca.mjs — uruchamia MATRYCĘ SZEROKOŚCI (`harness/matrix.html` + `matrix-min.html`)
 * bez klikania i bez patrzenia w okno: 7 ramek × 2 powierzchnie, wynik zbierany
 * z `window.MP_MATRYCA`.
 *
 * PO CO OSOBNE NARZĘDZIE. W przebiegu 50 okazało się, że matryca leciała wyjątkiem
 * na `cz.zamknij.click()` (`×` w belce zniknął przy przebudowie do `7574:12487`)
 * i NIE WYKONYWAŁA ani jednej asercji poniżej tego miejsca — przez kilkanaście
 * przebiegów. Suche biegi raportowały zieleń, a matryca była ciemna, bo nikt jej
 * nie odpalał z wiersza poleceń. 287 asercji na ramkę przed naprawą, 438 po.
 *
 * ŻĄDANIA POZA localhost SĄ UBIJANE: fonty jadą z CDN witryny, a przeglądarka w tym
 * kontenerze nie ma sieci — bez tego `load` nigdy nie pada. Asercje o krój pytają
 * o DEKLARACJĘ, nie o narysowany glif, więc brak pliku nie zmienia werdyktu; wiersze
 * mierzące GLIFY (I4) w tym kontenerze padają i to jest artefakt środowiska.
 *
 * Uruchomienie:
 *   npx http-server . -p 8099 -c-1 --silent &
 *   node narzedzia/matryca.mjs
 * Zmienne: PORT (domyślnie 8099), ZAPISZ=<plik.json> (zbiór padnięć do porównań),
 * ZNACZNIK=<tekst|-> (kontrola świeżości: fraza, która MUSI być w podanym fixture;
 * „-" wyłącza kontrolę, gdy świadomie mierzymy drzewo odniesienia).
 */
import fs from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const PORT = process.env.PORT || '8099';
const BAZA = `http://127.0.0.1:${PORT}`;

const gotowy = async () => { for (let i = 0; i < 60; i++) {
  try { const r = await fetch(BAZA + '/harness/matrix.html'); if (r.ok) return true; } catch {}
  await new Promise((r) => setTimeout(r, 250)); } return false; };
if (!await gotowy()) { console.error('serwer nie wstał na', BAZA); process.exit(2); }

import fsx from 'node:fs';
const swiezosc = await (await fetch(BAZA + '/harness/fixture.html')).text();
const swiezoscMin = await (await fetch(BAZA + '/harness/fixture-min.html')).text();
/* KONTROLA ŚWIEŻOŚCI DOMYŚLNA: bajty podane przez serwer == bajty na dysku. Bez niej
   próba potrafi zmierzyć plik z cache'u albo z innego katalogu i odpowiedzieć pewnie
   nie na to pytanie (pułapka z przeb. 14, powtórzona w przeb. 45). */
if (!process.env.ZNACZNIK) {
  const paryOk = [['harness/fixture.html', swiezosc], ['harness/fixture-min.html', swiezoscMin]]
    .map(([f, tresc]) => { let dysk = ''; try { dysk = fsx.readFileSync(f, 'utf8'); } catch { return f + ': BRAK NA DYSKU'; }
      return f + ': ' + (dysk === tresc ? 'zgodne' : 'ROZJAZD serwer/dysk'); });
  console.log('KONTROLA ŚWIEŻOŚCI:', paryOk.join(' | '));
  if (paryOk.some((x) => !x.endsWith('zgodne'))) process.exit(2);
}
const znacznik = (!process.env.ZNACZNIK || process.env.ZNACZNIK === '-') ? null : process.env.ZNACZNIK;
if (znacznik !== null) {
  console.log('KONTROLA ŚWIEŻOŚCI: fixture.html ma nową asercję:',
    swiezosc.includes(znacznik) ? 'TAK' : 'NIE — MIERZĘ NIE TEN PLIK',
    '| fixture-min.html:', swiezoscMin.includes(znacznik) ? 'TAK' : 'NIE — MIERZĘ NIE TEN PLIK');
  if (!swiezosc.includes(znacznik) || !swiezoscMin.includes(znacznik)) process.exit(2);
}

const WSZYSTKIE = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
/* Żądania POZA localhost ubijamy: fonty jadą z CDN witryny, a ten kontener nie ma
   sieci w przeglądarce — bez tego `load` nigdy nie pada i próba stoi na timeoucie.
   Asercje o kroju pytają o DEKLARACJĘ, nie o narysowany glif (nota przy W30), więc
   brak pliku fontu nie zmienia żadnego werdyktu. */
let zleRazem = 0;
for (const strona of ['matrix.html', 'matrix-min.html']) {
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  await p.route('**/*', (r) => (new URL(r.request().url()).hostname === '127.0.0.1'
    ? r.continue() : r.abort()));
  await p.goto(`${BAZA}/harness/${strona}`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.MP_MATRYCA && window.MP_MATRYCA.gotowe, null, { timeout: 60000 })
    .catch(() => console.log('  (nie wszystkie ramki zdążyły)'));
  const w = await p.evaluate(() => {
    const r = window.MP_MATRYCA.wyniki;
    return Object.keys(r).map((k) => ({ ramka: k, ok: r[k].ok, asercji: r[k].asercje.length,
      konsola: r[k].konsola.map((x) => x.poziom + ': ' + x.tresc),
      zle: r[k].asercje.filter((a) => !a.ok).map((a) => a.nazwa + (a.detal ? ' → ' + a.detal : '')) }));
  });
  w.forEach((r) => r.zle.forEach((a) => WSZYSTKIE.push(strona + ' | ' + r.ramka + ' | ' + a.split(' → ')[0])));
  const zle = w.filter((x) => !x.ok);
  zleRazem += zle.length;
  console.log(`\n=== ${strona} — ${w.length - zle.length}/${w.length} ramek OK, asercji na ramkę: ${w[0] ? w[0].asercji : '—'}`);
  for (const r of zle) { console.log(`  ✗ ramka ${r.ramka}`);
    r.zle.forEach((a) => console.log('      ' + a));
    r.konsola.forEach((c) => console.log('      konsola ' + c)); }
  await p.close();
}
await b.close();
if (process.env.ZAPISZ) {
  fs.writeFileSync(process.env.ZAPISZ, JSON.stringify(WSZYSTKIE, null, 1));
  console.log('zapisano zbiór padnięć do', process.env.ZAPISZ, '—', WSZYSTKIE.length, 'pozycji');
}
console.log('\n' + (zleRazem ? `RAMEK Z BŁĘDEM: ${zleRazem}` : 'MATRYCA ZIELONA'));
process.exit(zleRazem ? 1 : 0);
