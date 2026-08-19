/* porownaj.mjs — bramka „czy repo, CMS i Pages mówią to samo".
 *
 * Trzy pytania, każde osobno, każde mierzalne:
 *   1. REGENERACJA — czy z `przepisy/<id>.txt` wychodzi znak w znak to, co leży
 *      w polach `*-html` w CMS. To jest warunek ukończenia migracji nr 1.
 *   2. PĘTLA — czy każdy plik ma item i każdy item ma plik. Zero sierot.
 *   3. ŁADUNEK — czy `dane/<id>.<sha8>.json` istnieje dla bieżącej treści i czy
 *      `parser-url` w CMS wskazuje właśnie na niego.
 *
 * Bez zrzutu CMS porównuje się z ODCISKIEM (`odcisk-*.json`) — zamrożonym
 * pomiarem stanu z dnia migracji. Odcisk to nie druga kopia treści: to hasze,
 * czyli detektor zmiany. Gdy zaświeci, prawdę pokazuje CMS, nie odcisk.
 *
 * Użycie:
 *   node lancuch-html/porownaj.mjs                     # wobec odcisku
 *   node lancuch-html/porownaj.mjs zrzut-cms.json      # wobec żywego CMS-u
 *   node lancuch-html/porownaj.mjs zrzut.json --pokaz  # + fragment pierwszej różnicy
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { zbuduj, POLA_HTML, wczytajIndeks } from './generuj-html.mjs';
import { wczytajPlik } from './zrodlo.mjs';
import { KATALOG_DANYCH, wczytajZrzut, zrodla } from './wspolne.mjs';

const POLA = Object.values(POLA_HTML);
const POCHODNE = ['kcal-porcja', 'bialko-porcja', 'weglowodany-porcja', 'tluszcz-porcja'];
const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

const argv = process.argv.slice(2);
const zrzut = argv.find((a) => !a.startsWith('--'));
const pokaz = argv.includes('--pokaz');

const items = zrzut ? new Map(wczytajZrzut(zrzut).map((it) => [it.id, it])) : null;
const odcisk = zrzut ? null : wczytajOdcisk();
const indeks = wczytajIndeks();

let zgodne = 0, rozjazdy = 0, uwagi = 0;
const raport = [];

for (const { slug, item: id, zrodlo } of zrodla()) {
  if (!id) { raport.push(`  pomijam (bez „item:"): ${slug}`); continue; }
  const w = zbuduj(id, zrodlo);

  if (w.bledy.length) {
    rozjazdy += w.bledy.length;
    w.bledy.forEach((b) => raport.push(`✗ ${zrodlo.meta.slug}: ${b}`));
  }

  // --- 1. regeneracja ---------------------------------------------------
  const wzorzec = items
    ? (items.has(id) ? Object.fromEntries(POLA.concat(POCHODNE).map((p) => [p, items.get(id).fieldData[p]])) : null)
    : (odcisk.przepisy[id] || null);

  if (!wzorzec) {
    rozjazdy++;
    raport.push(`✗ ${id} (${zrodlo.meta.slug}): PLIK BEZ ITEMU — nie ma go ${items ? 'w kolekcji' : 'w odcisku'}`);
  } else {
    for (const pole of POLA) {
      const nasze = w.pola[pole];
      const ich = wzorzec[pole];
      const rowne = items ? nasze === ich : sha(nasze) === ich;
      if (rowne) { zgodne++; continue; }
      rozjazdy++;
      raport.push(`✗ ${zrodlo.meta.slug} / ${pole}: regeneracja ≠ ${items ? 'CMS' : 'odcisk'}`);
      if (pokaz && items) raport.push(pierwszaRoznica(ich ?? '', nasze));
    }
    for (const pole of POCHODNE) {
      const ich = items ? wzorzec[pole] : wzorzec[pole];
      if (w.pochodne[pole] === ich) { zgodne++; continue; }
      rozjazdy++;
      raport.push(`✗ ${zrodlo.meta.slug} / ${pole}: wyliczone ${w.pochodne[pole]}, w ${items ? 'CMS' : 'odcisku'} ${ich}`);
    }
  }

  // --- 3. ładunek -------------------------------------------------------
  const plikLadunku = path.join(KATALOG_DANYCH, w.ladunek.plik);
  if (!fs.existsSync(plikLadunku)) {
    rozjazdy++;
    raport.push(`✗ ${zrodlo.meta.slug}: brak ${w.ladunek.plik} — uruchom generuj-html.mjs przed pushem`);
  } else if (fs.readFileSync(plikLadunku, 'utf8') !== w.ladunek.tresc) {
    rozjazdy++;
    raport.push(`✗ ${zrodlo.meta.slug}: ${w.ladunek.plik} na dysku ≠ regeneracja (ten sam hash, inna treść — to nie powinno się zdarzyć)`);
  }
  if (indeks[id] && indeks[id].sha8 !== w.ladunek.hash) {
    rozjazdy++;
    raport.push(`✗ ${zrodlo.meta.slug}: dane/indeks.json ma sha8 ${indeks[id].sha8}, regeneracja daje ${w.ladunek.hash}`);
  }
  if (items && items.has(id)) {
    const url = items.get(id).fieldData['parser-url'];
    if (url === undefined) {
      uwagi++;
      raport.push(`! ${zrodlo.meta.slug}: pole „parser-url" nie istnieje w kolekcji (jeszcze go nie założono)`);
    } else if (url !== w.ladunek.url) {
      rozjazdy++;
      raport.push(`✗ ${zrodlo.meta.slug}: parser-url w CMS wskazuje na ${url || '(puste)'}, ` +
        `a bieżący ładunek to ${w.ladunek.url} — strona pobierze nieaktualne dane albo dostanie 404`);
    }
  }

  // --- uwagi merytoryczne, gdy mamy żywy item ---------------------------
  if (items && items.has(id)) {
    const d = items.get(id).fieldData;
    if (d.slug !== zrodlo.meta.slug) {
      uwagi++;
      raport.push(`! ${id}: slug w CMS „${d.slug}", w pliku „${zrodlo.meta.slug}" — plik jest lustrem, popraw [meta]`);
    }
    if (d.name !== zrodlo.meta.nazwa) {
      uwagi++;
      raport.push(`! ${zrodlo.meta.slug}: nazwa w CMS „${d.name}", w pliku „${zrodlo.meta.nazwa}"`);
    }
    const produktow = (d['produkty-w-przepisie'] || []).length;
    if (d['liczba-produktow'] !== produktow) {
      uwagi++;
      raport.push(`! ${zrodlo.meta.slug}: liczba-produktow = ${d['liczba-produktow']}, ` +
        `a produkty-w-przepisie ma ${produktow} pozycji`);
    }
    for (const [pole, wartosc] of [['porcje-bazowe', zrodlo.meta['porcje-bazowe']],
      ['waga-porcji', zrodlo.meta['waga-porcji']], ['czas-minuty', zrodlo.meta['czas-minuty']],
      ['liczba-porcji', zrodlo.meta['liczba-porcji']]]) {
      if (d[pole] !== wartosc) {
        rozjazdy++;
        raport.push(`✗ ${zrodlo.meta.slug} / ${pole}: CMS ${JSON.stringify(d[pole])}, plik ${JSON.stringify(wartosc)}`);
      }
    }
  }
}

// --- 2. pętla w drugą stronę --------------------------------------------
if (items) {
  const maPlik = new Set(zrodla().map((z) => z.item).filter(Boolean));
  for (const [id, it] of items) {
    if (maPlik.has(id)) continue;
    const wZakresie = Object.keys(POLA_HTML).every((p) => it.fieldData[p]);
    if (wZakresie) {
      rozjazdy++;
      raport.push(`✗ ${id} (${it.fieldData.slug}): ITEM BEZ PLIKU — ma komplet pól źródłowych, a nie ma go w przepisy/`);
    } else {
      raport.push(`  poza zakresem (puste pola źródłowe): ${it.fieldData.slug}`);
    }
  }
}

// --- ładunki sieroce ----------------------------------------------------
if (fs.existsSync(KATALOG_DANYCH)) {
  const znane = new Set(zrodla().map((z) => z.item).filter(Boolean));
  for (const f of fs.readdirSync(KATALOG_DANYCH)) {
    const m = /^([0-9a-f]{24})\.[0-9a-f]{8}\.json$/.exec(f);
    if (m && !znane.has(m[1])) {
      uwagi++;
      raport.push(`! dane/${f}: ładunek bez pliku źródłowego`);
    }
  }
}

raport.forEach((l) => console.log(l));
console.log(`\nzgodne pola: ${zgodne} · rozjazdy: ${rozjazdy} · uwagi: ${uwagi}` +
  (items ? ` · wobec zrzutu ${path.basename(zrzut)}` : ` · wobec odcisku ${odcisk.data}`));
process.exit(rozjazdy ? 1 : 0);

// ------------------------------------------------------------------------

function wczytajOdcisk() {
  const pliki = fs.readdirSync(path.dirname(new URL(import.meta.url).pathname))
    .filter((f) => /^odcisk-.*\.json$/.test(f)).sort();
  if (!pliki.length) {
    console.error('brak pliku odcisk-*.json — podaj zrzut CMS jako argument');
    process.exit(2);
  }
  const p = path.join(path.dirname(new URL(import.meta.url).pathname), pliki[pliki.length - 1]);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function pierwszaRoznica(a, b) {
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  const okno = (s) => JSON.stringify(s.slice(Math.max(0, i - 50), i + 80));
  return `    znak ${i}\n      CMS: …${okno(a)}\n      my:  …${okno(b)}`;
}
