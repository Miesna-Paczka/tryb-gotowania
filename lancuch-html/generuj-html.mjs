/* generuj-html.mjs — jedno uruchomienie, trzy wyjścia z jednego źródła.
 *
 *     przepisy/<slug>.txt            ← ŹRÓDŁO, jedyne miejsce do pisania
 *           │
 *           ├─→ 5 × pole `*-html`            → CMS (Webflow renderuje statycznie)
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
import { KATALOG_DANYCH, BAZA_PAGES, zrodla } from './wspolne.mjs';
import { kontrolujZrodlo, kontrolujWynik } from './kontrole.mjs';

const P = parser();

/* Pole źródłowe → pole `*-html`. Nazwy pól `*-html` NIE są mechaniczną pochodną
   nazw źródeł (`wskazowka` → `wskazowki-html`, `co-mozesz-zmienic` →
   `zamienniki-html`), więc tabela musi być jawna. Zgadywanie po wzorcu
   trafiłoby w trzy z pięciu.

   BYŁO SIEDEM. `wartosci-100-html` i `wartosci-porcja-html` zniknęły 2026-08-24,
   bo NIE MIAŁY ODBIORCY — zmierzone na opublikowanej produkcji: tabelę odżywczą
   składa embed `mpOdzywczeEmbed 2.1.0` z atrybutów `data-mp-odz-zrodlo-100`
   i `-porcja`, czyli wprost z mikroskładni `wartosci-odzywcze` / `wartosci-porcja`.
   Pola RichText nie renderowały się nigdzie. Szczegóły: rejestr w repozytorium zamkniętym, przebieg 63. */
export const POLA_HTML = {
  skladniki: 'skladniki-html',
  kroki: 'kroki-html',
  wskazowka: 'wskazowki-html',
  'co-mozesz-zmienic': 'zamienniki-html',
  przechowywanie: 'przechowywanie-html'
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

/* `opcje.czasZMinutnika` — DOMYŚLNIE WŁĄCZONE od 2026-08-25, decyzja operatora.

   Do tej daty było odwrotnie: krok z `minutnik:` nie pokazywał na stronie czasu
   wcale. Zmierzone wtedy na całym korpusie: 98 kroków z `minutnik:` bez własnego
   `czas:`, z czego 89 nie niosło długości również w prozie — czytelnik nie widział
   jej NIGDZIE, akurat przy krokach najdłuższych (duszenie gołąbków 75 min
   renderowało się jako samo „duś na małym ogniu") `[V 2026-08-25]`.

   ROZRÓŻNIENIE, KTÓRE TO PORZĄDKUJE — i którego wcześniejszy zapis nie robił:
   `D-57.4` zabrania prozie wołać MINUTNIK JAKO URZĄDZENIE („po sygnale",
   „odpal minutnik"), bo tego urządzenia szablon statyczny nie ma. Nie zabrania
   podania DŁUGOŚCI kroku — długość jest faktem o gotowaniu, nie o interfejsie,
   i czytelnik strony potrzebuje jej tak samo jak czytelnik trybu. Te dwie rzeczy
   były tu zrośnięte i to zrośnięcie kosztowało 89 kroków bez czasu.

   Wyłączenie: `--bez-czasu-z-minutnika` (albo `{ czasZMinutnika: false }`).
   Odwraca renderowanie do stanu sprzed 2026-08-25. */
/* `id="krok-N"` NIE jest ozdoba: `HowToStep.url` w bloku JSON-LD celuje w te
   kotwice (`…/przepisy/<slug>#krok-3`), a `url` jest u Google wlasciwoscia
   ZALECANA, wiec zdjecie jej kosztuje wiecej niz dodanie kotwicy. Do 2026-08-25
   blok obiecywal adresy, ktorych dokument nie mial: 0 kotwic na 159 krokow.
   Numeracja idzie od 1 i musi zgadzac sie z ta z `generuj-jsonld.mjs` - obie
   licza z tego samego modelu `parsujKroki`, wiec zgadzaja sie z konstrukcji,
   a `zbuduj` sprawdza to jeszcze raz na gotowym HTML-u. */
/* JEDNOSTKA ZMIENIA SIĘ NA GODZINIE, bo powyżej niej nikt nie liczy w minutach.
   Zmierzone na korpusie 2026-08-27: wszystkie trzy ręcznie pisane `czas:` dłuższe
   niż godzina używają godzin („4–12 h", „min. 1 h", „min. 2 h"), a najdłuższy
   ręczny zapis w minutach to 15 min — powyżej kwadransa minut nie napisał nikt
   ani razu. Proza tak samo: „2 godzin" ×32, „półtorej godziny" ×7.
   Do tej daty generator łamał tę konwencję i renderował „(ok. 240 min)". Na
   żeberkach dawało to dwie konwencje w jednej liście kroków: ręczne „(min. 2 h)"
   w kroku 2 obok wygenerowanego „(ok. 90 min)" w kroku 3.
   Jednostka `h`, nie „godz.", bo `h` niosą wszystkie trzy ręczne plakietki w tym
   samym slocie; „godz." żyje w prozie i tam zostaje. */
const formatujMinuty = (sek) => {
  const min = sek % 60 === 0 ? sek / 60 : Math.round(sek / 60);
  if (min < 60) return `ok. ${min} min`;
  const godziny = Math.floor(min / 60);
  const reszta = min % 60;
  return reszta === 0 ? `ok. ${godziny} h` : `ok. ${godziny} h ${reszta} min`;
};

function krokiHtml(model, opcje = {}) {
  const li = model.map((k, i) => {
    let s = `<strong>${wyroznienia(k.tytul)}</strong>`;
    let czas = k.czas && k.czas !== CZAS_PUSTY ? k.czas : null;
    if (!czas && opcje.czasZMinutnika !== false && k.minutnik) czas = formatujMinuty(k.minutnik.sekundy);
    if (czas) s += ` <em>(${wyroznienia(czas)})</em>`;
    s += `<br>${wyroznienia(k.tekst)}`;
    if (k.kryterium) s += `<br><em>Gotowe, gdy: ${wyroznienia(k.kryterium)}</em>`;
    return `<li id="krok-${i + 1}">${s}</li>`;
  });
  return `<ol role="list">${li.join('')}</ol>`;
}

/* PRZESŁANKA REGUŁY `D-57.4` z `kontrole.mjs`, sprawdzana, a nie zakładana.
   Tamta reguła zabrania prozie wołać MINUTNIK JAKO URZĄDZENIE. Jej jedynym
   uzasadnieniem jest to, że strona statyczna tego urządzenia nie ma — żadnego
   kafelka, żadnego odliczania, żadnego sygnału. To zdanie o TYM pliku, więc
   mierzymy je tutaj, inaczej reguła byłaby zdaniem o czyimś słowniku.

   POPRAWIONE 2026-08-25: do tej daty asercja mierzyła coś innego, niż głosiła.
   Sprawdzała `/<em>\(/`, czyli „krok nie pokazuje ŻADNEGO czasu", i nazywała to
   „strona nie ma minutnika". To zlepiało dwie różne rzeczy — brak urządzenia
   z brakiem długości kroku — i przez to blokowało włączenie `czasZMinutnika`
   asercją, która wtedy padała bez żadnej szkody w produkcie. Teraz mierzy
   URZĄDZENIE: markup kafelka i słownictwo odliczania. Gdy strona statyczna
   kiedyś minutnik dostanie, ta asercja pada i każe wrócić do `SLOWNIK_TRYBU`
   w `kontrole.mjs`, zamiast zostawiać redakcję z zakazem bez powodu. */
(function sprawdzBrakMinutnika() {
  const parsuj = (txt) => {
    P._wewnetrzne.wyczyscBledy();
    const k = P._wewnetrzne.parsujKroki(txt, []);
    P._wewnetrzne.wyczyscBledy();
    return k;
  };
  /* DWIE KONTROLE DODATNIE. Bez nich asercja niżej przechodziłaby także wtedy,
     gdyby `krokiHtml` zwracał pustkę — a wtedy jej zieleń nic by nie znaczyła. */
  const zCzasem = krokiHtml(parsuj('== próba\nczas: 5 min\ntreść kroku'));
  if (!/<em>\(5 min\)<\/em>/.test(zCzasem)) {
    throw new Error('generuj-html.mjs: krok z „czas:" przestał renderować czas — przyrząd tej ' +
      'asercji nie działa, więc jej wynik o minutniku nic nie znaczy.');
  }
  const html = krokiHtml(parsuj('== próba\nminutnik: 5:00 próba\ntreść kroku'));
  if (!/<em>\(ok\. 5 min\)<\/em>/.test(html)) {
    throw new Error('generuj-html.mjs: krok z „minutnik:" przestał renderować długość ' +
      '(dostałem ' + JSON.stringify(html) + '). Decyzja operatora z 2026-08-25 mówi, że ma ją ' +
      'renderować — sprawdź `czasZMinutnika`, zanim to zostawisz.');
  }
  /* KONTROLA DODATNIA GAŁĘZI GODZINOWEJ. Bez niej zmiana progu albo powrót do
     samych minut przeszedłby niezauważony: asercja wyżej pyta o 5 min i świeciłaby
     na zielono także wtedy, gdyby „(ok. 240 min)" wróciło. */
  const dlugi = krokiHtml(parsuj('== próba\nminutnik: 90:00 próba\ntreść kroku'));
  if (!/<em>\(ok\. 1 h 30 min\)<\/em>/.test(dlugi)) {
    throw new Error('generuj-html.mjs: krok dłuższy niż godzina przestał renderować się ' +
      'w godzinach (dostałem ' + JSON.stringify(dlugi) + '). Powyżej godziny korpus liczy ' +
      'w godzinach — patrz komentarz przy `formatujMinuty`.');
  }
  /* WŁAŚCIWA ASERCJA: długość — tak, urządzenie — nie. */
  if (/minutnik|data-mp-minutnik|po sygnale|odliczani|odliczeni|<button/i.test(html)) {
    throw new Error('generuj-html.mjs: krok z „minutnik:" renderuje teraz ' +
      JSON.stringify(html) + ', czyli samo URZĄDZENIE, nie tylko jego długość. Przesłanka ' +
      'reguły D-57.4 („strona statyczna nie ma minutnika") przestała być prawdziwa — wróć do ' +
      'SLOWNIK_TRYBU w kontrole.mjs, zanim to zostawisz.');
  }
})();


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

/* LISTA, NIE TABELA — i to nie jest wybór estetyczny.

   Webflow RichText nie zna `<table>`. Pole z tabelą jest wyświetlane i renderowane
   po zdjęciu znaczników, a komórki tabeli nie mają między sobą żadnego separatora,
   więc wszystko skleja się w jeden ciąg:

       „wartość odżywczaw 100 genergia693 kJ / 165 kcaltłuszcz6,7 g…"

   Zgłoszone na zrzucie z edytora CMS, odtworzone
   znak w znak z regeneracji.

   Najgorsze w tej usterce jest to, że decyzja BYŁA JUŻ PODJĘTA i zapisana —
   w helpText obu pól stoi wprost „Webflow nie renderuje tabel w RichText, więc
   to lista, nie tabela". Nie została tylko przeniesiona do kodu, który te pola
   produkuje. Ta sama klasa co `BAZA_PAGES`: fakt zapisany w jednym miejscu
   i nieaktualny w drugim. Dlatego niżej stoi kontrola, a nie sama poprawka. */
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
    'przechowywanie-html': kartyHtml(karty.przechowywanie)
  };

  /* Bramka na kontrakt z blokiem JSON-LD. Sprawdzana na GOTOWYM HTML-u, nie na
     modelu - inaczej mierzylaby wlasne zalozenie zamiast wyniku renderu. */
  const kotwice = (pola['kroki-html'].match(/ id="krok-\d+"/g) || []).length;
  if (kotwice !== kroki.length) {
    throw new Error(`kroki-html: kotwic ${kotwice}, kroków ${kroki.length} — ` +
      `HowToStep.url w JSON-LD wskaże adres, którego dokument nie ma`);
  }
  kroki.forEach((_, i) => {
    if (!pola['kroki-html'].includes(`id="krok-${i + 1}"`)) {
      throw new Error(`kroki-html: brak kotwicy id="krok-${i + 1}"`);
    }
  });

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
  const opcje = { czasZMinutnika: !argv.includes('--bez-czasu-z-minutnika') };

  const lista = zrodla().filter((z) => !tylko || z.slug === tylko);
  if (!lista.length) { console.error('brak plików w przepisy/ (albo --tylko nie trafiło)'); process.exit(2); }

  if (!sucho) fs.mkdirSync(KATALOG_DANYCH, { recursive: true });

  /* Poprzedni indeks czytamy PRZED pętlą, bo pętla go nadpisze. Wcześniej był
     czytany po niej i stąd brał się błąd opisany niżej przy sprzątaniu. */
  const poprzedni = wczytajIndeks();

  const indeks = {};
  let bledy = 0, ostrzezen = 0;

  for (const { slug, item, zrodlo } of lista) {
    const w = zbuduj(item, zrodlo, opcje);
    bledy += w.bledy.length; ostrzezen += w.ostrzezenia.length;

    /* Bez `item` nie ma ładunku: adres na Pages jest kluczowany identyfikatorem
       itemu, a ten jeszcze nie istnieje. Walidacja treści zadziała normalnie —
       przepis da się pisać i sprawdzać, zanim dostanie miejsce w kolekcji. */
    if (!item) {
      console.log(`· ${slug}  bez „item:" w [meta] — waliduję, ale nie buduję ładunku`);
      w.bledy.forEach((b) => console.log(`    BŁĄD: ${b}`));
      w.ostrzezenia.forEach((b) => console.log(`    uwaga: ${b}`));
      continue;
    }

    /* `poprzedni` to nazwa pliku, na który CMS może jeszcze wskazywać przez
       `parser-url`. Trzymamy ją W INDEKSIE, a nie wyprowadzamy z poprzedniej
       wersji indeksu przy sprzątaniu — bo indeks jest wtedy już nadpisany.
       Gdy ładunek się nie zmienił, przenosimy wpis dalej bez zmian; dzięki temu
       dwa uruchomienia z rzędu dają identyczne drzewo. */
    const byl = poprzedni[item];
    const wczesniejszy = byl && byl.plik !== w.ladunek.plik ? byl.plik : (byl && byl.poprzedni);
    indeks[item] = { slug, sha8: w.ladunek.hash, plik: w.ladunek.plik, url: w.ladunek.url };
    if (wczesniejszy) indeks[item].poprzedni = wczesniejszy;

    /* Ładunek z uszkodzonego źródła NIE trafia na dysk. Zapisany wjechałby na
       Pages przy najbliższym pushu i byłby serwowany — a cała ta konstrukcja
       istnieje po to, żeby uszkodzenie zatrzymać przed publikacją, nie po niej. */
    if (!sucho && !w.bledy.length) fs.writeFileSync(path.join(KATALOG_DANYCH, w.ladunek.plik), w.ladunek.tresc);

    const znak = w.bledy.length ? '✗' : (w.ostrzezenia.length ? '!' : '✓');
    console.log(`${znak} ${slug}  → ${w.ladunek.plik}`);
    w.bledy.forEach((b) => console.log(`    BŁĄD: ${b}`));
    w.ostrzezenia.forEach((b) => console.log(`    uwaga: ${b}`));
  }

  if (!sucho && !tylko && !bledy) {
    /* Sprzątanie ładunków po poprzednich wersjach. Zostaje BIEŻĄCY i JEDEN
       POPRZEDNI — nie dlatego, że tak ładniej, tylko dlatego, że między pushem
       a zapisem `parser-url` w CMS opublikowana strona wskazuje jeszcze na stary
       adres. Skasowanie go w tej samej chwili dałoby 404 na produkcji w oknie,
       którego długość zależy od tempa pracy. Starsze idą, bo po dwóch cyklach nikt
       już na nie nie wskazuje.

       Zbiór budujemy z pola `poprzedni` w NOWYM indeksie, nie z odczytu starego.
       Odczyt starego dawał zapas tylko przy PIERWSZYM uruchomieniu po zmianie:
       drugie widziało już nadpisany indeks, „poprzedni" równał się bieżącemu
       i zapas znikał. Bramka CI regeneruje z zacommitowanego stanu, czyli jest
       właśnie tym drugim uruchomieniem — więc mechanizm chroniący przed 404
       kasował się dokładnie tam, gdzie miał zadziałać. */
    const zachowaj = new Set(Object.values(indeks).flatMap((x) => [x.plik, x.poprzedni]).filter(Boolean));
    for (const f of fs.readdirSync(KATALOG_DANYCH)) {
      if (!/^[0-9a-f]{24}\.[0-9a-f]{8}\.json$/.test(f) || zachowaj.has(f)) continue;
      fs.unlinkSync(path.join(KATALOG_DANYCH, f));
      console.log(`− usunięty nieaktualny ładunek: ${f}`);
    }
    /* Klucze sortowane, żeby zawartość indeksu była funkcją danych, a nie
       kolejności czytania katalogu. Bez tego migracja nazw plików (itemId → slug)
       przestawiła 63 wiersze, nie zmieniając ani jednej wartości — czyli diff,
       który wygląda jak zmiana treści i uczy, żeby go nie czytać. */
    const posortowany = Object.fromEntries(Object.keys(indeks).sort().map((k) => [k, indeks[k]]));
    fs.writeFileSync(path.join(KATALOG_DANYCH, 'indeks.json'), JSON.stringify(posortowany, null, 1) + '\n');
  }

  console.log(`\n${lista.length} przepisów · błędów: ${bledy} · uwag: ${ostrzezen}` +
    (sucho ? ' · SUCHY BIEG, nic nie zapisano' : ''));
  if (!opcje.czasZMinutnika) console.log('UWAGA: --bez-czasu-z-minutnika cofa kroki do renderu sprzed 2026-08-25 (bez długości).');
  process.exit(bledy ? 1 : 0);
}

export function wczytajIndeks() {
  const p = path.join(KATALOG_DANYCH, 'indeks.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}

if (import.meta.url === `file://${process.argv[1]}`) main();
