/* wypchnij-do-cms.mjs — repo → CMS, w kolejności, której nie da się pomylić.
 *
 * KOLEJNOŚĆ PUBLIKACJI JEST WARUNKIEM KONIECZNYM, nie zaleceniem:
 *
 *     push do GH  →  Pages przebudowane  →  zapis do CMS  →  publikacja itemu
 *
 * Odwrotna kolejność otwiera okno, w którym `parser-url` w CMS wskazuje na plik,
 * którego jeszcze nie ma. Ta sama pułapka jest zapisana w skillu
 * `mp-pomiar-i-pulapki` §3.5 i raz kosztowała zepsute środowisko testowe.
 *
 * Dlatego ten skrypt NIE PRZYPOMINA o kolejności — on ją wymusza: przed
 * jakimkolwiek zapisem pobiera każdy `parser-url` z Pages i wymaga odpowiedzi
 * 200 o treści identycznej z regeneracją. Nie ma pliku na Pages → nie ma zapisu.
 * Przypomnienie da się przeoczyć; 404 nie da się.
 *
 * CZEGO TEN SKRYPT NIE ROBI: nie publikuje. `publish_collection_items` nie
 * przyjmuje parametru domeny `[U]`, więc publikacja itemu jest ZAWSZE zmianą
 * produkcyjną i zawsze decyzją operatora.
 *
 * ODCZYT ZWROTNY JEST OBOWIĄZKOWY, nie ozdobny: zapis do CMS potrafi zgłosić
 * timeout po 180 s i timeout NIE NIESIE INFORMACJI O SKUTKU — 2026-08-19 raz
 * oznaczał udany zapis, raz porażkę z 14 pustymi polami `[V]`. Rozstrzyga
 * wyłącznie ponowny odczyt. Zapis jest idempotentny, więc powtórka jest bezpieczna.
 *
 * Użycie:
 *   WEBFLOW_TOKEN=… node lancuch-html/wypchnij-do-cms.mjs            # SUCHY BIEG
 *   WEBFLOW_TOKEN=… node lancuch-html/wypchnij-do-cms.mjs --wykonaj
 *   WEBFLOW_TOKEN=… node lancuch-html/wypchnij-do-cms.mjs --zaloz-pole-parser-url --wykonaj
 *   node lancuch-html/wypchnij-do-cms.mjs --przez-mcp    # bez tokenu, payload dla sesji Claude
 *   … --pomin-pages     # OSTATECZNOŚĆ, zdejmuje jedyne zabezpieczenie kolejności
 *
 * DWIE BRAMKI, JEDNA GWARANCJA. Repozytorium jest PUBLICZNE z konieczności —
 * inaczej nie działałby ani jsDelivr, ani Pages — więc token Webflow nie ma tu
 * gdzie mieszkać i most między Pages a CMS-em jest sesją Claude, nie skryptem
 * z sekretem (decyzja operatora 2026-08-19). Sesja nie widzi jednak Pages:
 * `lukaszwerecik.github.io` jest zablokowane przez politykę egressu środowiska
 * `[V 2026-08-19]`, i przez curl, i przez WebFetch. Dlatego kolejność sprawdza się
 * dwoma sposobami, zależnie od tego, kto uruchamia skrypt:
 *
 *   `--wykonaj` (maszyna operatora, jest sieć) — POBIERA każdy ładunek z Pages
 *      i wymaga 200 o treści identycznej co do bajtu.
 *
 *   `--przez-mcp` (sesja Claude, nie ma sieci do Pages) — sprawdza, czy commit
 *      wskazywany przez `origin/main` niesie ładunek o IDENTYCZNYM haszu obiektu
 *      gita, liczonym ze świeżo wygenerowanej treści, nie z pliku na dysku.
 *      Plus wypisuje SHA, dla którego trzeba potwierdzić zielony przebieg
 *      `pages build and deployment` — tego skrypt nie zrobi, bo nie ma tokenu
 *      do API GitHuba; robi to sesja i zapisuje wynik.
 *
 * Druga bramka jest słabsza o jedno założenie: ufa, że Pages serwuje korzeń
 * repozytorium z `main`. To założenie jest zmierzone osobno (DEPLOY.md: oba
 * artefakty embedu jadą właśnie stamtąd) i nie zmienia się przy publikacji treści.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { zbuduj } from './generuj-html.mjs';
import { wczytajPlik } from './zrodlo.mjs';
import { KORZEN, KOLEKCJA, zrodla, BAZA_PAGES } from './wspolne.mjs';

const API = 'https://api.webflow.com/v2';
const argv = process.argv.slice(2);
const wykonaj = argv.includes('--wykonaj');
const pominPages = argv.includes('--pomin-pages');
const zalozPole = argv.includes('--zaloz-pole-parser-url');
const przezMcp = argv.includes('--przez-mcp');
const token = process.env.WEBFLOW_TOKEN;

if (!token && !przezMcp) {
  console.error('brak WEBFLOW_TOKEN w środowisku — token site API z uprawnieniem CMS:write\n' +
    '(albo uruchom z --przez-mcp, jeśli zapis ma iść przez sesję Claude)');
  process.exit(2);
}

const naglowki = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

async function api(sciezka, opcje = {}) {
  const r = await fetch(API + sciezka, { ...opcje, headers: { ...naglowki, ...(opcje.headers || {}) } });
  const tekst = await r.text();
  if (!r.ok) throw new Error(`${opcje.method || 'GET'} ${sciezka} → ${r.status} ${tekst.slice(0, 300)}`);
  return tekst ? JSON.parse(tekst) : null;
}

// ------------------------------------------------------------------ 1. budowa
const budowy = [];
let bledy = 0;
for (const { slug, item: id, zrodlo } of zrodla()) {
  /* Bez `item` nie ma dokąd pisać. To nie jest usterka, tylko przepis jeszcze
     nieprzypisany do kolekcji — ale wypchnięcie MUSI o tym powiedzieć, bo cicho
     pominięty przepis wygląda jak wypchnięty. */
  if (!id) { console.log(`· ${slug}  bez „item:" — pomijam, nie ma dokąd wypchnąć`); continue; }
  const w = zbuduj(id, zrodlo);
  if (w.bledy.length) {
    bledy += w.bledy.length;
    console.log(`✗ ${zrodlo.meta.slug}`);
    w.bledy.forEach((b) => console.log(`    ${b}`));
  }
  budowy.push(w);
}
if (bledy) {
  console.error(`\n${bledy} błędów w źródłach — nic nie wypycham. Napraw pliki i uruchom ponownie.`);
  process.exit(1);
}
console.log(`zbudowane bez błędu: ${budowy.length} przepisów`);

// ------------------------------------------------------------------ 2. bramka
/* Hasz obiektu gita liczony ZE ŚWIEŻO WYGENEROWANEJ TREŚCI, nie z pliku na dysku.
   Różnica jest istotna: plik na dysku mógł zostać zmieniony po commicie i wtedy
   porównanie „dysk vs drzewo" przechodziłoby, mówiąc o czymś innym niż to, co
   pojedzie do CMS-u. Tu porównujemy dokładnie te bajty, których adres wpiszemy
   w `parser-url`. */
const gitOut = (args, wejscie) => execFileSync('git', ['-C', KORZEN, ...args],
  { input: wejscie, encoding: 'utf8' }).trim();

/* KTÓRE `main` PILNUJEMY — to nie jest szczegół konfiguracji.

   Bramka ma odpowiadać na jedno pytanie: czy plik, na który za chwilę wskaże
   `parser-url` w CMS, JEST JUŻ na hoście, który go serwuje. Do 2026-08-19 pytała
   o `origin/main`, czyli o repozytorium osobiste — bo stamtąd wtedy szły Pages.
   Po migracji hosta na organizację ten sam kod zaczął pilnować NIE TEGO REPO:
   przechodziłby, gdy plik leży na osobistym, a na organizacyjnym go nie ma,
   czyli dokładnie w sytuacji, dla której powstał.

   Referencję wyprowadzamy więc z `BAZA_PAGES`, a nie z nazwy zdalnego — dzięki
   temu adres w wygenerowanym `parser-url` i repozytorium sprawdzane przez bramkę
   są z definicji tym samym miejscem. Zmiana hosta w jednej stałej przestawia oba. */
function refPages() {
  const m = /^https:\/\/([^.]+)\.github\.io\/([^/]+)/.exec(BAZA_PAGES);
  if (!m) { console.error(`nie umiem wyprowadzić repozytorium z BAZA_PAGES (${BAZA_PAGES})`); process.exit(1); }
  const [, wlasciciel, repo] = m;
  const url = `https://github.com/${wlasciciel}/${repo}`;
  /* Szukamy zdalnego, który wskazuje na TEN adres — nie zgadujemy nazwy. */
  const zdalne = gitOut(['remote']).split('\n').filter(Boolean);
  for (const r of zdalne) {
    const u = gitOut(['remote', 'get-url', r]).replace(/\.git$/, '');
    if (u.toLowerCase() === url.toLowerCase()) return { ref: `${r}/main`, url };
  }
  console.error(`\nżaden zdalny nie wskazuje na ${url} — a stamtąd Pages serwuje ładunki.`);
  console.error(`Dodaj go: git remote add pages ${url}   (potem: git fetch pages main)`);
  process.exit(1);
}

function bramkaGit(budowy) {
  const { ref, url } = refPages();
  let commit;
  try { commit = gitOut(['rev-parse', ref]); }
  catch { console.error(`nie umiem odczytać ${ref} — zrób \`git fetch ${ref.split('/')[0]} main\``); process.exit(1); }

  console.log(`\nbramka git — czy ${ref} (${commit.slice(0, 7)}) — ${url} — niesie te same bajty:`);
  let brakuje = 0;
  for (const w of budowy) {
    const nasz = gitOut(['hash-object', '--stdin'], w.ladunek.tresc);
    let wDrzewie = null;
    try {
      const wiersz = gitOut(['ls-tree', commit, '--', `dane/${w.ladunek.plik}`]);
      wDrzewie = wiersz ? wiersz.split(/\s+/)[2] : null;
    } catch { /* brak wpisu */ }
    if (wDrzewie !== nasz) {
      brakuje++;
      console.log(`  ✗ ${w.zrodlo.meta.slug}: dane/${w.ladunek.plik} ` +
        (wDrzewie ? `ma w main hasz ${wDrzewie.slice(0, 8)}, a regeneracja daje ${nasz.slice(0, 8)}`
                  : `NIE MA GO w commicie wskazywanym przez ${ref}`));
    }
  }
  if (brakuje) {
    console.error(`\n${brakuje} ładunków nie ma na ${ref} albo różnią się treścią. ` +
      'Najpierw commit i push, potem zapis do CMS — odwrotna kolejność daje stronę ' +
      'wskazującą na nieistniejący plik.');
    process.exit(1);
  }
  console.log(`  ✓ ${budowy.length}/${budowy.length} ładunków obecnych w origin/main, bajt w bajt`);
  console.log(`\n  DO POTWIERDZENIA PRZEZ SESJĘ (skrypt nie ma tokenu do API GitHuba):`);
  console.log(`  przebieg „pages build and deployment" dla ${commit} musi mieć conclusion=success.`);
  console.log(`  Bez tego zielona bramka mówi tylko „jest w repo", a nie „jest pod adresem".`);
}

if (pominPages) {
  console.log('\n! --pomin-pages: NIE sprawdzam, czy ładunki są na Pages. Zapisany parser-url ' +
    'może wskazywać na plik, którego nie ma — to jest dokładnie ta awaria, przed którą chroni ta bramka.');
} else if (przezMcp) {
  bramkaGit(budowy);
} else {
  console.log('\nbramka Pages — czy każdy ładunek jest już pod swoim adresem:');
  let brakuje = 0;
  for (const w of budowy) {
    let stan;
    try {
      const r = await fetch(w.ladunek.url, { cache: 'no-store' });
      stan = r.ok ? (await r.text()) === w.ladunek.tresc ? 'ok' : 'inna treść' : `HTTP ${r.status}`;
    } catch (e) { stan = `sieć: ${e.message}`; }
    if (stan !== 'ok') { brakuje++; console.log(`  ✗ ${w.zrodlo.meta.slug}: ${stan} — ${w.ladunek.url}`); }
  }
  if (brakuje) {
    console.error(`\n${brakuje} ładunków nie ma na Pages. Najpierw push, potem (do minuty) ten skrypt. ` +
      'Zapis do CMS teraz dałby stronę wskazującą na nieistniejący plik.');
    process.exit(1);
  }
  console.log(`  ✓ ${budowy.length}/${budowy.length} ładunków dostępnych i zgodnych co do bajtu`);
}

// ------------------------------------------------------------------ 3. tryb MCP
/* Payload wypisywany do pliku, a NIE na ekran. Powód jest zmierzony, nie
   estetyczny: przepisywanie polskiej treści do wywołania MCP ręcznie dało
   6 literówek w jednej sesji `[V 2026-08-19]` — `schłódź`, `prześnij`, `przeć`,
   `wrć`, `rozluźnić`, `dosłodź` — a dwie z nich miały identyczną długość ciągu,
   więc kontrola długości ich nie łapała. Jedyne, co je łapało, to porównanie
   znak w znak. Plik na dysku pozwala odczytać payload maszynowo zamiast
   przepisywać go z ekranu, a `porownaj.mjs` na zrzucie CMS domyka pętlę PO zapisie
   i jest właściwym dowodem, że nic się po drodze nie przekręciło. */
if (przezMcp) {
  const doZapisu = budowy.map((w) => ({
    id: w.itemId,
    slug: w.zrodlo.meta.slug,
    fieldData: { ...w.pola, ...w.pochodne, 'parser-url': w.ladunek.url }
  }));
  const plik = path.join(KORZEN, 'payload-cms.json');
  fs.writeFileSync(plik, JSON.stringify({ kolekcja: KOLEKCJA, itemy: doZapisu }, null, 1) + '\n');
  console.log(`\npayload dla ${doZapisu.length} itemów × ${Object.keys(doZapisu[0].fieldData).length} pól → ${plik}`);
  console.log('pola: ' + Object.keys(doZapisu[0].fieldData).join(', '));
  console.log('\nDalej, w tej kolejności:');
  console.log('  1. potwierdź zielony „pages build and deployment" dla SHA wypisanego wyżej');
  console.log('  2. załóż pole „parser-url" (Link), jeśli go nie ma');
  console.log('  3. zapisz payload przez data_cms_tool > update_collection_items');
  console.log('  4. ZRÓB ZRZUT kolekcji i uruchom `porownaj.mjs <zrzut>` — bez tego zapis');
  console.log('     jest niepotwierdzony: timeout MCP nie niesie informacji o skutku');
  console.log('  5. NIE publikuj. Publikacja itemu jest decyzją operatora.');
  console.log('\npayload-cms.json jest artefaktem roboczym — nie commituj go.');
  process.exit(0);
}

// ------------------------------------------------------------------ 4. pole parser-url
const pola = (await api(`/collections/${KOLEKCJA}`)).fields || [];
const maParserUrl = pola.some((f) => f.slug === 'parser-url');
if (!maParserUrl) {
  if (!zalozPole) {
    console.error('\nw kolekcji nie ma pola „parser-url". Dodaj je flagą --zaloz-pole-parser-url ' +
      '(typ Link) albo ręcznie w Designerze — bez niego strona nie ma skąd wziąć adresu ładunku.');
    process.exit(1);
  }
  if (wykonaj) {
    await api(`/collections/${KOLEKCJA}/fields`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'Link', displayName: 'parser url', isRequired: false,
        helpText: 'POLE POCHODNE — generuje je lancuch-html/generuj-html.mjs. Nie edytuj ręcznie: ' +
          'adres niesie hash zawartości, więc ręczna zmiana daje 404 albo stare dane.'
      })
    });
    console.log('✓ założone pole „parser url" (Link)');
  } else {
    console.log('[sucho] założyłbym pole „parser url" (Link)');
  }
}

// ------------------------------------------------------------------ 5. zapis
const doZapisu = budowy.map((w) => ({
  id: w.itemId,
  slug: w.zrodlo.meta.slug,
  fieldData: { ...w.pola, ...w.pochodne, 'parser-url': w.ladunek.url }
}));

if (!wykonaj) {
  console.log('\n[SUCHY BIEG] zapisałbym po 12 pól w każdym z ' + doZapisu.length + ' itemów:');
  console.log('  ' + Object.keys(doZapisu[0].fieldData).join(', '));
  console.log('\nUruchom ponownie z --wykonaj, żeby zapisać. Publikacji nie robię w żadnym trybie.');
  process.exit(0);
}

let zapisane = 0, nieudane = 0;
for (const it of doZapisu) {
  try {
    await api(`/collections/${KOLEKCJA}/items/${it.id}`, {
      method: 'PATCH', body: JSON.stringify({ fieldData: it.fieldData })
    });
    zapisane++;
    console.log(`✓ zapisany ${it.slug}`);
  } catch (e) {
    nieudane++;
    console.log(`✗ ${it.slug}: ${e.message}`);
    console.log('    (timeout NIE znaczy „nie zapisało się" — rozstrzygnie odczyt zwrotny niżej)');
  }
}

// ------------------------------------------------------------------ 6. odczyt zwrotny
console.log('\nodczyt zwrotny — jedyny rozstrzygający dowód zapisu:');
let rozjazdy = 0;
for (const it of doZapisu) {
  const item = await api(`/collections/${KOLEKCJA}/items/${it.id}`);
  for (const [pole, wartosc] of Object.entries(it.fieldData)) {
    if (item.fieldData[pole] !== wartosc) {
      rozjazdy++;
      console.log(`  ✗ ${it.slug} / ${pole}: w CMS ${JSON.stringify(String(item.fieldData[pole]).slice(0, 60))}`);
    }
  }
}
console.log(rozjazdy ? `  ${rozjazdy} pól nie zgadza się po zapisie` : `  ✓ wszystkie pola zgodne`);
console.log(`\nzapisane: ${zapisane} · nieudane wywołania: ${nieudane} · rozjazdy po odczycie: ${rozjazdy}`);
console.log('Itemy zostają WERSJAMI ROBOCZYMI. Publikacja jest decyzją operatora.');
process.exit(rozjazdy ? 1 : 0);
