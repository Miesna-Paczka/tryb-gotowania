/* generuj-html.mjs — jedno uruchomienie, trzy wyjścia z jednego źródła.
 *
 *     przepisy/<itemId>.txt          ← ŹRÓDŁO, jedyne miejsce do pisania
 *           │
 *           ├─→ 7 × pole `*-html`            → CMS (Webflow renderuje statycznie)
 *           ├─→ dane/<itemId>.<sha8>.json    → GitHub Pages (ładunek dla parsera)
 *           └─→ `parser-url`                 → CMS, pole pochodne
 *
 * Spójność trzech wyjść jest tu KONSTRUKCYJNA, nie dyscyplinarna: powstają
 * w jednym przebiegu z jednego odczytu pliku. Nie da się wypchnąć HTML-a bez
 * ładunku ani ładunku pod starym adresem.
 *
 * CZEGO TEN PLIK NIE ROBI I DLACZEGO. Nie parsuje mikroskładni. Całe rozbieranie
 * `skladniki`, `kroki` i pól kartowych robi `przepis-parser.js` przez most
 * `odmiana-node.mjs` — ten sam plik, który to samo robi w przeglądarce. Druga
 * implementacja gramatyki byłaby czwartą kopią wiedzy dzielonej i rozjechałaby
 * się dokładnie tam, gdzie nikt nie patrzy: przy znaczniku używanym raz na
 * dwadzieścia przepisów. Tutaj zostaje wyłącznie RENDER — decyzje o tym, jaki
 * znacznik HTML dostaje co.
 *
 * Użycie:
 *   node lancuch-html/generuj-html.mjs                # wszystkie przepisy → dane/
 *   node lancuch-html/generuj-html.mjs --tylko <id>
 *   node lancuch-html/generuj-html.mjs --sucho        # nic nie zapisuje, tylko raport
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parser } from '../odmiana-node.mjs';
import { wczytajPlik } from './zrodlo.mjs';
import { KATALOG_ZRODEL, KATALOG_DANYCH, BAZA_PAGES, idZrodel } from './wspolne.mjs';
import { kontrolujZrodlo, kontrolujWynik } from './kontrole.mjs';

const P = parser();

/* Pole źródłowe → pole `*-html`. Nazwy pól `*-html` NIE są mechaniczną pochodną
   nazw źródeł (`wskazowka` → `wskazowki-html`, `co-mozesz-zmienic` →
   `zamienniki-html`, `wartosci-odzywcze` → `wartosci-100-html`), więc tabela
   musi być jawna. Zgadywanie po wzorcu trafiłoby w cztery z siedmiu. */
export const POLA_HTML = {
  skladniki: 'skladniki-html',
  kroki: 'kroki-html',
  wskazowka: 'wskazowki-html',
  'co-mozesz-zmienic': 'zamienniki-html',
  przechowywanie: 'przechowywanie-html',
  'wartosci-odzywcze': 'wartosci-100-html',
  'wartosci-porcja': 'wartosci-porcja-html'
};

const ORIGIN_PROD = 'https://miesnapaczka.pl';

/* `parsujKroki` wstawia tę wartość w `czas`, gdy krok nie ma ANI `czas:`, ANI
   `minutnik:` — to sentinel modelu, nie tekst do pokazania czytelnikowi.
   Renderowanie go dałoby na stronie „(bez minutnika)" przy co czwartym kroku.
   Sprawdzamy go przy starcie zamiast ufać stałej: gdyby parser zmienił brzmienie,
   ten sentinel przestałby być rozpoznawany i wyciekłby do treści po cichu —
   czyli objaw, którego nikt by nie zgłosił, bo wygląda jak decyzja redakcji. */
const CZAS_PUSTY = 'bez minutnika';
(function sprawdzSentinel() {
  P._wewnetrzne.wyczyscBledy();
  const [k] = P._wewnetrzne.parsujKroki('== próba\ntreść kroku', []);
  P._wewnetrzne.wyczyscBledy();
  if (!k || k.czas !== CZAS_PUSTY) {
    throw new Error('generuj-html.mjs: parser nie wstawia już „' + CZAS_PUSTY + '" w krok bez czasu ' +
      '(dostałem ' + JSON.stringify(k && k.czas) + '). Sentinel się rozjechał — ustal nowy, ' +
      'zanim cokolwiek wygenerujesz, bo inaczej wycieknie do treści na stronie.');
  }
})();

/* DWIE UCIECZKI, BO DWA KONTEKSTY — i to nie jest pedanteria, tylko odtworzenie
   stanu zastanego. `escapeHtml` w parserze escapuje też `"` i `'`, bo jego wyjście
   bywa wstawiane w atrybut. Generator strony tego NIE robił i widać to w CMS
   `[V 2026-08-19]`: wskazówka wędliny niesie `znaczy „dopiekaj"` z gołym cudzysłowem
   prostym, nie `&quot;`. W treści elementu obie formy wyglądają dla czytelnika
   identycznie — więc gdyby nie porównanie znak w znak, rozjazd nie miałby objawu.
   W atrybucie różnica jest już realna, stąd `escAtrybut` przy `href`. */
const escTekst = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const escAtrybut = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* `**tekst**` → `<strong>` — jedyny element mikroskładni, który generator zamienia
   na znacznik HTML (świadomie, `D-39.62`). Escapowanie stoi PIERWSZE i to ono, a nie
   brak znaczników w wyniku, sprawia, że treść nie wstrzyknie HTML-u.

   ROZJAZD NAZWANY, NIE ZAMIECIONY: parser stosuje `wyroznienia()` do kroków, ale do
   odpowiedzi kafelkowych stosuje samo `escapeHtml` — więc `**` w polu kartowym da
   pogrubienie na stronie i gołe gwiazdki… nigdzie, bo tryb gotowania pokaże je jako
   tekst. Dziś to teoria: w 16 przepisach nie ma ani jednej gwiazdki poza `kroki`
   `[V 2026-08-19]`. `waliduj.mjs` ostrzega, gdy przestanie być teorią. */
const wyroznienia = (s) => escTekst(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

// ------------------------------------------------------------------ render

function skladnikiHtml(model) {
  const li = model.map((s) => {
    let tekst = wyroznienia(P.etykietaBazowa(s.tresc));
    if (s.produktSlug) {
      tekst += ` <a href="${ORIGIN_PROD}/produkty/${escAtrybut(s.produktSlug)}">— w Mięsnej Paczce</a>`;
    }
    return `<li>${tekst}</li>`;
  });
  return `<ul role="list">${li.join('')}</ul>`;
}

/* `opcje.czasZMinutnika` — patrz README §„Otwarte pozycje". Domyślnie WYŁĄCZONE,
   czyli zachowanie zastane: krok z `minutnik:` nie pokazuje czasu w HTML-u wcale
   (55 z 55 kroków z minutnikiem `[V 2026-08-19]`). Konsekwencja jest zła i jest
   nazwana — czytelnik nie widzi czasu akurat przy najdłuższych krokach, a przyszły
   `HowToStep` pójdzie bez `totalTime` — ale przełącznik jest decyzją operatora,
   nie generatora: jego włączenie zmienia treść 16 opublikowanych stron. */
function krokiHtml(model, opcje = {}) {
  const li = model.map((k) => {
    let s = `<strong>${wyroznienia(k.tytul)}</strong>`;
    let czas = k.czas && k.czas !== CZAS_PUSTY ? k.czas : null;
    if (!czas && opcje.czasZMinutnika && k.minutnik) czas = formatujMinuty(k.minutnik.sekundy);
    if (czas) s += ` <em>(${wyroznienia(czas)})</em>`;
    s += `<br>${wyroznienia(k.tekst)}`;
    if (k.kryterium) s += `<br><em>Gotowe, gdy: ${wyroznienia(k.kryterium)}</em>`;
    return `<li>${s}</li>`;
  });
  return `<ol role="list">${li.join('')}</ol>`;
}

const formatujMinuty = (sek) => sek % 60 === 0 ? `ok. ${sek / 60} min` : `ok. ${Math.round(sek / 60)} min`;

/* Pola kartowe. `krótko:` i `#klucz` są metadanymi dla trybu gotowania (skrót na
   markerze zamiennika), nie treścią strony — parser zdejmuje je z odpowiedzi
   i tu się nie renderują. Wieloliniowa odpowiedź składa się w JEDEN akapit,
   bo tak robi `parsujWpisyKartowe` (`akapity.join(' ')`); rozbijanie jej tutaj
   na `<p>` per wiersz dałoby stronę i tryb gotowania o różnej liczbie akapitów. */
function kartyHtml(wpisy) {
  return wpisy.map((w) => {
    let s = `<h3>${wyroznienia(w.pytanie)}</h3><p>${wyroznienia(w.odpowiedz)}</p>`;
    if (w.link && w.link.adres) {
      /* `[?]` NIEZMIERZONE — w 16 zastanych przepisach nie ma ani jednego linku
         w kafelku, więc tego kształtu nie potwierdza żaden bajt w CMS. Renderujemy
         go mimo to, bo parser tę składnię ZNA: cisza dałaby zniknięcie treści,
         które autor napisał i widzi w źródle. Gdy pierwszy taki kafelek powstanie,
         `porownaj.mjs` pokaże różnicę i wtedy kształt się rozstrzyga. */
      s += `<p><a href="${escAtrybut(w.link.adres)}">${escTekst(w.link.etykieta || w.link.adres)}</a></p>`;
    }
    return s;
  }).join('');
}

/* `wartosci-odzywcze` / `wartosci-porcja`: „klucz: wartość; klucz: wartość".
   Kolejność wierszy jest kolejnością z pola — jest to kolejność z etykiety
   produktu spożywczego i nie wolno jej sortować. */
export function parsujWartosci(txt) {
  return String(txt).split(';').map((p) => p.trim()).filter(Boolean).map((p) => {
    const i = p.indexOf(':');
    if (i < 0) return { klucz: p, wartosc: '', blad: `„${p}" nie ma dwukropka` };
    return { klucz: p.slice(0, i).trim(), wartosc: p.slice(i + 1).trim() };
  });
}

function wartosciHtml(txt, naglowekKolumny) {
  const wiersze = parsujWartosci(txt)
    .map((w) => `<tr><th scope="row">${escTekst(w.klucz)}</th><td>${escTekst(w.wartosc)}</td></tr>`).join('');
  return `<table><thead><tr><th scope="col">wartość odżywcza</th>` +
    `<th scope="col">${escTekst(naglowekKolumny)}</th></tr></thead><tbody>${wiersze}</tbody></table>`;
}

// ------------------------------------------------------------------ pochodne

/* Sześć pól, które w CMS wypełnia się dziś ręcznie, a są w całości wyliczalne.
   `liczba-produktow` NIE jest tutaj: liczy długość `produkty-w-przepisie`, czyli
   pola, którego plik źródłowy nie posiada i nie powinien. Sprawdza je
   `porownaj.mjs`, mając pod ręką item z CMS. */
const MAKRO = {
  'kcal-porcja': /(\d[\d\s]*)\s*kcal/i,
  'bialko-porcja': /(?:^|;)\s*białko\s*:\s*([\d.,]+)/i,
  'weglowodany-porcja': /(?:^|;)\s*węglowodany\s*:\s*([\d.,]+)/i,
  'tluszcz-porcja': /(?:^|;)\s*tłuszcz\s*:\s*([\d.,]+)/i
};

export function pochodne(zrodlo) {
  const w = zrodlo.pola['wartosci-porcja'];
  const out = {};
  for (const [pole, re] of Object.entries(MAKRO)) {
    const m = re.exec(w);
    out[pole] = m ? Math.round(Number(m[1].replace(/\s/g, '').replace(',', '.'))) : null;
  }
  return out;
}

// ------------------------------------------------------------------ ładunek

/* Ładunek dla parsera = DOKŁADNIE to, co dziś niesie kontrakt DOM z nagłówka
   `przepis-parser.js` (wyspy `text/plain` + atrybuty `#mp-tryb-gotowania`).
   1:1 świadomie: parser ma mieć jeden model niezależnie od tego, skąd wziął
   dane, więc ładunek nie wprowadza własnego kształtu, tylko przenosi tamten.
   Pola natywnie webflowe (zdjęcia, produkty) tu nie wchodzą — one zostają
   w Webflow i tam są wiązane. */
export function ladunek(itemId, zrodlo) {
  return {
    schemat: 1,
    item: itemId,
    slug: zrodlo.meta.slug,
    nazwa: zrodlo.meta.nazwa,
    'porcje-bazowe': zrodlo.meta['porcje-bazowe'],
    'liczba-porcji': zrodlo.meta['liczba-porcji'],
    'waga-porcji': zrodlo.meta['waga-porcji'],
    'czas-minuty': zrodlo.meta['czas-minuty'],
    skladniki: zrodlo.pola.skladniki,
    kroki: zrodlo.pola.kroki,
    'wartosci-porcja': zrodlo.pola['wartosci-porcja'],
    'wartosci-odzywcze': zrodlo.pola['wartosci-odzywcze'],
    wskazowka: zrodlo.pola.wskazowka,
    'co-mozesz-zmienic': zrodlo.pola['co-mozesz-zmienic'],
    przechowywanie: zrodlo.pola.przechowywanie
  };
}

/* Adres z HASHEM ZAWARTOŚCI. Dwa powody, oba o awariach:
   — adres niezmienny znosi problem cache'u (Pages podaje `max-age=600`);
   — zapomniany push daje 404 zamiast cichego serwowania starej wersji, czyli
     zamienia awarię niemą w głośną. To jest główne uzasadnienie fetcha.
   Hash liczymy z BAJTÓW SERWOWANEGO PLIKU, nie ze źródła — bo to plik jest tym,
   co przeglądarka dostaje, i to jego zmiana musi zmienić adres. */
export const serializujLadunek = (l) => JSON.stringify(l, null, 1) + '\n';
export const sha8 = (tekst) => crypto.createHash('sha256').update(tekst, 'utf8').digest('hex').slice(0, 8);
export const adresLadunku = (itemId, hash) => `${BAZA_PAGES}/dane/${itemId}.${hash}.json`;

// ------------------------------------------------------------------ przepis → wszystko

export function zbuduj(itemId, zrodlo, opcje = {}) {
  P._wewnetrzne.wyczyscBledy();

  const skl = P._wewnetrzne.parsujSkladniki(zrodlo.pola.skladniki);
  const kroki = P._wewnetrzne.parsujKroki(zrodlo.pola.kroki, skl.map((s) => s.key));
  const karty = {
    wskazowka: P.wpisyKartowe(zrodlo.pola.wskazowka, 'wskazowka'),
    'co-mozesz-zmienic': P.wpisyKartowe(zrodlo.pola['co-mozesz-zmienic'], 'co-mozesz-zmienic'),
    przechowywanie: P.wpisyKartowe(zrodlo.pola.przechowywanie, 'przechowywanie')
  };

  const pola = {
    'skladniki-html': skladnikiHtml(skl),
    'kroki-html': krokiHtml(kroki, opcje),
    'wskazowki-html': kartyHtml(karty.wskazowka),
    'zamienniki-html': kartyHtml(karty['co-mozesz-zmienic']),
    'przechowywanie-html': kartyHtml(karty.przechowywanie),
    'wartosci-100-html': wartosciHtml(zrodlo.pola['wartosci-odzywcze'], 'w 100 g'),
    'wartosci-porcja-html': wartosciHtml(zrodlo.pola['wartosci-porcja'],
      `w 1 porcji (${zrodlo.meta['waga-porcji']} g)`)
  };

  const tresc = serializujLadunek(ladunek(itemId, zrodlo));
  const hash = sha8(tresc);

  const zParsera = { bledy: P._wewnetrzne.bledyTeraz(), ostrzezenia: P._wewnetrzne.ostrzezeniaTeraz() };
  P._wewnetrzne.wyczyscBledy();

  const wynik = {
    itemId, zrodlo, model: { skladniki: skl, kroki, karty },
    pola, pochodne: pochodne(zrodlo),
    ladunek: { tresc, hash, plik: `${itemId}.${hash}.json`, url: adresLadunku(itemId, hash) }
  };

  const zZrodla = kontrolujZrodlo(zrodlo);
  const zWyniku = kontrolujWynik(zrodlo, wynik);
  wynik.bledy = [...zParsera.bledy, ...zZrodla.bledy, ...zWyniku.bledy];
  wynik.ostrzezenia = [...zParsera.ostrzezenia, ...zZrodla.ostrzezenia,
    ...ostrzezeniaWlasne(zrodlo, skl, karty)];
  return wynik;
}

/* Kontrole, których parser nie robi, bo dotyczą PLIKU, a nie mikroskładni. */
function ostrzezeniaWlasne(zrodlo, skl, karty) {
  const o = [];
  const bazowe = zrodlo.meta['porcje-bazowe'];
  const liczby = (zrodlo.meta['liczba-porcji'].match(/\d+/g) || []).map(Number);
  if (!liczby.includes(bazowe)) {
    o.push(`„liczba-porcji: ${zrodlo.meta['liczba-porcji']}" nie zawiera liczby bazowej ${bazowe} — ` +
      'jedno z dwóch jest nieaktualne, a skalowanie porcji liczy się z porcje-bazowe');
  }
  const kluczeKart = karty['co-mozesz-zmienic'].filter((w) => w.klucz).length;
  if (karty['co-mozesz-zmienic'].length && !kluczeKart) {
    o.push('żaden wpis w „co-mozesz-zmienic" nie ma #klucza — bez niego marker zamiennika ' +
      'nie pojawi się w żadnym kroku trybu gotowania');
  }
  if (!skl.length) o.push('pole „skladniki" nie dało ani jednego wiersza');
  return o;
}

// ------------------------------------------------------------------ CLI

function main() {
  const argv = process.argv.slice(2);
  const sucho = argv.includes('--sucho');
  const tylko = argv.includes('--tylko') ? argv[argv.indexOf('--tylko') + 1] : null;
  const opcje = { czasZMinutnika: argv.includes('--czas-z-minutnika') };

  const ids = idZrodel().filter((id) => !tylko || id === tylko);
  if (!ids.length) { console.error('brak plików w przepisy/ (albo --tylko nie trafiło)'); process.exit(2); }

  if (!sucho) fs.mkdirSync(KATALOG_DANYCH, { recursive: true });

  const indeks = {};
  let bledy = 0, ostrzezen = 0;

  for (const id of ids) {
    const zrodlo = wczytajPlik(path.join(KATALOG_ZRODEL, `${id}.txt`));
    const w = zbuduj(id, zrodlo, opcje);
    bledy += w.bledy.length; ostrzezen += w.ostrzezenia.length;

    indeks[id] = { slug: zrodlo.meta.slug, sha8: w.ladunek.hash, plik: w.ladunek.plik, url: w.ladunek.url };

    /* Ładunek z uszkodzonego źródła NIE trafia na dysk. Zapisany wjechałby na
       Pages przy najbliższym pushu i byłby serwowany — a cała ta konstrukcja
       istnieje po to, żeby uszkodzenie zatrzymać przed publikacją, nie po niej. */
    if (!sucho && !w.bledy.length) fs.writeFileSync(path.join(KATALOG_DANYCH, w.ladunek.plik), w.ladunek.tresc);

    const znak = w.bledy.length ? '✗' : (w.ostrzezenia.length ? '!' : '✓');
    console.log(`${znak} ${id}  ${zrodlo.meta.slug}  → ${w.ladunek.plik}`);
    w.bledy.forEach((b) => console.log(`    BŁĄD: ${b}`));
    w.ostrzezenia.forEach((b) => console.log(`    uwaga: ${b}`));
  }

  if (!sucho && !tylko && !bledy) {
    /* Sprzątanie ładunków po poprzednich wersjach. Zostaje BIEŻĄCY i JEDEN
       POPRZEDNI — nie dlatego, że tak ładniej, tylko dlatego, że między pushem
       a zapisem `parser-url` w CMS opublikowana strona wskazuje jeszcze na stary
       adres. Skasowanie go w tej samej chwili dałoby 404 na produkcji w oknie,
       którego długość zależy od operatora. Starsze idą, bo po dwóch cyklach nikt
       już na nie nie wskazuje. */
    const poprzedni = wczytajIndeks();
    const zachowaj = new Set(Object.values(indeks).map((x) => x.plik)
      .concat(Object.values(poprzedni).map((x) => x.plik)));
    for (const f of fs.readdirSync(KATALOG_DANYCH)) {
      if (!/^[0-9a-f]{24}\.[0-9a-f]{8}\.json$/.test(f) || zachowaj.has(f)) continue;
      fs.unlinkSync(path.join(KATALOG_DANYCH, f));
      console.log(`− usunięty nieaktualny ładunek: ${f}`);
    }
    fs.writeFileSync(path.join(KATALOG_DANYCH, 'indeks.json'), JSON.stringify(indeks, null, 1) + '\n');
  }

  console.log(`\n${ids.length} przepisów · błędów: ${bledy} · uwag: ${ostrzezen}` +
    (sucho ? ' · SUCHY BIEG, nic nie zapisano' : ''));
  if (opcje.czasZMinutnika) console.log('UWAGA: --czas-z-minutnika zmienia treść kroków wobec stanu w CMS.');
  process.exit(bledy ? 1 : 0);
}

export function wczytajIndeks() {
  const p = path.join(KATALOG_DANYCH, 'indeks.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}

if (import.meta.url === `file://${process.argv[1]}`) main();
