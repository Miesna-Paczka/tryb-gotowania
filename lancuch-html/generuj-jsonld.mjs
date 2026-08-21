#!/usr/bin/env node
/* generuj-jsonld.mjs — składa DOCELOWY Recipe JSON-LD dla pola CMS `json-ld`.

   WEJŚCIE  jsonld-zniwa/<slug>.json   — dosłowne żniwa z `mpJsonLd 1.2.0`
                                          (zbierz-jsonld.mjs, nie reimplementacja)
   WEJŚCIE  jsonld-zniwa/osie.json     — { "<slug>": {kategoria, kuchnia} }, z CMS
   WYJŚCIE  jsonld-gotowe/<slug>.json  — to, co wchodzi do pola `json-ld`

   Trzy przekształcenia, każde z powodem:

   1. ZDEJMIJ `**` z recipeInstructions[].text.
      To NIE jest naprawa źródła — źródło jest zdrowe. Parser wystawia
      `krok.tekst` (surowy, z markerami) ORAZ `krok.tekstHtml` (z `<strong>`,
      `przepis-parser.js:673`). Generator strony i tryb gotowania czytają wariant
      Html; markery są dla nich znaczeniem, nie śmieciem, i zdjęcie ich u źródła
      cofnęłoby naprawę z 2026-08-17, gdzie tryb gotowania spłaszczał wyróżnienia
      autora do gołego tekstu — objaw cichy, opisany w przepis-parser.js:461-465.
      Wyciek ma jedno miejsce: `mpJsonLd` czyta `k.tekst` zamiast wariantu
      renderowanego. JSON-LD chce czystego tekstu, nie HTML-a, więc nie bierzemy
      `tekstHtml` — zdejmujemy same markery, zostawiając treść.

   2. USUŃ `datePublished`, zostaw `dateModified`. Decyzja operatora: pole
      `zaktualizowano` niosło od zawsze „last updated", więc podawanie go jako
      daty publikacji było nieprawdą o treści.

   3. DOŁÓŻ `recipeCategory` i `recipeCuisine`. `mpJsonLd 1.2.0` ich nie zna
      (czyta je dopiero 1.3.0, nigdy niewklejona), a pola CMS `typ dania`
      i `kuchnia` są wypełnione. `recipeCuisine` to goły przymiotnik — bez
      przedrostka „kuchnia", zgodnie z rekonesansem z 2026-08-21.
*/
import fs from 'node:fs';
import path from 'node:path';

const KAT = path.dirname(new URL(import.meta.url).pathname);
const ZNIWA = path.join(KAT, 'jsonld-zniwa');
const GOTOWE = path.join(KAT, 'jsonld-gotowe');

export const bezMarkerow = (s) => String(s).replace(/\*\*([^*]+)\*\*/g, '$1');

export function przeksztalc(zniwo, osie) {
  const r = JSON.parse(JSON.stringify(zniwo));
  if (Array.isArray(r.recipeInstructions)) {
    r.recipeInstructions = r.recipeInstructions.map((k) => {
      const n = { ...k };
      if (n.text) n.text = bezMarkerow(n.text);
      if (n.name) n.name = bezMarkerow(n.name);
      return n;
    });
  }
  if (Array.isArray(r.recipeIngredient)) r.recipeIngredient = r.recipeIngredient.map(bezMarkerow);
  delete r.datePublished;
  if (osie?.kategoria) r.recipeCategory = osie.kategoria;
  if (osie?.kuchnia) r.recipeCuisine = osie.kuchnia;
  return r;
}

/* --- uruchomienie jako skrypt ------------------------------------------- */
if (process.argv[1] && process.argv[1].endsWith('generuj-jsonld.mjs')) {
  const osiePlik = path.join(ZNIWA, 'osie.json');
  const osie = fs.existsSync(osiePlik) ? JSON.parse(fs.readFileSync(osiePlik, 'utf8')) : {};
  if (!Object.keys(osie).length) {
    console.error('UWAGA: brak jsonld-zniwa/osie.json — recipeCategory i recipeCuisine NIE zostaną dołożone.');
  }
  fs.mkdirSync(GOTOWE, { recursive: true });
  let markerow = 0, plikow = 0, bezOsi = [];
  for (const f of fs.readdirSync(ZNIWA).filter((x) => x.endsWith('.json') && x !== 'osie.json')) {
    const slug = f.replace(/\.json$/, '');
    const zniwo = JSON.parse(fs.readFileSync(path.join(ZNIWA, f), 'utf8'));
    const przed = JSON.stringify(zniwo).match(/\*\*/g)?.length ?? 0;
    const out = przeksztalc(zniwo, osie[slug]);
    const po = JSON.stringify(out).match(/\*\*/g)?.length ?? 0;
    if (po) throw new Error(`${slug}: po przekształceniu zostało ${po} markerów`);
    if (!osie[slug]) bezOsi.push(slug);
    markerow += przed; plikow++;
    fs.writeFileSync(path.join(GOTOWE, f), JSON.stringify(out));
    console.log(`${slug.padEnd(52)} ${String(JSON.stringify(out).length).padStart(5)} B  −${przed} \`**\`  ${out.recipeCategory ?? '(bez kategorii)'} / ${out.recipeCuisine ?? '(bez kuchni)'}`);
  }
  console.log(`\nplików ${plikow} · zdjętych markerów ${markerow} · datePublished usunięte wszędzie`);
  if (bezOsi.length) console.log(`BEZ OSI (${bezOsi.length}): ${bezOsi.join(', ')}`);

  /* KONTROLA UJEMNA: przekształcenie musi COŚ robić. Gdyby `bezMarkerow` było
     tożsamością, wszystko powyżej i tak przeszłoby na zielono. */
  const probka = '**a** zwykły **b**';
  if (bezMarkerow(probka) !== 'a zwykły b') throw new Error('kontrola ujemna: bezMarkerow nie działa');
  if (bezMarkerow('brak markerow') !== 'brak markerow') throw new Error('kontrola ujemna: bezMarkerow psuje czysty tekst');
  console.log('kontrola ujemna: bezMarkerow zdejmuje markery i nie tyka czystego tekstu — OK');
}
