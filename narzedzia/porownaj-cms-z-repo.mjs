/* porownaj-cms-z-repo.mjs — czy żywy CMS mówi to samo, co repozytorium.
 *
 * POWÓD. Od 2026-08-19 źródłem prawdy dla przepisów jest `przepisy/*.txt`,
 * a CMS jest odbiorcą. Zdanie „CMS zgadza się z repo" było dotąd wnioskiem
 * z procedury (wypchnęliśmy, więc pasuje), a nie pomiarem. Bramka w CI porównuje
 * repo z odciskiem, NIE z żywym CMS-em (handoff §7.4) — więc każda ręczna zmiana
 * w Webflow jest niewidoczna, dopóki ktoś nie porówna wprost.
 *
 * Porównuje trzy warstwy, bo rozjazd w każdej znaczy co innego:
 *   1. pola SUROWE (`skladniki`, `kroki`, kartowe, wartości) — wejście parsera,
 *   2. pola POCHODNE (`*-html`, `parser-url`) — to, co widzi crawler,
 *   3. MODEL PARSERA zbudowany z tekstu CMS vs z tekstu repo — czy tryb gotowania
 *      pokazałby to samo. Ta warstwa łapie różnice, których nie widać w tekście:
 *      inne białe znaki potrafią przejść bez śladu w HTML, a rozbić parsowanie.
 *
 * Wejście: zrzut kolekcji z Webflow MCP (`list_collection_items`) w JSON.
 * Uruchomienie: node narzedzia/porownaj-cms-z-repo.mjs <zrzut.json>
 */
import fs from 'node:fs';
import path from 'node:path';
import { parser } from '../odmiana-node.mjs';
import { czytajZrodlo } from '../lancuch-html/zrodlo.mjs';
import { zbuduj } from '../lancuch-html/generuj-html.mjs';
import { zrodla } from '../lancuch-html/wspolne.mjs';

const P = parser();
const zrzut = JSON.parse(fs.readFileSync(process.argv[2] || '/tmp/cms-przepisy.json', 'utf8'));
const wgSlugu = new Map(zrodla().filter((z) => z.item).map((z) => [z.item, z]));
const wRepo = new Set(wgSlugu.keys());

/* Pola surowe: nazwa w CMS ↔ sekcja/meta w pliku źródłowym. */
const SUROWE = {
  skladniki: (z) => z.pola.skladniki,
  kroki: (z) => z.pola.kroki,
  wskazowka: (z) => z.pola.wskazowka,
  'co-mozesz-zmienic': (z) => z.pola['co-mozesz-zmienic'],
  przechowywanie: (z) => z.pola.przechowywanie,
  'wartosci-odzywcze': (z) => z.pola['wartosci-odzywcze'],
  'wartosci-porcja': (z) => z.pola['wartosci-porcja'],
  name: (z) => z.meta.nazwa,
  slug: (z) => z.meta.slug,
  'porcje-bazowe': (z) => z.meta['porcje-bazowe'],
  'czas-minuty': (z) => z.meta['czas-minuty'],
  'waga-porcji': (z) => z.meta['waga-porcji'],
  'liczba-porcji': (z) => z.meta['liczba-porcji']
};

const roznice = [];
const zglos = (id, slug, warstwa, pole, cms, repo) =>
  roznice.push({ id, slug, warstwa, pole, cms, repo });

/* --- itemy w CMS, których nie ma w repo --- */
const osierocone = zrzut.filter((it) => !wRepo.has(it.id));
/* --- źródła w repo, których nie ma w CMS --- */
const wCms = new Set(zrzut.map((it) => it.id));
const bezItemu = [...wRepo].filter((id) => !wCms.has(id));

let zgodnych = 0;

for (const it of zrzut) {
  if (!wRepo.has(it.id)) continue;
  const f = it.fieldData;
  const z = wgSlugu.get(it.id).zrodlo;
  const w = zbuduj(it.id, z);
  let czyste = true;

  // 1. surowe
  for (const [pole, we] of Object.entries(SUROWE)) {
    const oczek = we(z);
    const jest = f[pole];
    const rowne = (oczek == null && jest == null) ||
                  String(jest == null ? '' : jest) === String(oczek == null ? '' : oczek);
    if (!rowne) { czyste = false; zglos(it.id, f.slug, 'surowe', pole, jest, oczek); }
  }

  // 2. pochodne
  for (const [sekcja, pole] of Object.entries(w.pola ? {} : {})) void sekcja;
  for (const [pole, wartosc] of Object.entries(w.pola || {})) {
    if (String(f[pole] || '') !== String(wartosc || '')) {
      czyste = false; zglos(it.id, f.slug, 'pochodne', pole, f[pole], wartosc);
    }
  }
  if (w.ladunek && f['parser-url'] !== w.ladunek.url) {
    czyste = false; zglos(it.id, f.slug, 'pochodne', 'parser-url', f['parser-url'], w.ladunek.url);
  }

  // 3. model parsera: z tekstu CMS vs z tekstu repo
  const etykiety = (skl, kroki, baza) => {
    const s = P._wewnetrzne.parsujSkladniki(String(skl || ''));
    const k = P._wewnetrzne.parsujKroki(String(kroki || ''), s.map((x) => x.key));
    return {
      skladniki: P.naPorcje({ skladniki: s, kroki: [], porcjeBazowe: baza }, baza).skladniki.map((x) => x.etykieta),
      kroki: k.map((x) => `${x.tytul}|${x.czas || ''}|${x.minutnik ? x.minutnik.sekundy : ''}|${x.skladniki.join(',')}`)
    };
  };
  const zCms = etykiety(f.skladniki, f.kroki, f['porcje-bazowe'] || 2);
  const zRepo = etykiety(z.pola.skladniki, z.pola.kroki, z.meta['porcje-bazowe']);
  if (JSON.stringify(zCms) !== JSON.stringify(zRepo)) {
    czyste = false;
    const i = zCms.skladniki.findIndex((x, j) => x !== zRepo.skladniki[j]);
    zglos(it.id, f.slug, 'model', i >= 0 ? `skladnik #${i + 1}` : 'kroki',
          i >= 0 ? zCms.skladniki[i] : zCms.kroki.find((x, j) => x !== zRepo.kroki[j]),
          i >= 0 ? zRepo.skladniki[i] : zRepo.kroki.find((x, j) => x !== zCms.kroki[j]));
  }

  // 4. ładunek na GitHubie vs model z CMS
  if (w.ladunek) {
    const naDysku = path.join('dane', w.ladunek.plik);
    if (!fs.existsSync(naDysku)) { czyste = false; zglos(it.id, f.slug, 'ladunek', w.ladunek.plik, 'BRAK PLIKU', 'oczekiwany'); }
    else if (fs.readFileSync(naDysku, 'utf8') !== w.ladunek.tresc) {
      czyste = false; zglos(it.id, f.slug, 'ladunek', w.ladunek.plik, 'inna treść', 'regeneracja');
    }
  }

  if (czyste) zgodnych++;
}

console.log(`itemów w CMS: ${zrzut.length} · źródeł w repo: ${wRepo.size}`);
console.log(`zgodnych 1:1 we wszystkich warstwach: ${zgodnych}/${wRepo.size}\n`);

if (osierocone.length) {
  console.log(`ITEMY W CMS BEZ ŹRÓDŁA W REPO — ${osierocone.length}:`);
  osierocone.forEach((it) => console.log(`  ${it.id}  ${it.fieldData.slug}  (draft: ${it.isDraft}, archiwum: ${it.isArchived})`));
  console.log();
}
if (bezItemu.length) {
  console.log(`ŹRÓDŁA W REPO BEZ ITEMU W CMS — ${bezItemu.length}:`);
  bezItemu.forEach((id) => console.log(`  ${id}`));
  console.log();
}
if (roznice.length) {
  console.log(`RÓŻNICE — ${roznice.length}:`);
  for (const r of roznice) {
    const skroc = (v) => { const s = String(v == null ? '(puste)' : v); return s.length > 110 ? s.slice(0, 110) + '…' : s; };
    console.log(`\n  ${r.slug} · ${r.warstwa} · ${r.pole}`);
    console.log(`    CMS:  ${skroc(r.cms)}`);
    console.log(`    repo: ${skroc(r.repo)}`);
  }
} else {
  console.log('Zero różnic w polach objętych porównaniem.');
}
process.exit(roznice.length || osierocone.length ? 1 : 0);
