/* zmierz-jsonld-na-stagingu.mjs — czy blok `json-ld-rich` DOJECHAŁ na stronę.
 *
 * Po co osobne narzędzie, skoro jest `porownaj.mjs`. Bo tamto porównuje repo
 * ze ZRZUTEM CMS-u, a zrzut trzeba najpierw zrobić i przepisać do pliku. To
 * narzędzie nie potrzebuje ani tokenu, ani zrzutu — pobiera opublikowaną stronę
 * i porównuje wyciągnięty z niej blok znak w znak z regeneracją. Domyka więc
 * ostatni odcinek, którego żadna bramka w repo nie widzi: CMS → render → HTML.
 *
 * DLACZEGO TO JEST JEDYNY WIARYGODNY DOWÓD PRZY ZAPISIE PRZEZ SESJĘ.
 * Zapis ręczny do wywołania MCP potrafi uciąć treść w środku i zwrócić przy tym
 * POPRAWNY JSON z kompletem pól wymaganych przez Google (zmierzone 2026-08-24,
 * dwa przypadki na szesnaście, rejestr w repozytorium zamkniętym przebieg 64). Ani `JSON.parse`,
 * ani kontrola wymaganych kluczy tego nie widzą. Widzi to wyłącznie porównanie
 * całego ciągu — i musi ono biec POZA sesją, bo to sesja jest tu uszkadzającym
 * ogniwem. Stąd: pobranie curl-em/fetchem i `===` w Node, nie oglądanie echa.
 *
 * Mierzy przy okazji dwie rzeczy, które osobno potrafią wywrócić wynik:
 *   · `&quot;` w całym HTML — enkodowanie cudzysłowu zabiłoby `JSON.parse`;
 *   · liczbę bloków `Recipe` w SUROWYM HTML — dwa znaczą, że runtime'owy
 *     `mpJsonLd` wciąż wstrzykuje duplikat (albo że szablon ma dwa wiązania).
 *     Surowy HTML, bo `mpJsonLd` dokłada swój blok dopiero po uruchomieniu JS.
 *
 * Użycie:
 *   node narzedzia/zmierz-jsonld-na-stagingu.mjs
 *   node narzedzia/zmierz-jsonld-na-stagingu.mjs --baza https://…   # inna domena
 *   node narzedzia/zmierz-jsonld-na-stagingu.mjs --pokaz            # + miejsce różnicy
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zrodla } from '../lancuch-html/wspolne.mjs';
import { POLE, dokument, blok } from '../lancuch-html/generuj-jsonld.mjs';

const KAT = path.dirname(fileURLToPath(import.meta.url));
const LUSTRO = path.join(KAT, '..', 'lancuch-html', 'pola-z-cms.json');
const argv = process.argv.slice(2);
const pokaz = argv.includes('--pokaz');
const i = argv.indexOf('--baza');
const BAZA = i >= 0 ? argv[i + 1] : 'https://miesna-paczka-ea5c01.webflow.io';
const STEMPEL = Date.now().toString(36);

if (!fs.existsSync(LUSTRO)) throw new Error(`brak ${LUSTRO} — lustro pól CMS jest wejściem, nie opcją`);
const lustro = JSON.parse(fs.readFileSync(LUSTRO, 'utf8'));

/* Wyciąga bloki z SUROWEGO HTML. Bez parsera DOM celowo: parser normalizuje
   wnętrze `<script>` i porównanie „znak w znak" przestałoby nim być. */
const BLOKI = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

function pierwszaRoznica(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const od = Math.max(0, i - 40);
  return `      pierwsza różnica na pozycji ${i}:\n` +
         `        strona:     …${JSON.stringify(a.slice(od, i + 60))}\n` +
         `        regeneracja:…${JSON.stringify(b.slice(od, i + 60))}`;
}

const wiersze = [];
let zgodne = 0, rozjazdy = 0, uwagi = 0;

for (const z of zrodla()) {
  if (!z.item) continue;
  const cms = lustro[z.item];
  if (!cms) { uwagi++; console.log(`! ${z.slug}: itemu nie ma w pola-z-cms.json`); continue; }
  if (cms.isDraft) { console.log(`· ${cms.slug}: szkic, nie ma go na stronie — pomijam`); continue; }

  const nasz = blok(dokument(z, lustro));
  /* Doklejony parametr jest OBOWIĄZKOWY, nie ostrożnościowy. `cache: 'no-store'`
     rządzi wyłącznie cache'em klienta; brzeg CDN Webflow ma go w nosie i po
     świeżej publikacji potrafi jeszcze przez minuty oddawać poprzedni HTML.
     Zmierzone 2026-08-24: ten sam adres bez parametru → zero bloków Recipe,
     z parametrem → blok obecny, `last-modified` sprzed dwóch minut. Pomiar bez
     tego dawał więc czysty fałsz ujemny: „zapis nie dojechał", choć dojechał. */
  const url = `${BAZA}/przepisy/${cms.slug}?pomiar=${STEMPEL}`;

  let html;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) { rozjazdy++; console.log(`✗ ${cms.slug}: HTTP ${r.status}`); continue; }
    html = await r.text();
  } catch (e) { rozjazdy++; console.log(`✗ ${cms.slug}: sieć — ${e.message}`); continue; }

  const znalezione = [...html.matchAll(BLOKI)].map((m) => m[0]);
  const recipe = znalezione.filter((b) => /"@type"\s*:\s*"Recipe"/.test(b));
  const quot = (html.match(/&quot;/g) || []).length;

  let stan;
  if (recipe.length === 0) { stan = 'BRAK bloku Recipe na stronie'; }
  else if (!recipe.includes(nasz)) {
    const naj = recipe[0];
    stan = `blok ≠ regeneracja (${naj.length} znaków na stronie, ${nasz.length} w regeneracji)`;
    if (pokaz) stan += '\n' + pierwszaRoznica(naj, nasz);
  } else { stan = null; }

  if (stan) { rozjazdy++; console.log(`✗ ${cms.slug}: ${stan}`); }
  else zgodne++;

  if (quot) { uwagi++; console.log(`! ${cms.slug}: &quot; w HTML ×${quot} — enkoder ruszył treść`); }
  if (recipe.length > 1) { uwagi++; console.log(`! ${cms.slug}: ${recipe.length} bloki Recipe w surowym HTML (duplikat)`); }

  wiersze.push({ slug: cms.slug, ok: !stan, blokow: recipe.length, quot });
}

/* Bramka na sam POMIAR: „0 rozjazdów" przy zerze zmierzonych stron znaczy
   „nic nie sprawdziłem", a wygląda identycznie jak „wszystko zgodne". */
if (wiersze.length === 0) {
  console.log('✗ POMIAR: zero pozycji do zmierzenia — sprawdź pola-z-cms.json i przepisy/');
  rozjazdy++;
}

console.log(`\nzgodne co do bajtu: ${zgodne}/${wiersze.length} · rozjazdy: ${rozjazdy} · uwagi: ${uwagi}`);
console.log(`pole: ${POLE} · baza: ${BAZA}`);
if (rozjazdy) {
  console.log('\nUWAGA: strona pokazuje treść OPUBLIKOWANĄ. Zapis do CMS bez publikacji');
  console.log('       nie dojedzie tu wcale — rozjazd może znaczyć „nie opublikowano",');
  console.log('       a nie „zapisano źle". Rozstrzyga publikacja, potem ten pomiar.');
}
process.exit(rozjazdy ? 1 : 0);
