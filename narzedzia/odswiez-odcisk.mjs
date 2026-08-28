/* odswiez-odcisk.mjs — wymiana zamrożonego pomiaru pól `*-html`.
 *
 * Odcisk jest DETEKTOREM ZMIANY, nie drugą kopią treści. Kiedy zaświeci, znaczy
 * to jedno z dwojga i trzeba wiedzieć które:
 *   · generator zaczął produkować co innego przy tym samym źródle → to jest usterka;
 *   · źródło zostało świadomie przeredagowane → odcisk jest po prostu stary.
 *
 * TEN SKRYPT WOLNO URUCHOMIĆ WYŁĄCZNIE W DRUGIM PRZYPADKU I DOPIERO PO POMIARZE.
 * Dlatego wymaga `--powod "…"`: bez zdania, które mówi, co się zmieniło i skąd
 * to wiadomo, wymiana odcisku jest zamiataniem czerwonej bramki pod dywan.
 *
 * Czym pomiar NIE jest: zgodnością regeneracji z regeneracją. To by przechodziło
 * zawsze. Pomiarem jest porównanie z OPUBLIKOWANĄ STRONĄ — bo dopiero ona mówi,
 * że CMS niesie tę samą treść, którą wypisuje dziś generator:
 *
 *     node narzedzia/sprawdz-html-na-stronie.mjs      (5 pól × 16 przepisów)
 *
 * Historia: pierwszy odcisk wymieniono, gdy imbir przeszedł z centymetrów na gramy
 * w trzech przepisach. Pole `powodWymiany` niesie tamto zdanie i ma nieść następne.
 *
 * Użycie:
 *   node narzedzia/odswiez-odcisk.mjs --powod "…"            # SUCHY BIEG
 *   node narzedzia/odswiez-odcisk.mjs --powod "…" --wykonaj
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { zbuduj, POLA_HTML } from '../lancuch-html/generuj-html.mjs';
import { KORZEN, zrodla } from '../lancuch-html/wspolne.mjs';

const POLA = Object.values(POLA_HTML);
const POCHODNE = ['kcal-porcja', 'bialko-porcja', 'weglowodany-porcja', 'tluszcz-porcja'];
const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

const argv = process.argv.slice(2);
const wykonaj = argv.includes('--wykonaj');
const i = argv.indexOf('--powod');
const powod = i >= 0 ? argv[i + 1] : null;

if (!powod) {
  console.error('brak --powod "…" — odcisku nie wymienia się bez zdania, które mówi, co się zmieniło.\n' +
    'Jeśli nie umiesz go napisać, to znaczy, że jeszcze nie wiesz, czy bramka świeci słusznie.');
  process.exit(2);
}

const dzis = new Date().toISOString().slice(0, 10);
const KAT = path.join(KORZEN, 'lancuch-html');
const plik = path.join(KAT, `odcisk-${dzis}.json`);

const przepisy = {};
let bledy = 0;
for (const { item: id, zrodlo } of zrodla()) {
  if (!id) continue;
  const w = zbuduj(id, zrodlo);
  if (w.bledy.length) { bledy += w.bledy.length; console.log(`✗ ${zrodlo.meta.slug}: ${w.bledy[0]}`); continue; }
  const wpis = { slug: zrodlo.meta.slug };
  for (const p of POLA) wpis[p] = sha(w.pola[p]);
  for (const p of POCHODNE) wpis[p] = w.pochodne[p];
  przepisy[id] = wpis;
}
if (bledy) { console.error(`\n${bledy} błędów w źródłach — odcisku z uszkodzonego drzewa się nie robi.`); process.exit(1); }

const stare = fs.readdirSync(KAT).filter((f) => /^odcisk-.*\.json$/.test(f)).sort();
const poprzedni = stare.length ? JSON.parse(fs.readFileSync(path.join(KAT, stare[stare.length - 1]), 'utf8')) : null;

const tresc = {
  data: dzis,
  co: `Zamrożony pomiar pól *-html w kolekcji przepisy (6a574b13929618407b161661).`,
  jak: 'sha256 wartości pola z regeneracji; pola pochodne zapisane wprost, bo są liczbami.',
  poCo: 'Detektor zmiany zachowania generatora — nie druga kopia treści. Gdy zaświeci, prawdę pokazuje CMS; odcisk zastępuje się dopiero po pomiarze na opublikowanej stronie.',
  powodWymiany: powod,
  poprzedni: poprzedni ? poprzedni.data : null,
  przepisow: Object.keys(przepisy).length,
  przepisy
};

if (!wykonaj) {
  const ile = poprzedni ? Object.keys(przepisy).filter((id) => {
    const a = poprzedni.przepisy[id]; if (!a) return true;
    return POLA.concat(POCHODNE).some((p) => a[p] !== przepisy[id][p]);
  }).length : Object.keys(przepisy).length;
  console.log(`[SUCHY BIEG] zapisałbym ${plik}`);
  console.log(`  przepisów: ${Object.keys(przepisy).length} · pól na przepis: ${POLA.length + POCHODNE.length}`);
  console.log(`  różniących się od odcisku ${poprzedni ? poprzedni.data : '(brak)'}: ${ile}`);
  console.log(`  powód wymiany: ${powod}`);
  console.log('\nUruchom ponownie z --wykonaj.');
  process.exit(0);
}

fs.writeFileSync(plik, JSON.stringify(tresc, null, 1) + '\n');
console.log(`✓ ${plik} — ${Object.keys(przepisy).length} przepisów`);
console.log('  Stary odcisk ZOSTAJE na dysku jako historia; porownaj.mjs bierze najnowszy po sortowaniu nazw.');
