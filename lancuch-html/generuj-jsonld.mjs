#!/usr/bin/env node
/* generuj-jsonld.mjs — kompletny blok Recipe JSON-LD dla pola CMS `json-ld`.

   WYJŚCIE: `jsonld/<slug>.json` = { "json-ld-rich": "<script …>…</script>" },
   czyli dokładnie to, co idzie do pola RichText `json-ld` (slug `json-ld-rich`).

   ── DLACZEGO TAK, A NIE INACZEJ ─────────────────────────────────────────────

   Cały blok jedzie JEDNYM polem, bo Webflow nie ma drugiej drogi. Zmierzone
   2026-08-24 (przebieg 63), wszystkie sensowne układy:

     Page Settings → Schema markup, token w cudzysłowach   → wartość staje się
        łańcuchem, cudzysłowy w środku idą na `&quot;`; blok parsuje się, ale
        `recipeIngredient` jest tekstem, nie tablicą;
     Page Settings → Schema markup, token bez cudzysłowów   → struktura ocalała
        (nawiasy, przecinki), ale `"` nadal na `&quot;`; `JSON.parse` PADA;
     to samo bez własnego `<script>`                        → Webflow zrzuca JSON
        gołym tekstem tuż po `<link rel=canonical>`, czyli **widocznym tekstem
        na górze strony**, bo luźny tekst zamyka `<head>`;
     RichText w embedzie                                    → Webflow tego nie
        renderuje (zmierzone 2026-08-20, komentarz w `mpKrokiEmbed 2.1.0`);
     PlainText gdziekolwiek                                 → zawsze escapowany,
        bo PlainText jest z definicji tekstem.

   Przechodzi wyłącznie: **pole RichText związane z ELEMENTEM RichText**.
   Zmierzone na opublikowanej stronie: `&quot;` = 0 w całym HTML, `JSON.parse`
   przechodzi, a sha256 bloku jest identyczny co do bajtu z tym, co zapisano
   do CMS. Element NIE MOŻE zostać ukryty — Webflow usuwa ukryte elementy
   z DOM-u i blok znika bez śladu.

   ── SKĄD SIĘ BIORĄ DANE ─────────────────────────────────────────────────────

   Osiem kluczy z MODELU PARSERA (`przepisy/<slug>.txt` przez `odmiana-node.mjs`
   i `parsujWartosci` z `zrodlo.mjs` — te same funkcje, z których żyje
   `generuj-html.mjs`, więc bez drugiej implementacji gramatyki):
   `recipeIngredient`, `recipeInstructions`, `nutrition`, `totalTime`,
   `recipeYield`, plus `@context`, `@type`, `author`/`publisher` (stałe).

   Siedem z LUSTRA CMS (`pola-z-cms.json`): `name`, `slug` (→ `url`,
   `mainEntityOfPage`), `description`, `image`, `recipeCategory`,
   `recipeCuisine`, `dateModified`. Tych pól łańcuch NIE PROWADZI — prowadzi je
   redakcja w Webflow, a lustro trzeba odświeżyć, gdy się zmienią. `porownaj.mjs`
   zgłosi rozjazd; kierunek prawdy jest tu CMS → repo, jak przy `slug`.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zrodla } from './wspolne.mjs';
import { parsujWartosci } from './zrodlo.mjs';
import { parser } from '../odmiana-node.mjs';

const KAT = path.dirname(fileURLToPath(import.meta.url));
const LUSTRO = path.join(KAT, 'pola-z-cms.json');
const WYJSCIE = path.join(KAT, 'jsonld');
const ODNIESIENIE = path.join(KAT, 'jsonld-gotowe');
const ORIGIN = 'https://miesnapaczka.pl';
const SLOWNIK_AUTOROW = path.join(KAT, 'autorzy.json');

/* Wezel organizacji jest JEDEN i mieszka w bloku Organization+WebSite w glowie
   kazdej strony (kod site-level). Powtarzanie tu nazwy i URL-a robilo z tego
   trzeci, anonimowy wezel `Organization` - parser widzial trzy firmy o tej samej
   nazwie zamiast jednej. Referencja przez `@id` spina graf i nie kosztuje bajtu:
   dane i tak sa juz na stronie. */
export const ORGANIZACJA = `${ORIGIN}/#organization`;

/* Slug pola CMS. Ma sufiks `-rich`, bo `json-ld` było już raz zajęte i Webflow
   rezerwuje slugi skasowanych pól. Nazwa wyświetlana jest czysta: `json-ld`. */
export const POLE = 'json-ld-rich';

const P = parser();

export const bezMarkerow = (s) => String(s).replace(/\*\*([^*]+)\*\*/g, '$1');

/* --------------------------------------------------------------- autor --- */

/* `author` MUSI zgadzac sie z bylinem, bo byline widzi czytelnik, a JSON-LD
   opisuje te sama strone. Rozjazd miedzy nimi to nie brak pola, tylko
   twierdzenie nieprawdziwe - dokladnie ta klasa, ktora wytyczne wymieniaja
   wprost jako zakazana. Dlatego zrodlem jest pole `autor` z CMS, a nie stala.

   Typu autora PlainText nie niesie: „male.nawyki" moze byc osoba albo marka,
   i generator tego nie rozstrzygnie. Konwencja „wszystko poza redakcja to
   Person" daje wynik, ktory wyglada poprawnie i bywa falszywy, wiec zamiast
   niej jest slownik w repo (`autorzy.json`) i BLAD przy wartosci spoza niego.
   Autor dopisuje sie w PR-ze - jedna linia, przejrzana przez czlowieka. */
export function autorZ(nazwa, slownik) {
  const s = String(nazwa ?? '').trim();
  if (slownik._redakcja.includes(s)) return { '@id': ORGANIZACJA };
  const w = slownik.autorzy[s];
  if (!w) {
    throw new Error(
      `autor „${s}" nie jest znany - dopisz go do lancuch-html/autorzy.json z typem ` +
      `(Person albo Organization). Generator nie zgaduje typu autora.`);
  }
  const a = { '@type': w.typ, name: s };
  if (w.sameAs) a.sameAs = w.sameAs;
  return a;
}

/* Webflow oddaje DateTime znormalizowane do UTC. Slice(0,10) na tym ciagu jest
   poprawny dla kazdej godziny POZA pierwsza godzina doby czasu lokalnego, gdzie
   UTC cofa sie o dzien. Zadny z 16 przepisow w to nie trafia, wiec blad byłby
   niewidoczny do pierwszego przepisu wydanego tuz po polnocy. Liczymy w strefie
   serwisu, nie w UTC; `en-CA` daje gotowe YYYY-MM-DD. */
const FORMAT_DATY = new Intl.DateTimeFormat('en-CA',
  { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' });
export const naDate = (iso) => FORMAT_DATY.format(new Date(iso));

/* ------------------------------------------------------------- odżywcze --- */

const MAPA_ODZYWCZYCH = {
  'tłuszcz': 'fatContent',
  'kwasy tłuszczowe nasycone': 'saturatedFatContent',
  'węglowodany': 'carbohydrateContent',
  'cukry': 'sugarContent',
  'błonnik': 'fiberContent',
  'białko': 'proteinContent'
};

const liczba = (s) => {
  const m = String(s).replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};
const zaokr = (n) => Math.round(n * 100) / 100;

export function odzywcze(wartosciPorcja, wagaPorcji) {
  const p = {};
  for (const { klucz, wartosc } of parsujWartosci(wartosciPorcja)) {
    if (klucz) p[klucz.trim().toLowerCase()] = wartosc;
  }
  const n = { '@type': 'NutritionInformation' };
  let cokolwiek = false;

  const kcal = p['energia'] && p['energia'].match(/(\d+(?:[.,]\d+)?)\s*kcal/i);
  if (kcal) { n.calories = `${liczba(kcal[1])} kcal`; cokolwiek = true; }

  for (const [klucz, cel] of Object.entries(MAPA_ODZYWCZYCH)) {
    const v = liczba(p[klucz]);
    if (p[klucz] !== undefined && v !== null) { n[cel] = `${zaokr(v)} g`; cokolwiek = true; }
  }

  /* Sól to nie sód; przelicznik ustawowy sól = sód × 2,5 (rozp. 1169/2011). */
  const sol = liczba(p['sól']);
  if (sol !== null) { n.sodiumContent = `${zaokr(sol / 2.5)} g`; cokolwiek = true; }

  if (wagaPorcji) n.servingSize = `${wagaPorcji} g`;
  return cokolwiek ? n : null;
}

/* -------------------------------------------------------------- dokument -- */

export function dokument({ zrodlo, item }, lustro, slownikAutorow) {
  const cms = lustro[item];
  if (!cms) throw new Error(`brak itemu ${item} w pola-z-cms.json — odśwież lustro`);
  const slownik = slownikAutorow || JSON.parse(fs.readFileSync(SLOWNIK_AUTOROW, 'utf8'));

  const skl = P._wewnetrzne.parsujSkladniki(zrodlo.pola.skladniki);
  const kroki = P._wewnetrzne.parsujKroki(zrodlo.pola.kroki, skl.map((s) => s.key));
  const kanon = `${ORIGIN}/przepisy/${cms.slug}`;

  const d = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: cms.name,
    url: kanon,
    mainEntityOfPage: { '@type': 'WebPage', '@id': kanon },
    description: cms['meta-description'],
    image: [cms.image],
    author: autorZ(cms.autor, slownik),
    /* Wydawca nie zmienia sie razem z autorem: przepis goscinny wydajemy my. */
    publisher: { '@id': ORGANIZACJA },
    recipeCategory: cms.recipeCategory,
    recipeCuisine: cms.recipeCuisine,
    totalTime: `PT${Math.round(zrodlo.meta['czas-minuty'])}M`,
    recipeYield: String(zrodlo.meta['porcje-bazowe']),
    dateModified: cms.dateModified,
    recipeIngredient: skl.map((s) => bezMarkerow(P.etykietaBazowa(s.tresc))),
    recipeInstructions: kroki.map((k, i) => {
      const krok = { '@type': 'HowToStep', text: bezMarkerow(k.tekst), url: `${kanon}#krok-${i + 1}` };
      if (k.tytul) krok.name = bezMarkerow(k.tytul);
      return krok;
    })
  };
  /* `datePublished` jest u Google ZALECANE, `dateModified` w opisie Recipe nie
     wystepuje wcale. Pole zostaje puste, gdy prawdziwej daty nie znamy - brak
     zalecanego pola kosztuje mniej niz data zmyslona. */
  if (cms.opublikowano) d.datePublished = naDate(cms.opublikowano);
  const n = odzywcze(zrodlo.pola['wartosci-porcja'], zrodlo.meta['waga-porcji']);
  if (n) d.nutrition = n;
  return d;
}

export const blok = (d) =>
  `<script type="application/ld+json">${JSON.stringify(d)}</script>`;

/* -------------------------------------------------------------- kontrole -- */

/* Mikroskładnia, która nie ma prawa dojść do danych strukturalnych. */
const MIKROSKLADNIA = [
  [/\{[^{}]*\|[^{}]*\}/, 'nierozwiązana odmiana {a|b|c|d}'],
  [/\*\*/, 'marker pogrubienia **'],
  [/(^|\s)#[\wąćęłńóśźż-]+/i, 'klucz składnika #klucz'],
  [/(^|\s)@[\w-]+/, 'slug produktu @slug']
];

/* Znaki, których zachowania przy renderze przez RichText NIE ZMIERZYLIŚMY,
   bo w 16 przepisach nie ma dziś ani jednego (zmierzone 2026-08-24: zero
   wystąpień każdego z ośmiu). Pierwszy przepis ze słowem w cudzysłowie albo
   z `l'orange` trafi w nieznane — a jeśli Webflow to zenkoduje, blok padnie
   po cichu, dokładnie jak padał ten z panelu Schema markup.

   Dlatego to jest BŁĄD, nie ostrzeżenie: lepiej zatrzymać łańcuch niż wypuścić
   dane strukturalne, o których nie wiemy, czy się sparsują. Zdejmujemy ten
   zakaz dopiero po pomiarze na stagingu, znak po znaku. */
const NIEZMIERZONE = [
  ["'", 'apostrof prosty'],
  ['"', 'cudzysłów prosty'],
  ['&', 'ampersand'],
  ['<', 'lewy nawias kątowy'],
  ['>', 'prawy nawias kątowy'],
  ['’', 'apostrof typograficzny ’'],
  ['„', 'cudzysłów otwierający „'],
  ['”', 'cudzysłów zamykający ”']
];

/* WYŁĄCZNIE tekst dla człowieka. `url` ma legalne `#krok-N`, a JSON ma własne
   cudzysłowy strukturalne — puszczenie ich przez te bramki dałoby setki
   fałszywych alarmów, a wyłączona bramka jest gorsza niż żadna. */
function tekstyDlaCzlowieka(d) {
  return [
    d.name, d.description, d.recipeCategory, d.recipeCuisine,
    ...d.recipeIngredient,
    ...d.recipeInstructions.flatMap((s) => [s.text, s.name].filter(Boolean)),
    ...Object.values(d.nutrition || {}).filter((v) => typeof v === 'string')
  ].filter(Boolean);
}

export function kontrole(slug, d, tekst) {
  const b = [];
  const kanon = `${ORIGIN}/przepisy/${slug}`;

  for (const t of tekstyDlaCzlowieka(d)) {
    for (const [re, opis] of MIKROSKLADNIA) if (re.test(t)) b.push(`${opis}: „${t.slice(0, 60)}…"`);
    for (const [znak, opis] of NIEZMIERZONE) {
      if (t.includes(znak)) b.push(`${opis} w treści — render przez RichText NIEZMIERZONY: „${t.slice(0, 60)}…"`);
    }
  }

  /* Google: `name` i `image` są jedynymi wymaganymi. Bez nich blok jest ważnym
     JSON-em i bezużytecznym Recipe — czyli zielenią bez informacji. */
  if (!d.name) b.push('brak `name` — Google wymaga');
  if (!d.image?.[0]) b.push('brak `image` — Google wymaga');
  if (!d.description) b.push('brak `description` (meta-description puste w CMS)');
  if (!d.recipeCategory) b.push('brak `recipeCategory` (typ dania puste w CMS)');
  if (!d.recipeCuisine) b.push('brak `recipeCuisine` (kuchnia pusta w CMS)');
  /* `dateModified` jest OPCJONALNE — pusty stan jest poprawny i wprost zalecany
     przez komentarz przy `datePublished` wyżej: „brak zalecanego pola kosztuje
     mniej niż data zmyślona". W opisie Recipe u Google to pole nie występuje
     w ogóle, a do 2026-08-27 bramka mimo to wymagała go bezwarunkowo — czyli
     zabraniała stanu, który ten sam plik dwie linijki wyżej uznaje za właściwy.
     Sprawdzamy więc KSZTAŁT, gdy pole jest, a nie samą jego obecność. Kontrola
     ujemna „dateModified z godziną zamiast daty" mierzy dokładnie to i zostaje
     w mocy; kontroli na brak pola nigdy nie było. */
  if (d.dateModified !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(d.dateModified)) {
    b.push(`dateModified nie jest datą ISO: ${d.dateModified}`);
  }

  /* Autor: albo referencja do jedynego wezla organizacji, albo nazwany wezel
     z typem ze slownika. Ksztalt sprzed D-84.1 - anonimowa `Organization`
     z nazwa i URL-em - jest tu bledem, bo to trzeci wezel obok tego z glowy. */
  const orgRef = JSON.stringify({ '@id': ORGANIZACJA });
  const a = d.author;
  if (!a) b.push('brak `author`');
  else if (JSON.stringify(a) !== orgRef && !(a['@type'] && a.name)) {
    b.push(`author ma zły kształt: ${JSON.stringify(a)}`);
  } else if (a.name && a.url) {
    b.push('author niesie `url` zamiast `@id` — to osobny, anonimowy węzeł Organization');
  }
  if (JSON.stringify(d.publisher) !== orgRef) {
    b.push(`publisher musi być referencją ${orgRef}, jest ${JSON.stringify(d.publisher)}`);
  }

  /* datePublished jest OPCJONALNE — puste pole `opublikowano` to poprawny stan.
     Gdy jest, musi być datą i musi poprzedzać modyfikację; odwrotna kolejność
     jest widoczna dla czytelnika i podważa oba stemple naraz. */
  if (d.datePublished !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.datePublished)) {
      b.push(`datePublished nie jest datą ISO: ${d.datePublished}`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(d.dateModified || '') && d.datePublished > d.dateModified) {
      b.push(`datePublished (${d.datePublished}) jest PÓŹNIEJSZE niż dateModified (${d.dateModified})`);
    }
  }
  if (!d.recipeIngredient.length) b.push('zero składników');
  if (!d.recipeInstructions.length) b.push('zero kroków');
  d.recipeInstructions.forEach((s, i) => {
    if (!s.text) b.push(`krok ${i + 1} bez tekstu`);
    if (s.url !== `${kanon}#krok-${i + 1}`) b.push(`krok ${i + 1}: zła kotwica ${s.url}`);
  });

  /* KONTROLA ODWROTNA. Blok, który się zapisze i sparsuje, nadal może zgubić
     połowę kroków. Rozstrzyga wyłącznie rozebranie go z powrotem. */
  if (!tekst.startsWith('<script type="application/ld+json">')) b.push('blok nie zaczyna się znacznikiem script');
  if (!tekst.endsWith('</script>')) b.push('blok nie kończy się </script>');
  let wrocilo;
  try {
    wrocilo = JSON.parse(tekst.slice(tekst.indexOf('>') + 1, tekst.lastIndexOf('<')));
  } catch (e) {
    b.push(`wnętrze bloku nie parsuje się: ${e.message}`);
    return b;
  }
  if (JSON.stringify(wrocilo) !== JSON.stringify(d)) b.push('po rozebraniu blok różni się od dokumentu');
  return b;
}

/* --- uruchomienie jako skrypt ------------------------------------------- */
if (process.argv[1] && process.argv[1].endsWith('generuj-jsonld.mjs')) {
  if (!fs.existsSync(LUSTRO)) throw new Error(`brak ${LUSTRO} — lustro pól CMS jest wejściem, nie opcją`);
  const lustro = JSON.parse(fs.readFileSync(LUSTRO, 'utf8'));
  fs.mkdirSync(WYJSCIE, { recursive: true });

  const zr = zrodla();
  if (!zr.length) throw new Error('zero plików źródłowych');

  const wiersze = [];
  const rozjazdy = { pozycji: 0, plikow: new Set() };

  for (const z of zr) {
    /* Brak `item:` NIE jest usterką — `zrodlo.mjs` opisuje go jako stan dozwolony
       („źródło bez `item` przechodzi walidację, ale NIE idzie do CMS-u, bo nie ma
       dokąd"), a `generuj-html.mjs` i `porownaj.mjs` takie pliki po prostu pomijają.
       Ten generator jako jedyny rzucał tu wyjątkiem i przez to wywracał CAŁY przebieg
       na jednym przepisie wycofanym z publikacji `[V 2026-08-27]`: dwa wykluczone
       źródła (pierogi, rosół z makaronem) zatrzymywały blok Recipe dla pozostałych 34.
       Pomijamy GŁOŚNO, bo cicho pominięty przepis wygląda jak wygenerowany. */
    if (!z.item) { console.log(`· ${z.slug}  bez „item:" — pomijam, nie ma dla kogo składać bloku`); continue; }
    const d = dokument(z, lustro);
    const tekst = blok(d);

    /* Nazwa pliku idzie za slugiem Z CMS, bo to on jest adresem strony. */
    const cms = lustro[z.item];
    if (cms.slug !== z.slug) {
      throw new Error(`${z.slug}: slug w CMS to „${cms.slug}" — uruchom przyjmij-slugi-z-cms.mjs`);
    }

    const bledy = kontrole(cms.slug, d, tekst);
    if (bledy.length) throw new Error(`${cms.slug}:\n  ` + bledy.join('\n  '));

    fs.writeFileSync(path.join(WYJSCIE, `${cms.slug}.json`),
      JSON.stringify({ [POLE]: tekst }, null, 1) + '\n');

    /* Odniesienie do żniw `mpJsonLd 1.2.0` — informacyjne, repo prowadzi. */
    const ref = path.join(ODNIESIENIE, `${cms.slug}.json`);
    if (fs.existsSync(ref)) {
      const r = JSON.parse(fs.readFileSync(ref, 'utf8'));
      let n = 0;
      for (const k of Object.keys(d)) {
        if (JSON.stringify(d[k]) !== JSON.stringify(r[k])) n++;
      }
      if (n) { rozjazdy.pozycji += n; rozjazdy.plikow.add(cms.slug); }
    }

    wiersze.push({ slug: cms.slug, item: z.item, dl: tekst.length,
      skl: d.recipeIngredient.length, krok: d.recipeInstructions.length });
  }

  const p = (s, n) => String(s).padStart(n);
  console.log(`${'slug'.padEnd(58)} ${p('znaków', 7)}   pozycji`);
  for (const w of wiersze) {
    console.log(`${w.slug.padEnd(58)} ${p(w.dl, 7)}   ${w.skl} skł. / ${w.krok} kroków`);
  }
  const max = Math.max(...wiersze.map((w) => w.dl));
  console.log(`\nplików ${wiersze.length} · największy blok ${max} znaków`);
  console.log(`bramki (mikroskładnia, znaki niezmierzone, wymagane pola, kotwice, kontrola odwrotna): ` +
    `${wiersze.length}/${wiersze.length} czysto`);
  console.log(`\nROZJAZD Z ŻNIWAMI mpJsonLd 1.2.0 (2026-08-21) — informacyjnie, repo prowadzi:`);
  console.log(`  różniących się kluczy ${rozjazdy.pozycji} w ${rozjazdy.plikow.size}/${wiersze.length} przepisach`);

  /* KONTROLA UJEMNA. Wszystko powyżej przeszłoby także wtedy, gdyby `kontrole`
     zwracało pustą tablicę zawsze. Pięć uszkodzeń, każde innej klasy — w tym
     dwa, które realnie przeszły dziś niezauważone. */
  const wzor = dokument(zr[0], lustro);
  const slug0 = lustro[zr[0].item].slug;
  const uszkodzenia = [
    ['nierozwiązana odmiana w składniku', (d) => { d.recipeIngredient[0] = '2 {mały por|małe pory|małych porów|małego pora}'; }],
    ['cudzysłów prosty w treści kroku', (d) => { d.recipeInstructions[0].text = 'dodaj "sos" na koniec'; }],
    ['zła kotwica kroku', (d) => { d.recipeInstructions[0].url = `${ORIGIN}/przepisy/inny#krok-1`; }],
    ['brak image (wymagane przez Google)', (d) => { d.image = []; }],
    ['dateModified z godziną zamiast daty', (d) => { d.dateModified = '2026-08-19T12:00:00.000Z'; }],
    ['author jako anonimowa Organization (kształt sprzed D-84.1)',
      (d) => { d.author = { '@type': 'Organization', name: 'Mięsna Paczka', url: ORIGIN }; }],
    ['publisher rozspięty z węzłem organizacji',
      (d) => { d.publisher = { '@type': 'Organization', name: 'Mięsna Paczka', url: ORIGIN }; }],
    ['datePublished późniejsze niż dateModified',
      (d) => { d.datePublished = '2026-12-31'; }],
    ['datePublished z godziną zamiast daty',
      (d) => { d.datePublished = '2023-02-07T07:33:00.000Z'; }]
  ];
  for (const [opis, psuj] of uszkodzenia) {
    const kopia = JSON.parse(JSON.stringify(wzor));
    psuj(kopia);
    if (!kontrole(slug0, kopia, blok(kopia)).length) {
      throw new Error(`kontrola ujemna: „${opis}" NIE zostało złapane — bramka nic nie mierzy`);
    }
  }
  /* `autorZ` rzuca, wiec `kontrole` go nie zobaczy - ma wlasna pare kontroli.
     Sama kontrola ujemna nie wystarczy: gdyby `autorZ` rzucalo ZAWSZE, przeszlaby
     tak samo, a lancuch nie zbudowalby ani jednego przepisu. */
  const slownikTest = JSON.parse(fs.readFileSync(SLOWNIK_AUTOROW, 'utf8'));

  /* Kontrola pyta o KONTRAKT, nie o konkretny wpis slownika. Wersja wpisujaca
     oczekiwany wynik na sztywno spadala przy KAZDEJ edycji `autorzy.json` -
     czyli w stanie, ktory jest poprawny - a nie spadala, gdy mapowanie sie
     psuje niezaleznie od slownika. Kontrola, ktora swieci na czerwono przy
     normalnej pracy, zostaje predzej czy pozniej "naprawiona" na zawsze zielona. */
  const bledyAutora = [];
  for (const wejscie of slownikTest._redakcja) {
    const w = JSON.stringify(autorZ(wejscie, slownikTest));
    if (w !== JSON.stringify({ '@id': ORGANIZACJA })) {
      bledyAutora.push(`redakcja „${wejscie}" dała ${w} zamiast referencji organizacji`);
    }
  }
  for (const [nazwa, wpis] of Object.entries(slownikTest.autorzy)) {
    const w = autorZ(nazwa, slownikTest);
    if (w['@type'] !== wpis.typ) bledyAutora.push(`„${nazwa}": @type ${w['@type']} ≠ ${wpis.typ}`);
    if (w.name !== nazwa) bledyAutora.push(`„${nazwa}": name ${w.name} ≠ klucz słownika`);
    if ((w.sameAs ?? null) !== (wpis.sameAs ?? null)) {
      bledyAutora.push(`„${nazwa}": sameAs ${w.sameAs} ≠ ${wpis.sameAs}`);
    }
    const nadmiar = Object.keys(w).filter((k) => !['@type', 'name', 'sameAs'].includes(k));
    if (nadmiar.length) bledyAutora.push(`„${nazwa}": klucze spoza kontraktu ${nadmiar}`);
  }
  if (bledyAutora.length) throw new Error('kontrola dodatnia autora:\n  ' + bledyAutora.join('\n  '));

  let rzucilo = false;
  try { autorZ('ktoś spoza słownika', slownikTest); } catch { rzucilo = true; }
  if (!rzucilo) throw new Error('kontrola ujemna autora: nieznany autor NIE zatrzymał łańcucha');

  /* Kontrola ujemna SAMEJ kontroli: podstawiony slownik z zepsutym mapowaniem
     musi ja przewrocic. Bez tego caly blok wyzej przechodzilby takze wtedy,
     gdyby `autorZ` zwracalo wpis slownika w calosci, bez zadnej translacji. */
  const zepsuty = { _redakcja: ['X'], autorzy: { 'Y': { typ: 'Person' } } };
  if (JSON.stringify(autorZ('X', zepsuty)) === JSON.stringify(autorZ('Y', zepsuty))) {
    throw new Error('kontrola ujemna kontroli autora: redakcja i autor dały ten sam węzeł');
  }
  console.log(`kontrola autora: ${slownikTest._redakcja.length} redakcyjnych + ` +
    `${Object.keys(slownikTest.autorzy).length} ze słownika + 2 ujemne — czysto`);

  /* Kontrola ujemna kontroli odwrotnej: blok rozjechany z dokumentem. */
  const kopia = JSON.parse(JSON.stringify(wzor));
  const podmieniony = blok(kopia).replace('"@type":"Recipe"', '"@type":"Thing"');
  if (!kontrole(slug0, kopia, podmieniony).some((x) => x.includes('różni się od dokumentu'))) {
    throw new Error('kontrola ujemna: podmiana treści bloku NIE została złapana');
  }
  console.log(`kontrola ujemna: ${uszkodzenia.length + 1}/${uszkodzenia.length + 1} uszkodzeń złapanych`);
}
