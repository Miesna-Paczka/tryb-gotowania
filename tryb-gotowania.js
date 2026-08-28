/* tryb-gotowania.js — warstwa WIDOKU trybu gotowania (overlay).
 *
 * Mięsna Paczka · para do `przepis-parser.js` (warstwa DANYCH).
 * Vanilla JS, bez zależności. ES2019+.
 *
 * PODZIAŁ NA DWA PLIKI JEST ŚWIADOMY I TYMCZASOWY. WYMAGANIA §4 mówi „jeden plik
 * runtime'u"; sam parser ma już 39 124 znaki przy celu < 40 000 i twardym limicie
 * 50 000, więc źródło obu warstw nie zmieści się w embedzie. Do embedu idzie BUILD
 * (konkatenacja + zdjęcie komentarzy), nie wklejone źródło — pozycja na liście
 * decyzji w STAN.md, do rozstrzygnięcia przed pakietem integracyjnym (poz. 10).
 *
 * Szkielet: trzy warstwy rodzeństwa wg GEOMETRIA.md §1 —
 *   TOP    pełna wysokość, przewijana, padding-top 88 i padding-bottom = |BOTTOM|
 *   belka  72 px, przypięta u góry, NAKŁADKA (nie odejmuje wysokości TOP)
 *   BOTTOM przypięty u dołu, wysokość z reguły składania §4.1 R6
 *
 * Kontrakt z warstwą danych:
 *   MP.tryb.otworz(widok, { krok: 1 })   // widok = MP.przepis.naPorcje(model, n)
 *   MP.tryb.pokazKrok(n)                 // 1..N
 *   MP.tryb.zamknij()
 *
 * Czas czytamy przez `MP.zegar.teraz()`, nigdy `Date.now()` wprost — inaczej
 * pomiar C10–C12 trwa tyle, co realne odliczanie (STAN, przebieg 3).
 */
(function (global) {
  'use strict';

  var ID = 'mp-tryb';

  /* U-4 / B24 · ZNAK MARKI ZDJĘTY Z BELKI 2026-08-23 — RAZEM ZE STAŁĄ `ZNAK`.
     Klatka `7574:12487` nie ma znaku byczka: belka to kreska postępu, jedna linia
     tekstu i przełącznik. Stała trzymała 1,7 kB inline'owanego SVG, więc zostaje
     usunięta, a nie osierocona — martwy literał w runtime jest długiem, którego
     nikt nigdy nie usunie, bo „może się przyda".
     MISTRZEM DALEJ JEST `znak-byczek.svg` w katalogu łańcucha, nietknięty; jeśli
     znak ma wrócić, wraca stamtąd. Rodowód, który tu stał (Figma `7283:10838`,
     pobrane przez `download_assets`, jedna ścieżka, `viewBox 0 0 50.8766 40`,
     `fill=currentColor`), jest zapisany w GEOMETRIA §1.1 i w historii gita —
     nie ginie razem z tą linią. */
  /* D-40.15 · ETYKIETA PASKA NIESIE TYLKO NAZWĘ TRYBU. Licznik kroku zszedł do
     pigułki przy tytule kroku (D-40.16), więc pasek przestał go dublować.
     **D-40.9 (prefiks + stan złączone `·`) WYCOFANE** — nie naprawione, tylko
     pozbawione przedmiotu: nie ma już czego doklejać, bo stan ekranu ma swoje
     miejsce w treści, a licznik swoje w pigułce. Stała `SEP` usunięta razem
     z jedynym zastosowaniem.
     Brzmienie jest jedno dla WSZYSTKICH czterech ekranów — pasek mówi, w jakim
     trybie jesteś, a nie co się na nim właśnie dzieje. */
  var ETYKIETA_TRYBU = 'tryb gotowania';
  var ID_STYL = 'mp-tryb-styl';

  /* ~~Substytuty Unicode~~ — ZDJĘTE w przebiegu 31 razem z B16. Runtime rysuje teraz
     PRAWDZIWE ligatury Material Symbols Outlined z subsetu wgranego do Webflow.
     Zbiór ligatur, których używa runtime, zostaje TABLICĄ (a nie znika), bo I4 pyta
     wprost o „ligatury używane przez runtime" — bez tego miejsca zbiór trzeba by
     odtwarzać z lektury widoków, a to jest dokładnie ten rodzaj wiedzy, który
     rozjeżdża się po cichu. `zbiorLigatur()` udostępnia go pomiarowi.

     B16 („brak glifu = błąd zgłoszony, nie własny fallback") naruszał wcześniej
     nie sam substytut, tylko **fallback `|| '·'`**: nazwa spoza subsetu dostawała
     kropkę i wyglądała jak ikona, której nie ma. Teraz nieznana nazwa idzie
     do `ostrzezenie()` i renderuje się PUSTO — bo słowo w miejscu ikony widać
     natychmiast, a kropka udaje sukces. */
  /* ZBIÓR JEST LISTĄ GLIFÓW, KTÓRYCH RUNTIME FAKTYCZNIE UŻYWA — nie katalogiem
     glifów dostępnych w subsecie. Każdy wpis musi mieć miejsce wykonania w kodzie.

     D-40.3 (2026-08-20) — `keyboard_arrow_up` USUNIĘTY: po przejściu wywoływacza
     listy na obrót (jak pigułka, I-36) runtime nie rysuje już tego glifu nigdzie.
     Zostawienie go czyniłoby ze zbioru katalog, a `I4` pytałby o obecność glifu
     w subsecie zamiast o zgodność zbioru z użyciem. 13 → 12.

     Historia wpisu, bo wprowadza w błąd: adnotacja D-39.32 mówiła „lista rośnie
     z 5 na 7" i zapowiadała przebazowanie asercji `B16`/`I4` z `szerLig.length === 5`.
     PRZEBAZOWANIA NIGDY NIE WYKONANO, a lista urosła dalej — do 13. Oba harnessy
     (`fixture.html`, `fixture-min.html`) nadal pytają o 5 i o zbiór pięcioelementowy. */
  var LIGATURY = ['hourglass', 'local_dining', 'leaderboard',
                'arrow_back', 'arrow_forward',
                'keyboard_arrow_down',
                'remove', 'add', 'close', 'refresh',
                'check_box', 'check_box_outline_blank'];

  /* Font ikon — trzy wagi subsetu, hosting **Webflow** (D-15.1, rozstrzygnięte
     pomiarem w przeb. 31: `FontFace.load()` z obcego originu przechodzi, więc CORS
     nie stoi na drodze i plik NIE musi jechać do GitHuba).
     Adresy są DANYMI, nie tekstem w arkuszu, żeby pakiet integracyjny i pomiar
     czytały jedno miejsce. `font-display: block`, nie `swap`: przy `swap`
     przeglądarka najpierw rysuje NAZWĘ LIGATURY krojem zastępczym, czyli słowo
     „hourglass" w pasku meta. Niewidoczna ikona przez 100 ms jest tańsza niż
     widoczne słowo. */
  var FONT_IKON_BAZA = 'https://cdn.prod.website-files.com/6983617613052dc9fe624303/';
  var FONT_IKON = [
    [300, '6a802bb795ffed595d0d4157_MaterialSymbolsOutlined-Light.woff2'],
    [400, '6a802bb76772924b821ab866_MaterialSymbolsOutlined-Regular.woff2'],
    [500, '6a802bb7e5ca52af75b2f846_MaterialSymbolsOutlined-Medium.woff2']
  ];

  /* Zamienniki tokenów designu, KROTKI TRZYELEMENTOWE: [nazwa, wartość, opis migracji].
     Wariant (3) rozstrzygnięcia „kształt builda": opis migracji
     jest DANYMI, nie komentarzem. Powód jest jeden i nie dotyczy estetyki — komentarz
     przeżywa tylko taki build, w którym ktoś pamiętał o fladze `--format comments`,
     a dane przeżywają każdy. Wiersz matrycy I7 pyta o `t[2]`, więc znacznik musi być
     tam, gdzie sięga pomiar, a nie tam, gdzie sięga lektura.

     Trzeci element to ALBO nazwa zmiennej Webflow, ALBO jawne uzasadnienie jej braku.
     Nazwy są ODCZYTANE ze zbioru zmiennych witryny 2026-08-15 [V] (33 kolory), nie
     przepisane z Figmy — to rozróżnienie kosztowało pozycję D-27.1: sekcja W wpisała
     tu kiedyś nazwę figmową (`primary-cta`) jak nazwę webflowową, a te dwie rzeczy
     mają w witrynie różne wartości. Nazwa bez odczytu jest zgadywaniem, które wygląda
     jak wiedza. Duplikowanie tej informacji w komentarzu obok jest zabronione:
     dwa zapisy tej samej rzeczy rozjeżdżają się cicho i asercja tego pilnuje. */
  var TOKENY = [
    ['--mp-beige-1', '#F1ECDF', 'beige-light-bg'],
    ['--mp-beige-2', '#C5B18A', 'beige-dark-bg'],
    ['--mp-beige-3', '#816D44', 'beige-dark'],
    ['--mp-bialy', '#FFFDFB', 'off-white-bg-100%'],
    ['--mp-atrament', '#3E2B22', 'primary-text'],
    ['--mp-akcent', '#C8461D', 'BRAK zmiennej: #C8461D nie ma w witrynie (loader, spec §17)'],
    /* `--mp-alarm` #CF411A ZDJĘTY 2026-08-28, decyzja operatora. Alarm minutnika
       bierze odtąd `--mp-cta` #E55529 — jedna barwa „działaj teraz" w produkcie.

       CO TO NAPRAWIA, policzone: na ekranie z minutnikiem w ostatniej minucie
       stały OBOK SIEBIE dwa pomarańcze — #CF411A (kropka, obrys pigułki) i
       #E55529 (wypełnienie „dalej"), jakieś 400 px od siebie w pionie. Miały
       znaczyć co innego, a nie różniły się niczym, co da się zobaczyć.

       I TO ROZEJŚCIE NIE BYŁO DECYZJĄ PROJEKTOWĄ. Do przebiegu 29 oba tokeny
       miały wartość #CF411A. Rozjechały się przy D-27.1, gdy CTA wzięło zmienną
       witryny, a alarm został przy figmowej — notatka obok mówiła wprost „te dwa
       tokeny miały do dziś identyczną wartość i rozjechały się właśnie teraz".
       Nikt nie zdecydował, że mają być dwa pomarańcze; one po prostu zostały.

       Zdjęcie idzie po linii samego D-27.1 („bierzemy kolor z witryny, nie
       z Figmy") — tamta decyzja przestawiła CTA i zostawiła alarm w pół drogi.
       `--mp-akcent` #C8461D (loader, spec §17) ZOSTAJE i nie jest tym samym:
       nie pojawia się na ekranie minutnika, więc nie należy do tego pomiaru.

       Cofnięcie: przywrócić wiersz `['--mp-alarm', '#CF411A', …]` i podmienić
       `var(--mp-cta)` na `var(--mp-alarm)` w regule obrysu pigułki, w kropce
       i w barwie odliczania stanów alarmowych. Trzy miejsca. */
    /* Dopisane w przebiegu 21 pod sekcję W (wykończenie powierzchni). Trzy uwagi:
       1. `--mp-bialy-pelny` to biel PEŁNA #FFFFFF — witryna ma ją jako `white-bg`
          i to NIE jest `off-white-bg-100%` (#FFFDFB, u nas `--mp-bialy`). Pas dolny
          (W01) jest rysowany bielą pełną, belka — złamaną. Zlanie ich skasowałoby
          różnicę, którą Figma rysuje świadomie.
       2. `--mp-zielen` = `secondary-text` #487622 — od 2026-08-23 NIE jest to już
          jedno użycie: kreska pasa dolnego, tor przełącznika w belce (D-40.5)
          oraz kreska/pasek postępu belki (D-40.12). Pierwotna nota: kreska
          nad pasem dolnym (W02). Figma nazywa ten styl `secondary-text (h1)`;
          w Webflow zmienna nazywa się bez nawiasu i to jej nazwa tu stoi.
       3. `--mp-cta` = `primary-cta` #E55529 — **D-27.1 ROZSTRZYGNIĘTE
          2026-08-15: bierzemy kolor z witryny, nie z Figmy.** Do przebiegu 29 stała tu
          figmowa #CF411A z opisem „BRAK zmiennej". Rozjazd był prawdziwy i nie zniknął:
          Figma dalej rysuje #CF411A, a witryna ma #E55529. Rozstrzygnięto go na korzyść
          witryny, bo embed żyje w witrynie i to jej zmienna jest oracle'em wdrożenia.
          ~~UWAGA na sąsiada: `--mp-alarm` ZOSTAJE przy #CF411A (I-19, kropka i obrys
          pigułki) — te dwa tokeny miały do dziś identyczną wartość i rozjechały się
          właśnie teraz. Zlanie ich po tej zmianie skasowałoby różnicę, której nikt
          nie zgłosił, a wyglądałoby na sprzątanie duplikatu.~~
          **ZLANE 2026-08-28, decyzją operatora — czyli różnicę JUŻ ZGŁOSZONO.**
          Ta ostrożność była słuszna w przebiegu 29 i przestała być słuszna, gdy
          ktoś na te dwa pomarańcze POPATRZYŁ naraz na jednym ekranie. Alarm bierze
          `--mp-cta`; `--mp-alarm` nie istnieje. Warunek, który tę notatkę
          unieważnił, jest w niej samej zapisany dosłownie: „różnica, której nikt
          nie zgłosił". Zgłoszona — nota wygasa. */
    ['--mp-bialy-pelny', '#FFFFFF', 'white-bg'],
    ['--mp-zielen', '#487622', 'secondary-text'],
    ['--mp-cta', '#E55529', 'primary-cta']
  ];

  /* Wymiary z GEOMETRIA.md §4.1 — liczby, nie „mniej więcej". Zmiana którejkolwiek
     jest zmianą wiersza matrycy, nie kosmetyką. */
  var W = {
    /* D-40.13 · BELKA SCHODZI Z 72 NA 64.
       Pytanie brzmiało: czy marginesy nad/pod przełącznikiem mają być identyczne
       jak nad/pod dolnym CTA. Zmierzone: CTA `dalej` ma 48 px i **16/16** w pasie
       80; przełącznik ma 32 px i **20/20** w belce 72. Regułą wspólną było już
       wyśrodkowanie — różniły się same liczby, bo pasy mają różną wysokość.
       Rozstrzygnięcie padło na LICZBACH: 16/16.
       `16 + 32 + 16 = 64`.

       **To jest zerwanie z Figmą na wysokości belki i trzeba je czytać jako takie.**
       `R4` i `B4` („belka 72, niezmienna na każdym ekranie i każdej szerokości")
       opierały się na pomiarze WSZYSTKICH klatek zestawu `7195:10893`, a nowa
       klatka `7574:12487` też ma 360×**72**. Zgłosiłem ten koszt przed zmianą;
       został potwierdzony. Wiersz `B4` idzie do WYCOFANIA, nie do naprawy.

       Konsekwencje policzone, nie zgadnięte:
       — `paddingTop` 88 → 80, bo `R1` mówi „belka + odstęp 16", a nie „88";
       — przełącznik: `(64 − 44)/2` = 10 (pudełko dotyku), tor `(64 − 32)/2` = 16;
       — etykieta: `(64 − 16)/2` = 24, czyli WYŚRODKOWANA. Klatka stawiała ją 3 px
         poniżej środka (D-40.7) i mirrorowałem to wiernie; skoro wysokość belki
         i tak przestała pochodzić z klatki, trzymanie tamtych 3 px byłoby
         przenoszeniem szczegółu z układu, którego już nie ma. Etykieta i tor
         przełącznika mają teraz WSPÓLNĄ oś: obie środkiem na 32 px.
         **D-40.7 zamknięte przez konsekwencję, nie przez rozstrzygnięcie.**
       Cofnięcie: `belka` 64→72, `paddingTop` 80→88, `etykietaGora` z powrotem na
       literał 31 (wartość z klatki). */
    belka: 64,        // R4, po D-40.13
    paddingTop: 80,   // R1 — 64 belki + 16 odstępu
    margines: 16,     // R1 — kolumna treści przy marginesie 16
    odstep: 16,       // R1 — gap przepływu TOP
    nawigacja: 80,    // §2.1
    celDotyku: 44,    // §2.1 / R13
    lukaCta: 12,      // §2.1 — 72 − (16 + 44)
    postepMin: 8,     // §1.1 — kikut na ekranie startowym, nie zero
    /* PRZEBUDOWA BELKI 2026-08-23 — klatka `7574:12487` (Figma, strona `Claude`).
       `W.torPostepu` (188), `W.belkaLukaZnak` (19) i `W.belkaLukaZamkniecie` (30)
       zniknęły RAZEM ZE SWOIM PRZEDMIOTEM: nie ma już bloku postępu wciśniętego
       między znak a `×`, więc nie ma czego rozstawiać. Tor idzie na całą szerokość
       belki i mierzy się z DOM-u, nie ze stałej — patrz `ustawPostep`. */
    /* D-40.14 · GRUBOŚĆ KRESKI = GRUBOŚĆ KRESKI PASA DOLNEGO, czyli 1 px.
       Zgłoszenie: „nie zgadza się jeszcze tylko grubość paska
       postępu". To domknięcie D-40.11/D-40.12: skoro kreska i pasek to JEDEN
       element, a kreska pasa dolnego (`.mp-tryb__nawigacja::before`) ma 1 px
       `--mp-zielen`, to belka musi mieć tyle samo — inaczej „2 w 1" jest prawdą
       o funkcji i nieprawdą o wyglądzie.
       Klatka `7574:12488` daje 3 px, ale klatka rysowała pasek NA GÓRZE i jako
       osobny byt od hairline'u; po D-40.11 tamta wysokość opisuje układ, którego
       nie ma. **Wypełnienie przy 1 px solid jest teraz IDENTYCZNE z kreską pasa
       dolnego** — dosłownie „border = progress bar" — a część niewypełniona to ta
       sama zieleń przy 50 %, czyli ledwie jaśniejszy wariant tej samej kreski.
       Cofnięcie: 1 → 3. */
    torWysokosc: 1,        // = 1 px kreski `.mp-tryb__nawigacja::before`
    /* Stała wysokości kreski (1 px) USUNIĘTA 2026-08-23 razem ze swoim przedmiotem: po
       D-40.11 kreską JEST tor postępu, więc osobnej kreski nie ma. */
    /* Etykieta wyśrodkowana pionowo — `(belka − etykietaWys) / 2`, liczone
       w regule, nie wpisane: przy zmianie `W.belka` idzie za nią samo. */
    etykietaWys: 24,       // interlinia Body Large — zob. D-40.17
    etykietaPrawa: 84,     // MARGINES 16 + przełącznik 52 + MARGINES 16 — zob. D-40.8
    /* D-40.8 ROZSTRZYGNIĘTE, dosłownie: „wysokość
       toggle'a powinna być zgodna 1:1 z wersją na /produkty. Szerokość jest już
       dyktowana przez sam tekst CTA, jedyna stała to szerokość marginesu
       tekst → granica toggle'a lewo-prawo. I tą stałą respektujmy."
       Czyli: GEOMETRIA KONTROLKI z `/produkty` 1:1, a w poziomie rządzi STAŁY
       MARGINES 16, nie szerokość przełącznika. Klatka `7574:12491` (44×26) zostaje
       źródłem WYŁĄCZNIE dla stanu ON — kolorów — bo opublikowany CSS go nie ma. */
    przelacznikSzer: 52,   // `.toggle` z /produkty
    przelacznikWys: 32,    // `.toggle` — wysokość 1:1, wprost z rozstrzygnięcia
    galka: 16,             // `.toggle__eye` 16×16
    galkaLuka: 4,          // `.toggle` `padding-right: 4`
    galkaLukaLewa: 8,      // `.toggle` `padding-left: 8` — bez wpływu przy ON, ale 1:1
    /* kafle `stos` — R7/R8, §2.2 */
    pigulka: 40,      // pigułka zwinięta; stan jej nie zmienia (§3.5)
    pigulkaKrotka: 126, // 16 + 34 (wiersz) + 12 + 48 (primary) + 16
    pigulkaBaza: 198, // pigułka pełna = 198 + wysokość podpowiedzi (236 przy 38, 255 przy 57)
    wiersz: 34,       // wiersz pigułki (§2.3)
    przycisk: 48,     // primary i ghost
    kafelOdstep: 8,   // R6 — odstęp między kaflami w `stos`
    stosDol: 12,      // R6 — dopełnienie pod ostatnim kaflem
    wnetrze: 16,      // R8 — padding pigułki
    blok: 12,         // R8 — odstęp między blokami wewnątrz pigułki
    kropkaMala: 8,    // R11 — > 60 s
    kropkaDuza: 12,   // R11 — ≤ 60 s oraz 0:00
    kropkaLuka: 12,   // §2.3 — nazwa 12 px za krawędzią kropki (x=20 przy 8, x=24 przy 12)
    szewron: 16,      // §2.3 — glif 16×22
    szewronLuka: 12,  // R9 — czas kończy się 28 px przed krawędzią treści: 12 + 16
    /* tooltip zamiennika — R12 / §3.14 */
    tooltipX: 32,       // lico kolumny składników: 16 marginesu + 16 wsunięcia (§3.14 poz. 1)
    tooltipPoziomo: 14, // padding poziomy; 296 − 2×14 = 268 ✓
    tooltipPionowo: 12, // padding pionowy; 12+19+8+38+12 = 89 ✓
    tooltipOdstep: 8,   // odstęp głowa → wyjaśnienie
    tooltipKotwica: 8,  // kotwica: 8 px pod wierszem (§3.14 poz. 2)
    tooltipGlif: 16,    // `×` 16×19 — cel dotyku 44 dopychany niewidocznie (G9)
    tooltipRadius: 12,  // I-24
    /* dialog modalny S2/S4 — §3b.1 */
    dialogPadding: 24,  // §3b.1
    dialogOdstep: 12,   // §3b.1 — odstęp między blokami
    dialogMargines: 16, // dialog 328 przy x=16 w ramce 360 = kolumna treści
    scrimKrycie: 45,    // I-07 — `#3E2B22` @ 45 %
    limitMinutnikow: 2, // I-18 / D11 — trzeci minutnik otwiera dialog S4
    /* wiersz minutnika W DIALOGU S4 — §3b.1, 280×44; inne pudełko niż wiersz
       pigułki (34 px), bo tu wiersz jest celem dotyku, a nie pozycją listy. */
    dialogWiersz: 44,      // §3b.1
    dialogWierszPad: 16,   // nazwa x=16; „zakończ" 218+46+16 = 280 ✓
    dialogWierszLuka: 16,  // czas prawo-równany do x=202, czyli 16 px przed „zakończ"
    /* baner offline S3 — §3b.2; kafel `stos` na równi z pigułką (R7) */
    banerWiersz: 20,    // row 296×20
    banerGlif: 20,      // Frame „refresh" 20×20
    banerLuka: 8        // tekst „sprawdź ponownie" x=28 → 20 + 8
  };

  var CSS =
    '#' + ID + '{position:fixed;inset:0;z-index:2147483000;display:none;' +
      'font-family:"DM Sans",system-ui,sans-serif;color:var(--mp-atrament);' +
      'background:var(--mp-bialy)}' +
    /* NIENARYSOWANE (G12): wejście i wyjście overlaya są PRZEŁĄCZENIEM, bez
       `transition` i bez easingu — tu stanąłby czas przejścia, gdyby jakiś był.
       Luka rozstrzygnięta ZANIECHANIEM: dowodem jest asercja negatywna sekcji H
       (`transition:` 0 ×, `ease`/`cubic-bezier` 0 ×), nie ten znacznik. */
    '#' + ID + '[data-otwarty]{display:block}' +
    /* Wszystkie liczby w GEOMETRIA.md to wymiary PUDEŁKA (Figma nie zna
       content-boxa). Bez tej linii `height:80` na pasku nawigacji z dopełnieniem
       18/16 daje 116 px — złapane pomiarem w przebiegu 5, nie przeglądem kodu. */
    '#' + ID + ',#' + ID + ' *{box-sizing:border-box}' +
    /* D-40.19 · `data-wyjscie` trzyma overlay WIDOCZNY na czas animacji wyjścia,
       ale `pointer-events:none` odbiera mu jakąkolwiek władzę nad wejściem.
       Zamknięcie funkcjonalne (przywrócenie `overflow`, historia, blokada ekranu)
       dzieje się NATYCHMIAST w `zamknijWewn`; to jest wyłącznie warstwa widoku.
       Bez tego rozdzielenia animacja stałaby się tym, co wprowadza interfejs
       w stan końcowy — a wtedy każde nieprzyjście `finish` zostawia tryb otwarty. */
    '#' + ID + '[data-wyjscie]{display:block;pointer-events:none}' +
    '#' + ID + ' .mp-tryb__duch{position:fixed;z-index:2147483000;display:flex;' +
      'align-items:center;box-sizing:border-box;white-space:nowrap;pointer-events:none}' +
    /* `[hidden]` z arkusza przeglądarki ma specyficzność atrybutu i przegrywa
       z naszymi regułami klasowymi — bez tej linii ukrywanie bloków pigułki
       (podpowiedź, ghosty) po prostu nie działa, a wysokość 126 nigdy nie wychodzi. */
    '#' + ID + ' [hidden]{display:none!important}' +

    /* TOP — pełna wysokość klatki. Belka i BOTTOM są NAKŁADKAMI (GEOMETRIA §1),
       więc treści nie skracamy; oddajemy jej dopełnienie równe ich wysokościom. */
    /* D-39.23 · `overscroll-behavior: contain` — TO JEST PRZYCZYNA „ZABLOKOWANEGO
       EKRANU", szukana od kilkunastu przebiegów, i ma nazwę: ŁAŃCUCHOWANIE
       PRZEWIJANIA (scroll chaining).
       Zmierzone prawdziwym gestem 2026-08-16 (kółko przez sterownik przeglądarki,
       nie `scrollTop=`): przy `zapas` 24–103 px gest kończył się `TOP.scrollTop === 0`
       i **`window.scrollY === 500`** — przewinął się ARTYKUŁ POD OVERLAYEM, a overlay
       ani drgnął. Overlay jest `position:fixed`, więc ruch strony pod spodem jest
       niewidoczny; z zewnątrz wygląda to dokładnie jak zamrożony ekran.
       Mechanizm: zapas przewijania TOP-u jest mały (kilkadziesiąt pikseli), więc
       flick natychmiast dobija do granicy, a przy `overscroll-behavior: auto`
       przeglądarka oddaje resztę gestu przodkowi. Każdy następny gest zaczyna się
       już na stronie, nie na overlayu — stąd „ani w górę, ani w dół".
       Dowód rozstrzygający: ten sam gest w ten sam punkt, po odsłonięciu TOP-u,
       daje `scrollTop: 24` z 24 możliwych i `window.scrollY: 0`.
       `contain` zatrzymuje gest w overlayu i nie rusza niczego innego — nie blokuje
       przewijania TOP-u, tylko odcina jego wyciek na zewnątrz. */
    /* D-39.30 · REZERWA POD PAS DOLNY PRZESTAJE BYĆ DOPEŁNIENIEM, A STAJE SIĘ PUDEŁKIEM.
       TO JEST PRZYCZYNA „NIE MOGĘ PRZEWINĄĆ LISTY DO KOŃCA", szukana od kilkunastu
       przebiegów, i nie ma nic wspólnego z żadną z hipotez, które ją poprzedzały —
       ani z `overflow` na liście, ani z animacją wysokości, ani z silnikiem.

       Zmierzone sondą NA URZĄDZENIU REFERENCYJNYM (Chrome/WebKit,
       2026-08-17) `[V]`: `TOPpb=80px` przy pasku `h=80` — rezerwa była co do piksela
       poprawna — a mimo to `zapas=0`, `ukryte=38`. Dzieci TOP-u kończyły się na 724,
       padding box TOP-u sięgał 766.

       Mechanizm jest ZGODNY ZE SPECYFIKACJĄ, nie jest błędem przeglądarki i dlatego
       nie da się go obejść większą liczbą: obszar przewijania to suma PADDING BOXA
       kontenera i tych fragmentów potomków, które poza niego wystają. Treść, która
       wjeżdża w `padding-bottom`, nie wystaje poza padding box — więc nadmiar nie
       powstaje, `scrollHeight === clientHeight`, przewijać nie ma czego, a pas dolny
       (nieprzezroczysty, `position:absolute`) tę treść zakrywa. Rezerwa istniała
       i jednocześnie niczego nie zabraniała.

       Dlatego `padding-bottom` schodzi do zera, a jego rolę przejmuje `::after` —
       PUDEŁKO w układzie, które treść musi obejść. Wtedy koniec treści ląduje nad
       paskiem, a to, co dotąd chowało się pod nim, staje się prawdziwym nadmiarem
       i zapas przewijania wraca.

       `::after`, a nie węzeł DOM, z trzech powodów: przeżywa każde przerysowanie
       TOP-u bez linijki JS, nie pojawia się w `children` ani w `elementsFromPoint`
       (więc nie psuje żadnej istniejącej asercji ani sondy), i nie da się go zgubić
       przy dopisywaniu nowego ekranu. Pseudoelement kontenera flex JEST elementem
       flex — to jest warunek, na którym ta poprawka stoi.

       `D-39.31` · ROZPÓRKA MA PEŁNĄ WYSOKOŚĆ PASA, BEZ ODEJMOWANIA ODSTĘPU.
       Pierwsza wersja odejmowała `W.odstep`, żeby suma wyszła równo 80 — czyli
       żeby zachować PARYTET ze starym `padding-bottom`. To był zły cel: stare
       dopełnienie dawało prześwit ZERO tak samo, tylko nikt tego nie widział,
       bo treść chowała się pod paskiem i problem wyglądał na brak przewijania.
       Po naprawie przewijania zero stało się widoczne i zostało zgłoszone
       natychmiast (2026-08-17, wprost: „brak odległości między nav barem
       a rozwiniętą listą, dosłownie 0 px").
       Teraz: `gap` (16) + rozpórka (`--mp-bottom-h`, 80) = 96, więc ostatni piksel
       treści ląduje **16 px nad krawędzią pasa**. Szesnaście, bo to ten sam
       `W.odstep`, który dzieli akapit kroku od bloku składników — odległość
       wskazana jako wzorzec. Rytm od dołu jest więc równy rytmowi
       od góry i nie jest osobną liczbą do pilnowania.

       `var(--mp-bottom-h)` bez `env()`: `przeliczBottom()` ustawia tę zmienną
       z `getBoundingClientRect().height` pasa, a pas ma safe-area już w swoim
       dopełnieniu — inset jest więc w niej ZAWARTY. Dołożenie `env()` tutaj
       liczyłoby go drugi raz. Zmierzone `safe=0` przy widocznym pasku narzędzi
       Chrome i 34 po jego schowaniu, więc pomyłka byłaby widoczna tylko czasem.

       Cofnięcie: usuń regułę `::after` i przywróć `var(--mp-bottom-h,80px)` jako
       trzecią wartość w `padding`. */
    '#' + ID + ' .mp-tryb__top{position:absolute;inset:0;overflow-y:auto;' +
      'overscroll-behavior-y:contain;' +
      '-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;' +
      'gap:' + W.odstep + 'px;' +
      'padding:' + W.paddingTop + 'px ' + W.margines + 'px 0}' +
    '#' + ID + ' .mp-tryb__top::after{content:"";display:block;flex:0 0 auto;' +
      'height:var(--mp-bottom-h,' + W.nawigacja + 'px)}' +
    /* D-39.12 WYCOFANE tego samego dnia, przed wysyłką — patrz STAN.md.
       Miała tu stanąć reguła `.mp-tryb__top > *{flex:0 0 auto}` jako naprawa
       obcięcia listy o 13 px. NIE STOI, bo hipoteza o ściskaniu flexem została
       OBALONA eksperymentem: `flex-shrink:0` nałożone na WSZYSTKIE potomki TOP-u
       nie zmieniło ani jednego piksela (311/298 przed i po), podczas gdy
       `min-height` wprost naprawiało pomiar natychmiast (311/311). Zmiana bez
       zmierzonego skutku nie wchodzi do produktu. */

    /* belka — wyłącznie rozmycie tła, BEZ cienia (C4, zweryfikowane na 29 klatkach) */
    /* W09/W10 (przeb. 21): krycie 80 %, nie 72 %, oraz rozmycie 4 px, nie 12 px.
       Figma podaje BACKGROUND_BLUR o promieniu 8; eksport MCP tłumaczy to na
       `backdrop-blur 4px`, czyli promień/2 — i to jest przyjęte mapowanie, bo
       Figma liczy promień jądra, a CSS `blur()` odchylenie standardowe. Mapowanie
       idzie na listę decyzji jako [I]: obowiązuje, dopóki nie zostanie zmierzony
       inaczej na urządzeniu. Przedtem runtime miał 12 px, czyli trzykrotność. */
    /* D-38.1 · `z-index:2` NA BELCE — bez tego `×` jest NIEKLIKALNY palcem.
       Zmierzone na stagingu `@5be768d` 2026-08-16, `document.elementsFromPoint`
       w środku przycisku: stos od wierzchu to `DIV.mp-tryb__top` (658×668),
       dopiero pod nim `BUTTON.mp-tryb__zamknij`. `trafia:false`.
       Przyczyna: `belka` jest PIERWSZYM dzieckiem korzenia (kolejność zmierzona:
       belka · top · bottom · scrim), wszystkie z `z-index:auto`, więc o malowaniu
       i o trafieniu decyduje kolejność w drzewie — a `.mp-tryb__top` ma
       `position:absolute;inset:0`, czyli przykrywa CAŁY overlay, w tym belkę.
       Wizualnie nikt tego nie widział, bo TOP jest przezroczysty; przezroczystość
       nie zdejmuje jednak przechwytywania zdarzeń. BOTTOM jest w drzewie PO TOP-ie,
       więc jego przyciski działały — i to właśnie dlatego objaw wyglądał na
       „tylko iks nie działa".
       Dlaczego to nie zostało złapane wcześniej: `element.click()` OMIJA trafianie
       w punkt, więc pomiar programowy zwracał `dialog: true` i mechanizm wyglądał
       na sprawny. Asercja o zachowaniu przycisku musi wołać `elementFromPoint`,
       nie `.click()` na referencji.
       Dlaczego 2, a nie 1: `.mp-tryb__ptaszek` ma `z-index:1`, a `.mp-tryb__top`
       nie tworzy kontekstu układania (`z-index:auto`), więc ptaszki uczestniczą
       w kontekście KORZENIA i przy `1` remisowałyby z belką, wygrywając kolejnością
       w drzewie — lista przewijana wchodziłaby NA belkę zamiast pod jej rozmycie.
       Powyżej zostaje tooltip (3) i scrim dialogów (4) — oba mają być nad belką.
       Cofnięcie: usuń `z-index:2` z tej reguły; objawem powrotu jest
       `elementFromPoint` w środku `×` zwracający `.mp-tryb__top`.
       Zmierzone po poprawce (wstrzyknięcie reguły na żywo, ta sama sesja):
       `trafia:true`, `wierzch: BUTTON.mp-tryb__zamknij`, a kliknięcie w element
       ZWRÓCONY przez `elementFromPoint` otwiera dialog `S2`.
       AKTUALIZACJA 2026-08-23: `×` zniknął z belki, ale ta reguła zostaje
       W MOCY I JEST TERAZ WAŻNIEJSZA — przykrywającym elementem był
       `.mp-tryb__top` (`position:absolute;inset:0`), a nie `×`, więc przyczyna
       jest ta sama dla KAŻDEGO celu w belce. Bez `z-index:2` nieklikalny byłby
       przełącznik. Objaw i sonda bez zmian, tylko cel inny:
       `elementFromPoint` w środku `.mp-tryb__przelacznik`. */
    '#' + ID + ' .mp-tryb__belka{position:absolute;top:0;left:0;right:0;height:' + W.belka + 'px;' +
      'z-index:2;' +
      /* D-39.28 — belka idzie na `blur(8px)`, tak jak pas dolny (`D-39.24`).
         Rozstrzygnięcie na wprost zadane pytanie: oba pasy są
         nav barami, więc oba biorą wykończenie z `.site-nav__links` strony
         (`blur(8px)`, biel złamana 80 % — odczytane [V]).
         **`W09/W10` przestaje obowiązywać w części dotyczącej rozmycia.** Mapowanie
         „promień Figmy / 2 → blur 4" było wnioskiem `[I]`, oznaczonym wtedy jako
         przyjęte do czasu pomiaru na urządzeniu; pomiar żywego nav baru jest tym
         pomiarem i daje 8. Krycie 80 % z tamtego ustalenia zostaje bez zmian —
         ta część się potwierdziła. */
      'box-shadow:none;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
      'background:color-mix(in srgb,var(--mp-bialy) 80%,transparent);' +
      /* D-40.1 · UKŁAD BELKI TO POZYCJONOWANIE BEZWZGLĘDNE, NIE FLEX.
         Klatka `7574:12487` stawia troje dzieci na trzech NIEZALEŻNYCH pozycjach:
         tor przy górnej krawędzi (y=0), etykietę na y=31, przełącznik na y=23.
         Flex w jednym rzędzie nie wyraża tego bez trzech nadpisań `align-self`
         i sztucznego `margin-top`, więc znika razem ze swoim przedmiotem.

         **D-39.38 (asymetryczne odstępy 19 / 30) TRACI PRZEDMIOT.** Tamten wpis
         rozstawiał znak, blok postępu i `×` w rzędzie flex; po przebudowie nie ma
         ani znaku, ani bloku, ani `×`, więc nie ma czego rozstawiać. `W.torPostepu`
         (188) zniknęło z tego samego powodu: tor mierzy się dziś z DOM-u, bo idzie
         na całą szerokość belki, jaka by ta szerokość nie była — czyli problem,
         który D-39.38 rozwiązywało marginesami (188 to wartość PRZY 360, nie stała
         produktu), rozwiązuje się teraz sam.
         Wiersze matrycy pytające o odstępy 19 / 30 są do WYCOFANIA, nie do
         poprawienia: ich przesłanka zniknęła.
         `padding:0`, bo marginesy poziome niosą dziś dzieci (`left`/`right` 16). */
      'display:block;padding:0}' +
    /* D-40.11 · PASEK POSTĘPU SCHODZI NA DOLNĄ KRAWĘDŹ I POCHŁANIA KRESKĘ.
       Zgłoszenie, po obejrzeniu ekranu: „nie powinien mieć
       efektu paska postępu na górze. Jeśli już chcemy go akcentować, proponuję
       umieścić go u podstawy górnego paska. Wówczas border = progress bar, 2 w 1".

       To jest ŚWIADOME ODSTĘPSTWO OD KLATKI, nie odczyt — `7574:12488` rysuje tor
       przy krawędzi GÓRNEJ (`top: 0`), a `7574:12493` daje osobny hairline przy
       dolnej. Klatka ma więc DWIE poziome kreski; po zgłoszeniu zostaje JEDNA,
       pełniąca obie role. Zapisane jako odstępstwo, żeby następna sesja nie
       „naprawiła" tego z powrotem do klatki.

       Konsekwencja, którą trzeba było rozstrzygnąć: **jeśli tor ma BYĆ kreską, to
       jego część NIEWYPEŁNIONA musi wyglądać jak kreska.** Dlatego tor przejmuje
       kolor po zlikwidowanym hairline (`beige-2` przy 50 %), a nie `beige-1`
       #F1ECDF z klatki — beż POWIERZCHNI na niemal białym dałby kreskę, której nie
       widać, czyli dokładnie ten dług, który w tym projekcie już raz wystąpił
       (`.recipe-nutri__row` miał `border-bottom-color` podpięty pod kolor tła
       i inwentarz opisał to jako „wiersze bez tła"). Wypełnienie zostaje `beige-2`
       w pełnym kryciu — ta sama barwa, mocniejsza tam, gdzie użytkownik już był.

       Krycie idzie w `color-mix`, a NIE w `opacity` na torze: `opacity` na rodzicu
       przygasiłoby też wypełnienie, więc pasek postępu wyblakłby razem z kreską
       i cały sens „2 w 1" by przepadł.

       Stała wysokości kreski (1 px) usunięta razem ze swoim przedmiotem.

       Cofnięcie do klatki: `bottom:0` → `top:0`, tło → `var(--mp-beige-1)`,
       plus przywrócenie reguły `.mp-tryb__belka::after` (`left/right:0; bottom:0;
       height:1px; background:var(--mp-beige-2); opacity:.5`).
       Wariant, gdyby 3 px okazało się za ciężkie jako krawędź: `W.torWysokosc` 3 → 2. */
    /* D-40.3 · TOR POSTĘPU: KRESKA 3 px NA CAŁĄ SZEROKOŚĆ.
       (Krawędź: po D-40.11 wyżej — DOLNA, nie górna jak w klatce.)
       `7574:12488` (tor `#F1ECDF`, 360×3, top 0) i `7574:12489` (wypełnienie
       `#C5B18A`, 238×3). Trzy zmiany wobec stanu sprzed przebudowy:
       — tor przestaje być kapsułą 188×6 wewnątrz bloku i staje się kreską
         full-bleed przypiętą do krawędzi (`position:absolute`, nie `flex`);
         `pointer-events:none`, bo kreska leży nad dolną krawędzią belki i nie ma
         powodu, żeby przechwytywała cokolwiek;
       — `border-radius` znika: eksport nie niesie ŻADNEJ klasy `rounded-*`,
         a W12 („promień 100, bo Figma rysuje kapsułę") mówiło o TAMTYM torze
         188×6 z klatek `7283:10791/10792`. Ten jest inny i nie ma czego zaokrąglać;
       — wypełnienie idzie z `beige-3` (#816D44) na `beige-2` (#C5B18A).
       Reguła szerokości NIE zmienia się: `ustawPostep` dalej liczy
       `round(n/N × szerokość toru)`, tyle że tor to teraz cała belka. Klatka daje
       238 px, a `6/9 × 360 = 240` — rozjazd 2 px. Rozstrzyga reguła z GEOMETRIA
       §1.1, zmierzona na CZTERECH klatkach, a nie jeden prostokąt postawiony
       ręcznie w jednej. Zapisane jako D-40.6 w rejestrze decyzji. */
    /* D-40.12 · KRESKA BELKI I KRESKA PASA DOLNEGO TO TERAZ TEN SAM KOLOR.
       Zgłoszenie: „górny pasek jest beżowy, dolny zielony,
       wygląda to losowo".
       Jest gorzej, niż widać na zrzucie, i warto to zapisać: kreska pasa dolnego
       NIE siedzi na `.mp-tryb__bottom`, tylko na `.mp-tryb__nawigacja::before`
       (i `.mp-tryb__akcje::before`) — 1 px `--mp-zielen`. Pierwsza sonda pytała
       o `::before` NA `bottom` i zwróciła `content: none`, czyli „nie ma kreski"
       o kresce, która jest. Wynik odrzucony, sonda naprawiona odczytem reguły
       w źródle — to ta sama rodzina błędu co „zero z martwego przyrządu".
       Kierunek unifikacji: **belka idzie na zieleń**, nie pas dolny na beż.
       Powody: (1) zieleń pasa dolnego jest ODCZYTEM Z FIGMY (`W02`, `7195:10948`),
       więc jej ruszanie kosztowałoby rozjazd z projektem, a kreska belki jest już
       i tak odstępstwem (D-40.11); (2) przełącznik w belce ma dokładnie ten kolor
       (`#487622`), więc chrom belki staje się jedną rodziną zamiast dwóch.
       Wypełnienie: zieleń w pełnym kryciu. Tor: ta sama zieleń przy 50 %, czyli
       ~1,5 px „tuszu" na 3 px wysokości — wizualnie równoważne 1 px solid pasa
       dolnego, przy zachowaniu akcentu, wymagany w D-40.11.
       Cofnięcie: `--mp-zielen` → `--mp-beige-2` w obu regułach. */
    '#' + ID + ' .mp-tryb__tor{position:absolute;bottom:0;left:0;right:0;' +
      'height:' + W.torWysokosc + 'px;pointer-events:none;' +
      'background:color-mix(in srgb,var(--mp-zielen) 50%,transparent);' +
      'overflow:hidden}' +
    '#' + ID + ' .mp-tryb__wypelnienie{height:' + W.torWysokosc + 'px;' +
      'background:var(--mp-zielen);width:0}' +
    /* D-40.4 · ETYKIETA TO JEDNA LINIA 12 px PRZY LEWYM MARGINESIE.
       `7574:12490`: DM Sans **Medium (500)**, 12/16, kolor **`#816D44`**
       (`beige-3`, NIE `primary-text` — etykieta jest wyciszona), x=16, y=31,
       `whitespace-nowrap`.
       **U-3 TRACI PRZEDMIOT, nie zostaje naruszone.** Tamten defekt brzmiał
       „etykieta ma być WYŚRODKOWANA NAD TOREM"; po przebudowie nie ma bloku
       postępu, nad którym miałaby się centrować — tor jest kreską przy krawędzi
       belki, a etykieta stoi samodzielnie przy marginesie. `text-align:center`
       zdjęte razem z przesłanką; wiersz matrycy pytający o wyśrodkowanie jest
       do WYCOFANIA, nie do naprawy (falsyfikowalność, reguła o usuniętej
       powierzchni).
       `top:31` jest Z KLATKI, nie z wycentrowania: (72 − 16) / 2 = 28, czyli
       etykieta siedzi 3 px NIŻEJ niż środek belki, podczas gdy przełącznik stoi
       dokładnie w środku (23 = (72 − 26) / 2). Odwzorowuję klatkę; rozjazd idzie
       na listę jako D-40.7.
       `etykietaPrawa` 76 = 16 marginesu + 44 przełącznika + 16 odstępu. Bez tej
       granicy `nowrap` wjeżdżałby POD przełącznik przy dłuższej etykiecie —
       a `nowrap` jest z klatki, więc granica musi być jawna. */
    /* D-40.17 · ETYKIETA PASKA = **BODY LARGE**, 1:1 z etykietą w oryginalnym
       przełączniku na stronie przepisu. Polecenie:
       „niech ten napis ma identyczny styling jak na toggle'u".
       ZMIERZONE na opublikowanej stronie, nie odtworzone z pamięci — etykietą
       w `a[data-mp-gotowanie-toggle]` jest `<div class="body-large">`:
         font-family  "DM Sans", Arial, sans-serif
         font-size    **16px**   (pasek miał 12)
         line-height  **24px**   (pasek miał 16)
         font-weight  **400**    (pasek miał 500)
         color        **#3E2B22** `primary-text`  (pasek miał #816D44 `beige-3`)
       Moje wcześniejsze przybliżenie (14 px / 500 / #3E2B22) było błędne w trzech
       parametrach na cztery — stąd pomiar zamiast odtwarzania.
       `top` liczone, nie wpisane: `(64 − 24) / 2` = 20, dzięki czemu oś etykiety
       i oś przełącznika wypadają na tym samym pikselu (32). */
    '#' + ID + ' .mp-tryb__etykieta{position:absolute;margin:0;' +
      'left:' + W.margines + 'px;top:' + ((W.belka - W.etykietaWys) / 2) + 'px;' +
      'right:' + W.etykietaPrawa + 'px;height:' + W.etykietaWys + 'px;' +
      'font-size:16px;line-height:' + W.etykietaWys + 'px;font-weight:400;' +
      'color:var(--mp-atrament);white-space:nowrap;' +
      'overflow:hidden;text-overflow:ellipsis}' +
    /* D-40.5 · PRZEŁĄCZNIK — SAM TOR, STAN ON, BEZ ETYKIETY.
       Kontrolka z `/produkty` jest KOMPONENTEM Webflow
       (`data-wf-component-id ac932c29-4b4a-6965-4f0d-8037e4060c10`), a opublikowany
       CSS niesie WYŁĄCZNIE stan bazowy — odczytane 2026-08-23 z
       `miesna-paczka-ea5c01.webflow.shared.4e1412ad8.min.css`:
         .toggle       52×32 · radius 100 · border 1.5 `--secondary-text`
                       · tło `--off-white-bg-80` · padding 8/4 · overflow hidden
                       · justify-content: FLEX-START  ← to jest OFF
         .toggle__eye  16×16 · radius 100 · `--primary-text`
       W całym arkuszu nie ma ŻADNEGO selektora stanu (`grep` po `toggle`:
       `.toggle`, `.toggle-wrapper`, `.toggle__eye` — i nic więcej), więc stan ON
       istnieje tylko w runtime silnika wariantów. Zamiast go zgadywać, czytam go
       z Figmy, gdzie jest narysowany wprost — `7574:12491`, eksport SVG:
         rect 44×26 rx=13 fill #487622        → `--mp-zielen`
         circle cx=32 cy=13 r=10 fill white   → gałka 20×20, biel PEŁNA
         filter: dy=1, stdDeviation=1.5, #3E2B22 α .35
       `stdDeviation` 1,5 → blur CSS 3 (CSS bierze średnicę, SVG odchylenie).
       **Wariant zmienia więc nie samo położenie oka, ale OBA kolory i wymiar** —
       dokładnie ten przypadek, przed którym brief ostrzegał.
       WYMIAR — D-40.8, ROZSTRZYGNIĘTE. Klatka rysuje
       tor **44×26**, brief mówił **52×32** za CSS-em `/produkty`. Zapytany wprost,
       odpowiedź brzmiała: „wysokość toggle'a powinna być zgodna 1:1 z wersją na
       /produkty. Szerokość jest już dyktowana przez sam tekst CTA, jedyna stała to
       szerokość marginesu tekst → granica toggle'a lewo-prawo. I tą stałą
       respektujmy."
       Czytam to jako podział źródeł, nie jako wybór jednego z dwóch:
       — **GEOMETRIA kontrolki idzie z `/produkty` 1:1** → 52×32, oko 16×16,
         padding 8/4, promień 100. Wysokość jest powiedziana wprost; szerokość idzie
         za nią, bo to JEDNA kontrolka, a nie dwie niezależne liczby — 16 px oka
         w torze 52×32 to proporcja `/produkty`, a nie moje przeskalowanie.
       — **W POZIOMIE RZĄDZI STAŁY MARGINES 16**, nie szerokość przełącznika:
         16 od lewej krawędzi do tekstu · ≥16 między tekstem a przełącznikiem
         (`W.etykietaPrawa` = 16 + 52 + 16) · 16 od przełącznika do prawej krawędzi.
         Dlatego zmiana 44 → 52 przesuwa WYŁĄCZNIE granicę etykiety i nic więcej.
       — **KOLORY STANU ON dalej z klatki**, bo opublikowany CSS ich nie ma i mieć
         nie może (silnik wariantów). To się nie zmienia.
       Cofnięcie do klatki: `przelacznikSzer` 52→44, `przelacznikWys` 32→26,
       `galka` 16→20, `galkaLuka` 4→2, `etykietaPrawa` 84→76.
       CEL DOTYKU (G9): pudełko przycisku ma **52×44**, a widoczny tor 52×32 siedzi
       w jego pionowym środku. Samo 32 px nie spełniłoby minimum 44 — i to jest
       jedyny powód, dla którego pudełko jest WYŻSZE od tego, co widać. Szerokość
       pudełka równa się szerokości toru, bo 52 > 44 i dokładanie czegokolwiek
       zjadałoby margines 16, który należy respektować. */
    '#' + ID + ' .mp-tryb__przelacznik{position:absolute;' +
      'right:' + W.margines + 'px;top:' + ((W.belka - W.celDotyku) / 2) + 'px;' +
      'width:' + W.przelacznikSzer + 'px;height:' + W.celDotyku + 'px;' +
      'display:flex;align-items:center;padding:0;border:0;background:none;' +
      'cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '#' + ID + ' .mp-tryb__przelacznik-tor{width:' + W.przelacznikSzer + 'px;' +
      'height:' + W.przelacznikWys + 'px;border-radius:100px;' +
      'background:var(--mp-zielen);display:flex;align-items:center;' +
      'justify-content:flex-end;overflow:hidden;' +
      'padding-left:' + W.galkaLukaLewa + 'px;padding-right:' + W.galkaLuka + 'px}' +
    '#' + ID + ' .mp-tryb__galka{width:' + W.galka + 'px;height:' + W.galka + 'px;' +
      'flex:0 0 auto;border-radius:100px;background:var(--mp-bialy-pelny);' +
      'box-shadow:0 1px 3px rgba(62,43,34,.35)}' +
    /* `.mp-tryb__zamknij` — REGUŁA ZOSTAJE, ALE BELKA JEJ JUŻ NIE UŻYWA.
       Po przebudowie 2026-08-23 jedynym konsumentem jest głowa arkusza składników
       (`.mp-tryb__arkusz-glowa`). Nie kasuję jej razem z `×` z belki właśnie
       dlatego: klasa jest współdzielona, a usunięcie zabrałoby zamknięcie arkusza.
       Opis W11 poniżej dotyczył wyglądu w BELCE i zostaje jako rodowód wartości.
       W11 (przeb. 21): `×` jest KÓŁKIEM z własnym tłem i rozmyciem, nie gołym
       glifem — obrys 1,5 px `primary-cta`, promień 100, tło 80 % + blur 4.
       Obrys jako `border` (nie `outline`, jak w pigułce): 40×40 jest wymiarem
       pudełka przy `box-sizing:border-box`, więc border nie rusza układu. */
    '#' + ID + ' .mp-tryb__zamknij{flex:0 0 auto;width:40px;height:40px;' +
      'border:1.5px solid var(--mp-cta);border-radius:100px;' +
      'background:color-mix(in srgb,var(--mp-bialy) 80%,transparent);' +
      'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);' +
      'font-size:20px;line-height:20px;padding:0;cursor:pointer;' +
      'color:var(--mp-atrament)}' +

    /* BOTTOM — przypięty u dołu; wysokość składa się z kafli + nawigacji (R6) */
    /* B17 — `drop_shadow_ui` wg HANDBACK decyzja 11 (WYMAGANIA §4): ambient 0/−1
       blur 2 α5 % + key 0/−4 blur 8 spread −2 α10 %, baza #3E2B22. Oba offsety są
       UJEMNE, czyli cień idzie DO GÓRY — pas dolny rzuca go na przewijaną treść nad
       sobą, a nie pod siebie, gdzie i tak jest krawędź ekranu. Dlatego cień siedzi
       na BOTTOM, a nie na belce: belka ma wyłącznie `backdrop-filter`, bez cienia
       (B5), i to jest osobne rozstrzygnięcie, nie niekonsekwencja. */
    /* W01 (przeb. 21): wypełnienie `white-full-bg` #FFFFFF. Do przebiegu 20 pas
       dolny NIE MIAŁ TŁA — treść przewijała się pod nim i było to widać gołym
       okiem przy 113 zielonych wierszach. Biel PEŁNA, nie złamana: patrz nota
       przy `--mp-bialy-pelny`. */
    /* SAFE AREA (poprawka). Wzorzec wzięty z ŻYWEJ
       produkcji, nie wymyślony: `.mp-mnav__bar` na `miesnapaczka.pl` robi
       `padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px))` [V, odczytane
       z arkusza 2026-08-15]. Trzy rzeczy z tego wzorca są istotne i wszystkie trzy
       przenoszę:
       (a) inset idzie w DOPEŁNIENIE, nie w offset `bottom` — dzięki temu tło i cień
           pasa dochodzą do fizycznej krawędzi ekranu, a treść nie wchodzi pod wskaźnik;
       (b) `env(...)` ZAWSZE z fallbackiem `0px` — bez drugiego argumentu cała funkcja
           jest nieznana starszym silnikom i unieważnia całą deklarację;
       (c) BOTTOM nie dostaje przez to zadanej wysokości — reguła składania
           (INTERAKCJE §4.1) zostaje nietknięta, bo `przeliczBottom()` mierzy
           `getBoundingClientRect().height`, czyli razem z dopełnieniem. Publikowane
           `--mp-bottom-h` rośnie samo, a TOP czyta je jako `padding-bottom`, więc
           zapas pod wskaźnikiem dostaje też PRZEWIJANA treść, nie tylko pasek.
       Czego NIE robię i dlaczego: `safe-area-inset-top` ani insetów bocznych nie
       dokładam, bo produkcja ich nie ma (w całym arkuszu są DOKŁADNIE trzy reguły
       z `env()`, wszystkie dolne). Symetria z produkcją jest tu ważniejsza niż moja
       intuicja o notchu; jeśli belka ma dostać zapas u góry, to jest decyzja, nie fix. */
    '#' + ID + ' .mp-tryb__bottom{position:absolute;left:0;right:0;bottom:0;' +
      'padding-bottom:env(safe-area-inset-bottom,0px);' +
      /* D-39.24 · PAS DOLNY WG NAV BARU WŁAŚCIWEJ STRONY
         2026-08-16: „opacity 80 % i 8 px bluru, analogicznie do nav baru na
         właściwej stronie". **Wzorzec ODCZYTANY, nie przyjęty z opisu:**
         `.site-nav__links` na stronie przepisu ma `backdrop-filter: blur(8px)`
         i `background: rgba(255,253,251,0.8)` [V] — czyli biel ZŁAMANA `--mp-bialy`
         (#FFFDFB) przy 80 %, nie biel pełna.
         **To nadpisuje dwa wcześniejsze ustalenia i zapisuję to wprost, zamiast
         udawać, że ich nie było:** `W01` mówił, że pas dolny jest jednym z dwóch
         miejsc bieli PEŁNEJ, a `W09/W10` przyjęły mapowanie „promień Figmy / 2",
         które dawało blur 4. Wskazano inny oracle — żywy nav bar — i ma
         pierwszeństwo przed odczytem z pliku.
         Cień zostaje: nav strony go nie ma, ale pas dolny overlaya oddziela treść
         przewijaną pod spodem, a nie stoi na tle strony. Gdyby miał zniknąć, jest
         to osobna decyzja i osobny wiersz. */
      /* POWIERZCHNIA ZESZŁA STĄD NA PASKI (2026-08-19). Do dziś tło, rozmycie,
         cień i zielona kreska siedziały na całym `BOTTOM`, czyli na sumie stosu
         i paska. Skutek był taki, że kreska wędrowała: przy jednym minutniku
         stała nad kaflem, przy dwóch wyżej — a pas dolny rósł i malał razem
         z liczbą kafli. Ustalono wprost: w krokach pasek ma STAŁĄ
         wysokość, a minutniki mają nad nim PŁYWAĆ, nie dzielić z nim tła.
         `BOTTOM` jest odtąd wyłącznie kontenerem układu — bez własnej skóry. */
      'background:none;backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none}' +
    /* W02 (przeb. 21): kreska 1 px `secondary-text (h1)` #487622 nad pasem dolnym.
       PSEUDOELEMENT, nie `border-top` — i to nie jest ozdobnik implementacyjny.
       `BOTTOM` nie ma zadanej wysokości: wg reguły składania (INTERAKCJE §4.1)
       jest sumą stosu i paska nawigacji, więc `border-top` przy `box-sizing:
       border-box` dołożyłby 1 px do KAŻDEJ z wysokości 80/132/218/266 i wywrócił
       wiersz B7. W Figmie obrys jest rysowany wewnątrz ramki i nie zmienia jej
       wysokości; `::before` jest jedynym odpowiednikiem, który tak samo nie
       uczestniczy w układzie. Ta sama logika, co `outline` zamiast `border`
       na pigułce alarmowej. Pomiar: `getComputedStyle(bottom,"::before")`. */
    /* Skóra paska: tło, rozmycie, cień i kreska 1 px `secondary-text (h1)` #487622.
       Ta sama dla nawigacji (kroki) i dla pasa akcji (start / S1 / zakończenie) —
       bo w obu wypadkach to ONA jest krawędzią, nad którą przewija się treść.
       Kreska dalej pseudoelementem, nie `border-top`: przy `box-sizing:border-box`
       dołożyłaby 1 px do wysokości 80/132 i wywróciła wiersz B7. */
    '#' + ID + ' .mp-tryb__nawigacja,#' + ID + ' .mp-tryb__akcje{position:relative;' +
      'background:color-mix(in srgb,var(--mp-bialy) 80%,transparent);' +
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
      'box-shadow:0 -1px 2px 0 rgba(62,43,34,.05),0 -4px 8px -2px rgba(62,43,34,.10)}' +
    '#' + ID + ' .mp-tryb__nawigacja::before,#' + ID + ' .mp-tryb__akcje::before{' +
      'content:"";position:absolute;top:0;left:0;right:0;height:1px;background:var(--mp-zielen)}' +
    /* `center`, nie `flex-start`: `←` ma 44 px, a CTA 48, więc jedno wyrównanie
       od góry nie ustawi obu. Projekt (`7195:11065`) daje `←` na +18 i CTA na +16,
       czyli OBA wyśrodkowane w pasie 80. Padding od góry 18 trzymał `←` poprawnie,
       ale spychał CTA o 2 px za nisko — zmierzone 718 zamiast 716. */
    '#' + ID + ' .mp-tryb__nawigacja{height:' + W.nawigacja + 'px;display:flex;align-items:center;' +
      'padding:0 ' + W.margines + 'px;gap:' + W.lukaCta + 'px}' +
    /* W04 (przeb. 21): `←` jest KÓŁKIEM — obrys 1 px `primary-text` #3E2B22,
       promień 22 (połowa z 44, czyli koło dokładne, nie „zaokrąglony kwadrat").
       Border przy `box-sizing:border-box` nie rusza 44×44, więc B10 zostaje. */
    '#' + ID + ' .mp-tryb__wstecz{width:' + W.celDotyku + 'px;height:' + W.celDotyku + 'px;flex:0 0 auto;' +
      'border:1px solid var(--mp-atrament);border-radius:' + (W.celDotyku / 2) + 'px;' +
      'background:transparent;font-size:24px;line-height:' + (W.celDotyku - 2) + 'px;' +
      'padding:0;cursor:pointer;color:var(--mp-atrament)}' +
    /* W05–W08 (przeb. 21) — CTA „dalej" miało cztery rozjazdy naraz i wszystkie
       cztery są jednym elementem, więc opis jest jeden:
       W05 wypełnienie `primary-cta` #CF411A, było `--mp-atrament` #3E2B22 — inny
           kolor, nie odcień: brązowy przycisk zamiast pomarańczowego;
       W06 promień 100 (kapsuła), było 8; padding 24 poziomo / 14 pionowo
           i `justify-content:space-between`, żeby glif szedł do prawej krawędzi
           treści, a nie tuż za etykietę;
       W07 glif `arrow_forward` 20 px po prawej — dopisany jako WĘZEŁ, bo bez węzła
           nie ma czego zmierzyć; brzmienie glifu to substytut Unicode `→`,
           migracja na ligaturę subsetu należy do B16, nie tutaj;
       W08 grubość 600 (DM Sans SemiBold) — kolor i stopień były już zgodne.
       `line-height:20px` nie jest kosmetyką: 48 = 14 + 20 + 14, więc wiersz musi
       mieć dokładnie 20, inaczej padding rozepchnąłby pudełko ponad 48. */
    '#' + ID + ' .mp-tryb__dalej{flex:1 1 auto;height:48px;border:0;border-radius:100px;' +
      'display:flex;align-items:center;justify-content:space-between;' +
      'padding:14px 24px;' +
      'background:var(--mp-cta);color:var(--mp-bialy);' +
      'font-family:inherit;font-size:16px;line-height:20px;font-weight:600;cursor:pointer}' +
    '#' + ID + ' .mp-tryb__dalej-glif{flex:0 0 auto;width:20px;height:20px;' +
      'font-size:20px;line-height:20px;text-align:right}' +

    /* ---- `stos` i kafle minutników (W2) — R6/R7/R8/R9/R10/R11, §2.2–2.3 ----
       `stos` jest SLOTEM KAFLI, nie kontenerem minutników: baner offline (S3)
       dzieli go z pigułkami i podlega tej samej regule składania (§2.2, lista
       decyzji). Pusty `stos` znika w całości — inaczej jego dopełnienie 12 px
       podniosłoby BOTTOM z 80 na 92 na każdym kroku bez minutnika. */
    '#' + ID + ' .mp-tryb__stos{display:flex;flex-direction:column;' +
      'gap:' + W.kafelOdstep + 'px;padding:0 ' + W.margines + 'px ' + W.stosDol + 'px}' +
    '#' + ID + ' .mp-tryb__stos:empty{display:none}' +

    /* W13/W14/W15 (przeb. 21, odczyt `7254:10913` „pigułka — w toku"):
       promień **8**, nie 12 — 12 było wartością wziętą z kart treści (§3.x),
       a pigułka minutnika ma własny, mniejszy; oraz `drop_shadow_ui`, ten SAM
       cień co pas dolny (B17, decyzja 11: ambient 0/−1 r2 α5 % + key 0/−4 r8
       spread −2 α10 %). Pigułka leży NA przewijanej treści dokładnie tak jak pas
       dolny, więc wspólny cień nie jest zbiegiem okoliczności, tylko jedną regułą
       unoszenia zastosowaną dwa razy. Cień był w Figmie od początku i nie miał
       wiersza — dokładnie ta klasa braku, dla której powstała sekcja W. */
    '#' + ID + ' .mp-tryb__pigulka{background:var(--mp-beige-1);' +
      'box-shadow:0 -1px 2px 0 rgba(62,43,34,.05),0 -4px 8px -2px rgba(62,43,34,.10);' +
      'position:relative}' +
    /* W13 — promień ZALEŻY OD FORMY i to nie jest niekonsekwencja projektanta:
       zwinięta (`7254:10913`) ma **8**, rozwinięta (`7195:11078`) — **12**.
       Odczytane osobno z obu komponentów w przeb. 21. Pierwsza wersja tej poprawki
       ustawiła 8 na wspólnej klasie i była błędna dla formy rozwiniętej — czyli
       naprawiła jedną formę, psując drugą, i przeszła jako zieleń, bo asercja
       pytała o pigułkę, a nie o pigułkę W DANEJ FORMIE. */
    '#' + ID + ' .mp-tryb__pigulka[data-forma="zwinieta"]{border-radius:8px}' +
    '#' + ID + ' .mp-tryb__pigulka[data-forma="start"],' +
    '#' + ID + ' .mp-tryb__pigulka[data-forma="pelna"]{border-radius:12px}' +
    /* `[X]` RAMKI ALARMOWEJ NIE MA — cała reguła zdjęta 2026-08-28, decyzja
       operatora: „nie róbmy ramki wokół minutników, tak będzie lepiej".

       Stała tu obwódka `outline:1.5px solid` z ujemnym offsetem, zapalana
       w `ostatnia-minuta`, `koncowka` i `zero`. Szła w dwóch krokach i drugi
       wynikł z pierwszego: najpierw (tego samego dnia) zdjęto jej PULS, a ona
       sama wzięła przy okazji `--mp-cta` zamiast ciemniejszego `--mp-alarm` —
       i przestała migać, ale zaczęła stać, w pełnej barwie CTA, wokół prostokąta
       361 × 236. Efekt był MOCNIEJSZY niż przed poprawką, choć poprawka miała
       uspokoić ekran. Zdjęcie pulsu bez zdjęcia obwódki było półśrodkiem.

       Alarm ma odtąd DWA nośniki, oba małe i oba przy cyfrach: **barwa
       odliczania** i **kropka** (12 px, pulsuje). Zero powierzchni większych
       niż glif.

       TO JEST DRUGIE ODEJŚCIE OD PLIKU W TYM MIEJSCU i trzeba je czytać razem
       z pierwszym: `7224:10900` rysuje obrys 1,5 px, a adnotacja `7196:11087`
       każe mu jeszcze pulsować. Nie ma tu ani obrysu, ani pulsu. Powodem nie
       jest niezgodność z plikiem tylko po to, żeby ją mieć — powodem jest
       zmierzona liczba barw i powierzchni na jednym ekranie, której plik nie
       liczył, bo klatki ogląda się po jednej.

       Cofnięcie: przywrócić regułę
       `.mp-tryb__pigulka[data-stan="ostatnia-minuta"|"koncowka"|"zero"]
        {outline:1.5px solid var(--mp-cta);outline-offset:-1.5px}`.
       `outline`, nie `border`: border zjadłby 3 px z wnętrza albo dołożył 3 px
       do wysokości, a wszystkie liczby §2.2 są wymiarami pudełka. */

    '#' + ID + ' .mp-tryb__pigulka[data-forma="zwinieta"]{height:' + W.pigulka + 'px;' +
      'padding:0 ' + W.wnetrze + 'px;display:flex;align-items:center}' +
    '#' + ID + ' .mp-tryb__pigulka[data-forma="start"],' +
    '#' + ID + ' .mp-tryb__pigulka[data-forma="pelna"]{padding:' + W.wnetrze + 'px;' +
      'display:flex;flex-direction:column;gap:' + W.blok + 'px}' +

    '#' + ID + ' .mp-tryb__wiersz-min{display:flex;align-items:center;width:100%;' +
      'border:0;background:transparent;padding:0;cursor:pointer;text-align:left;' +
      'color:inherit;font:inherit}' +
    '#' + ID + ' [data-forma="start"] .mp-tryb__wiersz-min,' +
    '#' + ID + ' [data-forma="pelna"] .mp-tryb__wiersz-min{height:' + W.wiersz + 'px;flex:0 0 auto}' +
    /* Wiersz kafla startowego nie rozwija niczego (klatka nie ma szewronu), więc
       nie ma prawa nieść kursora wskazującego — `.mp-tryb__wiersz-min` niesie go
       dla formy akordeonowej. */
    '#' + ID + ' [data-forma="start"] .mp-tryb__wiersz-min{cursor:default}' +

    /* R11 — oś kropki stoi, rośnie promień: `align-items:center` w wierszu, więc
       środek pionowy jest ten sam przy 8 i przy 12 px. */
    '#' + ID + ' .mp-tryb__kropka{flex:0 0 auto;border-radius:50%;' +
      'width:' + W.kropkaMala + 'px;height:' + W.kropkaMala + 'px;' +
      'margin-right:' + W.kropkaLuka + 'px;background:var(--mp-atrament)}' +
    '#' + ID + ' [data-stan="ostatnia-minuta"] .mp-tryb__kropka,' +
    '#' + ID + ' [data-stan="koncowka"] .mp-tryb__kropka,' +
    '#' + ID + ' [data-stan="zero"] .mp-tryb__kropka{' +
      'width:' + W.kropkaDuza + 'px;height:' + W.kropkaDuza + 'px;background:var(--mp-cta)}' +
    /* JEDNO TEMPO NA CAŁE 60 s.
       Do dziś puls przyspieszał poniżej 10 s (stan `koncowka`, 0,5 s). Eskalacja
       była w kodzie oznaczona `NIENARYSOWANE (G3, G4)`, czyli WYMYŚLONA: adnotacja
       na klatce `7196:11087` opisuje jeden rytm — „pulsuje raz na sekundę" — dla
       ostatnich 60 s i o drugim progu nie mówi. Zachowanie bez źródła zostało
       zdjęte, zamiast dalej udawać, że coś je uzasadnia.

       Stan `koncowka` ZOSTAJE w modelu: `stanCzasu()` dalej go zwraca, dalej
       jest w atrybucie `data-stan` i dalej dokłada obrys alarmowy. Zniknęła tylko
       różnica TEMPA. Usunięcie stanu byłoby większą zmianą, niż zamówiono,
       i skasowałoby próg I-20 z matrycy.

       Przy 0:00 puls gaśnie (I-21). Animacja skaluje kropkę, więc jej rozmiar
       mierzy się przez `getComputedStyle` (układ), nie przez
       `getBoundingClientRect` (klatka animacji). */
    '@keyframes mp-tryb-puls{0%,100%{transform:scale(1)}50%{transform:scale(.6)}}' +
    '#' + ID + ' [data-stan="ostatnia-minuta"] .mp-tryb__kropka,' +
    '#' + ID + ' [data-stan="koncowka"] .mp-tryb__kropka{animation:mp-tryb-puls 1s steps(60) infinite}' +
    '#' + ID + ' [data-stan="zero"] .mp-tryb__kropka{animation:none}' +

    /* `[X]` RAMKA JUŻ NIE PULSUJE — `mp-tryb-puls-ramki` zdjęte 2026-08-28,
       decyzja operatora po pomiarze barw. Obrys ZOSTAJE, tylko stoi.

       TO JEST ODEJŚCIE OD PLIKU I TAK MA ZOSTAĆ ZAPISANE. Adnotacja na klatce
       `7196:11087` mówi wprost: „Ostatnie 60 s: kropka rośnie, robi się
       pomarańczowa i pulsuje raz na sekundę — RAMKA MINUTNIKA TEŻ". Ten puls nie
       był wymysłem runtime'u — był ZGŁOSZONYM BRAKIEM i został dorobiony właśnie
       po to. Zdejmujemy go świadomie, wbrew adnotacji, i to jest cena decyzji,
       nie jej efekt uboczny.

       POWÓD, policzony: pulsowała BARWA OBRYSU CAŁEJ PIGUŁKI, czyli prostokąta
       **361 × 236 px**. Razem z kropką dawało to DWIE migające powierzchnie
       naraz, z czego większa zajmowała ćwierć ekranu. Zgłoszenie operatora:
       „można dostać oczopląsu". Migający prostokąt tej wielkości jest definicją
       szumu; migająca kropka 12 px przy liczbie nią nie jest.

       Alarm nie stracił przez to nośnika — DOSTAŁ LEPSZY: barwę odliczania
       (reguła niżej). Sygnał ląduje tam, gdzie oko i tak patrzy.

       Cofnięcie: przywrócić `@keyframes mp-tryb-puls-ramki` z `outline-color`
       oraz dwie reguły `animation` na pigułce (`ostatnia-minuta`/`koncowka`
       oraz `zero` → `none`). */

    /* W17 POPRAWIONE (D-44.1) · styl `Caption` to 12/16/500, nie 14/16/500.
       (Bez gwiazdek wokół liczby: `**12**` przed ukośnikiem daje ciąg `*` `*` `/`,
       który zamyka ten komentarz w połowie zdania. Złapane `node --check`.)
       W17 zapisało „stopień i interlinia były zgodne" — i to była nieprawda,
       przez DOKŁADNIE TĘ SAMĄ pułapkę, którą ten sam przebieg złapał dla `Timer`
       (34 mobilne vs 48 z fallbacku desktopowego): `typo/Caption` ma tryby, a 14
       to nie jest tryb mobilny. `get_variable_defs` na OBU kaflach — startowym
       `7195:11026` i rozwiniętym `7195:11078` — zwraca `typo/Caption: 12`.
       ROZSTRZYGNIĘTE PIKSELAMI, nie samym dumpem zmiennych: atrament napisu
       „dodaj koncentrat" na renderze klatki ma **97 px**, a ten sam ciąg w DM Sans
       Medium mierzy 97,2 px przy 12 i 113,4 px przy 14. Pomiar wykonany w ŻYWEJ
       stronie, gdzie ładowanie kroju jest dowiedzione kontrolą podmiany
       (DM Sans 97,2 ≠ generyczna 88,7 ≠ nieistniejąca 80,3); pierwsze podejście
       w pustej karcie tę kontrolę OBLAŁO (12 px = nieistniejąca = 80,3) i zostało
       odrzucone, nie zaraportowane. */
    /* D-44.4 — 12 px między nazwą a czasem, ODCZYTANE z `7195:11026`: w wierszu
       296 px kropka zajmuje 0–8, nazwa 20–209, czas 221–296, czyli oba odstępy
       wynoszą 12. Odstęp kropka→nazwa niósł już `margin-right` kropki; drugiego
       nie było wcale i nazwa dochodziła DOKŁADNIE do cyfr. Przy krótkiej nazwie
       tego nie widać (elastyczny wiersz zostawia lukę sam), przy długiej wielokropek
       stykałby się z czasem — czyli wada widoczna tylko na danych, których akurat
       nie było w przepisie pilotażowym. */
    '#' + ID + ' .mp-tryb__nazwa-min{flex:1 1 auto;min-width:0;overflow:hidden;' +
      'white-space:nowrap;text-overflow:ellipsis;font-size:12px;line-height:16px;' +
      'font-weight:500;margin-right:' + W.kropkaLuka + 'px}' +
    /* R9 — czas prawo-przypięty do krawędzi treści; przy szewronie oddaje 28 px */
    /* W18 ZAMKNIĘTE (2026-08-28) — reguła bazowa obsługuje WYŁĄCZNIE formę
       `zwinieta` (obie pozostałe, `pelna` i `start`, nadpisuje reguła niżej), więc
       to jest stopień pisma pigułki zwiniętej i nic poza nim.

       Stało tu **24 px wagi 400**. Plik rysuje `Price Small`, a `get_variable_defs`
       na `7254:10903` („pigułka — w toku") rozwija ten styl wprost:
       `Font(family: "DM Sans", style: Medium, size: typo/Price small, weight: 500,
       lineHeight: 1)` przy `typo/Price small: 14`. Czyli **14 px wagi 500**, nie 24
       wagi 400 — dziesięć pikseli i pół wagi różnicy.

       Potwierdzenie geometrią, nie samym dumpem zmiennych: węzeł `czas` w tej
       instancji ma **33×14**. Pole wysokości 14 nie mieści pisma stopnia 24 —
       przy 24 sama interlinia `1` dałaby 24. Zgadza się wyłącznie z czternastką.

       W18 zapisało „Price Small 16" i to też było o dwa piksele obok: 16 jest
       wartością ZAPASOWĄ tokenu, a tryb mobilny zmiennej daje 14. Ta sama pułapka
       co przy `typo/Timer` (34 mobilne vs 48 z fallbacku) i przy H4 (22 vs 32).

       `line-height` zostaje `W.wiersz`, nie `1`: pole wiersza ma 34 px i to ono
       centruje pismo w pionie. Przy `line-height:1` czternastka usiadłaby przy
       górnej krawędzi 34-pikselowego pudełka.

       CENA, NAZWANA WPROST: odliczanie w pigułce zwiniętej robi się drobne —
       czytelne z ręki, nie z drugiego końca kuchni. Tak rysuje plik: zwinięta
       pigułka to minutnik w TLE, a stopień 34 wraca w momencie rozwinięcia. */
    '#' + ID + ' .mp-tryb__odliczanie{flex:0 0 auto;margin-left:auto;' +
      'font-size:14px;font-weight:500;' +
      'line-height:' + W.wiersz + 'px;height:' + W.wiersz + 'px;' +
      'font-variant-numeric:tabular-nums}' +
    /* W64/W66 (przeb. 26) — styl `Timer` w pigułce ROZWINIĘTEJ: DM Sans **Bold 700**,
       `typo/Timer` = **34** (48 z fallbacku to tryb desktopowy zmiennej — ta sama
       zależność co H4 32→22, H6 24→18, Body large 18→16), interlinia **1**, pole
       **96 px prawo-równane**, barwa `primary-text`; przy `0:00` — `primary-cta`.
       Odczyt: `7195:11078` (krótka, biegnąca) i `7240:10922` (pełna, 0:00).
       DWIE formy, nie trzy: pigułka ZWINIĘTA ma w Figmie styl `Price Small` 16
       (W18) i została nietknięta, bo to otwarty kandydat na konflikt — jedna klasa
       runtime'u obsługiwała obie i podnosząc ją globalnie rozstrzygnąłbym W18 po cichu.
       Stopień 34 NIE zmienia wysokości wiersza: interlinia 1 × 34 = `W.wiersz`,
       czyli dokładnie pole, które pigułka miała od przebiegu 6 (C04 = 16+34+12+48+16).
       `min-width` zamiast `width`: klatka rysuje wyłącznie `MM:SS`, a runtime formatuje
       też `G:MM:SS` — sztywne 96 przycięłoby godzinę, której plik nie narysował. */
    '#' + ID + ' [data-forma="pelna"] .mp-tryb__odliczanie,' +
    '#' + ID + ' [data-forma="start"] .mp-tryb__odliczanie{font-size:34px;' +
      'font-weight:700;line-height:1;height:' + W.wiersz + 'px;' +
      'min-width:96px;text-align:right}' +
    /* ALARM NA LICZBIE — nowy nośnik wyróżnienia ostatniej minuty (2026-08-28).
       Nie jest to zachowanie wymyślone: plik rysuje pomarańczowe odliczanie przy
       0:00 (`7240:10922`) i runtime miał już tę regułę. Ta zmiana PRZESUWA JĄ
       WCZEŚNIEJ W CZASIE — na `ostatnia-minuta` i `koncowka` — zamiast dokładać
       nowy mechanizm. Liczba jest tym, na co użytkownik i tak patrzy, więc niesie
       sygnał taniej niż obrys ćwierci ekranu.

       ROZSZERZONE NA WSZYSTKIE FORMY, nie tylko `pelna`. Do dziś stało tu
       `[data-forma="pelna"][data-stan="zero"]`, bo taka była zmierzona klatka.
       Pigułka ZWINIĘTA też dochodzi do 0:00 i też bywa w ostatniej minucie —
       a po zdjęciu pulsu ramki ma wtedy jeden jedyny znak alarmu: kropkę.
       Zawężenie do jednej formy zostawiłoby najsłabszy stan bez sygnału.
       To jest nazwane rozszerzenie zakresu reguły, nie skutek uboczny. */
    '#' + ID + ' [data-stan="ostatnia-minuta"] .mp-tryb__odliczanie,' +
    '#' + ID + ' [data-stan="koncowka"] .mp-tryb__odliczanie,' +
    '#' + ID + ' [data-stan="zero"] .mp-tryb__odliczanie{color:var(--mp-cta)}' +
    /* D-40.2 · SZEWRON PIGULKI OBRACA SIE, ale W DRUGA STRONE NIZ FAQ.
       Decyzja operatora 2026-08-28, z uzasadnieniem, ktore rozstrzyga sprawe:
       „szewron powinien byc zwrocony domyslnie do gory, a w wersji rozwinietej
       do dolu. Wszak minutnik rozwija sie DO GORY, a nie do dolu, jak FAQ".

         zwinieta (domyslna)  strzalka W GORE   -> rotate(-180deg)
         pelna (rozwinieta)   strzalka W DOL    -> rotate(0deg)

       ODWRACA to D-40.1, ktore skopiowalo akordeon produktowki
       (`.mp-faq-item__heading .icon-text.is-faq`: down zwiniety / up rozwiniety).
       Pomiar produktowki byl poprawny i nie jest podwazony — po prostu opisywal
       element, ktory rosnie W DOL. Pigulka minutnika stoi PRZYPIETA DO DOLU
       ekranu i rozwija sie ku gorze, wiec ta sama regula wizualna („szewron
       pokazuje, dokad to pojedzie") daje tu przeciwny znak. Kopiowanie wzorca
       bez sprawdzenia, w ktora strone rosnie element, bylo bledem D-40.1.

       CO NA TO PLIK. Klatek z szewronem jest szesc:
         `7211:10925` `7196:11059` `7196:11116` `7196:11144`  rozwinieta, `down`
         `7240:10900`                                          rozwinieta, `up`
         `7254:10903`                                          zwinieta,   `down`
       Regula operatora zgadza sie z CZTEREMA rozwinietymi (`down` przy pelnej),
       a `7240:10900` i `7254:10903` sa wzgledem niej dryfem. Zapisuje to wprost,
       zeby nikt nie „naprawial" pliku pod kod ani kodu pod pliku bez decyzji:
       zgodnosc jest 4/6, nie 6/6, i tak ma zostac.

       `[X]` 2026-08-28, wczesniej tego samego dnia, ZDJALEM stad obrot razem
       z transycja, czytajac zgloszenie „szewrony rozjechane z projektem" jako
       polecenie odwzorowania pliku co do glifu. Operator o zdjecie obrotu nie
       prosil. Rozjazd byl w KIERUNKU, nie w istnieniu rotacji.

       Rotacja wisi na `[data-forma]`, nie na osobnej klasie stanu: forma JEST
       stanem rozwiniecia pigulki i drugi kanal tej samej prawdy trzeba by
       synchronizowac. Tym razem selektor jest POZYTYWNY (`="zwinieta"`), a nie
       negacja: obraca sie forma zwinieta, wiec pytamy o nia wprost. */
    '#' + ID + ' .mp-tryb__szewron{flex:0 0 auto;width:' + W.szewron + 'px;height:22px;' +
      'margin-left:' + W.szewronLuka + 'px;font-size:16px;line-height:22px;text-align:center;' +
      'transition:transform 280ms}' +
    '#' + ID + ' .mp-tryb__pigulka[data-forma="zwinieta"] .mp-tryb__szewron{' +
      'transform:rotate(-180deg)}' +
    '@media (prefers-reduced-motion:reduce){' +
      '#' + ID + ' .mp-tryb__szewron{transition:none}}' +

    /* W63 (przeb. 25) — podpowiedź w pigułce pełnej (`7240:10923`) jest zwykłą treścią
       `Body small` w `primary-text`, nie tekstem przygaszonym. Runtime dawał `beige-3`.
       Ten sam kształt pomyłki co W60: przygaszenie wpisane tam, gdzie plik go nie rysuje. */
    '#' + ID + ' .mp-tryb__podpowiedz{margin:0;font-size:14px;line-height:19px;' +
      'color:var(--mp-atrament)}' +
    /* W21 (przeb. 21, `7293:10902` „cta — primary"): promień **100**, nie 8 —
       kapsuła, tak samo jak CTA „dalej" (W06). Ósemka była tu tym samym promieniem
       kart treści, co przy pigułce; jedna liczba rozlana po trzech miejscach.
       Tekst: styl `Button` — DM Sans SemiBold **600**, 16/20. */
    /* WYPEŁNIONY — D-46.1, decyzja podjęta na zrzucie stanu
       biegnącego: „wadą jest brak wypełnienia górnego CTA".

       ODWRACA to decyzję z 2026-08-19 („CTA kafla jest obrysowane, nie wypełnione"),
       i odwraca ją JAWNIE, ustaleniem — nie moim odczytem. Sprzeczności między
       odczytami nie było: tamten patrzył na komponent `cta — primary` (`7293:10902`),
       a kafel minutnika używa `przycisk — primary` (`7237:105140`), którego zmienne to
       `white off bg` na `primary text`. Dwa komponenty, dwa wyglądy, jedna pomyłka
       w tym, który tu stoi.

       TA SAMA REGUŁA OBSŁUGUJE TERAZ KAFEL STARTOWY. Do D-46.1 stała obok osobna
       klasa `.mp-tryb__start-cta` o identycznej treści — bo primary było wtedy
       obrysowe i trzeba było je czymś nadpisać. Skoro oba są wypełnione, dwie klasy
       o tym samym wyglądzie mogą się już tylko rozjechać. Została jedna.
       `font-family:inherit` zostaje z `.mp-tryb__start-cta`: strona i tak podaje krój
       przyciskom (zmierzone: `"DM Sans", system-ui, sans-serif`), ale opieranie się
       na cudzej regule to zależność, której nie widać w tym pliku. */
    '#' + ID + ' .mp-tryb__primary{height:' + W.przycisk + 'px;flex:0 0 auto;' +
      'border:0;border-radius:100px;font-family:inherit;' +
      'font-weight:600;font-size:16px;line-height:20px;' +
      'background:var(--mp-atrament);color:var(--mp-bialy);' +
      'cursor:pointer;width:100%}' +
    '#' + ID + ' .mp-tryb__ghosty{display:flex;gap:' + W.wnetrze + 'px;flex:0 0 auto;' +
      'height:' + W.przycisk + 'px}' +
    /* W62 (przeb. 25) — ghost pigułki (`7293:10935` / `7293:10938` „cta — ghost").
       **Został z tyłu za poprawką W21 z przebiegu 21.** Tamta naprawiła sąsiedni
       `.mp-tryb__primary` (promień 8 → 100, waga → 600) i nazwała przyczynę: „jedna
       liczba rozlana po trzech miejscach". Ghost stał obok, w tym samym bloku CSS,
       z tą samą ósemką — i nie został ruszony, bo żaden wiersz o niego nie pytał.
       Cztery rozjazdy: promień **8 → 100**, obrys **1 px `beige-2` → 1,5 px `beige-3`
       #816D44** (`brązowy-2` w nazewnictwie pliku), waga **odziedziczona → 600**,
       interlinia **→ 20** ze stylu `Button`. Rozmycie tła z pliku pomijam świadomie:
       ghost leży na jednolitym `beige-1` kafla, więc `backdrop-filter` nic tu nie
       rysuje, a kosztuje warstwę kompozycji — pozycja **D-25.4**. */
    '#' + ID + ' .mp-tryb__ghost{flex:1 1 0;height:' + W.przycisk + 'px;border-radius:100px;' +
      'border:1.5px solid var(--mp-beige-3);background:transparent;color:var(--mp-atrament);' +
      'font-weight:600;font-size:16px;line-height:20px;cursor:pointer;min-width:0}' +

    /* treść kroku */
    /* Badge czasu — trzy stany z aneksu poz. 4, jeden element o trzech odmianach.
       Wysokość 26 px z klatek Figmy (§3.5, pigułka wiersza). */
    /* RZĄD NAGŁÓWKA KROKU — B19/W30, Figma `7212:10899`. Dołożony w przebiegu 22,
       bo porównanie ekranowe 1:1 pokazało, że runtime NIE RENDERUJE NAZWY KROKU:
       tytuł jest parsowany (`== tytuł`), jest w modelu (`krok.tytul`), jest w opisie
       interfejsu i jest narysowany w Figmie — ginął dopiero tutaj, w renderze.
       Rząd to `space-between` z tytułem na `flex: 1`, więc przy braku tytułu pigułka
       czasu i tak stoi po prawej, dokładnie jak w pliku.
       STOPIEŃ 22, NIE 32: `get_variable_defs` podaje `typo/H4` = 22, a metadane węzła
       dają wysokość 24 = 22 × 1,1. Liczba 32 z `get_design_context` to wartość
       ZAPASOWA tokenu, nie jego odczyt — patrz D-22.1. */
    '#' + ID + ' .mp-tryb__rzad-kroku{display:flex;align-items:center;' +
      'justify-content:space-between;gap:8px;min-height:26px}' +
    '#' + ID + ' .mp-tryb__rzad-kroku .mp-tryb__czas{align-self:center;flex:0 0 auto}' +
    /* NIENARYSOWANE w sensie pliku fontu: `DM Serif Display` nie ma dziś subsetu
       w `local/tech/fonts/` — harness zmierzy zadeklarowany krój, ale wyrenderuje
       zastępczy szeryf. Pozycja na listę decyzji (D-22.2), nie powód, żeby nie
       deklarować kroju: brak PLIKU nie jest powodem do rysowania złym krojem. */
    '#' + ID + ' .mp-tryb__nazwa-kroku{flex:1 1 auto;min-width:0;margin:0;' +
      'font-family:"DM Serif Display",Georgia,serif;font-weight:400;font-size:22px;' +
      'line-height:1.1;color:var(--mp-zielen)}' +
    /* U-2 (rozstrzygnięcie): pigułka czasu stoi przy PRAWEJ
       krawędzi JEDNAKOWO na każdej powierzchni. Do przeb. 29 miała `flex-start`,
       więc na ekranie KROKU wychodziła po prawej (rząd `space-between` z tytułem,
       x=260/282), a na PEŁNEJ LIŚCIE po lewej (x=16) — ta sama klasa, dwa wyrównania,
       bo w liście nie ma sąsiada, który by ją odepchnął. Nadpisanie dla rzędu kroku
       (`align-self:center`) zostaje: tam o stronę decyduje `space-between`, a `center`
       dotyczy osi poprzecznej i pionowo centruje pigułkę względem tytułu. */
    '#' + ID + ' .mp-tryb__czas{align-self:flex-end;height:26px;padding:0 12px;' +
      'border-radius:13px;font-size:14px;line-height:26px;background:var(--mp-beige-1);' +
      'color:var(--mp-atrament)}' +
    /* „bez minutnika" ma zmierzony MNIEJSZY stopień pisma (16 px wysokości tekstu
       wobec 19 przy „ok. 8 min") — potwierdzone dwoma niezależnymi pomiarami
       w Figmie, pozycja na liście decyzji „zostawić czy ujednolicić". Odwzorowuję
       plik, bo hierarchia prawdy każe iść za pomiarem, nie za intuicją. */
    '#' + ID + ' .mp-tryb__czas[data-stan="bez"]{font-size:12px;color:var(--mp-beige-3)}' +
    /* D-39.14 — badge z minutnikiem jest `<button>`, więc trzeba zdjąć z niego to,
       co przeglądarka dokłada przyciskom: obrys, własny krój i wyrównanie tekstu.
       Bez tego identycznie wyglądający element miałby inny font i inną wysokość niż
       badge bez minutnika, a §3.2 mówi wprost, że klasa bez `font-family` cicho
       spada na Arial. Geometria (26 px, promień 13, dopełnienie 12) zostaje z reguły
       bazowej i się nie zmienia — pomiary wiersza kroku pozostają ważne. */
    '#' + ID + ' button.mp-tryb__czas{border:0;font-family:inherit;font-weight:inherit;' +
      'text-align:center;cursor:pointer;-webkit-appearance:none;appearance:none}' +
    /* D-43.2 · WYZWALACZ MINUTNIKA BEZ MINUT. Etykietą tego przycisku był czas
       trwania („3 min") i to on miał zniknąć z prawego górnego rogu (polecenie).
       Zostaje ta sama pigułka i ten sam cel dotyku, tylko treścią jest
       glif `timer` — ZMIERZONY W SUBSECIE (24,0 px przy kontroli ujemnej 408 px na
       ciągu nieistniejącym, sonda wykonana WEWNĄTRZ `#mp-tryb`, bo reguła ikony
       jest scoped — poza nim ten sam pomiar dawał 61,8 px i kłamał).
       Dopełnienie schodzi z 12 na 5, bo pigułka nie niesie już słowa: 5+20+5 = 30 px
       szerokości przy zachowanej wysokości 26 i promieniu 13. */

    '#' + ID + ' .mp-tryb__opis{margin:0;font-size:16px;line-height:24px}' +
    /* `D-39.62` — waga pogrubienia WPISANA, nie odziedziczona po przeglądarce.
       Parser wystawia od dziś `<strong>` w `tekstHtml`/`kryteriumHtml`, a domyślna
       wartość dla `strong` to `bolder` — czyli wartość WZGLĘDNA, liczona od wagi
       rodzica. Przy akapicie 400 wypadnie 700, ale przy dowolnym elemencie o wadze
       500 albo 600 (a takich jest w tym widoku szesnaście) wypadłaby inna i wynik
       zależałby od miejsca w drzewie. 700 jest tu wagą już używaną — niesie ją
       odliczanie minutnika i pytanie tooltipa, czyli wyróżnienie w tekście
       o rozmiarze zbliżonym do treści kroku. */
    '#' + ID + ' strong{font-weight:700}' +
    /* D-39.15 · ZAKREŚLENIE USUNIĘTE Z PRODUKTU,
       wprost: „usuńmy efekt highlightu zupełnie, jest nieutrzymywalny".
       Stała tu reguła malująca `<mark>` na atrament z wybitą bielą (W53/W54,
       `box-decoration-break: clone`, R14). Zdjęta razem ze ŹRÓDŁEM: parser nie
       produkuje już `<mark>`, tylko zdejmuje `**…**` i zostawia sam tekst
       (`bezZakreslen()` w `przepis-parser.js`). Usunięcie po jednej stronie
       zostawiłoby albo martwą regułę, albo gwiazdki na ekranie.
       **Skutek dla matrycy, do rozliczenia, a nie do przemilczenia:** wiersze
       `W53`, `W54` i `R14` tracą przedmiot, a mutacja `M5-mark-blok` (cel `B14`,
       „marker łamie się z wierszem") przestanie cokolwiek psuć i wyjdzie
       `ZERO EFEKTU`. Trzy wiersze do WYCOFANIA i jedna mutacja do zdjęcia
       z katalogu — nie do zostawienia na zielono.
       Cofnięcie: przywróć tę regułę ORAZ `<mark>$1</mark>` w parserze; jedno bez
       drugiego daje stan pośredni, który wygląda na usterkę. */
    /* B16 — font ikon w RUNTIMIE. Trzy statyczne subsety, nie oś zmienna: `font-weight`
       syntetyczny dałby cichy fałsz (waga „by wyglądała", a nie „byłaby"). `@font-face`
       stoi POZA zakresem `#ID`, bo reguła at-rule nie zagnieżdża się w selektorze —
       to jedyne miejsce arkusza, które wychodzi poza korzeń overlaya, i wychodzi
       z konieczności języka, nie z wyboru.
       `font-display: block`, nie `swap`: przy `swap` przeglądarka rysuje najpierw
       NAZWĘ ligatury krojem zastępczym, czyli słowo „hourglass" w pasku meta. */
    FONT_IKON.map(function (f) {
      return "@font-face{font-family:'Material Symbols Outlined';font-style:normal;" +
             'font-weight:' + f[0] + ";font-display:block;src:url('" + FONT_IKON_BAZA + f[1] +
             "') format('woff2')}";
    }).join('') +
    /* `font-feature-settings:'liga'` JAWNIE: ligatury standardowe bywają wyłączane
       przez reset strony gospodarza, a wtedy nazwa ikony renderuje się jako SŁOWO —
       objaw wygląda na brak glifu, a jest brakiem cechy (nauka z przeb. 21). */
    '#' + ID + " .mp-ikona{font-family:'Material Symbols Outlined';font-weight:400;" +
      "font-variant-ligatures:normal;font-feature-settings:'liga';" +
      'letter-spacing:normal;text-transform:none;white-space:nowrap;' +
      'direction:ltr;-webkit-font-smoothing:antialiased}' +
    /* `D-39.44` · ZDJĘCIE NA ASPEKCIE 16:9, NIE NA STAŁEJ WYSOKOŚCI.
       **To domyka `D-31.1`** — rozjazd między inwariantem `0aa` („żadnej miary
       zależnej od szerokości") a `D-26.2` („aspekt") stał na liście decyzji od
       przebiegu 31. **Rozstrzygnięto na rzecz aspektu, 16:9.**

       Przesłanka jest zmierzona i to ona czyni z tego USTERKĘ, nie preferencję:
       Figma rysuje 328×150, czyli 2,19:1, ale runtime miał `height:150px` na sztywno
       przy PŁYNNEJ szerokości. Zdjęcie było więc zgodne z projektem **wyłącznie przy
       360 px** i płaszczyło się na każdym szerszym telefonie — przy ekranie 440 px
       kolumna ma 408 px, co daje **2,72:1**. Im lepszy telefon, tym gorszy kadr.
       Zgłoszenie („zwyczajnie za szerokie") opisuje więc dryf, a nie sam
       projekt. `aspect-ratio` znosi go w całości: kadr jest ten sam na każdej
       szerokości, a 16:9 daje 184 px przy kolumnie 328.

       **Reguła BAZOWA, więc obejmuje też zdjęcie KROKU** — i to jest świadome:
       klatka kroku (`7195:10965`) ma dokładnie te same 328×150, czyli ten sam dryf.
       Zostawienie kroku na stałej wysokości dałoby dwa różne kadry w jednym
       produkcie, co jest gorsze niż jedna zmiana więcej.

       Zapas zgodności: `aspect-ratio` działa od iOS 15 i Chrome 88, czyli poniżej
       każdego urządzenia, na którym ten tryb ma sens. Cofnięcie: `height:150px`
       zamiast `aspect-ratio`. */
    '#' + ID + ' .mp-tryb__foto{width:100%;aspect-ratio:16/9;object-fit:cover;' +
      'border-radius:8px;display:block}' +
    /* Zdjęcie GŁÓWNE przepisu (D-23.1) — ekran startowy `7195:10901` i zakończenia
       `7195:11188`, obie ramki 328×150 z promieniem **12**. Modyfikator, a nie zmiana
       `.mp-tryb__foto`, bo zdjęcie KROKU nie ma dziś klatki w zestawie (inwentarz
       INTERAKCJE zna wyłącznie „krok BEZ zdjęcia", `7240:10936`) — przestawienie
       jego promienia byłoby zielenią z lektury kodu, nie z odczytu.
       **`D-31.1` ROZSTRZYGNIĘTE**: wygrywa `D-26.2`, czyli
       aspekt — patrz `D-39.44` przy regule bazowej. Poprzednie brzmienie tego akapitu
       („wysokość zostaje STAŁA, bo inwariant 0aa zabrania miary zależnej od
       szerokości") było zapisem WSTRZYMANIA, nie rozstrzygnięcia, i przestało
       obowiązywać. Modyfikator niesie odtąd wyłącznie promień 12. */
    /* `D-51.4` · ZDJĘCIE GŁÓWNE NA PROPORCJI RYSOWANEJ 328:150, nie na 16:9.
       To NIE jest cofnięcie D-39.44, tylko dokończenie jej własnego rozumowania.
       D-39.44 usuwała `height:150px` z płynnej kolumny, bo stała
       wysokość zgadzała się z klatką WYŁĄCZNIE przy 360 px i płaszczyła kadr na każdym
       szerszym telefonie. Sporna była MIARA ZALEŻNA OD SZEROKOŚCI, nie liczba 150.
       `aspect-ratio` znosi dryf tak samo dobrze przy 2,19:1, co przy 16:9 — a 2,19:1 to
       dokładnie to, co klatka rysuje w OBU miejscach, gdzie to zdjęcie stoi: `7195:10901`
       (start) i `7195:11188` (zakończenie), obie ramki 328×150.

       Przesłanka jest zmierzona i o trzy piksele: po wdrożeniu klatki `7627:12679`
       selektor porcji schodził pod pasek dolny na 10/16 przepisów przy 375×667 —
       o 3 px. 16:9 daje przy kolumnie 343 px wysokość 193, proporcja rysowana 157.
       Różnica 36 px kasuje te trzy z zapasem i przywraca 0/16 na wszystkich trzech
       ekranach. Zdjęcie KROKU zostaje na 16:9 (reguła bazowa) — modyfikator dotyczy
       wyłącznie zdjęcia głównego, bo tylko ono ma narysowaną klatkę. */
    '#' + ID + ' .mp-tryb__foto--glowne{border-radius:12px;aspect-ratio:328/150}' +
    /* Blok składników na ekranie kroku — W22/W26/W29, Figma `7477:12561` (zewnętrzne)
       i `7195:10935` (ramka). DWA pudełka, nie jedno: zewnętrzne niesie nagłówek
       „składniki" (`7477:12562`) i samo nie ma żadnego wykończenia; wewnętrzne JEST
       ramką — obrys 1 px `beige-2`, promień 12, padding 16, rytm 12 — i nie ma
       WYPEŁNIENIA. Do przebiegu 22 runtime nie rysował tu ani ramki, ani żadnego
       z DWÓCH narysowanych napisów; blok stał nago na tle strony, więc jego brak
       nie miał czym paść — dokładnie ta sama klasa braku co pas dolny (W01/W02). */
    '#' + ID + ' .mp-tryb__blok-skladnikow{display:flex;flex-direction:column;gap:8px}' +
    /* ROZWIJANIE W MIEJSCU (poprawka 2026-08-15, decyzja — zmienia §3.8).
       Do tej poprawki „zobacz pozostałe" PODMIENIAŁO całą treść TOP-u na osobny
       ekran listy. Stąd brały się DWA zgłoszone objawy naraz i oba były jednym
       zachowaniem: rozwinięcie „skakało", bo nie było czego animować przy podmianie
       dokumentu, a akapit kroku „znikał", bo ekran listy z założenia go nie miał.
       Teraz pozostałe sekcje są RODZEŃSTWEM listy „w tym kroku" w tej samej ramce,
       a `height` jest animowalne, bo idzie przez piksele, nie przez `auto`.
       `overflow:hidden` jest warunkiem koniecznym, nie ozdobą: bez niego zwinięty
       kontener o wysokości 0 dalej rysowałby treść poza swoim pudełkiem. */
    /* `flex:0 0 auto` NA SAMYM KONTENERZE, nie tylko na jego dzieciach — druga
       odsłona tej samej pomyłki tego samego dnia. Ramka bloku składników jest
       kolumną flex, więc `.mp-tryb__reszta` jest w niej ELEMENTEM flex i domyślne
       `flex-shrink:1` pozwalało ją ścisnąć. Zmierzone: `height:auto`, a mimo to
       `scrollHeight 373` przy `clientHeight 360` — trzynaście pikseli listy
       obcinanych przez `overflow:hidden`, bez własnego paska przewijania, bo
       kontener nie jest przewijalny. Z zewnątrz wygląda to dokładnie jak
       „rozwinięcie listy uniemożliwia przewijanie" (zgłoszenie). */
    '#' + ID + ' .mp-tryb__reszta{overflow:hidden;height:0;display:flex;' +
      'flex:0 0 auto;flex-direction:column;gap:8px}' +
    /* D-39.21 · STAN OTWARTY NIE MOŻE NICZEGO PRZYCIĄĆ — `overflow:visible` obok
       `height:auto`. Zgłoszenie wracało od kilkunastu przebiegów w dwóch
       przebraniach: „rozwinięcie uniemożliwia przewijanie" i „lista urwana".
       Zmierzone: przy rozwiniętej liście `.mp-tryb__reszta` ma `scrollHeight 311`
       przy `clientHeight 298` — trzynaście pikseli treści siedzi pod `overflow:hidden`,
       w kontenerze, który sam nie jest przewijalny, a TOP ma wtedy zaledwie 30 px
       zapasu. Z zewnątrz to jest dokładnie „ekran zablokowany".
       **Przyczyny tych 298 px NIE USTALIŁEM i tego nie ukrywam** — `transition:none`,
       `height:auto` i `overflow:visible` na samym kontenerze, a także `flex-shrink:0`
       na wszystkich potomkach TOP-u, nie zmieniły ani jednego piksela; jedyne, co
       działało, to `min-height` wprost. Przyrząd tej sesji (karta wyhamowana,
       `Page.captureScreenshot` pada po 30 s) nie pozwala pójść dalej.
       **Dlatego zmiana nie celuje w przyczynę, tylko w SKUTEK, i jest tak dobrana,
       żeby skutek był niemożliwy niezależnie od przyczyny:** `overflow:hidden`
       potrzebne jest WYŁĄCZNIE do animacji zwijania. W stanie otwartym nie pełni
       żadnej funkcji, a jedyne, co może zrobić, to schować treść. Zdjęte —
       cokolwiek ustawia wysokość na 298, treść wyjdzie poza pudełko i będzie
       widoczna, bo `.mp-tryb__ramka-skladnikow` ma `overflow:visible`.
       `min-height` dokładam jako drugi bezpiecznik: pudełko nie może być niższe
       od własnej zawartości, więc rytm bloku też się nie posypie.
       Cofnięcie: usuń `overflow` i `min-height` z tej reguły. */
    '#' + ID + ' .mp-tryb__reszta[data-otwarta]{height:auto;overflow:visible;' +
      'min-height:max-content}' +
    /* `flex:0 0 auto` na DZIECIACH — bez tego akordeon nie otwiera się w ogóle
       i objaw jest mylący. Kontener jest kolumną flex, więc przy `height:0`
       domyślne `flex-shrink:1` ściska każde dziecko do zera; `scrollHeight`
       liczy wtedy zawartość ŚCIŚNIĘTĄ i zwraca 0, czyli wysokość docelowa
       animacji wychodzi zerowa. Zmierzone: etykieta i `aria-expanded`
       przełączały się poprawnie, a wysokość zostawała 0 po 500 ms. */
    '#' + ID + ' .mp-tryb__reszta>*{flex:0 0 auto}' +
    /* Animacja WYŁĄCZNIE przy `no-preference`. Nie jest to uprzejmość: przy
       `reduce` brak przejścia znaczy, że `transitionend` NIGDY nie przyjdzie,
       więc kod niżej musi mieć osobną ścieżkę — i ma. */
    '@media (prefers-reduced-motion:no-preference){#' + ID + ' .mp-tryb__reszta{' +
      'transition:height 220ms cubic-bezier(.4,0,.2,1)}}' +
    '#' + ID + ' .mp-tryb__naglowek-skladnikow,#' + ID + ' .mp-tryb__etykieta-sekcji{' +
      'margin:0;height:16px;font-size:14px;line-height:16px;font-weight:500;' +
      'color:var(--mp-atrament)}' +
    /* PADDING 15, NIE 16 — i to nie jest odstępstwo od Figmy, tylko jej wierne
       przełożenie. Figma rysuje obrys ramki do ŚRODKA (`strokeAlign: INSIDE`),
       więc jej padding 16 mierzy się od krawędzi ramki i obrys mieści się w tych
       16. CSS dokłada border DO paddingu, więc `border:1 + padding:16` dałoby lico
       kolumny na 33 i wiersz 294 px zamiast 296 — czyli rozjazd o piksel z DWIEMA
       rzeczami zmierzonymi wcześniej: `tooltipX: 32` (§3.14) i szerokością wiersza
       296 (§3.2). 1 + 15 = 16 odtwarza plik dokładnie. Wiersz W22 mierzy dlatego
       LICO (obrys + padding = 16), a nie samą liczbę `padding`. */
    '#' + ID + ' .mp-tryb__ramka-skladnikow{display:flex;flex-direction:column;gap:12px;' +
      'padding:15px;border:1px solid var(--mp-beige-2);border-radius:12px;' +
      'background:transparent}' +
    /* Rytm 12 daje tu ODSTĘP RODZICA, więc własny `margin-top` wywoływacza musi
       zniknąć, inaczej 12 zrobiłoby się 24. W liście PEŁNEJ rytm wynosi 8 i margines
       zostaje — dlatego reguła jest zawężona do tej ramki, a nie zmienia klasy.
       W25 malowało tu kreskę atramentem, a zawężenie było wtedy świadome: kreska
       poza ramką to inny węzeł Figmy i nie wolno jej było przemalować odczytem,
       który jej nie dotyczy. **D-39.5 zdejmuje to zawężenie** — rozstrzygnięto
       kolor separatorów globalnie (#3E2B22), więc atrament stoi teraz w regule
       BAZOWEJ `.mp-tryb__wiecej`, a tutaj zostaje wyłącznie rytm. Nadpisanie koloru
       byłoby od tej chwili martwe i udawałoby, że kontekst coś zmienia. */
    '#' + ID + ' .mp-tryb__ramka-skladnikow .mp-tryb__wiecej{margin-top:0}' +
    /* Lista składników kroku (W3). Skok 31 = wiersz 19 + odstęp 12 (§3.2);
       wiersz z markerem ma 20 px, bo kółko `i` jest o 1 px wyższe od tekstu
       (§3.14) — dlatego wysokość wiersza jest TREŚCIĄ, nie stałą. */
    '#' + ID + ' .mp-tryb__skladniki{margin:0;padding:0;list-style:none;' +
      'display:flex;flex-direction:column;gap:12px}' +
    '#' + ID + ' .mp-tryb__wiersz{display:flex;align-items:center;' +
      'font-size:14px;line-height:19px}' +
    /* W23 — checkbox `I7273:10794;7224:10912`: 16×16, obrys 1 px `primary-text`,
       promień 3. Poprzedni komentarz mówił „rozmiaru plik nie podaje" i była to
       prawda o METODZIE, nie o pliku: `get_metadata` instancji nie rozkłada, ale
       `get_design_context` rozkłada i podaje wszystkie trzy wartości. Runtime miał
       1,5 px `beige-3` r4 — trzy rozjazdy naraz, każdy o jeden stopień, więc żaden
       nie rzucał się w oczy. Cel dotyku dopychany niewidocznie, jak przy markerze. */
    /* W41 — ptaszek `7224:10919`: DM Sans SemiBold **600**, **10 px**, interlinia 1,5
       (15), kolor `white-full-bg` **#FFFFFF**, nie `white-off-bg`. Runtime miał 11/13
       i wagę odziedziczoną (400) — trzeci raz ten sam kształt co W23 i W17: rozjazd
       o jeden stopień w trzech własnościach naraz, więc żadna nie rzuca się w oczy
       osobno. Biel: pas dolny (W01) i ten ptaszek są jedynymi miejscami bieli PEŁNEJ. */
    /* D-39.36 · CHECKBOX TO JEDEN GLIF, NIE PUDEŁKO CSS ZE ZNAKIEM W ŚRODKU.
       Decyzja, wprost: „chcę ten mechanizm. Pusty stan =
       blank, zaznaczony = check_box. Będzie to spójne z resztą projektu".
       **To jest ODSTĘPSTWO OD FIGMY podjęte świadomie**, a nie odczyt — i jest
       jedynym takim miejscem w tym produkcie. `7273:10878` rysuje pudełko 16×16
       (promień 3, obrys 1 px `primary-text`), wypełniane atramentem po zaznaczeniu,
       ze znakiem `✓` w DM Sans SemiBold 10 px BIELĄ w środku. Jednostka 2 z 2026-08-16
       zbadała to i zaleciła zostawienie znaku tekstowego; wybrano spójność
       mechanizmu ikon ponad wierność pojedynczemu komponentowi.

       **RÓŻNICA, KTÓRA Z TEGO WYNIKA I KTÓRA JEST WIDOCZNA — zmierzona, nie
       przewidziana:** subset to trzy STATYCZNE pliki woff2 (Light/Regular/Medium),
       **bez osi `FILL`**. Sprawdzone zrzutem: `check_box` przy `FILL 0` i `FILL 1`
       renderuje się IDENTYCZNIE `[V]` 2026-08-17. Stan zaznaczony jest więc
       kwadratem OBRYSOWANYM z ptaszkiem w środku, a nie kwadratem WYPEŁNIONYM
       z ptaszkiem wyciętym na biało, jak w Figmie. Para blank/check jest spójna
       sama w sobie, ale to nie jest ten sam obraz co w pliku projektowym.
       Odzyskanie wypełnienia wymaga subsetu z osią `FILL` albo dogranego wariantu
       — a subset należy do sesji CMS i jest dla tego łańcucha TYLKO DO ODCZYTU
       (pin w STAN.md). Pozycja decyzyjna, nie zadanie na teraz.

       Glif siedzi we WŁASNYM spanie, nie w `textContent` przycisku: przycisk niesie
       też `.mp-tryb__cel` (niewidzialny cel dotyku 44 px), a `p.textContent = …`
       przy przełączaniu skasowałoby to dziecko. Ten błąd popełniłby każdy, kto
       pójdzie najkrótszą drogą — stąd osobny węzeł i ten komentarz.
       Cofnięcie: przywróć obrys/promień/tło w tej regule, `font-size:10px`,
       `color:transparent`, wróć do `textContent = '✓'` i przywróć regułę
       wypełnienia dla `[data-odhaczony]` / `[data-stan="zuzyty"]`. */
    '#' + ID + ' .mp-tryb__ptaszek{position:relative;flex:0 0 auto;width:16px;height:16px;' +
      'margin-right:8px;padding:0;border:0;background:transparent;cursor:pointer;' +
      'color:var(--mp-atrament);text-align:center}' +
    /* `overflow:hidden` NIE JEST kosmetyką — pilnuje TRAFIALNOŚCI SĄSIADÓW.
       Zmierzone przy nieosiągalnym CDN fontu: ligatura `check_box_outline_blank`
       renderuje się wtedy jako DOSŁOWNY TEKST o szerokości **165 px** w pudełku
       zadeklarowanym na 16. Ptaszek ma `z-index:1`, więc ten wylew leży NAD
       markerem i `elementFromPoint` w geometrycznym środku celu markera zwracał
       `.mp-tryb__ptaszek-glif` zamiast markera — tooltip zamienników przestawał
       być osiągalny palcem, mimo że jego cel dotyku był poprawnie zbudowany.
       Element deklarujący 16×16 ma się do tej deklaracji stosować; bez tego
       awaria wczytywania fontu zamienia dekorację w niewidzialną blokadę.
       NIEZMIERZONE TUTAJ: czy przy WCZYTANYM foncie glif nie ociera się o krawędź
       pudełka — z tego środowiska nie da się pobrać subsetu. Do domiaru na
       stagingu. Ryzyko oceniam jako małe, bo `font-size` i `line-height` już dziś
       równają się 16, więc przycięcie nie zmienia niczego, co się mieści. */
    '#' + ID + ' .mp-tryb__ptaszek-glif{display:block;width:16px;height:16px;' +
      'overflow:hidden;font-size:16px;line-height:16px}' +
    /* Odhaczony w bieżącym kroku = checkbox wypełniony + ✓, BEZ przekreślenia.
       (Dawne NIENARYSOWANE G2; przekreślenie niesie „składnik już zużyty".) */
    /* D-39.4 · ZUŻYTY DOSTAJE OBIE RZECZY NARAZ: wypełniony checkbox ORAZ przekreślenie.
       Rozstrzygnięcie, wprost: „zużyte wymagają zarówno odhaczenia
       checkboxa, jak i przekreślenia tekstu". Zgodne z odczytem `7273:10878`
       (`składnik — zużyty`): pudełko `primary-text` #3E2B22, znak `✓` bielą pełną,
       DM Sans SemiBold 10 px/1,5 — i jednocześnie nazwa `line-through`.
       To ODWRACA dawne G2 w części dotyczącej rozłączności obu delt: rozłączne mają
       być „odhaczony" i „zużyty" jako STANY, a nie ich wykończenia. Wiersz `W42`
       („przekreślenie jest CAŁĄ deltą") jest przez to nieaktualny — patrz `W42b`.
       Cofnięcie: usuń selektor `[data-stan="zuzyty"]` z listy niżej. */
    /* D-39.36 — reguła wypełnienia USUNIĘTA. Stan niesie teraz GLIF
       (`check_box` wobec `check_box_outline_blank`), ustawiany w JS, a nie
       tło i kolor pudełka. Zostawienie jej pomalowałoby ciemny kwadrat POD
       obrysowanym glifem — dwa kwadraty jeden na drugim.
       Intencja `D-39.4` zachowana: zużyty nadal dostaje OBIE delty naraz —
       zaznaczony glif ORAZ przekreślenie nazwy (reguła `line-through` niżej,
       nietknięta). Zmieniło się wykończenie, nie reguła stanu. */
    '#' + ID + ' .mp-tryb__nazwa-skl{flex:0 1 auto;min-width:0;overflow:hidden;' +
      'white-space:nowrap;text-overflow:ellipsis}' +
    /* D1 — DWA stany wiersza, nie trzy: `dalej` nie dostaje delty wizualnej
       (INTERAKCJE v1.4). Rozdziela go nagłówek, linia i kolejność, nie styl. */
    /* W42 — stan `zużyty` niesie WYŁĄCZNIE przekreślenie. Runtime przygaszał nazwę
       do `beige-3` #816D44; w Figmie nie ma na to źródła: wariant `7224:10917` wiąże
       dokładnie dwa kolory (`primary text` #3E2B22 i `white full bg`), a pięć instancji
       na klatce produkcyjnej `7196:10982` (`7273:10878` i dalsze) wiąże to samo, bez
       nadpisania wypełnienia. Sprawdzone na OBU pudełkach, bo lekcja W22 brzmiała
       „zanim naprawisz wiersz, sprawdź, o które pudełko pyta". [V] */
    /* D-39.25 · PRZEKREŚLENIE NIESIE „WYKORZYSTANY", NIEZALEŻNIE OD TEGO, KTO TAK
       ORZEKŁ. Do tej zmiany przekreślenie dostawał
       wyłącznie stan `zużyty` (nadany przez postęp przepisu), a odhaczenie ręczne
       zmieniało tylko pudełko checkboxa. Użytkownik widział więc dwa różne
       wykończenia dla tej samej informacji: „ten składnik jest już użyty".
       To domyka kierunek z `D-39.4`: rozłączne mają być STANY, a nie ich delty
       wizualne. Dawne `G2` („odhaczony BEZ przekreślenia") jest tym samym
       unieważnione w całości — nie zostawiam go jako obowiązującego. */
    '#' + ID + ' .mp-tryb__wiersz[data-stan="zuzyty"] .mp-tryb__nazwa-skl,' +
    '#' + ID + ' .mp-tryb__wiersz[data-odhaczony] .mp-tryb__nazwa-skl{' +
      'text-decoration:line-through}' +
    /* D-39.26 — wiersz z sekcji „zużyte" nie daje się odznaczyć (polecenie).
       Kursor i cel dotyku znikają razem z możliwością kliknięcia,
       inaczej przycisk obiecywałby akcję, której nie wykona. */
    '#' + ID + ' .mp-tryb__wiersz[data-stan="zuzyty"] .mp-tryb__ptaszek{cursor:default}' +
    /* E5 · `D-39.78` — w liście zostaje SAMO kółko `i` zaraz za nazwą, odstęp 8 px
       (§3.14: 182 − 174). Kropkowane podkreślenie nazwy ZDJĘTE.
       Powód nie jest kosmetyczny: ta sama nazwa dostaje `line-through`, gdy składnik
       jest wykorzystany albo odhaczony (`D-39.25`). Zostawienie `underline dotted`
       posadziłoby na jednym tekście DWA `text-decoration` o niepowiązanych
       znaczeniach — „wykorzystany" i „jest zamiennik" — a czytający nie ma jak ich
       rozdzielić, bo jedno i drugie jest kreską przy tekście.
       `text-decoration` zostaje odtąd zarezerwowane dla STANU; zamiennik ma własny
       nośnik, który stanu nie udaje.
       Cofnięcie: przywróć regułę `underline dotted` + `text-underline-offset:3px`
       na `.mp-tryb__wiersz[data-mp-zamiennik] .mp-tryb__nazwa-skl`. */
    /* W48 — kółko `i` (`7473:12562`) jest WYPEŁNIONE zielenią `secondary-text (h1)`
       #487622, BEZ obrysu, a litera jest biała złamana #FFFDFB, DM Sans Medium 500,
       13 px. Runtime rysował dokładnie odwrotność: przezroczyste kółko z obrysem
       `beige-3` i ciemną literą. To nie jest rozjazd o stopień jak W23 czy W41 —
       to inny element wizualny, i przetrwał piętnaście przebiegów, bo sekcja E
       pytała o POŁOŻENIE i cel dotyku (20 px, odstęp 8, hit 44), a o barwy nie
       pytał nikt aż do reguły pokrycia. Wymiar i odstęp zostają: były zmierzone. */
    /* `D-39.77` · CEL MARKERA PRZESTAJE OBEJMOWAĆ CAŁY WIERSZ.
       `U-7` rozciągnęło go na pełną szerokość (zmierzone 296×24), bo klikalne było
       20 px z 295, czyli 7 %. Ta diagnoza była trafna i ZOSTAJE — unieważniona jest
       sama szerokość, nie powód, dla którego ją wtedy dobrano.
       Dlaczego musi odpaść: checkbox wiersza znów przełącza (`D-39.76`) i ma własny
       cel dotyku. Nakładka na pełną szerokość przykryłaby go w całości, a jedynym
       ratunkiem byłyby warstwy — tymczasem `z-index:1` na ptaszku JUŻ RAZ wymusił
       `z-index:2` na belce, żeby dało się trafić w `×`. Drugie piętro tej samej
       konstrukcji kupowałoby kolejny defekt trafialności za cel, w który i tak
       celuje się nazwą, a nie krawędzią wiersza.
       Marker odzyskuje własne `position:relative` — kotwicą jest znów on, nie `li`.
       `li` traci je razem z nakładką: tooltip kotwiczy się w TOP (patrz `ustawTooltip`),
       więc nic innego z tego `position` nie korzystało.
       CENA, NAZWANA: cel tooltipa spada z ~296 px do 40 px szerokości. To jest regres
       wobec `U-7`. Łagodzi go to, że marker powstaje wyłącznie przy istniejącym
       zamienniku — dotyczy mniejszości wierszy — oraz to, że 40×31 daje 1240 px²
       wobec 480 px² sprzed `U-7`.
       Cofnięcie: `li` → `position:relative`, marker → `position:static`,
       cel markera → `left:0;right:0;top:50%;width:auto;height:24px`. */
    '#' + ID + ' .mp-tryb__marker{position:relative;flex:0 0 auto;width:20px;height:20px;' +
      'margin-left:8px;padding:0;border:0;border-radius:100px;' +
      'background:var(--mp-zielen);color:var(--mp-bialy);font-size:13px;line-height:20px;' +
      'font-weight:500;text-align:center;cursor:pointer}' +
    /* NIENARYSOWANE (G9) / R13 — cel dotyku MUSI wyjść poza pudełko znaku, inaczej rytm
       listy (skok 31) przestaje się zgadzać. Realny element, nie `::before`:
       pseudoelementu nie da się zmierzyć asercją, a wiersz matrycy E6 pyta dokładnie
       o wymiar tego celu.
       Reguła wspólna (44×44) obsługuje odtąd `×` tooltipa (E10) i „zakończ".
       Wiersz składnika ma własne wymiary — nadpisania niżej dziedziczą centrowanie
       z tej reguły i zmieniają wyłącznie rozmiar. */
    '#' + ID + ' .mp-tryb__cel{position:absolute;left:50%;top:50%;width:44px;height:44px;' +
      'transform:translate(-50%,-50%);border-radius:50%}' +
    /* `D-39.77` · CELE W WIERSZU SKŁADNIKA: WYSOKOŚĆ 31, MARKER 40, CHECKBOX 32.
       31 = 19 (wiersz) + 6 + 6 (po połowie interlinii nad i pod). To DOKŁADNIE skok
       listy, więc cele sąsiednich wierszy stykają się co do piksela: podział pionu
       jest zupełny i rozłączny naraz — zero zachodzenia i zero pasa, w który
       stuknięcie nie trafia w nic. Wariant jednostronny (19 + 6 = 25) odrzucony
       właśnie za ten sześciopikselowy pas.
       Reguła 44 px jest tu JAWNIE UCHYLONA. Jest instrukcją własną tego projektu,
       nie wymogiem z zewnątrz, i ustępuje zmierzonemu rytmowi listy.
       Szerokości: marker 40 = 2× kółko (20), checkbox 32 = 2× pudełko (16).
       31 JEST POPRAWNE TYLKO DLA WIERSZA 19 px, A WIERSZ NIE ZAWSZE MA 19.
       Zmierzone, nie wywnioskowane: wiersz Z MARKEREM ma 20 px, bo kółko `i` (20 px,
       `W48`) jest wyższe od interlinii 19 i rozpycha `li`. Skok listy wynosi więc
       31 między wierszami bez markera i 32, gdy w grę wchodzi wiersz z markerem.
       Cel 31 px zostawiał tam SZCZELINĘ 1 px — zmierzoną skanem co 0,1 px w punkcie
       `y = 255,5`. Skan co 1 px jej NIE WIDZIAŁ i meldował zero martwych punktów;
       to była tautologia z próbkowania, nie wynik.

       Regułą jest zatem WYSOKOŚĆ WIERSZA + 12, a nie stała 31. Wtedy odległość
       środków dwóch sąsiadów (h1/2 + 12 + h2/2) równa się sumie ich półwysokości
       (h1/2+6 oraz 6+h2/2) — styczność wychodzi CO DO PIKSELA w każdej z trzech
       kombinacji: 19–19, 19–20 i 20–20.

       ⚠ PUŁAPKA: reguła niżej kluczuje po `[data-mp-zamiennik]`, czyli po OBECNOŚCI
       MARKERA, a nie po zmierzonej wysokości wiersza. Dziś to jedno i to samo. Gdyby
       cokolwiek innego zaczęło rozpychać wiersz do 20 px, szczelina wróci po cichu.
       Broni przed tym wyłącznie asercja skanująca co 0,1 px — nie ten komentarz.

       SZEROKOŚCI: marker 40 = 2× kółko (20), checkbox 32 = 2× pudełko (16).
       Cele NIE ZACHODZĄ na siebie, ale margines jest cienki i NIE BIERZE SIĘ
       Z „PRZECIWNYCH KOŃCÓW WIERSZA": marker jest elementem flex ZARAZ ZA NAZWĄ,
       więc przy krótkiej nazwie wędruje w lewo, ku checkboxowi. Zmierzone przy
       nazwie jednoznakowej: prześwit **2 px** (cel checkboxa kończy się na 56,
       cel markera zaczyna na 58). Między nimi leży nazwa, która celem nie jest —
       liczy się wyłącznie to, że cele się nie nakładają.
       Prześwit zależy od marginesu ptaszka (8) i odstępu przed markerem (8).
       Kto tknie którąkolwiek z tych dwóch liczb, ma go przemierzyć. */
    '#' + ID + ' .mp-tryb__marker .mp-tryb__cel{width:40px;height:31px;border-radius:0}' +
    /* `D-39.81` · CEL CHECKBOXA SIEGA 12 px DALEJ W PRAWO: 44, nie 32.
       Lewy nawis zostaje 8 px; rosnie wylacznie prawa krawedz, z 24 na 36 wzgledem
       wiersza — czyli cel wchodzi 12 px w POCZATEK NAZWY. Nazwa celem nie jest
       i zadnego gestu nie niesie, wiec nic jej to nie zabiera; palec celujacy
       w kwadrat trafia dzis czesto tuz obok niego, w napis.
       Pole rosnie z 992 px2 do 1364 px2 (+38 %). Srodek celu przesuwa sie o 6 px
       w prawo — stad `left:calc(50% + 6px)` przy niezmienionym centrowaniu z reguly
       wspolnej. NIE zmieniaj tego na `margin-left`: regula wspolna centruje
       transformem, wiec margines przesunalby takze punkt odniesienia.

       KIEDY TO ZACZELOBY KOLIDOWAC Z CELEM MARKERA — liczba, nie przeczucie.
       Lewa krawedz celu markera wypada na `22 + szerokosc_nazwy`, prawa krawedz
       celu checkboxa na 36; zachodzenie zaczyna sie zatem przy nazwie WEZSZEJ
       NIZ 14 px, czyli mniej wiecej jednoznakowej.
       Zmierzone na WSZYSTKICH 21 ladunkach w `dane/`: 84 wiersze z markerem,
       najciasniejszy przeswit **62 px** („4 limonki", nazwa 64 px) — po tej
       zmianie zostaje 50 px. Prog 14 px pilnuje asercja w
       `suchy-bieg-afordancji.mjs`, nie ten komentarz: gdyby ktos tknal margines
       ptaszka (8) albo odstep przed markerem (8), prog sie przesunie i wiersz padnie.
       Cofniecie: `width:32px` i usun `left`. */
    '#' + ID + ' .mp-tryb__ptaszek .mp-tryb__cel{width:44px;height:31px;' +
      'left:calc(50% + 6px);border-radius:0}' +
    '#' + ID + ' .mp-tryb__wiersz[data-mp-zamiennik] .mp-tryb__cel{height:32px}' +
    /* `z-index` na ptaszku ZOSTAJE, mimo że nakładka, którą przebijał, zniknęła.
       Do rozdzielenia celów nie jest już potrzebny — te się nie stykają. Ale
       `.mp-tryb__belka` ma `z-index:2` dobrane WZGLĘDEM TEJ JEDYNKI (F2b: przy `1`
       ptaszki wygrałyby remis kolejnością w drzewie i weszły NA belkę zamiast pod
       jej rozmycie). Zdjęcie go tutaj byłoby cichą zmianą warunku, na którym stoi
       reguła opisana przy zupełnie innym elemencie. */
    '#' + ID + ' .mp-tryb__ptaszek{z-index:1}' +

    /* Wywoływacz pełnej listy w liście skróconej (§3.2): linia 1 px, rytm 12 px
       po obu jej stronach, wiersz 22 px = tekst 19 + glif 16×22.
       NIENARYSOWANE (G7): etykieta jest placeholderem — cel jest narysowany, brzmienie nie. */
    /* W27 — rozkład wiersza to `space-between` (`7209:10899`), nie „glif dopchnięty
       marginesem". Wynik na ekranie ten sam, ale wiersz matrycy pyta o ROZKŁAD,
       a `margin-left:auto` daje `justify-content: normal` i pytanie zostaje bez
       odpowiedzi. Tam, gdzie Figma nazywa regułę, runtime ma nazywać ją tak samo. */
    '#' + ID + ' .mp-tryb__wiecej{display:flex;align-items:center;' +
      'justify-content:space-between;width:100%;height:22px;' +
      /* D-39.5 · kreska wywoływacza jest `primary-text` #3E2B22, nie `beige-2`.
         Rozstrzygnięcie, wprost: „separatory noszą kolor
         3E2B22". Zdejmuje zawężenie z W25, które malowało atramentem WYŁĄCZNIE
         kreskę wewnątrz ramki składników i zostawiało tę samą kreskę poza ramką
         na beżu — a dwa kolory jednej linii zależnie od kontekstu to właśnie
         zgłoszenie nr 3 („kolory separatorów niespójne").
         Cofnięcie: `var(--mp-beige-2)` z powrotem tutaj oraz przywrócenie
         `border-top-color` w regule zawężonej dwadzieścia linii wyżej. */
      'margin-top:12px;padding:12px 0 0;border:0;border-top:1px solid var(--mp-atrament);' +
      'box-sizing:content-box;background:transparent;cursor:pointer;color:inherit;' +
      'font-size:14px;line-height:19px;text-align:left}' +
    /* D-40.3 — wywolywacz listy dostaje TEN SAM mechanizm co szewron pigulki
       (I-36): jeden glif `keyboard_arrow_down` i obrot, zamiast podmiany dwoch
       glifow. Wartosci sa te same, bo zrodlem jest ten sam wzorzec — akordeon
       `.mp-faq-item` z produktowki: `transform 280ms`, `-180deg`, origin w srodku.
       Stanem steruje `aria-expanded`, ktory przycisk JUZ nosi i ktory `przelaczListe`
       JUZ aktualizuje — wiec nie powstaje drugi kanal tej samej prawdy. */
    '#' + ID + ' .mp-tryb__wiecej-glif{width:16px;height:22px;' +
      'font-size:16px;line-height:22px;text-align:center;transition:transform 280ms}' +
    '#' + ID + ' .mp-tryb__wiecej[aria-expanded="true"] .mp-tryb__wiecej-glif{' +
      'transform:rotate(-180deg)}' +
    '@media (prefers-reduced-motion:reduce){' +
      '#' + ID + ' .mp-tryb__wiecej-glif{transition:none}}' +

    /* Pełna lista (§3.8): JEDEN rytm 8 px między wszystkimi blokami — nagłówek,
       wiersze, linia. Skok wiersza 27 = 19 + 8, wobec 31 = 19 + 12 na ekranie
       kroku (R15). Ta różnica jest zmierzona i celowa, nie dryf. */
    /* W59 (przeb. 25) — ramka listy PEŁNEJ (`7196:10993`) jest OBRYSOWANA, nie
       wypełniona: obrys 1 px `beige-2` #C5B18A, bez żadnego tła. Runtime rysował
       odwrotnie — wypełnienie `beige-1` i zero obrysu. To ten sam kształt pudełka
       co ramka na ekranie kroku (W22) i **ta sama pomyłka co w przeb. 21**: dwa
       pudełka tego kształtu, poprawione jedno. Padding 15, nie 16, z tego samego
       powodu co przy W22 — Figma rysuje obrys DO ŚRODKA, więc `border:1 + padding:15`
       daje lico 16, a `border:1 + padding:16` dałoby 17. */
    '#' + ID + ' .mp-tryb__lista{display:flex;flex-direction:column;gap:8px;' +
      'padding:15px;border-radius:12px;background:transparent;' +
      'border:1px solid var(--mp-beige-2)}' +
    '#' + ID + ' .mp-tryb__lista .mp-tryb__skladniki{gap:8px}' +
    /* W60 — nagłówki sekcji (`7196:10998` „dalej", `7196:11014` „zużyte") mają styl
       `Caption`, czyli DM Sans **Medium 500** w `primary-text`. Runtime dawał im
       `beige-3` i wagę odziedziczoną 400 — mimo że nagłówek „w tym kroku" (W29)
       dostał w tym samym pliku 500 + atrament. Trzecia sekcja tego samego kształtu
       co W22/W59: dwie klasy na jedną rolę i poprawiona jedna. */
    '#' + ID + ' .mp-tryb__naglowek-sekcji{margin:0;font-size:14px;line-height:16px;' +
      'height:16px;font-weight:500;color:var(--mp-atrament)}' +
    /* W61 — kreska między sekcjami (`7196:10997` / `7196:11013`) to `primary-text`,
       tak samo jak kreska pod listą SKRÓCONĄ (W25). Komentarz przy W25 zawężał tamten
       odczyt do listy skróconej, bo „kreska listy PEŁNEJ to inny węzeł, nieczytany" —
       zawężenie było uczciwe, ale wniosek z niego (`beige-2`) nie miał źródła.
       Węzeł przeczytany w przeb. 25: obie kreski są tym samym kolorem. */
    '#' + ID + ' .mp-tryb__linia{height:1px;background:var(--mp-atrament)}' +

    /* Tooltip zamiennika (E7–E13, §3.14 / R12). POPOVER, nie modal: bez scrima (E11),
       bez wygaszania i bez zwijania czegokolwiek pod spodem (E12). To jest różnica
       gatunkowa wobec dialogów S2/S4, dlatego budowany jest osobno i wcześniej.
       `left/right: 32` zamiast `width: 296`: 296 jest prawdziwe wyłącznie dla ramki
       360 (32 + 296 + 32), a mierzymy pięć szerokości. Regułą jest LICO kolumny
       składników, liczba 296 jest jej wartością w klatce kanonicznej. */
    '#' + ID + ' .mp-tryb__tooltip{position:absolute;z-index:3;' +
      'left:' + W.tooltipX + 'px;right:' + W.tooltipX + 'px;' +
      'display:flex;flex-direction:column;gap:' + W.tooltipOdstep + 'px;' +
      'padding:' + W.tooltipPionowo + 'px ' + W.tooltipPoziomo + 'px;' +
      'border-radius:' + W.tooltipRadius + 'px;background:var(--mp-beige-1);' +
      /* W43 — cień JEST narysowany i plik podaje wartości: `0px 4px 14px 0px
         rgba(61,43,33,0.18)` (`7468:103138`). Poprzedni komentarz („I-24 podaje surowy
         DROP_SHADOW bez wartości") był prawdą o METODZIE, nie o pliku — trzeci raz ta
         sama pomyłka: po W23 i po pytaniu tooltipa w tym samym bloku (W45).
         `get_metadata` i INTERAKCJE nie rozkładają efektu,
         `get_design_context` rozkłada. Runtime miał 0/8/24: przezroczystość trafiona,
         odsunięcie dwukrotne, rozmycie o 70 % za duże. Baza #3D2B21, o jeden stopień
         w każdym kanale od `--mp-atrament` #3E2B22 — wpisana wprost, bo to cień, a nie
         atrament, i zlanie ich skasowałoby różnicę, którą plik trzyma osobno. */
      'box-shadow:0 4px 14px rgba(61,43,33,.18)}' +
    /* W44 — głowa tooltipa: `items-center` (`7473:103098`), nie `flex-start`. */
    '#' + ID + ' .mp-tryb__tooltip-glowa{display:flex;align-items:center;' +
      'gap:' + W.tooltipOdstep + 'px}' +
    /* W45 — pytanie: DM Sans **Bold 700**, `typo/Body small` 14, interlinia 1,35
       (`7473:103099`). Poprzedni komentarz mówił „grubości pisma plik nie podaje" —
       ta sama pomyłka metody co przy cieniu wyżej, w tym samym bloku. */
    '#' + ID + ' .mp-tryb__tooltip-pytanie{margin:0;flex:1 1 auto;min-width:0;' +
      'font-size:14px;line-height:19px;font-weight:700}' +
    '#' + ID + ' .mp-tryb__tooltip-tekst{margin:0;font-size:14px;line-height:19px}' +
    /* E10 — glif 16×19 wg klatki; cel dotyku 44×44 tym samym wzorcem `.mp-tryb__cel`,
       co przy markerze i checkboxie: realny element wychodzący POZA pudełko, bo
       44 nie mieści się w tooltipie o dopełnieniu 12 (§3.14, uwaga wdrożeniowa). */
    '#' + ID + ' .mp-tryb__tooltip-zamknij{position:relative;flex:0 0 auto;' +
      'width:' + W.tooltipGlif + 'px;height:19px;padding:0;border:0;background:transparent;' +
      'color:var(--mp-atrament);font-size:' + W.tooltipGlif + 'px;line-height:19px;' +
      'text-align:center;cursor:pointer}' +

    /* Dialog modalny S2/S4 (§3b.1, I-07). W przeciwieństwie do tooltipa (E11) to JEST
       modal: pełnoekranowy scrim 45 % na atramencie, treść pod spodem nieklikalna.
       Scrim jest rodzeństwem BOTTOM-u i leży NAD nim — F6: BOTTOM zostaje w drzewie,
       tylko pod przyciemnieniem; klatki dialogowe nie mają BOTTOM, bo go zakrywają. */
    '#' + ID + ' .mp-tryb__scrim{position:absolute;inset:0;z-index:4;display:none;' +
      'align-items:center;justify-content:center;' +
      'background:color-mix(in srgb,var(--mp-atrament) ' + W.scrimKrycie + '%,transparent)}' +
    '#' + ID + ' .mp-tryb__scrim[data-otwarty]{display:flex}' +
    /* 328 px w ramce 360 to kolumna treści (margines 16 z obu stron), nie stała —
       ta sama reguła co przy tooltipie i pigułce. Wyśrodkowanie pionowe wg F5:
       S4 jest wyśrodkowany, S2 leży 8 px niżej i §3b.1 nazywa to dryfem, nie zamiarem. */
    '#' + ID + ' .mp-tryb__dialog{width:calc(100% - ' + (2 * W.dialogMargines) + 'px);' +
      'display:flex;flex-direction:column;gap:' + W.dialogOdstep + 'px;' +
      /* W55 (przeb. 25) — pudełko dialogu `7196:10925`. Dwie poprawki:
         BIEL PEŁNA #FFFFFF (`white full bg`), nie złamana #FFFDFB — ta sama para,
         którą projekt trzyma osobno przy pasie dolnym (W01) i ptaszku (W41);
         PROMIEŃ 16, nie 12. Komentarz „NIENARYSOWANE: promienia dialogu plik nie
         podaje" był nieprawdą o PLIKU, a nie o metodzie: `get_design_context` na
         `7196:10925` zwraca `rounded-[16px]` wprost. Trzeci raz ta sama pomyłka
         (W43, W45) — brak odczytu zapisany jako brak danych. */
      'padding:' + W.dialogPadding + 'px;background:var(--mp-bialy-pelny);' +
      'border-radius:16px}' +
    /* W56 — tytuł `7196:10926`: styl H6 = DM Sans SemiBold 600, `typo/H6` = **18**
       (nie 24 z podpowiedzi — zmienna mówi 18, tak jak przy `typo/Body large` = 16),
       interlinia 1,2 → 22. Stopień i interlinia były trafione; waga NIE: `<h2>` bierze
       z przeglądarki 700 i nikt o to nie pytał. */
    '#' + ID + ' .mp-tryb__dialog-tytul{margin:0;font-weight:600;' +
      'font-size:18px;line-height:22px}' +
    '#' + ID + ' .mp-tryb__dialog-tresc{margin:0;font-size:14px;line-height:19px}' +
    /* W57 — CTA dialogu to ta sama INSTANCJA `cta — cta` co przycisk „dalej" w pasie
       dolnym (`7291:10917`), a runtime rysował ją jako osobny przycisk: atrament
       zamiast `primary-cta`, promień 8 zamiast pigułki 100, waga odziedziczona
       zamiast SemiBold. Wysokość 48 zostaje — w Figmie wychodzi ze składu
       (14 + 20 + 14), a nie z liczby, więc centruję flexem, nie interlinią. */
    '#' + ID + ' .mp-tryb__dialog-cta{height:' + W.przycisk + 'px;width:100%;border:0;' +
      'border-radius:100px;background:var(--mp-cta);color:var(--mp-bialy);' +
      'display:flex;align-items:center;justify-content:center;gap:8px;' +
      'font-weight:600;font-size:16px;line-height:20px;padding:0 24px;cursor:pointer}' +
    /* „wyjdź mimo to" jest LINKIEM tekstowym (§3b.1), nie drugim przyciskiem: gdyby
       był przyciskiem, dwie równorzędne akcje wyglądałyby jak wybór, a to jest
       wyjście awaryjne. W58 (przeb. 25) — wykończenie wg `7196:10931`: `primary-text`,
       WYŚRODKOWANY na pełnej szerokości, bez podkreślenia. Runtime miał `beige-3`,
       do lewej i z podkreśleniem — trzy rozjazdy, żaden nigdy niemierzony.
       Skutek: akcja nie odróżnia się już niczym od tekstu treści; pozycja D-25.3. */
    '#' + ID + ' .mp-tryb__dialog-link{height:19px;width:100%;border:0;' +
      'background:transparent;padding:0;font-size:14px;line-height:19px;' +
      'color:var(--mp-atrament);text-align:center;' +
      'text-decoration:none;cursor:pointer}' +

    /* S4 — wiersz minutnika w dialogu (§3b.1: 280×44, nazwa x=16, czas h=14,
       „zakończ" 46×16 przypięte). Wysokość 44 to jednocześnie cel dotyku, więc
       „zakończ" nie potrzebuje osobnego `.mp-tryb__cel` w pionie — potrzebuje go
       w poziomie i dostaje ten sam wzorzec, co `×` tooltipa. */
    '#' + ID + ' .mp-tryb__dialog-min{display:flex;align-items:center;' +
      'height:' + W.dialogWiersz + 'px;flex:0 0 auto;' +
      'padding:0 ' + W.dialogWierszPad + 'px;background:var(--mp-beige-1);' +
      'border-radius:8px}' +
    '#' + ID + ' .mp-tryb__dialog-min-nazwa{flex:1 1 auto;min-width:0;overflow:hidden;' +
      'white-space:nowrap;text-overflow:ellipsis;font-size:14px;line-height:19px}' +
    /* Czas w dialogu jest MNIEJSZY niż w pigułce (14 px wobec 24): tu nie jest
       odczytem, tylko etykietą wiersza — §3b.1 mierzy h=14. Prawe równanie
       wyprowadzone z dwóch pomiarów x (171 i 178): oba kończą się na 202. */
    '#' + ID + ' .mp-tryb__dialog-min-czas{flex:0 0 auto;margin-left:auto;' +
      'font-size:12px;line-height:14px;height:14px;font-variant-numeric:tabular-nums;' +
      'color:var(--mp-beige-3)}' +
    '#' + ID + ' .mp-tryb__dialog-min-koniec{position:relative;flex:0 0 auto;' +
      'margin-left:' + W.dialogWierszLuka + 'px;height:16px;padding:0;border:0;' +
      'background:transparent;color:var(--mp-atrament);font-size:13px;line-height:16px;' +
      'text-decoration:underline;cursor:pointer}' +

    /* S3 — baner offline (§3b.2). Kafel `stos` dokładnie tej samej rangi co pigułka:
       to samo tło, ten sam promień, ten sam padding 16 i odstęp 12. Wysokość 121
       NIE jest pinowana w CSS — wychodzi ze składu, tak jak 40/126/198+H pigułki. */
    /* W50 (przeb. 25) — baner nosi ten sam NAZWANY styl cienia co pas dolny i pigułka:
       `drop_shadow_ui` = 0/−1 blur 2 spread 0 α5 % + 0/−4 blur 8 spread −2 α10 %,
       baza #3E2B22, oba offsety UJEMNE (cień rzucany do góry). Blok CSS banera nie
       miał `box-shadow` w ogóle — ta sama klasa braku co pas dolny bez tła: element
       jest, wykończenia nie ma, i żaden wiersz o układzie nie mógł tego złapać. */
    '#' + ID + ' .mp-tryb__baner{background:var(--mp-beige-1);border-radius:12px;' +
      'padding:' + W.wnetrze + 'px;display:flex;flex-direction:column;' +
      'gap:' + W.blok + 'px;flex:0 0 auto;' +
      'box-shadow:0 -1px 2px 0 rgba(62,43,34,.05),0 -4px 8px -2px rgba(62,43,34,.10)}' +
    '#' + ID + ' .mp-tryb__baner-tresc{margin:0;font-size:14px;line-height:19px}' +
    '#' + ID + ' .mp-tryb__baner-akcja{display:flex;align-items:center;' +
      'height:' + W.banerWiersz + 'px;width:100%;padding:0;border:0;' +
      'background:transparent;color:var(--mp-cta);font:inherit;cursor:pointer;' +
      'position:relative;text-align:left}' +
    /* W52 (przeb. 25) — wiersz akcji `7209:10922`. Trzy poprawki wobec stanu z przeb. 24:
       1. GLIF rysuje się na 20 px, nie 16. Ramka `refresh` (`7202:10894`) ma 20×20,
          a wektor wypełnia ją bez marginesu — pudełko 20 px z glifem 16 px to nie
          ten sam obraz. Pudełko mierzy F10 i tego nie dubluję.
       2. BARWA całego wiersza to `primary-cta` #CF411A — potwierdzone dwoma odczytami:
          napis `7202:10897` ma związane `primary cta`, a ramka glifu również.
          Runtime miał `color:inherit`, czyli dziedziczył `--mp-atrament`.
       3. PODKREŚLENIE ZDJĘTE. Nie miało źródła: żaden wiersz go nie mierzył, a Figma
          rysuje napis bez ozdobnika. To był wynalazek runtime'u, nie odczyt.
          Skutek uboczny — akcja odróżnia się teraz wyłącznie barwą; pozycja D-25.3. */
    '#' + ID + ' .mp-tryb__baner-glif{flex:0 0 auto;width:' + W.banerGlif + 'px;' +
      'height:' + W.banerGlif + 'px;margin-right:' + W.banerLuka + 'px;' +
      'font-size:' + W.banerGlif + 'px;line-height:' + W.banerGlif + 'px;text-align:center}' +
    '#' + ID + ' .mp-tryb__baner-tekst{flex:1 1 auto;font-size:14px;line-height:19px;' +
      'text-decoration:none}' +

    /* ---- ekrany start / S1 / zakończenie (§3.1, §3b.0, §3.4) -------------------
       R6 wariant drugi: BOTTOM 132 to NIE stos kafli, tylko blok dwóch CTA pełnej
       szerokości bez paska nawigacji. 16 + 48 + 12 + 48 + 8 = 132 ✓ — dopełnienie
       dolne 8, nie 16, bo tak wychodzi z klatki (`cta — ghost` na y=76). */
    '#' + ID + ' .mp-tryb__akcje{height:132px;display:flex;flex-direction:column;' +
      'gap:12px;padding:16px ' + W.margines + 'px 8px}' +
    /* W67/W68 (przeb. 26) — dwa CTA pasa dolnego ekranów start / S1 / zakończenie,
       odczytane z `7195:11205`: `cta — cta` (`7291:10911`) i `cta — ghost`
       (`7290:10944`). Promień **100**, nie 8 — czwarte miejsce, w którym ósemka
       kart treści rozlała się na kapsułę (po W06, W21, W13). Rozjazdów było sześć
       i żaden nie krzyczał osobno: wypełnienie CTA **`primary-cta` #CF411A**, nie
       atrament (brąz to `cta — primary` pigułki, W21 — dwa poziomy nacisku, nie
       synonimy); obrys ghosta **1,5 px `beige-3` #816D44**, nie 1 px atramentu;
       ghost ma **rozmycie tła** blur(4px) (BACKGROUND_BLUR r8, mapowanie jak B5/W10);
       etykieta obu to styl `Button` — SemiBold **600**, 16/20, w CTA `white-off-bg`.
       Padding 14/24 z klatki realizuję jako lico 48 z `align-items:center`: obrys
       Figmy rysuje się DO ŚRODKA, więc `height:48` + `box-sizing:border-box` daje
       tę samą wysokość co instancja, a 14+20+14 poza pudełkiem dałoby 51 (W22/W32). */
    '#' + ID + ' .mp-tryb__akcja-primary{height:48px;flex:0 0 auto;border:0;' +
      'box-sizing:border-box;padding:0 24px;display:flex;align-items:center;' +
      'justify-content:center;gap:8px;' +
      'border-radius:100px;background:var(--mp-cta);color:var(--mp-bialy);' +
      'font-size:16px;font-weight:600;line-height:20px;cursor:pointer;width:100%}' +
    '#' + ID + ' .mp-tryb__akcja-ghost{height:48px;flex:0 0 auto;border-radius:100px;' +
      'box-sizing:border-box;padding:0 24px;display:flex;align-items:center;' +
      'justify-content:center;gap:8px;' +
      'border:1.5px solid var(--mp-beige-3);background:transparent;color:var(--mp-atrament);' +
      'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);' +
      'font-size:16px;font-weight:600;line-height:20px;cursor:pointer;width:100%}' +
    /* `D-50.1` · TYTUŁ EKRANU (`7195:10902`) — styl **H3**, 28/1,1, `secondary text (H1)`
       #487622, DO LEWEJ. Zmiana wobec 22/1,1 wyśrodkowanego, i to NIE jest korekta
       błędnego odczytu: klatka się zmieniła. Poprzednie brzmienie tego akapitu opisywało
       węzeł 328×48 (dwa wiersze po 24,2 = 22 × 1,1) i było wtedy prawdziwe. Następnie
       przerysował ekran startowy 2026-08-23; ten sam węzeł ma dziś 328×**62**, wiąże
       zmienną `typo/H3` = 28 i dwa wiersze po 30,8 = 28 × 1,1 dają 61,6 ≈ 62. Pudełko
       rozstrzyga stopień tak samo jak przy 22 — zmieniła się jego wysokość.

       KOSZT ZMIERZONY, nie oszacowany (16 prawdziwych tytułów, prawdziwy DM Serif
       Display pobrany z CDN witryny, kolumna 328 px): przy 22 tytuły biorą 1–3 wiersze
       (24/48/73 px), przy 28 biorą 1–4 (31/62/92/123 px). Średnia rośnie z 41 na 67 px,
       najdłuższy tytuł korpusu („Pierś z kurczaka z grzybami w sosie
       śmietanowo-musztardowym", 59 znaków) z 73 na 123 px.

       `D-51.1` — WYBRANO POWRÓT DO 22 wobec tego pomiaru (klatka `7627:12679`,
       2026-08-23, węzeł tytułu z powrotem 328×**48**). Stopień wraca, WYRÓWNANIE DO LEWEJ
       zostaje — to nie był powód sporu. Zostawiam akapit powyżej w całości: pokazuje,
       czym za 28 płaciliśmy, i po co ta decyzja zapadła. */
    '#' + ID + ' .mp-tryb__ekran-tytul{margin:0;font-family:"DM Serif Display",Georgia,serif;' +
      'font-weight:400;font-size:22px;line-height:1.1;color:var(--mp-zielen)}' +
    /* W68 — „gotowe, smacznego" (`7195:11186`) to też styl **H4** (DM Serif Display
       400, 22/1,1, zieleń), ale WYRÓWNANY DO LEWEJ: klatka nie daje mu `text-center`,
       którym W38 opisał tytuł ekranu startowego. Runtime miał 20/24 DM Sans w atramencie.
       Osobna klasa od `ekran-tytul` zostaje właśnie dlatego, że różni je wyrównanie. */
    '#' + ID + ' .mp-tryb__ekran-nadtytul{margin:0;font-family:"DM Serif Display",Georgia,serif;' +
      'font-weight:400;font-size:22px;line-height:1.1;color:var(--mp-zielen)}' +
    '#' + ID + ' .mp-tryb__ekran-podtytul{margin:0;font-size:14px;line-height:19px}' +
    /* meta start (`7263:10715`) — trzy kolumny ELASTYCZNE, nie po 88 px.
       Odczyt klatki: `flex-[1_0_0]` + `gap 16` + `padding 16/12`. Przy 328 wypada
       88 na kolumnę (328 − 32 − 32 = 264 = 3 × 88) i to jest SKUTEK, nie reguła.
       Sztywne 88 + `space-between` dawało ten sam obraz przy 360 i łamało inwariant
       odległości przy 320: odstęp rósłby/malał zamiast kolumny. */
    /* Padding 11/15, nie 12/16 — obrys Figmy jest rysowany DO ŚRODKA, a `border` CSS
       leży poza paddingiem. Ta sama pułapka co przy ramce składników (W22, przeb. 22):
       `1 + 16` dałoby lico 17 i pas 83 px zamiast 81, czyli rozjazd o piksel z dwiema
       wartościami zmierzonymi w klatce. Mierzymy LICO, nie liczbę `padding`. */
    '#' + ID + ' .mp-tryb__meta{display:flex;gap:16px;align-items:flex-start;' +
      'padding:11px 15px;box-sizing:border-box;border:1px solid var(--mp-beige-2);' +
      'border-radius:16px}' +
    '#' + ID + ' .mp-tryb__meta-kol{flex:1 0 0;min-width:0;display:flex;' +
      'flex-direction:column;align-items:center;gap:8px;border-radius:8px}' +
    /* Glif: Material Symbols Outlined **Light (300)**, 32 px, `secondary-text (h1)`
       #487622 — zieleń, nie atrament. Dopóki font ikon nie jest wpięty w runtime
       (B16 · I4 · D-15.1), rysuje się SUBSTYTUT Unicode, tak samo jak `⌄`, `←`, `→`
       gdzie indziej; prawdziwa nazwa ligatury jedzie w `data-mp-ligatura`, żeby
       zbiór używanych ligatur dał się zmierzyć bez czytania kodu. */
    '#' + ID + ' .mp-tryb__meta-glif{display:block;height:32px;font-size:32px;' +
      'line-height:32px;font-weight:300;color:var(--mp-zielen)}' +
    '#' + ID + ' .mp-tryb__meta-wartosc{display:block;width:100%;height:17px;' +
      'font-size:14px;line-height:16.8px;font-weight:600;text-align:center;' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    /* `D-52.1` · AKAPIT WYJAŚNIAJĄCY WRACA — z przepisaną treścią i ZAPŁACONY.
       DM Sans Regular 400, stopień 16, interlinia 1,5, `primary text` #3E2B22, do lewej,
       „Twój ekran nie gaśnie," pogrubione. Klatka `7627:12679` przepisana
       2026-08-23 wieczorem (węzeł `7640:12824`).

       Stopień znowu rozstrzygnięty PUDEŁKIEM, nie tokenem: `get_design_context` podaje 18,
       węzeł ma 328×**72**, a ten tekst zawija się w kolumnie 328 na 3 wiersze przy 16
       (3 × 24 = 72 ✓) i na 4 przy 18 (108 ✗). Ten sam rozjazd trybów zmiennej co poprzednio
       — i ta sama metoda rozstrzygnięcia.

       CZYM ZAPŁACONY: znika etykieta „ile porcji?" (D-52.2), a treść jest przepisana tak,
       żeby zmieściła się w TRZECH wierszach. Poprzednia wersja akapitu (D-50.4) kosztowała
       88 px i wracała bez pokrycia; ta kosztuje 88 px i oddaje 40, więc netto 48. */
    '#' + ID + ' .mp-tryb__wyjasnienie{margin:0;font-size:16px;line-height:1.5;' +
      'color:var(--mp-atrament)}' +
    '#' + ID + ' .mp-tryb__wyjasnienie b{font-weight:700}' +
    /* `D-52.2` · REGUŁA „ile porcji?" USUNIĘTA razem z elementem. Historia tej jednej
       linijki, żeby nie odtwarzać jej z pamięci, gdyby miała wrócić po raz czwarty:
       · D-39.42 — `Caption` 14/16, waga 500, WYŚRODKOWANE (zgłoszenie,
         odczyt `7195:10910`);
       · D-50.3 — wyśrodkowanie zdjęte razem z wyrównaniem całego ekranu;
       · D-50.5 — etykieta ZOSTAWIONA wbrew rysunkowi, bo miała własną decyzję;
       · D-51.2 — styl podniesiony z `Caption` na `Body Large` 16/1,5, gdy została jedynym
         zdaniem ekranu;
       · `D-52.2` — USUNIĘTA. Klatka jej nie rysuje w ŻADNEJ wersji, w której stoi akapit;
         te dwie rzeczy wykluczają się w rysunku od początku. Skoro akapit wraca, etykieta
         schodzi — i tym razem nie bronię jej wbrew rysunkowi, bo tamten argument (jedyny
         podpis jedynej decyzji) padł: akapit mówi, czym jest tryb, a wiersz „− 4 porcje +"
         nazywa się sam. */

    /* `D-39.45` · ARKUSZ SKŁADNIKÓW NA EKRANIE STARTOWYM (`S6`).
       Zgłoszenie: „najpierw pokaż składniki" ma pokazywać listę
       NA TYM SAMYM ekranie, a nie przechodzić do kroku 1. Makieta narysowana w Figmie
       (`7545:12442`) i zatwierdzona; ta reguła jest jej wdrożeniem.

       **Arkusz dolny, nie dialog wyśrodkowany** — S2/S4 są zaprojektowane pod dwa
       zdania i dwa przyciski, a lista bywa na kilkanaście pozycji. `max-height:72%`
       zamiast stałej wysokości: arkusz ma być krótszy przy krótkiej liście i nie
       przykrywać całego ekranu przy długiej.

       **Lista przewija się WEWNĄTRZ arkusza** (`flex:1 1 auto` + `min-height:0`
       + `overflow-y:auto`). `min-height:0` jest tu konieczne, nie ozdobne: dziecko
       kolumny flex ma domyślnie `min-height:auto`, więc bez tego rozpycha rodzica
       zamiast się przewijać — ta sama pułapka, która dała `D-39.30`.
       `overscroll-behavior-y:contain`, żeby dojechanie do końca listy nie przewijało
       ekranu pod spodem.

       **Pas dolny arkusza dostaje safe-area**, tak samo jak pas produktu — inaczej
       CTA wchodziłoby pod wskaźnik gestu iPhone'a. */
    /* D-39.58 — punktor arkusza: kropka rysowana CSS-em, nie znakiem i nie glifem.
       Szerokość pudełka równa checkboxowi (16 + 8 odstępu), żeby rytm kolumny tekstu
       był ten sam w arkuszu i na kroku. */
    '#' + ID + ' .mp-tryb__punktor{flex:0 0 auto;width:16px;height:16px;' +
      'margin-right:8px;position:relative}' +
    '#' + ID + ' .mp-tryb__punktor::after{content:"";position:absolute;left:6px;top:6px;' +
      'width:4px;height:4px;border-radius:50%;background:var(--mp-atrament)}' +
    '#' + ID + ' .mp-tryb__arkusz-scrim{position:absolute;inset:0;z-index:5;display:none;' +
      'background:color-mix(in srgb,var(--mp-atrament) 45%,transparent)}' +
    '#' + ID + '[data-arkusz] .mp-tryb__arkusz-scrim{display:block}' +
    '#' + ID + ' .mp-tryb__arkusz{position:absolute;left:0;right:0;bottom:0;z-index:6;' +
      'display:none;flex-direction:column;max-height:72%;background:var(--mp-bialy);' +
      'border-radius:16px 16px 0 0;box-shadow:0 -2px 8px rgba(62,43,34,.08)}' +
    '#' + ID + '[data-arkusz] .mp-tryb__arkusz{display:flex}' +
    '#' + ID + ' .mp-tryb__arkusz-glowa{flex:0 0 auto;display:flex;align-items:flex-start;' +
      'justify-content:space-between;gap:8px;padding:20px ' + W.margines + 'px 0}' +
    '#' + ID + ' .mp-tryb__arkusz-tytul{margin:0;font-family:"DM Serif Display",Georgia,serif;' +
      'font-size:22px;line-height:1.1;color:var(--mp-zielen)}' +
    '#' + ID + ' .mp-tryb__arkusz-podpowiedz{flex:0 0 auto;margin:8px ' + W.margines + 'px 0;' +
      'font-size:14px;line-height:19px}' +
    '#' + ID + ' .mp-tryb__arkusz-lista{flex:1 1 auto;min-height:0;overflow-y:auto;' +
      'overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;' +
      'margin:' + W.margines + 'px;padding:' + W.wnetrze + 'px;' +
      'border:1px solid var(--mp-beige-2);border-radius:12px;' +
      'display:flex;flex-direction:column;gap:12px}' +
    '#' + ID + ' .mp-tryb__arkusz-pas{flex:0 0 auto;display:flex;flex-direction:column;' +
      'gap:' + W.lukaCta + 'px;padding:0 ' + W.margines + 'px ' + W.margines + 'px;' +
      'padding-bottom:calc(' + W.margines + 'px + env(safe-area-inset-bottom,0px))}' +
    /* D-39.46 — rytm 12 px między CTA, ten sam co na ekranach (W.lukaCta). */
    /* G01 · `D-50.2`: blok 192 DO LEWEJ kolumny treści. Do 2026-08-23 był wyśrodkowany
       (68+192+68 = 328 ✓) i to też był odczyt klatki — w poprzedniej wersji `7195:10894`
       blok miał x=68. Przerysowana klatka daje mu **x=0** wewnątrz wiersza 328, czyli
       dosunięcie do lewej. Jak wtedy, tak i teraz opisujemy to WYRÓWNANIEM, nie
       współrzędną: kolumna ma pięć szerokości i x=0 jest jedyną miarą, która to znosi. */
    '#' + ID + ' .mp-tryb__porcje{height:48px;display:flex;justify-content:flex-start}' +
    /* Blok `7195:10911`: wypełnienie `beige-1-bg`, promień 100, padding 4, gap 16.
       Szerokość 192 przy „4 porcje" jest WYNIKIEM (4+40+16+72+16+40+4), nie regułą —
       etykieta ma szerokość treści, a odmiana zmienia ją między „1 porcja" i „7 porcji". */
    '#' + ID + ' .mp-tryb__porcje-blok{height:48px;display:flex;box-sizing:border-box;' +
      'align-items:center;gap:16px;padding:4px;border-radius:100px;' +
      'background:var(--mp-beige-1)}' +
    /* C8 (KONFLIKT OTWARTY): klatka daje ramce `buttons` 40×40, czyli poniżej progu
       44 px. Zostawiamy 40 wg rysunku i NIE dokładamy celu 44 — rozstrzygnięcie
       jest do rozstrzygnięcia, a dołożenie celu przesądzałoby je po cichu. */
    '#' + ID + ' .mp-tryb__porcje-krok{width:40px;height:40px;padding:0;box-sizing:border-box;' +
      'border:1.5px solid var(--mp-cta);border-radius:100px;background:var(--mp-bialy);' +
      'color:var(--mp-atrament);font-size:20px;font-weight:500;line-height:1;' +
      'display:flex;align-items:center;justify-content:center;cursor:pointer}' +
    '#' + ID + ' .mp-tryb__porcje-krok[disabled]{opacity:.4;cursor:default}' +
    /* `typo/H6` = **18**, nie 24. Fallback tokenu z `get_design_context` podaje 24,
       ale wysokość węzła „porcje" wynosi 22 = 18 × 1,2 — a 24 × 1,2 dałoby 28,8.
       Ta sama rozbieżność co przy H4 (D-22.1) i tu rozstrzyga ją geometria. */
    '#' + ID + ' .mp-tryb__porcje-ile{width:72px;height:22px;font-size:18px;' +
      'font-weight:600;line-height:22px;text-align:center;white-space:nowrap}' +
    /* Karta stanu S1 (§3b.0) — odstęp 8, nie 12: to lista metadanych, nie stos akcji.
       Rozjazd rytmu wobec pigułki i banera jest ZAMIERZONY i zmierzony. */
    '#' + ID + ' .mp-tryb__karta{background:var(--mp-beige-1);border-radius:12px;' +
      'padding:' + W.wnetrze + 'px;display:flex;flex-direction:column;gap:8px}' +
    /* W70 (przeb. 26) — karta „pochwal się" (`7195:11189`) NIE jest kartą S1
       (`7196:10902`, W39), choć runtime rysował obie jedną klasą: tamta ma
       wypełnienie `beige-1` i zero obrysu, ta ma **zero wypełnienia** i **obrys
       1 px `beige-2`**, i inny rytm (odstęp 16, nie 8). Czwarty w tym łańcuchu
       przypadek „dwa elementy w jednej roli" (W22↔W59, W29↔W60, W25↔W61, W21↔W62)
       i pierwszy, w którym różni je WYPEŁNIENIE, a nie stopień pisma.
       Lico 16 = obrys 1 + padding 15 — obrys Figmy rysuje się do środka (W22/W32). */
    '#' + ID + ' .mp-tryb__karta[data-mp-karta="pochwal-sie"]{background:transparent;' +
      'border:1px solid var(--mp-beige-2);box-sizing:border-box;' +
      'padding:' + (W.wnetrze - 1) + 'px;gap:16px}' +
    /* W71 — nagłówek tej karty (`7200:10893`) to styl **H4**, ten sam co tytuł
       ekranu (W38) i nazwa kroku (W30): DM Serif Display 400, 22/1,1, zieleń.
       Runtime dawał tu 18/22 DM Sans w atramencie, czyli rangę karty S1. */
    '#' + ID + ' .mp-tryb__karta[data-mp-karta="pochwal-sie"] .mp-tryb__karta-krok{' +
      'font-family:"DM Serif Display",Georgia,serif;font-weight:400;font-size:22px;' +
      'line-height:1.1;color:var(--mp-zielen)}' +
    '#' + ID + ' .mp-tryb__karta-meta{margin:0;font-size:14px;line-height:16px;' +
      'color:var(--mp-beige-3)}' +
    '#' + ID + ' .mp-tryb__karta-krok{margin:0;font-size:18px;line-height:22px}' +
    /* Tor postępu W KARCIE S1 (`7284:10851`) jest INNY niż tor w belce (W12), i to
       jest rysunek, nie niedopatrzenie: w belce tor jest WYPEŁNIONY `beige-1` bez obrysu,
       tutaj jest PUSTY z obrysem 1 px `beige-2`. Wypełnienie: `beige-3`, nie atrament.
       Promień 100 w obu. Runtime miał tu wypełnienie `beige-2`, promień 3 i atrament —
       trzy rozjazdy naraz, żaden rzucający się w oczy osobno przy pasku 6 px wysokości. */
    '#' + ID + ' .mp-tryb__karta-tor{height:6px;box-sizing:border-box;border-radius:100px;' +
      'border:1px solid var(--mp-beige-2);background:transparent;overflow:hidden}' +
    '#' + ID + ' .mp-tryb__karta-wypelnienie{height:6px;border-radius:100px;' +
      'background:var(--mp-beige-3)}' +
    '#' + ID + ' .mp-tryb__karta-ogon{margin:0;font-size:14px;line-height:19px}' +
    /* Karta „pochwal się" (§3.4): padding 16, nagłówek, potem lista numerowana
       o odstępie 12; numer w kwadracie 20×20, tekst od x=28 (odstęp 8) — ten sam
       rytm co wiersz akcji w banerze offline. */
    '#' + ID + ' .mp-tryb__karta-lista{display:flex;flex-direction:column;gap:12px}' +
    '#' + ID + ' .mp-tryb__karta-wiersz{display:flex;align-items:flex-start}' +
    /* W72/W73 — numer kroku instrukcji (`7200:10895` + `7200:10896`) jest KÓŁKIEM:
       obrys 1 px `beige-3` #816D44, promień 10 na polu 20×20, BEZ wypełnienia,
       a cyfra w środku to styl `Caption` — DM Sans **Medium 500**, interlinia **16**,
       barwa **`beige-3`**, nie odziedziczony atrament. Runtime rysował samą cyfrę
       w pustym polu: ten sam kształt co kółko `i` (W48) — element wizualny, nie
       rozjazd o stopień. Stopień pisma zostaje 14 do rozstrzygnięcia **D-25.5**
       (`typo/Caption`: 14 w trybie desktopowym, 12 w mobilnym). */
    '#' + ID + ' .mp-tryb__karta-numer{flex:0 0 auto;width:20px;height:20px;' +
      'box-sizing:border-box;border:1px solid var(--mp-beige-3);border-radius:10px;' +
      'color:var(--mp-beige-3);display:flex;align-items:center;justify-content:center;' +
      'margin-right:8px;font-size:14px;font-weight:500;line-height:16px;text-align:center}' +
    '#' + ID + ' .mp-tryb__karta-tekst{flex:1 1 auto;font-size:14px;line-height:19px}' +

    /* NIENARYSOWANE (G11): scrim orientacji poziomej — mechanizmem jest media query,
       nie `screen.orientation.lock()` (WYMAGANIA §1; lock nie istnieje na iOS). */
    '#' + ID + ' .mp-tryb__scrim-poziom{display:none}' +
    '@media (orientation:landscape){#' + ID + '[data-otwarty] .mp-tryb__scrim-poziom{' +
      'display:flex;position:absolute;inset:0;z-index:2;align-items:center;justify-content:center;' +
      'background:var(--mp-bialy)}}';

  /* Rejestr ostrzeżeń runtime'u. NIE `console.warn`: matryca wymaga zera błędów
     I OSTRZEŻEŃ w konsoli na każdej ramce, więc zgłoszenie przez konsolę zamieniłoby
     jedną czerwień (B16) na drugą. Zgłoszenie ma być odczytywalne przez pomiar
     i nieszkodliwe dla użytkownika — lista spełnia oba warunki, konsola żadnego. */
  var ostrzezeniaRuntime = [];
  function ostrzezenie(tekst) { ostrzezeniaRuntime.push(String(tekst)); return null; }

  function el(tag, klasa, rodzic) {
    var e = document.createElement(tag);
    if (klasa) e.className = klasa;
    if (rodzic) rodzic.appendChild(e);
    return e;
  }

  function wstawStyl() {
    if (document.getElementById(ID_STYL)) return;
    var s = document.createElement('style');
    s.id = ID_STYL;
    s.textContent = ':root{' + TOKENY.map(function (t) { return t[0] + ':' + t[1]; }).join(';') + '}' + CSS;
    document.head.appendChild(s);
  }

  var stan = { widok: null, krok: 1, korzen: null, czesci: null, listaOtwarta: false,
               ekran: null, porcje: 2, model: null };

  /* ====================================================================
     POMIAR — instrumentacja PostHog (jednostka „instrumentacja", 2026-08-21)

     Runtime nie zna PostHoga i nie może go zakładać. Snippet PostHoga na
     miesnapaczka.pl stoi w `<head>` jako `<script type="text/plain"
     data-cookieconsent="statistics">`, a Cookiebot z `data-blockingmode="auto"`
     odblokowuje go DOPIERO po zgodzie na kategorię „statistics".

     ZMIERZONE 2026-08-21 na produkcji, nie odczytane z dokumentacji:
       przed zgodą  →  `window.posthog` === undefined · 0 żądań sieciowych
       po zgodzie   →  `window.posthog` obiekt, `__loaded` true · 9 żądań
     a `window.MP.tryb` i `window.mpGotowanie` istnieją JUŻ PRZED zgodą.

     Stąd KOLEJKA, a nie strażnik. Gdyby tu stało zwykłe
     `if (posthog) posthog.capture(...)`, użytkownik, który otwiera tryb przed
     kliknięciem banera, zgubiłby `cooking_mode_opened`, a jego późniejsze
     `cooking_step_advanced` weszłyby normalnie — czyli instrumentacja
     produkowałaby SYSTEMATYCZNIE tę samą awarię, którą zapytanie kontrolne
     („otwarcia == 1 dla każdej sesji") ma wykrywać. Kolejka jest ograniczona
     do LIMIT_KOLEJKI i pilnowana zegarem o skończonej liczbie prób: dla
     użytkownika bez zgody moment odblokowania nie nadejdzie NIGDY i pamięć
     nie może rosnąć w nieskończoność.

     DZIENNIK jest tym samym obiektem, który idzie do `capture` — nie
     równoległą rekonstrukcją. Gdyby był budowany osobno, wiersze matrycy
     mierzyłyby dziennik, a nie produkt.
     ==================================================================== */
  var POMIAR = (function () {
    var LIMIT_KOLEJKI = 40;      // ~6 sesji trybu; wyżej i tak nie ma czego ratować
    var LIMIT_PROB = 30;         // 30 × 1 s — tyle czekamy na zgodę, potem odpuszczamy
    var LIMIT_DZIENNIKA = 200;

    var kolejka = [];
    var dziennik = [];
    var sesja = null;            // { id, t0, wznowiona, minutnikow, ostatniKrok, zakonczona }
    var zegar = null, prob = 0, zgloszono = false;

    function silnik() {
      var p = global.posthog;
      /* Nie wymagamy `__loaded`: między odblokowaniem snippetu a wczytaniem
         `array.js` `window.posthog` jest namiastką, która KOLEJKUJE `capture`
         i sama się opróżnia. Odrzucanie jej zgubiłoby zdarzenia z tego okna. */
      return (p && typeof p.capture === 'function') ? p : null;
    }

    function klucz() {
      try {
        if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
      } catch (e) { /* `crypto` bywa nieobecne w kontekście niezabezpieczonym */ }
      /* Zapas: Safari < 15.4 nie ma `randomUUID`. To nie jest UUID v4 w sensie
         normy i nie musi być — klucz ma być unikalny w obrębie projektu, a nie
         rozstrzygalny globalnie. */
      return 'mp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    function slug() {
      var p = String((global.location && global.location.pathname) || '');
      return p.replace(/\/+$/, '').split('/').pop() || '';
    }

    function tytul() {
      if (stan.widok && stan.widok.tytul) return stan.widok.tytul;
      if (global.MP && global.MP.model && global.MP.model.tytul) return global.MP.model.tytul;
      return null;
    }

    function zglos(tekst) {
      if (zgloszono) return;
      zgloszono = true;
      /* WYMÓG Z PRZEKAZANIA: cichy brak pomiaru jest gorszy niż wyjątek.
         Raz, nie przy każdym zdarzeniu — inaczej konsola staje się bezużyteczna. */
      try { console.warn('[mp-tryb] pomiar: ' + tekst); } catch (e) {}
    }

    function spusc(p) {
      if (!kolejka.length) return;
      var partia = kolejka;
      kolejka = [];
      for (var i = 0; i < partia.length; i++) {
        try { p.capture(partia[i][0], partia[i][1]); } catch (e) {
          zglos('`posthog.capture` rzucił przy spuszczaniu kolejki: ' + (e && e.message));
        }
      }
    }

    function pilnuj() {
      if (zegar) return;
      zegar = setInterval(function () {
        prob++;
        var p = silnik();
        if (p) { spusc(p); clearInterval(zegar); zegar = null; return; }
        if (prob >= LIMIT_PROB) {
          clearInterval(zegar); zegar = null;
          zglos('PostHog nie wstał w ' + LIMIT_PROB + ' s (brak zgody na „statistics"?) — ' +
                kolejka.length + ' zdarzeń nie pojedzie');
        }
      }, 1000);
    }

    function wyslij(nazwa, wlasciwosci) {
      /* Właściwości zamrażamy TERAZ, nie przy spuszczaniu kolejki: między
         zakolejkowaniem a zgodą użytkownik zdąży zmienić krok i porcje. */
      var w = {
        cooking_session_id: sesja ? sesja.id : null,
        recipe_slug: slug(),
        recipe_title: tytul()
      };
      for (var k in wlasciwosci) {
        if (Object.prototype.hasOwnProperty.call(wlasciwosci, k)) w[k] = wlasciwosci[k];
      }
      if (dziennik.length < LIMIT_DZIENNIKA) dziennik.push({ event: nazwa, properties: w });
      var p = silnik();
      if (p) {
        spusc(p);
        /* Nie połykamy wyjątku po cichu. Wymóg z przekazania §4 brzmi wprost:
           cichy brak pomiaru jest gorszy niż wyjątek. `try` zostaje, bo rzucający
           `capture` nie ma prawa przewrócić trybu gotowania — ale rzut jest
           ZGŁASZANY, raz, zamiast znikać. */
        try { p.capture(nazwa, w); } catch (e) {
          zglos('`posthog.capture` rzucił na „' + nazwa + '": ' + (e && e.message));
        }
        return w;
      }
      if (kolejka.length < LIMIT_KOLEJKI) { kolejka.push([nazwa, w]); pilnuj(); return w; }
      zglos('kolejka pełna (' + LIMIT_KOLEJKI + ') — zdarzenia od tej chwili przepadają');
      return w;
    }

    /* Powiązanie z konwersją. `cta_click` zostaje JEDYNĄ miarą kliknięcia
       (zakaz z przekazania §6/§10) — dokładamy do niego kontekst przez super
       properties, nie przez drugie zdarzenie.

       ZMIERZONE 2026-08-21: w overlayu NIE MA przycisku „dodaj do Paczki" —
       ekran zakończenia to okrojony wariant `7195:11178` (WYMAGANIA §2, D9 poza
       zakresem v1.0), a klikalne są tylko `close`, „zrób zdjęcie" i „wróć do
       przepisu". Konwersja pada więc PO wyjściu z trybu, na stronie przepisu.
       Dlatego `cooking_session_id` rejestrujemy na całą sesję PostHoga: jedzie
       odtąd na każdym `cta_click`, także tym poza overlayem — i to jest właśnie
       miara „sesja z trybem gotowania kontra sesja bez".
       `in_cooking_mode` zostaje osobno i mówi węższą prawdę: czy overlay był
       otwarty W CHWILI kliknięcia. */
    function oznacz(wlasciwosci) {
      var p = silnik();
      if (!p || typeof p.register !== 'function') return false;
      try { p.register(wlasciwosci); return true; } catch (e) { return false; }
    }

    return {
      otwarto: function (dane) {
        sesja = { id: klucz(), t0: teraz(), wznowiona: !!dane.is_resumed,
                  minutnikow: 0, ostatniKrok: null, zakonczona: false };
        oznacz({ cooking_session_id: sesja.id, in_cooking_mode: true });
        return wyslij('cooking_mode_opened', {
          steps_total: dane.steps_total,
          servings: dane.servings,
          servings_base: dane.servings_base,
          source: dane.source,
          is_resumed: !!dane.is_resumed,
          viewport_width: (global.innerWidth || 0)
        });
      },

      krok: function (n, N, maMinutnik) {
        if (!sesja) return null;
        if (n === sesja.ostatniKrok) return null;   // przerysowanie to nie przejście
        var wstecz = sesja.ostatniKrok !== null && n < sesja.ostatniKrok;
        sesja.ostatniKrok = n;
        return wyslij('cooking_step_advanced', {
          /* `step_index` LICZONY OD ZERA — spec przekazania mówi to wprost,
             a runtime numeruje kroki od jedynki, więc konwersja jest tutaj
             i tylko tutaj. */
          step_index: n - 1,
          steps_total: N,
          step_has_timer: !!maMinutnik,
          direction: wstecz ? 'back' : 'forward'
        });
      },

      minutnik: function (sekundy, ileChodzi) {
        if (!sesja) return null;
        sesja.minutnikow++;
        return wyslij('cooking_timer_started', {
          step_index: sesja.ostatniKrok === null ? null : sesja.ostatniKrok - 1,
          timer_seconds: sekundy,
          timers_active: ileChodzi
        });
      },

      zakonczono: function (N, porcje) {
        if (!sesja) return null;
        /* Bez tej bramki zmiana porcji NA EKRANIE ZAKOŃCZENIA odpalałaby
           zdarzenie ponownie: `ustawPorcje` woła `pokazEkran(stan.ekran)`,
           a `stan.ekran` jest wtedy `'koniec'`. */
        if (sesja.zakonczona) return null;
        sesja.zakonczona = true;
        return wyslij('cooking_mode_completed', {
          steps_total: N,
          duration_seconds: Math.round((teraz() - sesja.t0) / 1000),
          servings: porcje,
          timers_used: sesja.minutnikow
        });
      },

      zamknieto: function (powod, N, porcje) {
        if (!sesja) return null;
        var w = wyslij('cooking_mode_closed', {
          exit_step_index: sesja.ostatniKrok === null ? null : sesja.ostatniKrok - 1,
          steps_total: N,
          duration_seconds: Math.round((teraz() - sesja.t0) / 1000),
          reason: powod
        });
        oznacz({ in_cooking_mode: false });
        /* Sesja gaśnie TUTAJ i to jest bramka przeciw duplikatom: `zamknijWewn`
           nie zeruje `stan.korzen`, więc drugie `zamknij()` przeszłoby przez jego
           własny strażnik. */
        sesja = null;
        return w;
      },

      porcje: function (z, na) {
        if (!sesja) return null;
        return wyslij('cooking_servings_changed', {
          servings_from: z,
          servings_to: na,
          step_index: sesja.ostatniKrok === null ? null : sesja.ostatniKrok - 1
        });
      },

      /* Powierzchnia POMIAROWA — matryca ma czym mierzyć bez sieci i bez zgody. */
      dziennik: function () { return dziennik.slice(); },
      wyczysc: function () { dziennik = []; kolejka = []; },
      sesja: function () { return sesja ? { id: sesja.id, wznowiona: sesja.wznowiona,
                                            minutnikow: sesja.minutnikow,
                                            ostatniKrok: sesja.ostatniKrok,
                                            zakonczona: sesja.zakonczona } : null; },
      wKolejce: function () { return kolejka.length; },
      silnikJest: function () { return !!silnik(); }
    };
  })();


  function zbuduj() {
    if (stan.korzen) return stan.korzen;
    wstawStyl();

    /* B15: overlay jest elementem TEGO dokumentu (`position: fixed`), nie iframe'em —
       spec §9. Iframe zerwałby dostęp do modelu i do zaznaczeń listy. */
    var korzen = el('div');
    korzen.id = ID;
    korzen.setAttribute('role', 'dialog');
    korzen.setAttribute('aria-modal', 'true');

    var belka = el('div', 'mp-tryb__belka', korzen);
    /* KOLEJNOŚĆ W DRZEWIE JEST TU BEZ ZNACZENIA DLA UKŁADU — wszystkie troje dzieci
       są `position:absolute` wobec belki. Zostaje ta, w której czyta się klatkę
       od góry: kreska postępu, etykieta, przełącznik. */
    var tor = el('div', 'mp-tryb__tor', belka);
    var wypelnienie = el('div', 'mp-tryb__wypelnienie', tor);
    var etykieta = el('p', 'mp-tryb__etykieta', belka);
    /* PRZEŁĄCZNIK PRZEJMUJE ROLĘ `×` — patrz komentarz przy nasłuchu niżej.
       `role="switch"` + `aria-checked="true"`, bo to jest przełącznik trybu w stanie
       włączonym, a nie przycisk „zamknij": czytnik ma powiedzieć, CO jest włączone,
       a nie co się stanie. Etykieta jest tekstowa, bo w belce nie ma jej wizualnie
       (klatka: „sam tor, bez etykiety"), a kontrolka bez nazwy jest niedostępna. */
    var przelacznik = el('button', 'mp-tryb__przelacznik', belka);
    przelacznik.type = 'button';
    przelacznik.setAttribute('role', 'switch');
    przelacznik.setAttribute('aria-checked', 'true');
    przelacznik.setAttribute('aria-label', 'tryb gotowania');
    var przelacznikTor = el('div', 'mp-tryb__przelacznik-tor', przelacznik);
    przelacznikTor.setAttribute('aria-hidden', 'true');
    el('div', 'mp-tryb__galka', przelacznikTor);

    var top = el('div', 'mp-tryb__top', korzen);

    var bottom = el('div', 'mp-tryb__bottom', korzen);
    var stos = el('div', 'mp-tryb__stos', bottom);      // kafle minutników — jednostka 7
    /* B11: ekrany start / S1 / zakończenie mają BOTTOM 132 = dwa CTA pełnej
       szerokości i ANI JEDNEGO `←`. Blok akcji i pasek nawigacji wykluczają się
       wzajemnie — dlatego to dwa węzły przełączane, a nie jeden przebudowywany:
       przebudowa gubiłaby uchwyty, a kafle `stos` wiszą pod oboma tak samo. */
    var akcje = el('div', 'mp-tryb__akcje', bottom);
    akcje.hidden = true;
    var akcjaPrimary = el('button', 'mp-tryb__akcja-primary', akcje);
    akcjaPrimary.type = 'button';
    var akcjaGhost = el('button', 'mp-tryb__akcja-ghost', akcje);
    akcjaGhost.type = 'button';
    var nawigacja = el('div', 'mp-tryb__nawigacja', bottom);
    var wstecz = el('button', 'mp-tryb__wstecz', nawigacja);
    wstecz.type = 'button';
    wstecz.setAttribute('aria-label', 'poprzedni krok');
    /* IKONA, NIE ZNAK (poprawka 2026-08-15, zgłoszenie: „strzałka zdecydowanie
       za wielka"). Było `'←'` (U+2190) renderowane krojem tekstowym: jego pudełko nie ma
       nic wspólnego z siatką ikony, więc przy `font-size:24px` wychodziło za duże i innej
       wagi niż reszta interfejsu. Teraz PRAWDZIWA ligatura subsetu — `arrow_back` jest
       w subsecie v4 (zweryfikowane sondą szerokości na foncie z CDN Webflow: 20,0 px
       przy kontroli ujemnej 445,6 px). Nazwa dopisana do `LIGATURY`, żeby `I4` dalej
       pytało o PEŁNY zbiór ligatur używanych przez runtime, a nie o trzy z pięciu. */
    wstecz.className += ' mp-ikona';
    wstecz.textContent = 'arrow_back';
    wstecz.setAttribute('data-mp-ligatura', 'arrow_back');
    var dalej = el('button', 'mp-tryb__dalej', nawigacja);
    dalej.type = 'button';
    /* W07/W08: etykieta i glif to DWA węzły, bo `justify-content:space-between`
       rozpycha rodzeństwo, nie tekst. Etykieta w `<span>`, nie gołym tekstem —
       goły węzeł tekstowy też jest elementem flexa, ale nie ma go czym złapać
       w asercji. Glif `→` jest SUBSTYTUTEM Unicode w miejsce `arrow_forward`
       z subsetu; wymiana na ligaturę idzie razem z B16, po wpięciu fontu. */
    var dalejEtykieta = el('span', 'mp-tryb__dalej-etykieta', dalej);
    dalejEtykieta.textContent = 'dalej';
    var dalejGlif = el('span', 'mp-tryb__dalej-glif', dalej);
    /* W07 zapowiadał tę migrację wprost: „brzmienie glifu to substytut Unicode `→`,
       migracja na ligaturę subsetu należy do B16, nie tutaj". B16 jest zielone od przeb. 32,
       więc zapowiedź jest wykonana. */
    dalejGlif.className += ' mp-ikona';
    dalejGlif.textContent = 'arrow_forward';
    dalejGlif.setAttribute('data-mp-ligatura', 'arrow_forward');
    dalejGlif.setAttribute('aria-hidden', 'true');

    /* Scrim dialogów PO `bottom` w drzewie — F6: BOTTOM zostaje, tylko pod nim. */
    var scrimDialogu = el('div', 'mp-tryb__scrim', korzen);
    var scrim = el('div', 'mp-tryb__scrim-poziom', korzen);
    // NIENARYSOWANE: brzmienie tekstu dostarcza pipeline treści (tryb ui)
    scrim.textContent = 'obróć telefon';

    // NIENARYSOWANE (G1) / I-04/I-05: krok → krok wyłącznie tapem, bez swipe.
    // Luka rozstrzygnięta ZANIECHANIEM: dowodem jest asercja negatywna sekcji H
    // (`touchstart`/`pointerdown`/`swipe` 0 ×), nie sam ten znacznik.
    /* D-39.13 · Z OSTATNIEGO KROKU „dalej" PROWADZI NA EKRAN ZAKOŃCZENIA.
       Do tej poprawki wołało `pokazKrok(N + 1)`, a `pokazKrok` zwraca `null` poza
       zakresem — więc przycisk był widoczny, miał normalną etykietę i NIE ROBIŁ NIC.
       Zmierzone na stagingu 2026-08-16: na `krok 9 z 9` `dalej` widoczny, po kliknięciu
       `ekranTeraz()` dalej `null`, etykieta bez zmian. Klatka `10 · zakończenie —
       prośba o zdjęcie` istnieje w Figmie i nie było do niej ŻADNEJ drogi z interfejsu:
       `pokazEkran('koniec')` miało dotąd jedynego wywołującego w publicznym API.
       Granicę czytam z `stan.widok`, a nie ze stałej — liczba kroków jest cechą
       przepisu, nie runtime'u. Gdy widoku nie ma, zachowanie zostaje bez zmian. */
    dalej.addEventListener('click', function () {
      var N = stan.widok && stan.widok.kroki ? stan.widok.kroki.length : 0;
      if (N && stan.krok >= N) return pokazEkran('koniec');
      return pokazKrok(stan.krok + 1);
    });
    /* D-39.19 · Z KROKU 1 „wstecz" WRACA NA EKRAN STARTOWY.
       Zgłoszenie: „przycisk wstecz z pierwszego kroku
       uniemożliwia powrót na ekran startowy, jest nieinteraktywny". Tak było
       zaprojektowane — `pokazKrok()` ustawiało `wstecz.disabled = (n === 1)` — i to
       jest ta sama pomyłka co na drugim końcu przepisu (`D-39.13`): oba krańce
       traktowano jako ŚCIANĘ, podczas gdy za każdym stoi ekran. Skutek: po wejściu
       w gotowanie nie było już drogi do selektora porcji inaczej niż przez wyjście
       z trybu i wejście od nowa.
       Symetria jest teraz pełna: `wstecz` z kroku 1 → `start`, `dalej` z kroku N →
       `koniec`. Wyłączanie przycisku zdjęte razem z przyczyną — przycisk, który
       ma dokąd prowadzić, nie ma powodu być wygaszony. */
    wstecz.addEventListener('click', function () {
      if (stan.krok <= 1) return pokazEkran('start');
      return pokazKrok(stan.krok - 1);
    });
    /* F2/I-07 · PRZEŁĄCZNIK PRZEJMUJE DROGĘ WYJŚCIA PO `×`.
       `×` był JEDYNYM trwałym wyjściem z trybu i po przebudowie belki (2026-08-23)
       znika, a jego rolę bierze przełącznik.

       D-43.1 · WYJŚCIE JEST NATYCHMIASTOWE — S2 ZDJĘTY Z TEJ DROGI (staging, próba
       UX, polecenie). Przesłanka: przełącznik
       obiecuje przełączanie bez ceremonii, a okno „Przerwać gotowanie?" tej obietnicy
       przeczy. Do tego S2 pilnował JEDNYCH Z TROJGA DRZWI — pozostałe dwie drogi
       wyjścia (gest wstecz przez `popstate` oraz ghost „wróć do przepisu" na ekranie
       końcowym) wołają `zamknij()` wprost i nigdy nie ostrzegały. Strażnik przy
       jednym z trzech wejść nie jest strażnikiem, tylko niespodzianką.

       CO TA ZMIANA ODDAJE: S2 mówił „minutniki przestaną odliczać". To jedyna
       treść, która przepada — postęp przepisu i tak zostaje zapamiętany (mówił
       to sam dialog), a zapamiętanie robi zapis stanu, nie dialog.

       DIALOG ZOSTAJE W KODZIE NIETKNIĘTY i dalej wisi na `MP.tryb.dialog.otworz`;
       zdjęty jest wyłącznie ten jeden wywołujący. Odwrócenie próby to jedna linia.

       ASERCJA, KTÓRA TO PILNUJE, MUSI PYTAĆ O TRAFIENIE, NIE O PODPIĘCIE:
       `elementFromPoint` w środku przełącznika ma zwrócić go albo jego potomka
       (patrz D-38.1 — `.click()` przechodził na `×`, w który nie dało się trafić).

       `aria-checked` przestawiamy TERAZ, bo od tej zmiany nie ma czego anulować:
       aktywacja przełącznika JEST decyzją. Wartość wraca na `true` przy otwarciu
       (`otworz`), bo szkielet overlaya budowany jest raz i przeżywa zamknięcie —
       bez tego drugie wejście zastałoby przełącznik kłamiący, że tryb jest wyłączony. */
    przelacznik.addEventListener('click', function () {
      przelacznik.setAttribute('aria-checked', 'false');
      zamknij();
    });
    /* Jeden nasłuch na przycisk, cel zależny od ekranu — zamiast przepinania
       handlerów przy każdym przerysowaniu. Przepinanie było najkrótszą drogą do
       dwóch nasłuchów na tym samym węźle. */
    akcjaPrimary.addEventListener('click', function () { akcjaEkranu('primary'); });
    akcjaGhost.addEventListener('click', function () { akcjaEkranu('ghost'); });

    document.body.appendChild(korzen);
    stan.korzen = korzen;
    stan.czesci = { belka: belka, etykieta: etykieta, tor: tor, wypelnienie: wypelnienie,
                    przelacznik: przelacznik, top: top, bottom: bottom, stos: stos,
                    nawigacja: nawigacja, wstecz: wstecz, dalej: dalej, scrim: scrim,
                    scrimDialogu: scrimDialogu, akcje: akcje,
                    akcjaPrimary: akcjaPrimary, akcjaGhost: akcjaGhost };
    return korzen;
  }

  /* R6: BOTTOM = 80 + [Σ kafli + 8×(n−1) + 12] gdy n ≥ 1, inaczej 80.
     Szkielet nie ma jeszcze kafli, więc n = 0 — pełna reguła wchodzi z jednostką 7. */
  function przeliczBottom() {
    var h = stan.czesci.bottom.getBoundingClientRect().height;
    stan.korzen.style.setProperty('--mp-bottom-h', h + 'px');
    return h;
  }

  /* ================= minutniki — kafle w `stos` (jednostka W2) =================
     Kafel żyje w BOTTOM, a nie w treści kroku, więc minutnik z natury biegnie
     dalej przy zmianie kroku (C17, §3.16 klatka 07) — to nie jest osobna
     mechanika, tylko konsekwencja miejsca w drzewie.

     Czas czytamy WYŁĄCZNIE przez `MP.zegar.teraz()` (STAN, przebieg 3).
     `tyk()` jest wystawiony na zewnątrz, żeby pomiar mógł wymusić przeliczenie
     natychmiast po `MP_TEST.przewin()`, zamiast czekać na interwał. */
  var minutniki = [];
  var interwal = null;

  function formatOdliczania(sek) {
    if (sek < 0) sek = 0;
    var g = Math.floor(sek / 3600);
    var m = Math.floor((sek % 3600) / 60);
    var s = sek % 60;
    var mm = g > 0 ? String(m).padStart(2, '0') : String(m);
    return (g > 0 ? g + ':' : '') + mm + ':' + String(s).padStart(2, '0');
  }

  /* I-19 (≤ 60 s) · I-20 (≤ 10 s) · I-21 (0:00). Progi domknięte od góry:
     dokładnie 60 s to już „ostatnia minuta", dokładnie 10 s to już „końcówka". */
  function stanCzasu(pozostalo) {
    if (pozostalo <= 0) return 'zero';
    if (pozostalo <= 10) return 'koncowka';
    if (pozostalo <= 60) return 'ostatnia-minuta';
    return 'w-toku';
  }

  function teraz() {
    return (global.MP && global.MP.zegar && global.MP.zegar.teraz)
      ? global.MP.zegar.teraz() : Date.now();
  }

  /* D-49.1 · FORMY SĄ DWIE: zwinięta 40 i rozwinięta. Trzecia — „rozwinięta krótka",
     wybierana przy BRAKU podpowiedzi — została usunięta na polecenie
     2026-08-23: „po co nam tryb, do którego nie da się dotrzeć?".

     Nie dało się do niej dotrzeć od D-48.1: skoro krok z minutnikiem bez kryterium
     jest błędem parsera, to każdy minutnik z treści ma podpowiedź, więc każdy był
     `pelna`. Zmierzone przed usunięciem: 16 źródeł, **55 minutników, 55 razy
     niepuste `kryteriumHtml`, zero wyjątków** — więc usunięcie nie rusza ani
     jednego przepisu.

     Co ta forma kosztowała, póki żyła: rząd ghostów wisiał na `f === 'pelna'`,
     więc minutnik bez podpowiedzi tracił `+5 min` i `od nowa` NA 0:00. Stan
     nieosiągalny z treści, ale osiągalny z API — i cicho gubiący dwa wyjścia.
     Teraz rozwinięta jest jedna i zawsze ma komplet przycisków.

     Podpowiedź chowa się odtąd po SWOJEJ obecności, nie po formie (patrz
     `rysujKafel`): pusty akapit nie ma czego pokazać niezależnie od tego,
     jak nazywa się forma dookoła niego. */
  function forma(m) {
    return m.rozwinieta ? 'pelna' : 'zwinieta';
  }

  function rysujKafel(m) {
    var p = m.el.pigulka;
    var f = forma(m);
    var wPauzie = m.pauza != null;
    p.setAttribute('data-forma', f);
    /* `data-stan="pauza"` zamiast `stanCzasu(...)` — CELOWO wartość, której nie zna
       żadna reguła alarmu. Bez tego minutnik zapauzowany na 30 s pulsowałby
       obrysem i kropką, choć nic już nie ucieka. */
    p.setAttribute('data-stan', wPauzie ? 'pauza' : m.stan);

    /* R10 ZDJETE decyzja. Regula („szewron wylacznie przy
       pigulce rozwinietej pelnej") byla odczytana z klatek i jest w nich prawdziwa
       — ale opisuje projekt BEZ obrotu. Szewron, ktory znika przy zwinieciu, nie ma
       jak pokazac pozycji `w dol`: uzytkownik ogladalby wylacznie polowe animacji,
       a pigulka zwinieta nie mialaby zadnej oznaki, ze da sie ja rozwinac —
       czyli traciloby sie sam afordans akordeonu. Skutek uboczny jest zmierzalny
       i zamierzony: R9 (czas oddaje szewronowi 28 px) obowiazuje teraz takze
       w pigulce zwinietej, wiec odliczanie w formie `zwinieta` przesuwa sie
       o 28 px w lewo. To jest ta zmiana, nie przypadek. */
    m.el.szewron.hidden = false;
    /* D-49.1 — podpowiedź chowa się po SWOJEJ obecności, nie po nazwie formy.
       Po zlaniu form „krótka" i „pełna" w jedną warunek `f !== 'pelna'` pokazywałby
       PUSTY akapit minutnikowi bez podpowiedzi (droga programistyczna, `uruchom()`
       bez `podpowiedz`) — czyli 12 px odstępu bez treści. */
    m.el.podpowiedz.hidden = f === 'zwinieta' || !m.podpowiedz;
    m.el.primary.hidden = f === 'zwinieta';
    m.el.ghosty.hidden = f !== 'pelna';

    /* §3.6 vs §3.9: przy 0:00 rząd ma DWA ghosty po 140, przy biegnącym — jeden
       pełnej szerokości. W PAUZIE też JEDEN — D-45.2, odczyt `7212:10962`:
       skład podano wprost, „górne CTA: wznów minutnik, dolne CTA: wyłącz".
       Wcześniejsza wersja tej pauzy dokładała trzeci przycisk („od nowa"), bo
       polecenie mówiło „wznowienie / restart". Restart NIE ZNIKA — wychodzi
       z dwóch ruchów, które i tak istnieją: `wyłącz` zdejmuje minutnik, a krok
       natychmiast odzyskuje swój kafel startowy z pełnym czasem. Jeden przycisk
       mniej za tę samą możliwość. */
    m.el.ghost2.hidden = m.stan !== 'zero';

    /* ETYKIETY I ROLE — ODCZYTANE Z FIGMY 2026-08-20, nie z pipeline'u tresci.
       `7211:10925` (biegnacy): primary „✓ <nazwa> gotowy" + JEDEN ghost „wylacz minutnik".
       `7240:10918` (0:00):     primary „✓ <nazwa> gotowy" + DWA ghosty „+5 min" i „od nowa".

       Co to zastapilo i dlaczego. Do 2026-08-20 stalo tu „zatrzymaj" / „uruchom
       ponownie" / „dodaj minute" — TRZY etykiety, ktorych nie ma w ZADNEJ klatce,
       z polzaimplementowana pauza: funkcja pauzy ustawiala `zatrzymany` i nie robila
       nic wiecej — bez przerysowania, bez wznowienia, bez wyjscia. Efekt na produkcji
       byl gorszy niz brak funkcji: jedno tapniecie zamrazalo pigulke na zawsze, bo
       zapauzowany minutnik nie moze dojsc do `zero`, a zamykanie bylo schowane do `zero`.
       Zmierzone na produkcji 2026-08-20: 13 z 15 kombinacji (stan × przycisk) martwych.

       PAUZY NIE MA W PROJEKCIE — to nie luka do uzupelnienia, tylko funkcja, ktorej
       nigdy nie zamowiono. Primary NIE steruje czasem: potwierdza kryterium. */
    /* D-44.6 — w pauzie te same trzy gniazda niosą trzy wyjścia: wznów (primary),
       od nowa (ghost1), wyłącz (ghost2). Poza pauzą wszystko zostaje jak było. */
    /* D-46.2 · „✓ gotowe", bez nazwy — polecenie: „chcę, by na
       wypełnionym CTA był tylko tekst »gotowe«, bez rzeczownika, który trzeba
       odmieniać". Poprzednie brzmienie sklejało `'✓ ' + nazwa + ' gotowy'`, czyli
       przymiotnik w rodzaju MĘSKIM doklejany do dowolnej nazwy z CMS-u. Zgadzało się
       wyłącznie przez przypadek: „sos gotowy" tak, ale „brokuły gotowy" i „wołowina
       gotowy" — nie. Sklejanie odmiany z danych to defekt, którego nie da się
       naprawić inaczej niż usunięciem odmiany. */
    m.el.primary.textContent = wPauzie ? 'wznów minutnik' : '✓ gotowe';
    // NIENARYSOWANE brzmienie dolnego CTA w pauzie: podano „wyłącz",
    // krócej niż „wyłącz minutnik" ze stanu biegnącego. Zapisane dosłownie.
    m.el.ghost1.textContent = wPauzie ? 'wyłącz'
                            : (m.stan === 'zero' ? '+5 min' : 'wyłącz minutnik');
    m.el.ghost2.textContent = 'od nowa';
    m.el.odliczanie.textContent = formatOdliczania(m.pozostalo);
    m.el.nazwa.textContent = m.nazwa;
    /* D-39.15 — `innerHTML`, nie `textContent`, i to NIE jest rozluźnienie granicy.
       Pole niesie wynik `bezZakreslen()`, czyli tekst ESCAPOWANY i pozbawiony
       znaczników; pod `textContent` encje (`&amp;`, `&quot;`) pokazałyby się
       dosłownie. Zmiana idzie w parze z przejściem na `kryteriumHtml` przy
       `uruchomZKroku` — poprzednio szło tu pole SUROWE i stąd gwiazdki na ekranie. */
    m.el.podpowiedz.innerHTML = m.podpowiedz || '';
    /* D-39.32 — szewron pigułki jest LIGATURĄ, nie znakiem Unicode. Odczyt
       `7240:10921` (wiersz `row` z „duś ragù" i „0:00"): Outlined Regular 16 px,
       pudełko 16×22 `[V]`. `.mp-tryb__szewron` ma te wymiary. Ta część stoi.
       Zdjęte z tego wpisu 2026-08-20: zdanie „I-16 zostaje: `up` = zwiń; klatki
       z `down` to dryf Figmy" — patrz D-40.1 niżej. */
    /* D-40.1 — glif jest BAZOWY i staly: `keyboard_arrow_down`. Kierunek robi
       obrot z CSS, nie podmiana tresci. To rownoczesnie godzi odczyt Figmy
       z komentarzem, ktory tu stal: klatki z `up` (`7240:10921`) rysuja pigulke
       ROZWINIETA, klatki z `down` — zwinieta. Poprzednie ogniwo uznalo te drugie
       za „dryf Figmy", bo zakladalo glif statyczny; przy obrocie oba odczyty sa
       tym samym elementem w dwoch koncach przejscia i zaden nie jest dryfem. */
    m.el.szewron.textContent = 'keyboard_arrow_down';
    m.el.szewron.setAttribute('data-mp-ligatura', 'keyboard_arrow_down');
  }

  /* ================= PAUZA (D-44.6) ==========================================
     Polecenie: „pauzować na wyjściu, umożliwić wznowienie /
     restart na powrót". Zmierzone PRZED tą zmianą: minutnik odliczał dalej przy
     zamkniętym trybie (3:00 → wyjście → powrót → 2:55 → 2:53), czyli zdanie dialogu
     S2 „minutniki przestaną odliczać" było nieprawdą; teraz staje się prawdą.

     TA PAUZA NIE JEST TĄ, KTÓRĄ USUNIĘTO 2026-08-20, i różnica jest cała w tym,
     czego tamtej brakowało. Tamta była PRZYCISKIEM w kaflu, który ustawiał flagę
     i nie robił nic więcej: zapauzowany minutnik nie mógł dojść do `zero`,
     a zamykanie było schowane właśnie za `zero` — jedno tapnięcie zamrażało pigułkę
     na zawsze (13 z 15 kombinacji stan × przycisk martwych). Tutaj pauzy NIE DA SIĘ
     włączyć ręcznie: wchodzi wyłącznie przy wyjściu z trybu, a kafel w tym stanie
     ma KOMPLET trzech wyjść — wznów, od nowa, wyłącz. Nie ma stanu bez wyjścia.

     `pauza` trzyma SEKUNDY POZOSTAŁE, nie znacznik czasu: po wznowieniu `koniec`
     liczy się od nowa, więc jedno źródło pozostałego czasu (D-40.4) zostaje
     nienaruszone — `tyk` czyta `koniec` zawsze, gdy minutnik biegnie. */
  function pauzuj(m) {
    if (!m || m.pauza != null) return m;
    m.pauza = Math.max(0, Math.round((m.koniec - teraz()) / 1000));
    /* D-47.2 — pauza ROZWIJA kafel. Odkąd minutnik startuje zwinięty (D-47.1),
       zwinięty jest stanem „leci w tle", a zapauzowany właśnie NIE leci: czeka na
       `wznów` albo `wyłącz`. Kafel zwinięty chowałby oba te wyjścia za dodatkowym
       tapnięciem, dokładnie tak, jak robiła to pauza usunięta 2026-08-20.
       Klatka `7212:10962`, wskazaną dla pauzy, też jest rozwinięta. */
    m.rozwinieta = true;
    rysujKafel(m);
    return m;
  }
  function wznowMinutnik(m) {
    if (!m || m.pauza == null) return m;
    m.koniec = teraz() + m.pauza * 1000;
    m.pauza = null;
    m.pozostalo = Math.max(0, Math.round((m.koniec - teraz()) / 1000));
    m.stan = stanCzasu(m.pozostalo);
    m.rozwinieta = false;   // D-47.2 — wznowienie wraca do „leci w tle"
    rysujKafel(m);
    return m;
  }
  function pauzujWszystkie() {
    minutniki.forEach(pauzuj);
    return minutniki.length;
  }

  function tyk() {
    var t = teraz();
    minutniki.forEach(function (m) {
      /* Minutnik zapauzowany NIE TYKA i to jest jedyne miejsce, które o tym wie. */
      if (m.pauza != null) return;
      /* D-40.4 — JEDNO źródło pozostałego czasu: `koniec` minus teraz. Stała tu
         gałąź `m.zatrzymany != null ? …`, nieosiągalna od usunięcia pauzy
         (I-33/I-34/I-35, 2026-08-20). Zmierzone przed usunięciem: 27 próbek
         obiektu minutnika na 16 operacjach — pole zawsze `null`, przy kontroli
         dodatniej, która wstrzyknięte 42 widziała. PAUZY NIE MA W PROJEKCIE. */
      var pozostalo = Math.max(0, Math.round((m.koniec - t) / 1000));
      if (pozostalo === m.pozostalo && stanCzasu(pozostalo) === m.stan) return;
      var poprzedniStan = m.stan;
      m.pozostalo = pozostalo;
      m.stan = stanCzasu(pozostalo);
      /* D-47.3 · WEJŚCIE W 0:00 ROZWIJA KAFEL, i to nie jest ozdoba, tylko domknięcie
         luki, którą otwiera D-47.1. Przy 0:00 rząd przycisków zmienia się na `+5 min`
         i `od nowa` (§3.6) — dopóki wszystko startowało rozwinięte, były widoczne
         same z siebie. Przy starcie zwiniętym minutnik dobiegłby zera jako pasek
         40 px, a oba wyjścia zostałyby schowane za tapnięciem. To ta sama klasa
         awarii, przez którą usunięto pauzę 2026-08-20.
         Warunek pyta o PRZEJŚCIE, nie o stan: inaczej rozwijałby kafel przy każdym
         tyknięciu na zerze i użytkownik nie mógłby go zwinąć. */
      if (m.stan === 'zero' && poprzedniStan !== 'zero') m.rozwinieta = true;
      rysujKafel(m);
    });
    return minutniki.length;
  }

  function zbudujKafel(m) {
    var p = el('div', 'mp-tryb__pigulka');
    var wiersz = el('button', 'mp-tryb__wiersz-min', p);
    wiersz.type = 'button';
    m.el = {
      pigulka: p,
      wiersz: wiersz,
      kropka: el('span', 'mp-tryb__kropka', wiersz),
      nazwa: el('span', 'mp-tryb__nazwa-min', wiersz),
      odliczanie: el('span', 'mp-tryb__odliczanie', wiersz),
      szewron: el('span', 'mp-tryb__szewron mp-ikona', wiersz),   // D-39.32
      podpowiedz: el('p', 'mp-tryb__podpowiedz', p),
      primary: el('button', 'mp-tryb__primary', p),
      ghosty: el('div', 'mp-tryb__ghosty', p)
    };
    m.el.kropka.setAttribute('aria-hidden', 'true');
    m.el.szewron.setAttribute('aria-hidden', 'true');
    m.el.primary.type = 'button';
    m.el.ghost1 = el('button', 'mp-tryb__ghost', m.el.ghosty);
    m.el.ghost2 = el('button', 'mp-tryb__ghost', m.el.ghosty);
    m.el.ghost1.type = m.el.ghost2.type = 'button';
    /* Etykiety ghostow NIE sa statyczne: `ghost1` zmienia brzmienie ze stanem
       (patrz `rysujKafel`). Ustawia je wylacznie `rysujKafel`, zeby nie bylo
       dwoch zrodel tej samej prawdy. */

    // I-15 / I-16: tap wiersza rozwija i zwija ten sam kafel
    wiersz.addEventListener('click', function () { przelacz(m); });
    // I-33: primary „✓ <nazwa> gotowy" WYLACZNIE zamyka minutnik (decyzja
    // 2026-08-20). Nie przechodzi do nastepnego kroku: nawigacja stoi w BOTTOM, osobno.
    m.el.primary.addEventListener('click', function () {
      if (m.pauza != null) return wznowMinutnik(m);   // D-44.6
      return usun(m);
    });
    // I-34: ghost1 — w biegu „wylacz minutnik" (zamyka), na 0:00 „+5 min" (doklada 5 min)
    m.el.ghost1.addEventListener('click', function () {
      if (m.pauza != null) return usun(m);             // D-45.2 — „wyłącz"
      if (m.stan === 'zero') dolozMinuty(m, 5);
      else usun(m);
      return null;
    });
    // I-35: ghost2 „od nowa" — widoczny wylacznie na 0:00, restart pelnego czasu
    m.el.ghost2.addEventListener('click', function () { return uruchomPonownie(m); });
    return p;
  }

  /* AKORDEON: najwyżej JEDEN kafel rozwinięty naraz. Decyzja,
     ze zrzutu projektu: przy dwóch biegnących minutnikach jeden jest rozwinięty,
     drugi zwinięty do pigułki.

     Bez tego `stos` rósł nieograniczenie: dwa kafle pełne to 236 + 8 + 236 + 12,
     czyli BOTTOM na 572 px z 780 — pasek zjadał trzy czwarte ekranu i przestawał
     być czymś, co UNOSI SIĘ nad treścią, a stawał się drugą treścią. Zmierzone
     przed poprawką: dwa kafle dawały BOTTOM 462 px.

     Reguła stoi w JEDNYM miejscu — `rozwin()` — bo rozwinięcie ma dwa wyzwalacze
     (klik użytkownika i start nowego minutnika) i rozdzielenie ich dałoby dwie
     kopie tej samej decyzji. */
  function rozwin(m) {
    minutniki.forEach(function (x) {
      if (x !== m && x.rozwinieta) { x.rozwinieta = false; rysujKafel(x); }
    });
    m.rozwinieta = true;
    rysujKafel(m);
  }

  function przelacz(m) {
    if (m.rozwinieta) { m.rozwinieta = false; rysujKafel(m); }
    else rozwin(m);
    przeliczBottom();
    return m.rozwinieta;
  }

  /* D-40.4 — jedyny sposób przestawienia minutnika: ile sekund ma biec OD TERAZ.
     Po zdjęciu `zatrzymany` obie ścieżki różniły się już WYŁĄCZNIE tą liczbą,
     więc zostaje jedna. Nazwy `uruchomPonownie` nie zwijam do `nastaw`, bo jest
     w API publicznym (`MP.tryb.minutniki.uruchomPonownie`). */
  function nastaw(m, sekundy) {
    m.koniec = teraz() + sekundy * 1000;
    /* D-44.6 · ZDJĘCIE PAUZY NALEŻY DO `nastaw`, nie do wywołujących, i to jest
       warunek poprawności, nie porządki. `tyk()` pomija minutniki w pauzie, więc
       gdyby „od nowa" (`uruchomPonownie` → `nastaw`) zostawiło flagę, kafel
       zamarzłby na dawnej wartości i nie ruszył NIGDY — dokładnie ta awaria,
       przez którą pauzę usunięto 2026-08-20. Każde jawne nastawienie końca
       ZNACZY „ten minutnik biegnie", więc flaga schodzi tu, w jednym miejscu
       wspólnym dla `od nowa` i `+5 min`. */
    m.pauza = null;
    tyk();
    przeliczBottom();
    return m;
  }

  function uruchomPonownie(m) { return nastaw(m, m.sekundy); }

  /* `+5 min` z `7240:10918`. Liczy od TERAZ, nie od `pozostalo`: przycisk pokazuje
     sie wylacznie na `0:00`, wiec `pozostalo` jest zerem i „dolozenie" nie ma do
     czego dolozyc. Piec minut, nie jedna — brzmienie klatki jest jednoznaczne. */
  function dolozMinuty(m, minut) { return nastaw(m, minut * 60); }

  function usun(m) {
    var i = minutniki.indexOf(m);
    if (i < 0) return null;
    minutniki.splice(i, 1);
    if (m.el.pigulka.parentNode) m.el.pigulka.parentNode.removeChild(m.el.pigulka);
    if (!minutniki.length && interwal) { clearInterval(interwal); interwal = null; }
    /* D-45.2 · TO JEST CAŁA DROGA RESTARTU i dlatego stoi tutaj, a nie przy
       przycisku: zdjęcie minutnika ODDAJE bieżącemu krokowi jego kafel startowy
       z pełnym czasem. Bez tej linii „wyłącz" zostawiałoby pusty stos aż do zmiany
       kroku, a restart wymagałby nawigacji tam i z powrotem. Działa tak samo dla
       „✓ gotowy" — krok, który ma minutnik i go nie ma uruchomionego, MA pokazywać
       ofertę; to jeden warunek, nie dwa przypadki. */
    odswiezOferteBiezacegoKroku();
    przeliczBottom();
    return m;
  }

  /* I-18 / D11: trzeci minutnik NIE powstaje — otwiera dialog S4 (F7).
     Zwracamy `null`, bez wpisu w konsoli: konsola jest mierzoną powierzchnią
     (wiersz I1), więc ostrzeżenie tutaj zapalałoby własny pomiar.
     Odmowa jest PIERWSZA, przed jakimkolwiek skutkiem ubocznym — H7 pyta o to,
     że próba nie zostawia po sobie ani kafla, ani wpisu w tablicy minutników. */
  function uruchomMinutnik(opcje) {
    opcje = opcje || {};
    if (minutniki.length >= W.limitMinutnikow) {
      zbuduj();
      /* D-40.5 — odmowa NIE zabiera już ze sobą intencji. Do 2026-08-20 przepadała
         razem z kaflem: użytkownik prosił o minutnik, dostawał okno, zwalniał
         miejsce — i musiał poprosić DRUGI RAZ, choć treść okna obiecywała wprost
         „żeby zrobić miejsce na kolejny". Przekazujemy KOPIĘ żądania, nie `opcje`,
         żeby dialog nie trzymał obiektu, który wołający może jeszcze zmienić. */
      otworzDialog('S4', { nazwa: opcje.nazwa, sekundy: opcje.sekundy,
                           podpowiedz: opcje.podpowiedz, rozwinieta: opcje.rozwinieta });
      return null;
    }
    zbuduj();
    var m = {
      nazwa: opcje.nazwa || '',
      sekundy: opcje.sekundy || 0,
      podpowiedz: opcje.podpowiedz || null,
      /* DOMYŚLNIE ZWINIĘTY — D-47.1, polecenie: „po odpaleniu
         minutnika powinien przyjmować on zminifikowaną wersję automatycznie",
         ze wskazaniem klatki `7254:10908` (jeden wiersz: kropka, nazwa, czas, szewron).

         ODWRACA decyzję z 2026-08-19, która ustawiła domyślne rozwinięcie z tego
         powodu, że „obie klatki kroków (`7195:11065`, `7211:10893`) rysują kafel
         rozwinięty". Tamta przesłanka nie była fałszywa — była o czym innym: te klatki
         pokazują minutnik JUŻ BIEGNĄCY, z podpowiedzią, a nie chwilę tuż po
         odpaleniu. `7254:10908` opisuje właśnie tę chwilę.

         Forma niesie odtąd JEDNO rozróżnienie i to jest cała reguła: zwinięty =
         leci w tle, rozwinięty = czeka na decyzję. Rozwijają go więc trzy zdarzenia,
         każde oznaczone niżej: pauza (D-47.2), wejście w 0:00 (D-47.3) i powrót
         do karty z przegapionym końcem (S5). Wznowienie zwija z powrotem.

         `rozwinieta: true` nadal da się podać jawnie. */
      rozwinieta: !!opcje.rozwinieta,
      koniec: teraz() + (opcje.sekundy || 0) * 1000,
      pozostalo: -1,
      stan: 'w-toku',
      el: null
    };
    stan.czesci.stos.appendChild(zbudujKafel(m));
    minutniki.push(m);   // C14: drugi kafel dokłada się do `stos`, nie zastępuje pierwszego
    if (m.rozwinieta) rozwin(m);   // zwija poprzedni — patrz `rozwin()`
    tyk();
    przeliczBottom();
    if (!interwal) interwal = setInterval(tyk, 200);
    /* PO `push`, nie przed: `timers_active` ma nieść liczbę minutników
       chodzących W TEJ CHWILI, razem z właśnie uruchomionym. Odmowa przy
       limicie wraca wcześniej przez `return null` i zdarzenia nie wystawia —
       minutnik, którego nie ma, nie wystartował. */
    POMIAR.minutnik(m.sekundy, minutniki.length);
    return m;
  }

  /* ================= KAFEL STARTOWY MINUTNIKA (D-44.3, `7195:11026`) ==========
     Stanem startowym minutnika jest PŁYWAJĄCY KAFEL, nie plakietka w rogu kroku —
     klatkę wskazano słowami „tak wygląda stan startowy minutnika, ni mniej,
     ni więcej". Skład: kropka 8, nazwa (Caption), pełny czas (Timer 34/700)
     i wypełnione CTA 48 px na całą szerokość. 126 = 16 + 34 + 12 + 48 + 16,
     zgodne co do piksela z odczytem ramki (328×126).

     Kafel NIE JEST minutnikiem: nie ma wpisu w `minutniki`, nie tyka, nie ma
     szewronu ani akordeonu. Jest ofertą związaną z KROKIEM, więc żyje dokładnie
     tyle, co krok — dlatego jedynymi miejscami, które nim ruszają, są `rysujKrok`
     i `pokazEkran`, i dlatego zdejmowany jest ZAWSZE przed ewentualnym dołożeniem.

     NIENARYSOWANE: kolejność w `stos`. Baner offline wchodzi pierwszy (S3),
     minutniki biegnące dalej, kafel startowy NA KOŃCU — najbliżej kciuka, bo jest
     jedyną rzeczą w tym stosie, którą użytkownik ma tapnąć. Klatka pokazuje kafel
     samotnie i o kolejności nie rozstrzyga. */
  var kafelStartu = null;

  function zdejmijKafelStartu() {
    if (kafelStartu && kafelStartu.parentNode) kafelStartu.parentNode.removeChild(kafelStartu);
    kafelStartu = null;
  }

  /* Bieżący krok znany jest tylko wtedy, gdy NIE stoimy na ekranie bez kroku —
     `stan.ekran` niezerowe znaczy start / wznowienie / koniec, a tam oferty nie ma. */
  function odswiezOferteBiezacegoKroku() {
    if (!stan.widok || stan.ekran) return odswiezKafelStartu(null);
    return odswiezKafelStartu(stan.widok.kroki[stan.krok - 1]);
  }

  function odswiezKafelStartu(krok) {
    zdejmijKafelStartu();
    if (!krok || !krok.minutnik || !stan.czesci || !stan.czesci.stos) {
      if (stan.korzen) przeliczBottom();
      return null;
    }
    var nazwa = krok.minutnik.nazwa || '';
    /* TEN SAM STRAŻNIK, co przy dawnym wyzwalaczu w rogu: oferta uruchomienia nie
       ma prawa stać obok już biegnącego minutnika tego samego kroku. Porównanie po
       nazwie, bo to jedyna cecha, którą krok nadaje kaflowi. */
    var juzBiegnie = minutniki.some(function (m) { return m.nazwa === nazwa; });
    if (juzBiegnie) { przeliczBottom(); return null; }

    var p = el('div', 'mp-tryb__pigulka');
    p.setAttribute('data-forma', 'start');
    /* `data-stan="start"` — CELOWO wartość, której nie zna żadna reguła alarmu.
       Gdyby stało tu `stanCzasu(sekundy)`, krok z minutnikiem krótszym niż 60 s
       dostałby pulsujący obrys alarmowy, ZANIM ktokolwiek go uruchomił. */
    p.setAttribute('data-stan', 'start');
    var wiersz = el('div', 'mp-tryb__wiersz-min', p);
    el('span', 'mp-tryb__kropka', wiersz).setAttribute('aria-hidden', 'true');
    el('span', 'mp-tryb__nazwa-min', wiersz).textContent = nazwa;
    el('span', 'mp-tryb__odliczanie', wiersz).textContent =
      formatOdliczania(krok.minutnik.sekundy);
    var cta = el('button', 'mp-tryb__primary', p);
    cta.type = 'button';
    // NIENARYSOWANE brzmienie: pipeline treści (tryb ui). Klatka podaje „włącz minutnik".
    cta.textContent = 'włącz minutnik';
    cta.setAttribute('aria-label', 'włącz minutnik: ' + nazwa);
    cta.addEventListener('click', function () {
      /* `uruchomZKroku` ODMAWIA przy limicie dwóch minutników (wraca `null`
         i otwiera S4). Wtedy kafel startowy MA ZOSTAĆ — inaczej oferta znikałaby
         po tapnięciu, które niczego nie uruchomiło. */
      var m = uruchomZKroku(krok);
      if (m) zdejmijKafelStartu();
      przeliczBottom();
      return m;
    });
    stan.czesci.stos.appendChild(p);
    kafelStartu = p;
    przeliczBottom();
    return p;
  }

  /* Kafel z danych kroku: `minutnik: MM:SS nazwa` z parsera (§ warstwa danych). */
  function uruchomZKroku(krok, opcje) {
    if (!krok || !krok.minutnik) return null;
    opcje = opcje || {};
    return uruchomMinutnik({
      nazwa: opcje.nazwa || krok.minutnik.nazwa,
      sekundy: krok.minutnik.sekundy,
      /* D-39.15 — `kryteriumHtml`, nie `kryterium`. Poprzedni komentarz w tym miejscu
         uzasadniał odwrotny wybór zdaniem, że nie ma po co wpuszczać HTML-a tam,
         gdzie go nie trzeba. **Przesłanka była fałszywa**: pole `*Html` nie jest
         surowym HTML-em z CMS-u, tylko wynikiem `escapeHtml()` z jednym niegdyś
         dozwolonym znacznikiem — a po `D-39.15` bez żadnego. Skutkiem tamtego wyboru
         było to, że jedyna powierzchnia biorąca pole SUROWE wyświetlała gwiazdki
         Markdown dosłownie (zmierzone 2026-08-16: „Różyczki są **jaskrawozielone**"),
         podczas gdy akapit kroku obok renderował to samo poprawnie. */
      podpowiedz: opcje.podpowiedz || krok.kryteriumHtml || null,
      /* PRZEKAZUJEMY DALEJ, NIE ROZSTRZYGAMY. `!!opcje.rozwinieta` (do 2026-08-19)
         zamieniało brak wartości na twarde `false` i po cichu nadpisywało wartość
         domyślną z `uruchomMinutnik`. Wyszło to dopiero na pomiarze: kafel odpalony
         z kroku był zwinięty, choć domyślna zmieniła się na rozwiniętą. */
      rozwinieta: opcje.rozwinieta
    });
  }

  function wyczyscMinutniki() {
    minutniki.slice().forEach(usun);
    return minutniki.length;
  }

  function ustawPostep(n, N) {
    var tor = stan.czesci.tor.getBoundingClientRect().width;
    // R5 / I-32: round(n/N × szerokość toru); ekran startowy dostaje kikut, nie zero
    var w = n > 0 ? Math.round((n / N) * tor) : W.postepMin;
    stan.czesci.wypelnienie.style.width = w + 'px';
    return w;
  }

  /* Zaznaczenia (D12) żyją POZA wierszem, w module: wiersz jest przerysowywany przy
     każdej zmianie kroku, więc stan trzymany w DOM-ie ginąłby na `pokazKrok`.
     Klucz składnika, nie indeks — ten sam składnik wraca w wielu krokach. */

  /* `D-39.58` · W ARKUSZU NIE MA CHECKBOXÓW — SĄ PUNKTORY.
     Polecenie: *„inaczej przepuścimy wewnętrznie sprzeczny
     mechanizm (na starcie mogę sam wykreślać, ale na krokach już nie? użytkownika
     będzie to konfundować)"*.

     Argument jest rozstrzygający i **unieważnia mój `D-39.55`**, który dwie godziny
     wcześniej rozdzielał „mam w domu" od „wykorzystałem" na dwa zbiory. Rozdzielenie
     było poprawne SEMANTYCZNIE i wciąż tak uważam — ale semantyka, której użytkownik
     nie odczyta z ekranu, nie jest rozwiązaniem, tylko drugą pułapką. Ten sam kwadrat
     w dwóch miejscach, raz klikalny, raz nie, jest mylący niezależnie od tego,
     jak czysto rozdzielony jest model pod spodem.

     `mamWDomu` usunięte w całości — po odebraniu kontrolki nie ma zapisującego.
     **Konsekwencja, którą trzeba było przyjąć:** „skopiuj składniki" kopiuje odtąd
     CAŁĄ listę, bo nie ma czym filtrować. Podpowiedź arkusza obiecywała „zaznacz,
     co masz w domu, reszta zostanie na liście zakupów" i została przepisana —
     obietnica bez mechanizmu byłaby trzecim wcieleniem tego samego błędu. */

  function wierszSkladnika(s, krok, stanWiersza, opcje) {
    opcje = opcje || {};
    var wArkuszu = !!opcje.arkusz;
    var li = el('li', 'mp-tryb__wiersz');
    li.setAttribute('data-mp-klucz', s.key);
    li.setAttribute('data-stan', stanWiersza);          // teraz · dalej · zuzyty

    /* `D-39.76` · TRZY ZNAKI, TRZY RÓŻNE OBIETNICE — I KAŻDA DOTRZYMANA.
       Kwadrat pojawia się WYŁĄCZNIE tam, gdzie coś przełącza. To jest cała treść
       tej gałęzi i powód, dla którego wygląda na rozdmuchaną.

         arkusz            → punktor, nic nie przełącza, brak roli i celu dotyku
         krok, `zuzyty`    → kwadrat zaznaczony, nic nie przełącza (stan nadał postęp)
         krok, pozostałe   → KONTROLKA: `role="checkbox"`, cel dotyku, nasłuch

       Zmierzona przyczyna, dla której środkowy i dolny przypadek MUSZĄ się różnić
       zachowaniem, a nie tylko glifem: dopóki kwadrat na kroku był dekoracją,
       użytkownik uderzał w niego po dziesięć razy pod rząd i kończył `$rageclick`-iem.
       Autocapture zapisywał `check_box_outline_blank` przy KAŻDYM stuknięciu, łącznie
       z piątym w ten sam składnik — czyli stan nie drgnął ani razu. Element wyglądał
       na kontrolkę i nią nie był.

       Punktor rysuje CSS, nie znak i nie glif fontu: kropka nie jest ikoną, więc nie
       ma powodu wołać o nią do subsetu ani wstawiać substytutu Unicode.

       DOSTĘPNOŚĆ DZIAŁA TU W OBIE STRONY. Element, który niczego nie przełącza, nie
       ma prawa być ogłaszany jako kontrolka — dlatego punktor i kwadrat `zuzyty` są
       `aria-hidden`, a nie `disabled`: `disabled` zostawiłoby kontrolkę ogłaszaną
       jako istniejącą, tylko niedostępną, a jej po prostu nie ma. Ale zdanie
       odwrotne wiąże tak samo: element, który PRZEŁĄCZA, nie ma prawa być `span`-em
       z `aria-hidden`. Stąd `<button role="checkbox">` z `aria-checked` w trzecim
       przypadku. Glif zostaje `aria-hidden` — nazwę niesie etykieta, nie ikona.

       Podmiana `textContent` na GLIFIE jest bezpieczna, bo glif ma własny span.
       Na samym `<button>` byłaby błędem: skasowałaby `.mp-tryb__cel`, czyli cel
       dotyku. Ten błąd popełniłby każdy, kto pójdzie najkrótszą drogą. */
    if (wArkuszu) {
      var punktor = el('span', 'mp-tryb__punktor', li);
      punktor.setAttribute('aria-hidden', 'true');
    } else if (stanWiersza === 'zuzyty') {
      /* `D-39.26` — wiersz z sekcji „wykorzystane" NIE DAJE SIĘ odznaczyć. Nie jest
         więc kontrolką: ani przycisku, ani roli, ani celu dotyku, ani nasłuchu.
         Stan niesie nagłówek sekcji i przekreślenie nazwy (`D-39.25`). */
      var zuzytyZnak = el('span', 'mp-tryb__ptaszek', li);
      var zuzytyGlif = el('span', 'mp-tryb__ptaszek-glif mp-ikona', zuzytyZnak);
      zuzytyGlif.textContent = 'check_box';
      zuzytyGlif.setAttribute('aria-hidden', 'true');
      zuzytyZnak.setAttribute('aria-hidden', 'true');
    } else {
      var odhaczony = !!zaznaczone[s.key];
      var ptaszek = el('button', 'mp-tryb__ptaszek', li);
      ptaszek.type = 'button';
      ptaszek.setAttribute('role', 'checkbox');
      ptaszek.setAttribute('aria-checked', odhaczony ? 'true' : 'false');
      ptaszek.setAttribute('aria-label', s.etykieta);
      var ptaszekGlif = el('span', 'mp-tryb__ptaszek-glif mp-ikona', ptaszek);
      ptaszekGlif.textContent = odhaczony ? 'check_box' : 'check_box_outline_blank';
      ptaszekGlif.setAttribute('aria-hidden', 'true');
      el('span', 'mp-tryb__cel', ptaszek).setAttribute('aria-hidden', 'true');
      ptaszek.addEventListener('click', function () { odhacz(s.key); });
      if (odhaczony) li.setAttribute('data-odhaczony', '');
    }

    var nazwa = el('span', 'mp-tryb__nazwa-skl', li);
    nazwa.textContent = s.etykieta;

    /* D4: `byk` (kropka wiodąca listy na stronie przepisu) NIE wchodzi do trybu
       gotowania — decyzja 5. Wiersz zaczyna się checkboxem, nie znakiem wypunktowania. */
    var z = krok.zamiennikiWgKlucza && krok.zamiennikiWgKlucza[s.key];
    if (z) {
      li.setAttribute('data-mp-zamiennik', '');
      var marker = el('button', 'mp-tryb__marker', li);
      marker.type = 'button';
      marker.textContent = 'i';
      marker.setAttribute('aria-label', 'zamiennik: ' + s.etykieta);
      marker.setAttribute('data-mp-zamiennik-klucz', z.klucz || s.key);
      marker.setAttribute('aria-expanded', 'false');
      el('span', 'mp-tryb__cel', marker).setAttribute('aria-hidden', 'true');
      marker.addEventListener('click', function () { przelaczTooltip(marker, z, li); });
    }
    return li;
  }

  /* ================= tooltip zamiennika (jednostka W4) =========================
     E7–E13. Popover przy wierszu składnika: kotwica 8 px pod wierszem (R12), a przy
     dolnej krawędzi odbicie NAD wiersz — NIENARYSOWANE (G8). Żyje w TOP, nie w korzeniu:
     TOP jest kontenerem przewijanym i jednocześnie blokiem zawierającym, więc tooltip
     jedzie z wierszem przy przewijaniu, zamiast wisieć w oknie nad cudzą treścią.
     Nie dotyka minutników (E12) i nie stawia scrima (E11).                        */
  var tooltip = null;

  function zamknijTooltip() {
    if (!tooltip) return null;
    if (tooltip.marker) tooltip.marker.setAttribute('aria-expanded', 'false');
    if (tooltip.el.parentNode) tooltip.el.parentNode.removeChild(tooltip.el);
    tooltip = null;
    return null;
  }

  function ustawTooltip(t, wiersz) {
    var top = stan.czesci.top;
    var rT = top.getBoundingClientRect();
    var rW = wiersz.getBoundingClientRect();
    var h = t.offsetHeight;
    /* Dolna granica to GÓRA `BOTTOM`-u, nie dół okna: pod BOTTOM tooltip nie byłby
       „trochę za nisko", tylko niewidoczny — BOTTOM leży w drzewie po TOP. */
    var granica = rT.bottom - (stan.czesci.bottom ? stan.czesci.bottom.offsetHeight : 0);
    var flip = rW.bottom + W.tooltipKotwica + h > granica;
    var y = flip
      ? rW.top - rT.top + top.scrollTop - h - W.tooltipKotwica
      : rW.bottom - rT.top + top.scrollTop + W.tooltipKotwica;
    if (flip) t.setAttribute('data-mp-flip', 'gora'); else t.removeAttribute('data-mp-flip');
    t.style.top = Math.round(y) + 'px';
    return flip;
  }

  function otworzTooltip(marker, wpis, wiersz) {
    zamknijTooltip();
    var t = el('div', 'mp-tryb__tooltip');
    t.setAttribute('data-mp-tooltip', wpis.klucz || '');
    t.setAttribute('role', 'dialog');
    var glowa = el('div', 'mp-tryb__tooltip-glowa', t);
    var pytanie = el('p', 'mp-tryb__tooltip-pytanie', glowa);
    pytanie.textContent = wpis.pytanie || wpis.klucz || '';
    var x = el('button', 'mp-tryb__tooltip-zamknij mp-ikona', glowa);   // D-39.34
    x.type = 'button';
    x.textContent = 'close';
    x.setAttribute('data-mp-ligatura', 'close');
    x.setAttribute('aria-label', 'zamknij');
    el('span', 'mp-tryb__cel', x).setAttribute('aria-hidden', 'true');
    x.addEventListener('click', function (e) { e.stopPropagation(); zamknijTooltip(); });
    /* Pełny tekst — `krótko` nie ma tu czego zastąpić i NIE MA GDZIE trafić w overlayu.
       M-C (przeb. 24): wiersz składnika w Figmie to checkbox + `nazwa` + ukryty `byk`
       (`7224:10917`, identycznie w `teraz` i `dalej`), więc krótkiej formy nie ma gdzie
       narysować; HANDBACK §4 mówi zresztą wprost, że `krótko:` zdegradowano do
       opcjonalnego, BO pełny tekst niesie tooltip. Jedynym odbiorcą pola jest karta
       STRONY (`data-mp-krotko`). `link` wpisu też nie wchodzi: klatka §3.14 ma dokładnie
       dwa teksty, a link zostaje na karcie na stronie przepisu (A7). */
    var tresc = el('p', 'mp-tryb__tooltip-tekst', t);
    if (wpis.tekstHtml) tresc.innerHTML = wpis.tekstHtml;
    else tresc.textContent = wpis.tekst || '';
    stan.czesci.top.appendChild(t);
    var flip = ustawTooltip(t, wiersz);
    marker.setAttribute('aria-expanded', 'true');
    tooltip = { el: t, marker: marker, klucz: wpis.klucz || '', flip: flip, wiersz: wiersz };
    return t;
  }

  /* ================= dialogi modalne (jednostka W5) ============================
     F2 · F3 · F5 · F6. Jeden budowniczy dla S2 i S4 (§3b.1: „oba mają ten sam
     szkielet"), różnią się blokami po treści. Microcopy = placeholder.            */
  var dialog = null;

  function zamknijDialog() {
    if (!dialog) return null;
    stan.czesci.scrimDialogu.removeAttribute('data-otwarty');
    stan.czesci.scrimDialogu.textContent = '';
    dialog = null;
    return null;
  }

  /* S4: wiersz minutnika 280×44 (§3b.1). „zakończ" zdejmuje TEN minutnik i zamyka
     dialog — zwolnienie miejsca, nie start trzeciego. Automatyczny start po zwolnieniu
     slotu byłby zachowaniem ZGADYWANYM: I-18 opisuje wyłącznie odmowę i dialog. */
  function wierszDialoguMinutnika(m, intencja) {
    var w = el('div', 'mp-tryb__dialog-min');
    w.setAttribute('data-mp-min', '');
    var nazwa = el('span', 'mp-tryb__dialog-min-nazwa', w);
    nazwa.textContent = m.nazwa || '';
    var czas = el('span', 'mp-tryb__dialog-min-czas', w);
    czas.textContent = formatOdliczania(m.pozostalo < 0 ? m.sekundy : m.pozostalo);
    var koniec = el('button', 'mp-tryb__dialog-min-koniec', w);
    koniec.type = 'button';
    // NIENARYSOWANE: brzmienie „zakończ" jest placeholderem (pipeline treści, tryb ui)
    /* D-40.5 — etykieta NIESIE KONSEKWENCJĘ. Gdy dialog powstał z odmowy, tapnięcie
       zrobi DWIE rzeczy: zamknie ten minutnik i włączy ten, o który użytkownik
       właśnie prosił. Gołe „zakończ" ukrywałoby drugą połowę i zamieniało pomyłkę
       w podwójną stratę — a to był jedyny poważny zarzut wobec łączenia skutków.
       Bez intencji (dialog otwarty inaczej) brzmienie zostaje bez zmian. */
    koniec.textContent = (intencja && intencja.nazwa)
      ? 'zakończ i włącz „' + intencja.nazwa + '"'
      : 'zakończ';
    el('span', 'mp-tryb__cel', koniec).setAttribute('aria-hidden', 'true');
    koniec.addEventListener('click', function () {
      usun(m);
      zamknijDialog();
      /* Intencja żyje TYLKO tą jedną drogą wyjścia. `zamknijDialog()` niszczy obiekt
         dialogu, więc każde inne wyjście — „wróć do gotowania", scrim, zmiana kroku —
         zabiera ją ze sobą i nic się samo nie uruchomi. Kolejność jest wiążąca:
         najpierw `usun`, potem start, inaczej limit odmówiłby po raz drugi. */
      if (intencja) uruchomMinutnik(intencja);
    });
    return w;
  }

  function otworzDialog(rodzaj, intencja) {
    zamknijDialog();
    zamknijTooltip();
    var s4 = rodzaj === 'S4';
    var scrimEl = stan.czesci.scrimDialogu;
    var d = el('div', 'mp-tryb__dialog', scrimEl);
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');        // TU modal — inaczej niż tooltip (E11)
    d.setAttribute('data-mp-dialog', rodzaj);
    var tytul = el('h2', 'mp-tryb__dialog-tytul', d);
    // NIENARYSOWANE brzmienia obu dialogów: pipeline treści (tryb ui)
    tytul.textContent = s4 ? 'Dwa minutniki naraz' : 'Przerwać gotowanie?';
    var tresc = el('p', 'mp-tryb__dialog-tresc', d);
    tresc.textContent = s4
      ? 'Zakończ jeden z odliczających, żeby zrobić miejsce na kolejny.'
      /* D-39.56 — brzmienie poprawione: „zaznaczone składniki" obiecywały stan,
         którego użytkownik już nie tworzy. Mówimy o tym, co naprawdę przepada. */
      /* D-40.2 — zgodność liczby. Podmiotem drugiego zdania składowego jest
         „postęp" (l. poj.), a orzeczenie stało w mnogiej: „zostaną zapamiętane".
         Pozostałość po D-39.56, gdzie zdanie miało dwa podmioty. Zmierzone na
         produkcji 2026-08-20 przez odczyt dialogu S2 z żywej strony. */
      : 'Minutniki przestaną odliczać, a postęp przepisu ' +
        'zostanie zapamiętany do następnego razu.';
    /* Wiersze minutników wchodzą MIĘDZY treść a CTA (§3b.1 skład S4), czyli w tym
       samym rytmie 12 px co reszta bloków — dlatego to ten sam szkielet, nie nowy. */
    var wiersze = s4 ? minutniki.map(function (m) {
      var w = wierszDialoguMinutnika(m, intencja);
      d.appendChild(w);
      return w;
    }) : [];
    var cta = el('button', 'mp-tryb__dialog-cta', d);
    cta.type = 'button';
    cta.textContent = s4 ? 'wróć do gotowania' : 'wróć do gotowania';
    cta.addEventListener('click', function () { zamknijDialog(); });
    /* Link „wyjdź mimo to" należy WYŁĄCZNIE do S2 (§3b.1: skład S4 kończy się na CTA).
       W S4 nie ma wyjścia awaryjnego, bo dialog niczego nie przerywa. */
    var link = null;
    if (!s4) {
      link = el('button', 'mp-tryb__dialog-link', d);
      link.type = 'button';
      link.textContent = 'wyjdź mimo to';
      link.addEventListener('click', function () { zamknijDialog(); zamknij(); });  // I-08
    }
    scrimEl.setAttribute('data-otwarty', '');
    /* Intencja mieszka W OBIEKCIE DIALOGU, nie w stanie modułu. `zamknijDialog()`
       zeruje `dialog`, więc pamięć ginie razem z oknem i nie ma stanu, który mógłby
       zwietrzeć — nikt nie dostanie minutnika zamówionego trzy kroki wcześniej. */
    dialog = { el: d, rodzaj: rodzaj, cta: cta, link: link, wiersze: wiersze,
               intencja: intencja || null };
    return d;
  }

  /* ================= S3 — baner offline (F10 · F11) ============================
     §3b.2 uogólnia `stos`: to slot KAFLI, nie slot minutników. Baner jest kaflem
     na równi z pigułką — ten sam odstęp 8 px, to samo dopełnienie dolne 12 px —
     więc BOTTOM 213 (80 + 121 + 12) wychodzi z reguły R6, a nie z osobnej liczby.

     NIENARYSOWANE: kolejność w stosie. Baner wstawiamy jako PIERWSZY kafel, żeby
     pigułki zachowały swoje miejsce przy nawigacji (kciuk zna ich pozycję), a
     komunikat czytał się nad nimi. Klatka pokazuje baner samotnie i nie rozstrzyga.  */
  var baner = null;

  function ukryjBaner() {
    if (baner && baner.parentNode) baner.parentNode.removeChild(baner);
    baner = null;
    if (stan.korzen) przeliczBottom();
    return null;
  }

  function pokazBaner() {
    zbuduj();
    if (baner) return baner;
    var k = el('div', 'mp-tryb__baner');
    k.setAttribute('data-mp-baner', 'S3');
    k.setAttribute('role', 'status');
    var tresc = el('p', 'mp-tryb__baner-tresc', k);
    // NIENARYSOWANE: brzmienie dostarcza pipeline treści (tryb ui)
    tresc.textContent = 'Brak połączenia. Kroki i minutniki działają dalej, ' +
                        'ale zdjęcia i lista zakupów mogą się nie odświeżyć.';
    var akcja = el('button', 'mp-tryb__baner-akcja', k);
    akcja.type = 'button';
    /* D-39.35 · `↻` NA LIGATURĘ `refresh`. Decyzja.
       Odczyt Figmy `7202:10894` daje tu **wektor SVG 20×20**, a nie font — mimo że
       `refresh` istnieje jako ligatura i jest w subsecie (zmierzone, 20,0 px przy
       kontroli ujemnej 505,6). Zapisuję to jako ODSTĘPSTWO OD FIGMY podjęte
       świadomie, nie jako odczyt: plik projektowy mówi „wektor", produkt dostaje
       font. Pudełko się zgadza (20×20 w obu), więc różnica jest w nośniku glifu,
       nie w geometrii, a jeden mechanizm ikon w całym overlayu jest wart więcej
       niż jeden wyeksportowany plik. */
    var glif = el('span', 'mp-tryb__baner-glif mp-ikona', akcja);
    glif.textContent = 'refresh';
    glif.setAttribute('data-mp-ligatura', 'refresh');
    glif.setAttribute('aria-hidden', 'true');
    el('span', 'mp-tryb__baner-tekst', akcja).textContent = 'sprawdź ponownie';
    akcja.addEventListener('click', function () { sprawdzPolaczenie(); });
    stan.czesci.stos.insertBefore(k, stan.czesci.stos.firstChild);
    baner = k;
    przeliczBottom();
    return k;
  }

  /* F11 / I-31: „sprawdź ponownie" działa W MIEJSCU. Żadnego `location.reload()` —
     przeładowanie zabrałoby odliczające minutniki i zaznaczone składniki, czyli
     dokładnie to, czego brak sieci nie ruszył. Odczyt jest jednym pytaniem do
     `navigator.onLine`; wynik zdejmuje baner albo zostawia go bez zmian. */
  function sprawdzPolaczenie() {
    var online = !('onLine' in navigator) || navigator.onLine !== false;
    if (online) ukryjBaner(); else pokazBaner();
    return online;
  }

  function podlaczSiec() {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    window.addEventListener('offline', function () { if (stan.korzen) pokazBaner(); });
    window.addEventListener('online', function () { ukryjBaner(); });
  }

  /* ================= S5 — powrót z wygaszonego ekranu (F12 · I-23 · §3.11) =====
     Klatka `7240:10900` nie jest osobnym ekranem: to STAN PIGUŁKI po powrocie do
     karty, gdy minutnik dobiegł zera, kiedy nikt nie patrzył. Stąd BOTTOM 347 =
     `stos` 267 + nawigacja 80, a 267 = pigułka pełna 255 + 12 — czyli reguła R6
     i R7 bez wyjątku. „Trzy przyciski" z wiersza F12 to primary (296×48) i rząd
     dwóch ghostów po 140 — dokładnie skład pigułki PEŁNEJ w stanie `zero`
     (§3.6 vs §3.9), więc S5 nie dokłada widżetów, tylko wymusza formę.

     Dlaczego trzeba pamiętać, co biegło przy wygaszeniu, zamiast po prostu
     sprawdzić „czy coś stoi na 0:00": minutnik, który zszedł do zera przy
     WIDOCZNYM ekranie, użytkownik już zobaczył — rozwijanie mu pigułki przy
     każdym powrocie do karty byłoby karą za przełączenie się do przeglądarki.
     S5 należy się wyłącznie temu minutnikowi, którego koniec został PRZEGAPIONY.

     NIENARYSOWANE: brzmienie komunikatu dostarcza pipeline treści (tryb ui);
     §3.11 mierzy trzywierszową podpowiedź (57 px), nie konkretne zdanie.       */
  var KOMUNIKAT_S5 = 'Minutnik skończył się, kiedy ekran był wygaszony. ' +
                     'Sprawdź, na jakim etapie jest danie, zanim ruszysz dalej.';
  var bieglyPrzyUkryciu = [];

  /* `ukrytaWymuszona` istnieje z tego samego powodu, co hak `MP.zegar` przy
     minutnikach: karta pomiarowa JEST w tle (przebieg 6), więc `visibilityState`
     czyta 'hidden' przez cały pomiar i sam nasłuch nie ma jak zobaczyć powrotu.
     Produkcyjna ścieżka woła to BEZ argumentu i czyta stan dokumentu. */
  function naWidocznosc(ukrytaWymuszona) {
    var ukryta = (ukrytaWymuszona == null)
      ? (typeof document !== 'undefined' && document.visibilityState === 'hidden')
      : !!ukrytaWymuszona;

    if (ukryta) {
      /* D-39.17 — przeglądarka zwalnia wake lock sama przy schowaniu karty.
         Zerujemy własny uchwyt, żeby stan modułu nie twierdził, że trzymamy coś,
         czego już nie mamy; o samo `release()` nie prosimy, bo jest po fakcie. */
      blokadaEkranu = null;
      /* D-40.4 — warunek `m.zatrzymany == null &&` zdjęty: był tautologią. */
      bieglyPrzyUkryciu = minutniki.filter(function (m) {
        return m.pozostalo > 0;
      });
      return null;
    }
    /* Powrót do karty — blokadę trzeba wziąć PONOWNIE. Bez tej linii wake lock
       działałby dokładnie raz, do pierwszego przełączenia aplikacji, i wyglądałby
       na zaimplementowany. */
    trzymajEkran();

    /* Dogonienie czasu PRZED oceną: przy wygaszonym ekranie interwał chodzi rzadziej
       albo wcale, więc `m.pozostalo` bywa nieaktualne dokładnie w tym momencie. */
    tyk();
    var skonczone = bieglyPrzyUkryciu.filter(function (m) {
      return minutniki.indexOf(m) >= 0 && m.pozostalo <= 0;
    });
    bieglyPrzyUkryciu = [];
    if (!skonczone.length) return null;

    skonczone.forEach(function (m) {
      if (!m.podpowiedz) m.podpowiedz = KOMUNIKAT_S5;
      m.rozwinieta = true;          // `forma()` da 'pelna', bo podpowiedź już jest
      rysujKafel(m);
    });
    przeliczBottom();
    return skonczone;
  }

  function podlaczWidocznosc() {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    document.addEventListener('visibilitychange', function () { naWidocznosc(); });
  }

  /* ================= F4 — systemowy „wstecz" (I-09 · WYM §3) ===================
     I-09 ma ZERO reprezentacji w Figmie i jest wymaganiem produktu: na telefonie
     gest „wstecz" ma zamykać tryb gotowania, a nie wyrzucać z artykułu. Wejście
     dokłada więc jeden wpis do historii, wyjście go zdejmuje.

     Symetria jest tu warunkiem poprawności, nie elegancją. Gdyby `zamknij()`
     zostawiał wpis, użytkownik po zamknięciu krzyżykiem musiałby nacisnąć
     „wstecz" DWA razy, żeby opuścić artykuł — i wyglądałoby to na zawieszoną
     stronę. Dlatego programowe zamknięcie robi `history.back()`.

     `oczekujePop` liczy popstate'y, które sami wywołaliśmy: `back()` jest
     asynchroniczny, więc bez licznika kolejne `otworz()` wykonane przed
     nadejściem zdarzenia zostałoby przez nie natychmiast zamknięte.

     NIENARYSOWANE: `MP_BEZ_HISTORII` jest wyłącznikiem dla matrycy pomiarowej,
     nie dla produkcji. Historia sesji jest WSPÓLNA dla iframe'a i dokumentu
     nadrzędnego (zmierzone, przebieg 8), więc siedem ramek robiących `back()`
     naraz mieszałoby się w jednej historii. Domyślnie wyłącznik jest wyłączony. */
  var wpisHistorii = false;
  var oczekujePop = 0;

  function historiaWlaczona() {
    return typeof history !== 'undefined' && !!history.pushState &&
           global.MP_BEZ_HISTORII !== true;
  }

  function wejdzDoHistorii() {
    if (!historiaWlaczona() || wpisHistorii) return false;
    history.pushState({ mpTryb: true }, '');
    wpisHistorii = true;
    return true;
  }

  function zdejmijZHistorii() {
    if (!wpisHistorii) return false;
    wpisHistorii = false;
    oczekujePop++;
    history.back();
    return true;
  }

  function podlaczHistorie() {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    window.addEventListener('popstate', function () {
      if (oczekujePop > 0) { oczekujePop--; return; }
      if (!wpisHistorii) return;
      wpisHistorii = false;
      zamknijWewn(true);          // przyszliśmy Z historii — nie ruszaj jej ponownie
    });
  }

  function przelaczTooltip(marker, wpis, wiersz) {
    if (tooltip && tooltip.marker === marker) return zamknijTooltip();
    return otworzTooltip(marker, wpis, wiersz);
  }

  /* `D-39.76` · `odhacz()` I ZBIÓR `zaznaczone` PRZYWRÓCONE — `D-39.56` UNIEWAŻNIONE.
     Nie mylić z `D-39.58`: ono ZOSTAJE w mocy i jest tu filarem, nie ofiarą.

     Czego `D-39.56` broniło i dlaczego to już nie broni: argumentem było „trzy cele
     dotyku w wierszu 19 px wysokim". Argument opisywał ÓWCZESNĄ geometrię, w której
     cel markera zajmował całą szerokość wiersza, a cel bazowy miał 44×44. Przy tych
     liczbach trzeci cel faktycznie nie mieścił się bez zachodzenia. `D-39.77` zmienia
     liczby: cele mają 31 px wysokości i 6 px prześwitu w najgorszym przypadku,
     policzonym. Kolizja została rozwiązana GEOMETRIĄ, a nie amputacją mechaniki —
     `D-39.56` naprawiało w niewłaściwej warstwie, a rachunek za to zapłacił
     użytkownik uderzający dziesięć razy w kwadrat, który niczego nie robił.

     ZBIÓR ŻYJE W MODULE, NIE W DOM-ie. Wiersze są przerysowywane przy każdym
     `pokazKrok`, więc stan trzymany w atrybucie ginąłby przy przejściu kroku.
     Kluczem jest `s.key`, NIE indeks — ten sam składnik wraca w wielu krokach
     i ma się odhaczyć wszędzie, nie tylko tam, gdzie go tknięto.

     ODHACZENIA NIE IDĄ DO ZAPISU — `D-39.27` jest przez to unieważnione na stałe,
     a nie „traci przedmiot", jak zapisało `D-39.56`. Powód jest rzeczowy: zapisane
     odhaczenie i zapisany postęp mogą się rozjechać. Użytkownik cofa krok, a
     odhaczenie z zeszłego tygodnia twierdzi, że składnik jest już wykorzystany —
     dwa źródła prawdy o jednym stanie, czyli dokładnie ten defekt, który
     `D-39.55`/`D-39.56` naprawiały przy `mamWDomu`. Zapis sesji niesie dalej
     wyłącznie `krok` i `porcje`.

     `mamWDomu` NIE WRACA. Odhaczenie na kroku znaczy „wykorzystałem", nie „mam
     w domu"; to dwa różne stany i łączenie ich było usterką. „Skopiuj składniki"
     kopiuje więc dalej CAŁĄ listę — konsekwencja przyjęta świadomie w `D-39.58`
     i tu nietknięta. Kto sięgnie po ten zbiór, żeby filtrować listę zakupów,
     powtórzy pomylenie tożsamości SKŁADNIKA z tożsamością STANU.

     Cofnięcie: usuń `zaznaczone`, `odhacz()` i `odswiezWiersze()`, w
     `wierszSkladnika` zwiń trzecią gałąź do drugiej, zdejmij zerowanie
     w `zamknijWewn` i akcesor pomiarowy z publicznego API. */
  var zaznaczone = {};

  function odhacz(klucz) {
    if (!klucz) return null;
    if (zaznaczone[klucz]) delete zaznaczone[klucz];
    else zaznaczone[klucz] = true;
    odswiezWiersze(klucz);
    return !!zaznaczone[klucz];
  }

  /* Odświeża WSZYSTKIE żywe wiersze o tym kluczu, nie tylko ten tknięty: ten sam
     składnik potrafi stać naraz w „w tym kroku" i w rozwiniętej liście pełnej.
     Porównanie atrybutu zamiast selektora `[data-mp-klucz="…"]` jest celowe —
     klucz pochodzi z treści przepisu i nie ma gwarancji, że da się go bezpiecznie
     wstawić do selektora. Pominięte zostają: wiersze `zuzyty` (`D-39.26`) i wiersze
     arkusza, które nie mają przycisku, bo niosą punktor (`D-39.58`). */
  function odswiezWiersze(klucz) {
    if (!stan.korzen) return 0;
    var wlaczony = !!zaznaczone[klucz];
    var wiersze = stan.korzen.querySelectorAll('.mp-tryb__wiersz');
    var n = 0;
    for (var i = 0; i < wiersze.length; i++) {
      var w = wiersze[i];
      if (w.getAttribute('data-mp-klucz') !== klucz) continue;
      if (w.getAttribute('data-stan') === 'zuzyty') continue;
      var pt = w.querySelector('.mp-tryb__ptaszek');
      if (!pt || pt.tagName !== 'BUTTON') continue;
      var gl = pt.querySelector('.mp-tryb__ptaszek-glif');
      if (gl) gl.textContent = wlaczony ? 'check_box' : 'check_box_outline_blank';
      pt.setAttribute('aria-checked', wlaczony ? 'true' : 'false');
      if (wlaczony) w.setAttribute('data-odhaczony', '');
      else w.removeAttribute('data-odhaczony');
      n++;
    }
    return n;
  }

  /* Stan „wykorzystane" NIE JEST tym samym co odhaczenie i nie zniknął: nadaje go
     postęp przepisu (`[data-stan=zuzyty]`, liczony przez parser z pierwszego użycia
     składnika). Ręczne odhaczenie dochodzi OBOK niego, nie zamiast. */

  function rysujKrok(krok) {
    var top = stan.czesci.top;
    top.textContent = '';

    /* C01 — trzy stany czasu, rozróżniane po DANYCH, nie po treści napisu:
         `minutnik: MM:SS`  → badge z odliczaniem (pigułka w `stos` dochodzi w W2)
         `czas: …`          → badge statyczny
         `czas: bez minutnika` → badge odmiany „bez"
       Aneks poz. 4 dokłada warunek negatywny: czas NIGDY nie jest powtórzony
       w treści kroku (C02) — to wiersz osobny i jego tu nie zaliczamy. */
    /* B19/W30 — rząd nagłówka: NAZWA KROKU + pigułka czasu, jak `7212:10899`.
       Do przebiegu 22 pigułka wisiała samotnie jako dziecko TOP-u, a tytuł kroku
       nie był renderowany w ogóle, choć parser go zwraca. Element pusty przy braku
       tytułu jest celowy: trzyma rozkład `space-between`, więc pigułka zostaje
       po prawej niezależnie od tego, czy przepis nazywa kroki. */
    var rzad = el('div', 'mp-tryb__rzad-kroku', top);
    var nazwaKroku = el('h3', 'mp-tryb__nazwa-kroku', rzad);
    nazwaKroku.textContent = krok.tytul || '';
    /* D-39.14 · BADGE CZASU JEST WYZWALACZEM MINUTNIKA, gdy krok go ma.
       Zmierzone na stagingu 2026-08-16: model niesie minutniki na krokach 4 (180 s
       „brokuły"), 6 (5400 s „wołowina") i 7 (180 s „sos"), a w całym drzewie na
       wszystkich dziewięciu krokach jedyną klasą czasową był `mp-tryb__czas` — zero
       pigułek, zero odliczania, zero kontrolki startu. `uruchomZKroku()` istniało
       i miało **jedynego wywołującego w publicznym API**, czyli nikogo z interfejsu.
       Cała rodzina zachowań minutnika (kafel, odliczanie, limit dwóch, dialog S4)
       była martwym kodem, a badge — samym napisem.

       NIENARYSOWANE (I-14). Plik daje parę klatek „krok bez pigułki" → „krok
       z pigułką" i **nie rysuje stanu przed uruchomieniem**, więc wyzwalacza nie ma
       skąd odczytać — to jest decyzja, nie odczyt, i tak ją znakuję.
       Wybrałem badge, bo: (1) już niesie czas tego minutnika, więc nie dokłada
       nowego elementu do policzonej geometrii wiersza; (2) `data-stan="minutnik"`
       już go odróżnia od „czas" i „bez", więc rozróżnienie istniało zanim cokolwiek
       na nim wisiało; (3) alternatywa — osobny przycisk — zmienia rozkład
       `.mp-tryb__rzad-kroku` i wymagałaby odczytu z Figmy, którego nie ma.
       Do rozstrzygnięcia: czy wyzwalaczem ma być badge, czy osobny
       przycisk. Do tego czasu badge, bo funkcja bez wyzwalacza nie istnieje.

       Krok bez minutnika zostaje `<span>` — element nieinteraktywny nie ma być
       przyciskiem tylko dlatego, że sąsiedni nim jest. */
    var maMinutnik = !!krok.minutnik;
    /* D-40.16 · LICZNIK KROKU ZAMIAST MINUT W PIGUŁCE PRZY TYTULE.
       Polecenie. Pasek przestał nieść licznik (D-40.15), więc
       licznik musi mieć swoje miejsce — i jest nim ta pigułka.

       **KONFLIKT, KTÓREGO NIE WIDAĆ NA ZRZUCIE, I JEGO ZMIERZONY ZASIĘG.**
       Ta pigułka NIE JEST wszędzie plakietką: na krokach z minutnikiem to
       `<button>`, którego etykietą jest CZAS TRWANIA i który jest **jedynym
       wyzwalaczem minutnika** (`aria-label: „włącz minutnik…"`). Zmierzone na
       przepisie pilotażowym: 9 kroków, z tego **2 z przyciskiem** (kroki 5 i 7,
       `4 min`), 6 z plakietką `ok. N min`, 1 z `bez minutnika`.
       Nadpisanie treści licznikiem na ślepo zabrałoby wyzwalacz na 2 z 9 kroków
       i zostawiło przycisk „krok 5 / 9", który włącza minutnik. To defekt
       dostępności, nie kosmetyka.

       Rozstrzygnięcie z 2026-08-23 (D-40.16) rozdzielało role: licznik dostawał
       własną pigułkę PRZED wyzwalaczem, a wyzwalacz zostawał ze swoim „4 min".
       Cena była taka, że na krokach z minutnikiem w rogu stały DWIE pigułki.

       D-43.2 · MINUTY ZNIKAJĄ CAŁKOWICIE — polecenie:
       „w tym trybie, gdzie wyświetlamy kroki zamiast minut w prawym górnym rogu,
       minuty powinny zniknąć całkowicie, niezależnie od tego czy są obecnie
       w przepisie". Wykonane najpierw tak, że minuty znikały, a wyzwalacz zostawał
       w rogu jako pigułka ikonowa `timer`.

       D-44.3 · WYZWALACZ SCHODZI Z ROGU DO KAFLA — i to jest odczyt Figmy, nie
       kolejny pomysł. Wskazano klatkę `7195:11026` ze zdaniem „tak wygląda
       stan startowy minutnika, ni mniej, ni więcej": stanem startowym jest
       PŁYWAJĄCY KAFEL w `stos` — kropka, nazwa, PEŁNY CZAS w stylu `Timer`
       i wypełnione CTA „włącz minutnik" na całą szerokość. Nie ikonka w rogu.
       Rozstrzyga to obie odłożone pozycje naraz: wyzwalacz JEST mocno zaznaczony
       jako przycisk, a czas trwania JEST widoczny przed tapnięciem.

       Róg kroku niesie więc jedną pigułkę i tylko jedną — licznik — na każdym
       kroku, bez względu na minutnik. Cały ten `if` zniknął, a nie przeniósł się:
       kafel startowy buduje `odswiezKafelStartu()` przy `stos`, nie ten rząd. */
    var N_KROKOW = stan.widok ? stan.widok.kroki.length : 0;
    var czas = el('span', 'mp-tryb__czas', rzad);
    czas.textContent = 'krok ' + stan.krok + ' / ' + N_KROKOW;
    czas.setAttribute('data-stan', 'licznik');

    var opis = el('p', 'mp-tryb__opis', top);
    opis.innerHTML = krok.tekstHtml || '';    // R14: <mark>, nigdy prostokąt-atrapa

    // R3: zdjęcie i blok składników są NIEZALEŻNIE opcjonalne — brak nie zostawia dziury
    if (krok.fotoUrl) {
      var foto = el('img', 'mp-tryb__foto', top);
      foto.src = krok.fotoUrl;
      foto.alt = '';
    }
    /* `D-39.75` · BLOK SKŁADNIKÓW WYŁĄCZNIE NA KROKACH Z WŁASNYMI SKŁADNIKAMI.
       Decyzja, po obejrzeniu kroku 1 wołowiny teriyaki na
       stagingu: krok „nastaw piekarnik i wodę" nie używa niczego, a dostawał ramkę
       z pełną dwunastką w sekcji „dalej" — czyli powtórzenie listy z ekranu startowego
       w miejscu, w którym nie ma nic do odhaczenia.

       ODWRACA `D-39.16` — i wolno to zrobić, bo PRZESŁANKA TAMTEJ DECYZJI ZNIKŁA.
       D-39.16 broniło ścieżki „najpierw pokaż składniki", która wrzucała użytkownika
       na krok 1 z rozwiniętą listą; przy wyciętym bloku dostawał pustkę (pomiar
       2026-08-16: krok 1 `teraz=0 dalej=0 zużyty=0`). Dzień później `D-39.45`
       przeniosło tę akcję na ARKUSZ NA EKRANIE STARTOWYM — `akcjaEkranu()` dla
       ekranu `start` robi `return otworzArkusz()` i na krok 1 nikt już tą drogą
       nie wchodzi. Blok pilnował od dwóch dni trasy, której nie ma.

       **To jest wzorzec do zapamiętania, nie jednorazowa poprawka:** obrona
       postawiona przeciw konkretnej ścieżce przeżywa jej usunięcie i wygląda potem
       jak decyzja o wyglądzie. Przy cofaniu takiej obrony pytanie brzmi „czy trasa
       jeszcze istnieje", a nie „czy tak ładniej".

       CENA, NAZWANA: na kroku bez własnych składników pełna lista jest w trakcie
       gotowania NIEOSIĄGALNA — nie ma z czego rozwinąć „pozostałych". W tym
       przepisie dotyczy to 2 kroków z 9 („nastaw piekarnik i wodę", „połącz całość").
       Kompletu użytkownik szuka wtedy na ekranie startowym, arkuszem z `D-39.45`.

       Etykieta „w tym kroku" i jej lista renderują się WYŁĄCZNIE przy niepustym
       `skladnikiTeraz`: pusty nagłówek nad niczym wyglądałby na usterkę. */
    var maTeraz = !!(krok.skladnikiTeraz && krok.skladnikiTeraz.length);
    if (maTeraz) {
      /* W26/W29 — DWA napisy, obydwa narysowane w Figmie i obydwa nieobecne
         w runtimie do przebiegu 22: nagłówek „składniki" (`7477:12562`) NAD ramką
         i etykieta „w tym kroku" (`7195:10936`) W ramce. To nie jest microcopy
         placeholderowe: brzmienia są w pliku, więc idą do kodu wprost. */
      var blok = el('div', 'mp-tryb__blok-skladnikow', top);
      el('p', 'mp-tryb__naglowek-skladnikow', blok).textContent = 'składniki';
      var ramka = el('div', 'mp-tryb__ramka-skladnikow', blok);
      if (maTeraz) {
        el('p', 'mp-tryb__etykieta-sekcji', ramka).textContent = 'w tym kroku';
        var lista = el('ul', 'mp-tryb__skladniki', ramka);
        krok.skladnikiTeraz.forEach(function (s) {
          lista.appendChild(wierszSkladnika(s, krok, 'teraz'));
        });
      }
      /* D5: lista skrócona pokazuje WYŁĄCZNIE „w tym kroku"; reszta jest o jeden tap
         dalej. NIENARYSOWANE (G7) / D7: cel prowadzi do listy PEŁNEJ (wszystkie trzy sekcje) —
         zmieniamy etykietę, nie cel, więc tekst jest tu placeholderem. */
      /* Pozostałe sekcje wchodzą TU, jako rodzeństwo listy „w tym kroku", a nie na
         osobny ekran. `data-mp-lista-pelna` zostaje na kontenerze, bo to po nim
         pomiar rozpoznaje pełną listę — przeniosłem atrybut razem z treścią,
         zamiast go gubić i zakładać nowy. */
      var reszta = el('div', 'mp-tryb__reszta', ramka);
      reszta.setAttribute('data-mp-lista-pelna', '');
      var maReszte = sekcjePozostale(krok, reszta);
      stan.czesci.reszta = maReszte ? reszta : null;
      /* `D-39.75` — wraz z wejściem do bloku wyłącznie przy `maTeraz` znika gałąź
         z `D-39.16`, która rozwijała „pozostałe" na krokach bez własnych składników.
         Była martwa od chwili zawężenia bramki: tutaj `maTeraz` jest już zawsze
         prawdą. Zostawiona wyglądałaby na obsługiwany przypadek. */

      /* Przycisk istnieje tylko wtedy, gdy JEST co rozwijać. Wcześniej stał zawsze
         i prowadził na ekran listy nawet wtedy, gdy poza „w tym kroku" nie było
         ani jednej pozycji — czyli obiecywał treść, której nie ma. */
      if (maReszte) {
        var wiecej = el('button', 'mp-tryb__wiecej', ramka);
        wiecej.type = 'button';
        wiecej.setAttribute('aria-expanded', stan.listaOtwarta ? 'true' : 'false');
        el('span', 'mp-tryb__wiecej-tekst', wiecej).textContent =
          stan.listaOtwarta ? 'zwiń' : 'zobacz pozostałe';
        var glif = el('span', 'mp-tryb__wiecej-glif', wiecej);
        /* D-39.32 · SZEWRON WYWOŁYWACZA TO LIGATURA MATERIAL, NIE ZNAK UNICODE.
           Zgłoszenie, wprost: „szewron skierowany w dół,
           służący do rozwijania listy składników" wciąż jest substytutem.
           Rozstrzygnięte odczytem, nie wyborem: `7304:13193` w wierszu `row`
           z etykietą `zobacz pozostałe` to TEKST o treści `keyboard_arrow_down`,
           `Material Symbols Outlined` Regular, 16 px, interlinia 1,35,
           `#3e2b22` = `--primary-text`, pudełko 16×22 `[V]`.
           **Figma ma dwa pokolenia tego wiersza i to trzeba było rozstrzygnąć,
           a nie uśrednić:** starsze (`7211:10914`, `7240:10966`) ma znak `⌄`
           U+2304 w DM Sans, wiersz 19 px, etykieta 288 px; nowsze ma ligaturę,
           wiersz 22 px, etykieta 280 px. Piętnaście wystąpień ligatury wobec
           dwóch substytutu — bierzemy nowsze. Gdyby liczby były odwrotne,
           migracja byłaby REGRESEM, dokładnie jak przy ptaszku (jednostka 2).
           Geometria CSS nie wymaga zmiany: `.mp-tryb__wiecej-glif` ma już
           16×22 przy `font-size:16px`, czyli dokładnie pudełko z Figmy.
           Obecność ligatur w subsetcie ZMIERZONA, nie założona: sonda szerokości
           na foncie z CDN Webflow daje `keyboard_arrow_down` i `keyboard_arrow_up`
           po 20,0 px przy kontroli ujemnej 505,6 px `[V]` 2026-08-17. Bez tego
           sprawdzenia brak glifu w subsetcie wypisałby użytkownikowi SŁOWO. */
        glif.className += ' mp-ikona';
        /* NIENARYSOWANE (G5) / I-15 `down` = rozwiń · I-16 `up` = zwiń.
           D-40.3 (2026-08-21): rozstrzygnięcie ZMIENIONE — jeden glif
           `keyboard_arrow_down` obracany o −180° przez CSS na
           `[aria-expanded="true"]`, tak samo jak szewron pigułki (D-40.1)
           i jak akordeony stron produktowych. Podmiana `textContent`
           w `przelaczListe` zdjęta; `keyboard_arrow_up` wypadł z subsetu. */
        glif.textContent = 'keyboard_arrow_down';
        glif.setAttribute('data-mp-ligatura', 'keyboard_arrow_down');
        glif.setAttribute('aria-hidden', 'true');
        stan.czesci.wiecej = wiecej;
        wiecej.addEventListener('click', function () { przelaczListe(); });
        /* Render świeżego kroku przy otwartej liście NIE animuje: animacja ma
           komunikować akcję użytkownika, a nie stan zastany po zmianie kroku. */
        if (stan.listaOtwarta) reszta.setAttribute('data-otwarta', '');
      } else {
        stan.czesci.wiecej = null;
      }
    }
    /* KRYTERIUM GOTOWOŚCI NIE JEST TREŚCIĄ KROKU (decyzja).
       Do tego przebiegu render był ZDUBLOWANY: ten akapit plus pole `podpowiedz`
       na pigułce minutnika. Rysunek stawia je wyłącznie na WIDGECIE WŁĄCZONEGO
       minutnika, więc akapit znika, a `uruchomZKroku()` bierze `krok.kryterium`
       jako domyślną podpowiedź. Skutek uboczny wymieniony wprost: krok BEZ minutnika
       traci kryterium całkowicie — to jest wybór świadomy, nie przeoczenie. */
    top.scrollTop = 0;
    /* D-44.3 — oferta uruchomienia minutnika należy do KROKU, więc odświeża się
       razem z nim. Stoi na końcu `rysujKrok`, po `top.scrollTop`, bo dokłada kafel
       do BOTTOM-u i przelicza jego wysokość — a ta zależy od gotowego układu. */
    odswiezKafelStartu(krok);
  }

  /* Pełna lista (§3.8) jest INNĄ TREŚCIĄ TOP-u, nie panelem nad nim: klatka
     kanoniczna ma w TOP wyłącznie wiersz nagłówka i listę. Dzięki temu przewijanie
     listy (D10) jest tym samym przewijaniem, co przewijanie kroku — natywnym,
     bez własnego toru. */
  /* Sekcje „dalej" i „zużyte" — wydzielone z usuniętego `rysujListe()`, bo to
     jedyna część tamtej funkcji, która niosła treść; reszta budowała OSOBNY EKRAN
     i to ten ekran był usterką. Zwraca, czy cokolwiek dorysowała: przycisk
     „zobacz pozostałe" ma nie istnieć, gdy nie ma czego pokazać.

     D2 bez zmian: przynależność do sekcji niesie NAGŁÓWEK + LINIA + KOLEJNOŚĆ,
     nie styl wiersza — `dalej` ma dokładnie ten sam wygląd wiersza co `teraz`
     (D1 — dwa stany, nie trzy). Linia rozdzielająca stoi teraz PRZED każdą sekcją,
     bo pierwsza sekcja kontenera i tak ma nad sobą listę „w tym kroku". */
  function sekcjePozostale(krok, rodzic) {
    var sekcje = [
      ['dalej', krok.skladnikiDalej || [], 'dalej'],
      /* D-39.56 — „wykorzystane", nie „zużyte". Polecenie.
         Nazwa STANU w kodzie (`zuzyty`) zostaje bez zmian: zmiana etykiety widocznej
         nie jest powodem do przepisywania atrybutów, selektorów i asercji. */
      ['wykorzystane', krok.skladnikiZuzyte || [], 'zuzyty']
    ];
    var dorysowane = 0;
    sekcje.forEach(function (sek) {
      if (!sek[1].length) return;
      el('div', 'mp-tryb__linia', rodzic);
      var h = el('p', 'mp-tryb__naglowek-sekcji', rodzic);
      h.textContent = sek[0];
      var ul = el('ul', 'mp-tryb__skladniki', rodzic);
      sek[1].forEach(function (s) { ul.appendChild(wierszSkladnika(s, krok, sek[2])); });
      dorysowane++;
    });
    return dorysowane > 0;
  }

  function przelaczListe(wartosc) {
    var nowa = wartosc == null ? !stan.listaOtwarta : !!wartosc;
    var r = stan.czesci.reszta;
    /* Uchwyt musi być ŻYWY, nie tylko niepusty. `rysujKrok` czyści TOP przez
       `textContent = ''`, a ekrany bez nawigacji budują treść od zera — po każdym
       z tych przejść `stan.czesci.reszta` wskazuje na węzeł-sierotę, który jest
       prawdziwy w sensie JS i niewidoczny w sensie układu. Animowanie sieroty
       kończy się ciszą: `transitionend` nie przychodzi, bo węzeł nie jest rysowany.
       To ta sama klasa pomyłki co uchwyt tooltipa w `pokazKrok`. */
    if (r && !(stan.czesci.top && stan.czesci.top.contains(r))) {
      r = stan.czesci.reszta = null;
      stan.czesci.wiecej = null;
    }
    stan.listaOtwarta = nowa;
    /* Brak kontenera = jesteśmy poza ekranem kroku albo krok nie ma pozostałych
       sekcji. Wtedy jedyne, co da się zrobić sensownie, to przerysować ekran —
       i to jest ta sama ścieżka, którą szła cała funkcja przed poprawką. */
    if (!r) { pokazKrok(stan.krok); return stan.listaOtwarta; }

    if (stan.czesci.wiecej) {
      stan.czesci.wiecej.setAttribute('aria-expanded', nowa ? 'true' : 'false');
      var tekst = stan.czesci.wiecej.querySelector('.mp-tryb__wiecej-tekst');
      if (tekst) tekst.textContent = nowa ? 'zwiń' : 'zobacz pozostałe';
      /* D-40.3 — glifu NIE dotykamy: kierunek robi obrot z CSS, zawieszony na
         `aria-expanded` ustawionym linijke wyzej. Do 2026-08-20 stala tu podmiana
         `up`/`down` i to bylo jedyne miejsce w nakladce robiace to inaczej niz
         pigulka minutnika. */
    }

    /* Animujemy PIKSELE, nie `auto`. Kolejność jest wiążąca: najpierw zapisujemy
       wysokość bieżącą, potem przełączamy atrybut, potem wymuszamy przeliczenie
       układu, i dopiero wtedy podajemy wysokość docelową. Bez wymuszenia
       przeglądarka skleja obie zmiany w jedną klatkę i przejście nie powstaje —
       czyli wracamy dokładnie do skoku, który ta poprawka usuwa. */
    var start = r.getBoundingClientRect().height;
    r.style.height = start + 'px';
    if (nowa) r.setAttribute('data-otwarta', ''); else r.removeAttribute('data-otwarta');
    var cel = nowa ? r.scrollHeight : 0;
    void r.offsetHeight;                       // wymuszone przeliczenie układu

    var trwanie = 0;
    try {
      trwanie = parseFloat(getComputedStyle(r).transitionDuration) || 0;
    } catch (e) { trwanie = 0; }

    /* DOMKNIĘCIE MUSI BYĆ BEZWARUNKOWE — `transitionend` nie jest gwarancją.
       Zmierzone 2026-08-15: w karcie w tle (`document.hidden`) przejście nie postępuje
       wcale, więc zdarzenie nie przychodzi, `height` zostaje na wartości startowej,
       a `overflow:hidden` obcina listę. Z zewnątrz wygląda to jak „rozwinięcie
       uniemożliwia przewijanie" — dokładnie zgłoszenie. Ta sama pułapka
       dotyczy przerwanego przejścia i silników, które go nie odpalą.
       Stąd trzy drogi do tego samego stanu końcowego, a nie jedna:
       (a) brak przejścia albo karta w tle → domykamy SYNCHRONICZNIE, bez animacji;
       (b) `transitionend` → normalna droga;
       (c) budzik na czas trwania + zapas → siatka bezpieczeństwa dla (b). */
    function domknij() {
      if (r._mpKoniec) { r.removeEventListener('transitionend', r._mpKoniec); r._mpKoniec = null; }
      if (r._mpBudzik) { clearTimeout(r._mpBudzik); r._mpBudzik = null; }
      /* Po otwarciu oddajemy wysokość CSS-owi (`[data-otwarta]{height:auto}`):
         zostawiona wartość w pikselach zamroziłaby kontener i pozycja zaznaczona
         po rozwinięciu przestałaby zmieniać jego rozmiar. */
      var otwarta = r.hasAttribute('data-otwarta');
      r.style.height = otwarta ? '' : '0px';
      /* D-39.21 — DRUGI BEZPIECZNIK, liczbowy. Reguła CSS `min-height:max-content`
         nie zadziałała w pomiarze (pudełko zostało na 298 px przy zawartości 311),
         a `min-height` podane W PIKSELACH zadziałało od razu. Nie wiem, dlaczego
         słowo kluczowe nie rozwiązuje się w tym układzie, i nie zgaduję — biorę
         drogę, która jest zmierzona. Wysokość zawartości mamy tu za darmo:
         to ta sama liczba, którą chwilę wcześniej policzyliśmy na cel animacji.
         Zerowane przy zwijaniu, żeby zwinięte pudełko mogło zejść do zera. */
      r.style.minHeight = otwarta ? (r.scrollHeight + 'px') : '';
    }
    if (trwanie === 0 || document.hidden) { domknij(); return stan.listaOtwarta; }

    r.style.height = cel + 'px';
    if (r._mpKoniec) r.removeEventListener('transitionend', r._mpKoniec);
    if (r._mpBudzik) clearTimeout(r._mpBudzik);
    r._mpKoniec = function (e) {
      if (e.target !== r || e.propertyName !== 'height') return;
      domknij();
    };
    r.addEventListener('transitionend', r._mpKoniec);
    r._mpBudzik = setTimeout(domknij, trwanie * 1000 + 80);
    return stan.listaOtwarta;
  }

  /* ================= ekrany bez nawigacji (jednostka W7) =======================
     start `7195:10894` · S1 `7196:10893` · zakończenie `7195:11178`. Trzy klatki,
     jedna reguła: BOTTOM 132, dwa CTA pełnej szerokości, zero `←` (B11). Ekran
     kroku i ekran bez nawigacji różnią się WYŁĄCZNIE zawartością TOP-u i tym,
     który blok BOTTOM-u jest widoczny — reszta drzewa jest wspólna, więc minutniki
     przeżywają przejście na ekran zakończenia tak samo, jak przeżywają zmianę kroku. */
  function trybBottomu(zNawigacja) {
    stan.czesci.nawigacja.hidden = !zNawigacja;
    stan.czesci.akcje.hidden = !!zNawigacja;
    return przeliczBottom();
  }

  /* D-23.1: `widok.fotoUrl` niesie ZDJĘCIE GŁÓWNE przepisu (pole `zdjecie-glowne`),
     przepuszczone przez `naPorcje()`. Do przebiegu 30 pole to nie istniało na poziomie
     widoku — było polem KROKU — więc funkcja zwracała `null` zawsze i zdjęcie nie
     pojawiało się na żadnym z trzech ekranów (B21, W76). */
  function zdjecieEkranu(rodzic) {
    var url = stan.widok && stan.widok.fotoUrl;
    if (!url) return null;                 // R3: brak zdjęcia nie zostawia dziury
    var f = el('img', 'mp-tryb__foto mp-tryb__foto--glowne', rodzic);
    f.src = url;
    f.alt = '';
    f.setAttribute('data-mp-foto-ekranu', '');
    return f;
  }

  /* `D-50.2` · KOLEJNOŚĆ I WYRÓWNANIE EKRANU STARTOWEGO wg przerysowanej klatki
     `7195:10894`. Trzy zmiany, wszystkie na polecenie:
     TYTUŁ NAD ZDJĘCIEM (było odwrotnie), tytuł DO LEWEJ (był wyśrodkowany),
     blok porcji DO LEWEJ (był wyśrodkowany). Rytm 16 px między blokami zostaje —
     klatka trzyma go bez zmian (88 → 166 → 332 → 429 → 517, każda różnica to
     wysokość bloku + 16). */
  function ekranStart(top) {
    var t = el('h2', 'mp-tryb__ekran-tytul', top);
    t.textContent = (stan.widok && stan.widok.tytul) || '';
    zdjecieEkranu(top);
    /* Meta (`7263:10715`): trzy kolumny czas · kcal · makro. Wartości dostarcza model
       (`wartosci-porcja`, CR z 2026-08-15), widok ich nie liczy — mnożenie w przeglądarce
       jest dokładnie tą usterką, którą CR usuwa. Brak pola → model daje `[]` → pasek
       znika w całości, a nie pokazuje kolumn z kreskami. */
    var meta = el('div', 'mp-tryb__meta', top);
    (stan.widok && stan.widok.meta ? stan.widok.meta : []).forEach(function (m) {
      var kol = el('div', 'mp-tryb__meta-kol', meta);
      var g = el('span', 'mp-tryb__meta-glif mp-ikona', kol);
      /* B16 — PRAWDZIWA ligatura subsetu, bez fallbacku. Nazwa spoza `LIGATURY`
         nie dostaje znaku zastępczego: idzie do `ostrzezenie()` i zostaje pusto.
         Powód jest pomiarowy, nie estetyczny — znak zastępczy renderuje się jak
         ikona i przechodzi każdą asercję o obecności glifu, więc brak subsetu
         wyglądałby dokładnie jak subset kompletny. */
      if (m.glif && LIGATURY.indexOf(m.glif) < 0) {
        ostrzezenie('glif „' + m.glif + '" nie należy do subsetu ikon — pomijam, ' +
                    'bo własny zastępnik ukryłby brak (B16)');
        g.textContent = '';
      } else {
        g.textContent = m.glif || '';
      }
      g.setAttribute('data-mp-ligatura', m.glif || '');
      g.setAttribute('aria-hidden', 'true');
      el('span', 'mp-tryb__meta-wartosc', kol).textContent = m.wartosc || '';
    });
    if (!meta.children.length) meta.hidden = true;
    /* `D-52.1` · AKAPIT WYJAŚNIAJĄCY (`7640:12824`). Wracał raz (D-50.4) i raz schodził
       (D-51.3); ta wersja różni się tym, że jest ZAPŁACONA — treść przepisana tak, by
       zmieściła się w trzech wierszach, i wchodzi w miejsce etykiety „ile porcji?", nie
       obok niej. Treść jest RYSOWANA, nie z pipeline'u.
       Składane z węzłów, nie z `innerHTML`: pogrubienie to jeden `<b>`. */
    var wyj = el('p', 'mp-tryb__wyjasnienie', top);
    wyj.appendChild(document.createTextNode('W trybie gotowania podążasz za przepisem krok po kroku. '));
    el('b', '', wyj).textContent = 'Twój ekran nie gaśnie,';
    wyj.appendChild(document.createTextNode(' a gdy liczy się czas – korzystasz z minutników'));
    var rzad = el('div', 'mp-tryb__porcje', top);
    var blok = el('div', 'mp-tryb__porcje-blok', rzad);
    /* D-39.33 · PORCJE NA LIGATURY — rozstrzygnięte SZABLONEM, nie Figmą, i to na
       wyraźne polecenie („sprawdź, jak to jest na szablonie przepisu:
       jeśli DM Sans — zostaw, jeśli Symbols Outlined — przełącz").
       Zmierzone na żywym szablonie `[V]` 2026-08-17: selektor porcji strony przepisu
       ma `.icon-text` o treści **`remove`** i **`add`**, rodzina
       `"Material Symbols Outlined", Arial, sans-serif`, 16 px, waga **500**,
       kolor `rgb(62,43,34)` = #3E2B22.
       **To jest przypadek, w którym Figma NIE rozstrzyga, bo sama sobie przeczy:**
       węzły `7263:10729/10732` dają znaki U+2212 i U+002B w DM Sans Medium 20 px.
       Gdyby oracle'em była Figma, migracja byłaby regresem — i tak to zaraportowałem
       przed pytaniem. Szablon wskazano jako rozstrzygający dla TEJ pary
       i szablon mówi coś innego niż plik projektowy.
       Rozmiar zostaje **20 px**, nie 16 z szablonu: przycisk overlaya ma 40×40
       (`7263:…` = pudełko 40×20), a nie kontrolkę strony. Przenosimy MECHANIZM
       ikony, o który padło pytanie, nie skalę cudzego komponentu.
       Waga 500 zostaje z reguły `.mp-tryb__porcje-krok`, która stoi w arkuszu PO
       `.mp-ikona` przy równej specyficzności — czyli zgodnie z szablonem. */
    var minus = el('button', 'mp-tryb__porcje-krok mp-ikona', blok);
    minus.type = 'button';
    minus.textContent = 'remove';
    minus.setAttribute('data-mp-ligatura', 'remove');
    minus.setAttribute('aria-label', 'mniej porcji');
    var ile = el('span', 'mp-tryb__porcje-ile', blok);
    ile.setAttribute('data-mp-porcje', '');
    var plus = el('button', 'mp-tryb__porcje-krok mp-ikona', blok);   // D-39.33
    plus.type = 'button';
    plus.textContent = 'add';
    plus.setAttribute('data-mp-ligatura', 'add');
    plus.setAttribute('aria-label', 'więcej porcji');
    function rysujPorcje() {
      ile.textContent = stan.porcje + (stan.porcje === 1 ? ' porcja' : (stan.porcje < 5 ? ' porcje' : ' porcji'));
      minus.disabled = stan.porcje <= PORCJE_MIN;
      plus.disabled = stan.porcje >= PORCJE_MAX;
    }
    minus.addEventListener('click', function () { ustawPorcje(stan.porcje - 1); });
    plus.addEventListener('click', function () { ustawPorcje(stan.porcje + 1); });
    stan.czesci.porcjeIle = ile;
    stan.czesci.porcjeMinus = minus;
    stan.czesci.porcjePlus = plus;
    rysujPorcje();
    return top;
  }

  function ekranWznowienie(top) {
    zdjecieEkranu(top);
    var t = el('h2', 'mp-tryb__ekran-tytul', top);
    t.textContent = (stan.widok && stan.widok.tytul) || '';
    var karta = el('div', 'mp-tryb__karta', top);
    karta.setAttribute('data-mp-karta', 'S1');
    var meta = el('p', 'mp-tryb__karta-meta', karta);
    // NIENARYSOWANE brzmienia: pipeline treści. Wiersz pyta o rytm, nie o tekst.
    meta.textContent = 'przerwane niedawno · na ' + stan.porcje + ' porcje';
    var krokTekst = el('p', 'mp-tryb__karta-krok', karta);
    var N = stan.widok ? stan.widok.kroki.length : 0;
    var k = stan.widok ? stan.widok.kroki[Math.min(stan.krok, N) - 1] : null;
    krokTekst.textContent = 'krok ' + stan.krok + ' z ' + N +
                            (k && k.tytul ? ' — ' + k.tytul : '');
    var tor = el('div', 'mp-tryb__karta-tor', karta);
    var wyp = el('div', 'mp-tryb__karta-wypelnienie', tor);
    /* R5 na DRUGIM torze: `round(n/N × szerokość toru)` — reguła nie zna szerokości
       (§3b.0 potwierdza ją na torze 296: krok 6 z 9 → 197).
       Szerokości NIE liczymy tutaj: tor jeszcze nie zna swojej ostatecznej miary.
       Zmierzone w przebiegu 8 na ramce 667×375: policzone w tym miejscu wypełnienie
       wychodziło 402 zamiast 392, bo dalsza treść TOP-u dokładała pasek przewijania
       i zwężała kolumnę o 15 px PO tym pomiarze. Domiar idzie na koniec `pokazEkran`. */
    stan.czesci.kartaS1Tor = tor;
    stan.czesci.kartaS1Wyp = wyp;
    var ogon = el('p', 'mp-tryb__karta-ogon', karta);
    // D-39.56 — bez „zaznaczonych składników": ten stan zniknął razem z kontrolką.
    ogon.textContent = 'minutniki nie odliczały w tle, a przepis czeka w tym samym miejscu.';
    stan.czesci.kartaS1 = karta;
    return top;
  }

  function ekranKoniec(top) {
    var nad = el('p', 'mp-tryb__ekran-nadtytul', top);
    nad.textContent = 'gotowe, smacznego';   // NIENARYSOWANE brzmienie: pipeline treści
    var pod = el('p', 'mp-tryb__ekran-podtytul', top);
    pod.textContent = (stan.widok && stan.widok.tytul) || '';
    zdjecieEkranu(top);
    var karta = el('div', 'mp-tryb__karta', top);
    karta.setAttribute('data-mp-karta', 'pochwal-sie');
    var nagl = el('p', 'mp-tryb__karta-krok', karta);
    /* D-39.37 · BRZMIENIE Z FIGMY. Adnotacja „NIENARYSOWANE brzmienie" przy tych
       pięciu ciągach BYŁA NIEPRAWDZIWA i kosztowała ekran niezgodny z projektem
       aż do zgłoszenia. Tekst jest w `7195:11178` jako węzły
       `7195:11186`, `7200:10893`, `7200:10894`, `7200:10897`, `7200:10900` —
       ktoś uznał go za nienarysowany, nie otwierając klatki. Ta sama klasa błędu
       co `80 = 0 + 80` i „13 px obcięcia": twierdzenie o źródle bez sprawdzenia
       źródła, które przeżyło, bo matryca pytała runtime o runtime. */
    nagl.textContent = 'pochwal się swoim daniem';     // `7200:10893`
    var lista = el('div', 'mp-tryb__karta-lista', karta);
    /* WYM §6 / C6 (H10 · H11): wariant v1.0 zakończenia jest BEZ mechaniki −70 zł.
       Runtime nie czyta kwoty zniżki, nie renderuje uploadu zdjęcia i nie zna słowa
       „rabat" — trzy wiersze to instrukcja, nie formularz. */
    /* JEDNO ODSTĘPSTWO OD FIGMY, WYMUSZONE MECHANIZMEM. `7200:10894` brzmi
       „…przycisk poniżej zabierze Cię od razu do aparatu". **Na webie to jest
       nieprawda i nie da się jej naprawić kodem**: strona nie umie otworzyć
       aplikacji aparatu, a `<input capture>` pokazuje na iOS arkusz wyboru
       i — co gorsza — zwraca plik DO STRONY, nie do galerii telefonu, więc
       zdjęcia nie da się potem wrzucić na Instagrama. Obietnica z projektu
       prowadziłaby w ślepy zaułek. Stąd CTA idzie w aparat Instagrama
       (patrz `akcjaAparat`), a zdanie mówi to, co się naprawdę wydarzy.
       Korekta tekstu zaakceptowana.
       Pozostałe dwa wiersze — dosłownie z Figmy. */
    ['Zrób zdjęcie gotowego dania – przycisk poniżej otworzy aparat w Instagramie.',
     'Wrzuć zdjęcie na Instagrama i oznacz @miesnapaczka, jeśli polubiłeś(-aś) gotowanie z nami :)',
     '...a potem wróć po więcej przepisów!'].forEach(function (tekst, i) {
      var w = el('div', 'mp-tryb__karta-wiersz', lista);
      el('span', 'mp-tryb__karta-numer', w).textContent = String(i + 1);
      el('span', 'mp-tryb__karta-tekst', w).textContent = tekst;
    });
    stan.czesci.kartaKoniec = karta;
    return top;
  }

  var PORCJE_MIN = 1, PORCJE_MAX = 7;   // A3 / §3.1 — selektor 1–7

  /* ---- sesja: jeden klucz localStorage (F8 · I-30 · WYM §6) -------------------
     WYM §6 mówi „nie zapisuje nic poza swoim kluczem", więc klucz jest JEDEN
     i niesie cały stan sesji, zamiast trzech kluczy po jednym polu. Klucz nosi
     identyfikator przepisu, bo dwa przepisy przerwane tego samego dnia to dwie
     sesje, nie jedna nadpisana. Brak identyfikatora = brak zapisu, cicho:
     przeglądarka w trybie prywatnym rzuca na `setItem`, a tryb gotowania nie ma
     prawa się przez to wywrócić.
     // NIENARYSOWANE: nazwa klucza i granica świeżości — pozycje na liście decyzji. */
  var KLUCZ = 'mp-tryb:';

  function idPrzepisu() {
    var m = stan.model || stan.widok;
    return (m && (m.slug || m.tytul)) ? String(m.slug || m.tytul) : '';
  }

  function zapiszSesje() {
    var id = idPrzepisu();
    if (!id || typeof localStorage === 'undefined') return null;
    /* `D-39.76` · ZAPISUJEMY POSTĘP, NIE ODHACZENIA — I TO JEST DECYZJA, NIE BRAK.
       Odhaczenia wróciły do produktu (`odhacz()`), więc byłoby CO zapisać. Nie
       zapisujemy ich świadomie: `D-39.27` (persystencja odhaczeń) jest uchylone
       jako błędne, a nie „pozbawione przedmiotu", jak orzekło `D-39.56`.

       Powód: zapisane odhaczenie i zapisany `krok` to dwa źródła prawdy o jednym
       stanie i potrafią się rozjechać. Użytkownik wraca po tygodniu, wznawia na
       kroku 3, a odhaczenie z poprzedniej sesji twierdzi, że składnik jest już
       wykorzystany — bez żadnego zdarzenia, które by to uzasadniało. Postęp
       przepisu jest w tej parze jedynym źródłem, które da się odtworzyć.

       ⛔ Kto tu dopisze `zaznaczone`, przywróci `D-39.27` — decyzję już raz
       uchyloną. Stare zapisy z tym polem czytają się bez błędu, bo nikt go nie
       czyta; jego obecność w `localStorage` NIE jest argumentem, że ma wrócić. */
    var dane = { krok: stan.krok, porcje: stan.porcje, znacznik: Date.now() };
    try { localStorage.setItem(KLUCZ + id, JSON.stringify(dane)); } catch (e) { return null; }
    return dane;
  }

  function czytajSesje() {
    var id = idPrzepisu();
    if (!id || typeof localStorage === 'undefined') return null;
    var s = null;
    try { s = localStorage.getItem(KLUCZ + id); } catch (e) { return null; }
    if (!s) return null;
    try { s = JSON.parse(s); } catch (e) { return null; }   // uszkodzony wpis = brak wpisu
    if (!s || typeof s.krok !== 'number') return null;
    return s;
  }

  function zapomnijSesje() {
    var id = idPrzepisu();
    if (!id || typeof localStorage === 'undefined') return null;
    try { localStorage.removeItem(KLUCZ + id); } catch (e) {}
    return null;
  }

  /* I-30 · WZNOWIENIE PROWADZI PROSTO NA KROK — D-45.1, polecenie
     2026-08-23: „skoro usuwamy ekran ostrzegający przed wyjściem z trybu,
     powinniśmy także usunąć ekran informujący o powrocie. Wracasz = widzisz ekran,
     z którego wyszedłeś."

     To jest DRUGA POŁOWA D-43.1 i bez niej tamta decyzja była niesymetryczna:
     zdjęliśmy pytanie przy wyjściu, zostawiając komunikat przy wejściu. Przełącznik
     obiecuje przełączanie, a nie odprawę na granicy w jedną stronę.

     Ekran `wznowienie` ZOSTAJE W KODZIE, dokładnie jak dialog S2: `pokazEkran`
     dalej go rysuje, `MP.tryb.ekran('wznowienie')` dalej działa, zdjęty jest
     wyłącznie ten jeden wywołujący. Odwrócenie próby to jedna linia.

     Kolejność zostaje wiążąca z tego samego powodu, co przedtem: krok i porcje
     muszą być ustawione ZANIM cokolwiek się narysuje. */
  function wznow() {
    var s = czytajSesje();
    if (!s) return null;
    var N = stan.widok ? stan.widok.kroki.length : 0;
    stan.krok = Math.max(1, Math.min(N || s.krok, s.krok));
    if (s.porcje) ustawPorcje(s.porcje);
    pokazKrok(stan.krok);
    return s;
  }

  /* Cele CTA na ekranach bez nawigacji. Klatki podają BRYŁY, nie cele (I-02 mówi
     wprost: „brak celu w pliku"), więc każdy cel poniżej jest wnioskiem z WYM §5
     albo pozycją na liście decyzji — stąd `// NIENARYSOWANE:` przy trzech z sześciu. */
  /* D-39.37 · APARAT INSTAGRAMA, NIE `<input capture>`. Rozstrzygnięcie techniczne,
     nie estetyczne, i warto znać jego powód, zanim ktoś „uprości" to z powrotem:

     `<input type="file" accept="image/*" capture="environment">` wygląda na
     oczywistą drogę i jest ślepym zaułkiem dla TEGO zadania. Zwraca plik
     DO STRONY, a **nie zapisuje go w galerii telefonu** — więc użytkownik robi
     zdjęcie, po czym nie ma czego wrzucić na Instagrama. Zapisanie go wymagałoby
     uploadu, czyli mechaniki −70 zł, która jest poza zakresem v1.0. Kombinacja
     „CTA aparatu w v1.0" + „bez uploadu" ma dokładnie jedno spójne rozwiązanie:
     oddać użytkownika aparatowi Instagrama, gdzie zdjęcie i tak ma trafić.

     Schemat: **`instagram://story-camera`**, wybór po
     wyszukaniu. `instagram://camera` otwiera kompozytor NOWEGO POSTA, a wiersz 2
     prosi o RELACJĘ z oznaczeniem — story-camera trafia w tę intencję wprost.

     `[NIEZWERYFIKOWANE]` Schemat nie został sprawdzony na urządzeniu. Wyszukiwanie
     2026-08-17 potwierdza, że Instagram wystawia schematy aparatu na iOS i Androidzie
     i **nie znaleziono zgłoszeń o ich wycofaniu**, ale wszystkie merytoryczne źródła
     są z lat 2020–2022; schematy URL psują się cicho, bez ogłoszeń. Dlatego adres
     stoi w STAŁEJ, nie w treści funkcji.

     **KOREKTA WCZEŚNIEJSZEJ OCENY RYZYKA, zapisana, bo była błędna:** twierdziłem,
     że najgorszy przypadek to przejście na profil. Nieprawda — na iOS nawigacja pod
     NIEZAREJESTROWANY schemat wywołuje **systemowy alert o błędzie**, a droga
     zapasowa odpala dopiero po nim. Najgorszy przypadek to więc alert, a potem
     profil. Ryzyko przyjęte świadomie do czasu testu; jeśli alert wystąpi,
     alternatywą jest link uniwersalny (bez alertu, ale bez pewności wejścia
     w aparat). Test na urządzeniu: 10 sekund, ręcznie. */
  var IG_APARAT = 'instagram://story-camera';
  var IG_PROFIL = 'https://www.instagram.com/miesnapaczka/';

  function akcjaAparat() {
    var t = Date.now();
    var budzik = global.setTimeout(function () {
      /* `document.hidden` odróżnia „aplikacja przejęła ekran" od „nic się nie stało".
         Warunek czasowy obok, bo uśpiona karta potrafi odpalić budzik z opóźnieniem
         i wtedy sam `hidden` skłamie — ta sama pułapka co przy `transitionend`. */
      if (document.hidden || Date.now() - t > 2500) return;
      global.open(IG_PROFIL, '_blank', 'noopener');
    }, 1200);
    global.addEventListener('pagehide', function () { global.clearTimeout(budzik); }, { once: true });
    try { global.location.href = IG_APARAT; }
    catch (err) { global.clearTimeout(budzik); global.open(IG_PROFIL, '_blank', 'noopener'); }
    return null;
  }

  /* `D-39.45` · ARKUSZ SKŁADNIKÓW — budowa i przełączanie.
     Wiersze budowane tą samą funkcją co na kroku (`wierszSkladnika`), ze stanem
     `dalej`: przed startem nie ma kroku bieżącego ani zużytych, więc podział na
     trzy sekcje nie miałby desygnatu — a `dalej` jest jedynym stanem, który nie
     twierdzi nic nieprawdziwego o przebiegu gotowania.
     `D-39.58` — w arkuszu NIE MA już zaznaczania: wiersz zaczyna się punktorem,
     a nie checkboxem. Zaznaczać nie da się nigdzie, bo kontrolka nie istnieje
     ani tu, ani na krokach. */
  var arkusz = null;

  function zbudujArkusz() {
    if (arkusz) return arkusz;
    zbuduj();
    var scrim = el('div', 'mp-tryb__arkusz-scrim', stan.korzen);
    var pud = el('div', 'mp-tryb__arkusz', stan.korzen);
    pud.setAttribute('role', 'dialog');
    pud.setAttribute('aria-modal', 'true');
    pud.setAttribute('aria-label', 'składniki');

    var glowa = el('div', 'mp-tryb__arkusz-glowa', pud);
    el('p', 'mp-tryb__arkusz-tytul', glowa).textContent = 'składniki';
    var x = el('button', 'mp-tryb__zamknij mp-ikona', glowa);
    x.type = 'button';
    x.textContent = 'close';
    x.setAttribute('data-mp-ligatura', 'close');
    x.setAttribute('aria-label', 'zamknij listę składników');

    el('p', 'mp-tryb__arkusz-podpowiedz', pud).textContent =
      // NIENARYSOWANE brzmienie: pipeline treści (tryb ui). D-39.58 — poprzednie
      // obiecywało zaznaczanie, którego już nie ma.
      'Wszystko, czego potrzebujesz na wybraną liczbę porcji.';

    var lista = el('ul', 'mp-tryb__arkusz-lista', pud);
    lista.setAttribute('role', 'list');

    var pas = el('div', 'mp-tryb__arkusz-pas', pud);
    var cta = el('button', 'mp-tryb__akcja-primary', pas);
    cta.type = 'button';
    cta.textContent = 'zacznij gotować';

    /* `D-39.46` · DRUGIE CTA „skopiuj składniki",
       przez analogię do przycisku kopiowania na szablonie przepisu (desktop).
       **Kopiujemy WYŁĄCZNIE NIEODHACZONE** i to nie jest wybór estetyczny:
       podpowiedź arkusza mówi „zaznacz, co masz w domu, reszta zostanie na liście
       zakupów", więc skopiowanie wszystkiego przeczyłoby zdaniu stojącemu 8 px wyżej.
       Ta sama logika co na stronie przepisu.
       `[!]` Szablon nazywa ten przycisk „skopiuj listę zakupów"; ustalono
       „skopiuj składniki". Zostawiam brzmienie ustalone i zgłaszam rozjazd —
       dwie nazwy tej samej czynności w jednym produkcie to pozycja dla pipeline'u
       treści, nie dla mnie. */
    var kopiuj = el('button', 'mp-tryb__akcja-ghost mp-tryb__arkusz-kopiuj', pas);
    kopiuj.type = 'button';
    kopiuj.textContent = 'skopiuj składniki';

    x.addEventListener('click', zamknijArkusz);
    scrim.addEventListener('click', zamknijArkusz);
    cta.addEventListener('click', function () { zamknijArkusz(); pokazKrok(1); });
    kopiuj.addEventListener('click', function () { kopiujSkladniki(kopiuj); });

    arkusz = { el: pud, scrim: scrim, lista: lista, cta: cta, kopiuj: kopiuj };
    return arkusz;
  }

  /* Tekst do schowka: jedna pozycja w wierszu, bez numeracji i bez nagłówka —
     to ma się wkleić do notatek albo do wiadomości, a nie udawać dokumentu. */
  function tekstDoSchowka() {
    var skl = (stan.widok && stan.widok.skladniki) || [];
    /* D-39.58 — cała lista: nie ma już czym filtrować. */
    return skl.map(function (s) { return s.etykieta || s.nazwa || s.key; })
              .join('\n');
  }

  /* Dwie drogi do schowka, bo jedna nie wystarcza. `navigator.clipboard` wymaga
     kontekstu bezpiecznego i bywa odmawiane; `execCommand('copy')` jest wycofywany,
     ale działa tam, gdzie tamto pada. Potwierdzenie idzie na etykietę przycisku,
     nie w osobny komunikat — użytkownik patrzy w to miejsce, w które właśnie
     tapnął. Etykieta wraca po 1,6 s; `_mpBudzik` chroni przed nakładaniem się
     dwóch szybkich tapnięć. */
  function kopiujSkladniki(przycisk) {
    var tekst = tekstDoSchowka();
    if (!tekst) return null;
    var potwierdz = function (ok) {
      if (!przycisk) return;
      if (przycisk._mpBudzik) clearTimeout(przycisk._mpBudzik);
      var bylo = przycisk._mpEtykieta || przycisk.textContent;
      przycisk._mpEtykieta = bylo;
      przycisk.textContent = ok ? 'skopiowano' : 'nie udało się skopiować';
      przycisk._mpBudzik = setTimeout(function () {
        przycisk.textContent = przycisk._mpEtykieta;
        przycisk._mpBudzik = null;
      }, 1600);
    };
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tekst).then(function () { potwierdz(true); },
                                               function () { potwierdz(zapasowoDoSchowka(tekst)); });
      return tekst;
    }
    potwierdz(zapasowoDoSchowka(tekst));
    return tekst;
  }

  function zapasowoDoSchowka(tekst) {
    try {
      var pole = document.createElement('textarea');
      pole.value = tekst;
      /* `readOnly` i pozycja poza ekranem, żeby iOS nie podniósł klawiatury
         ani nie przewinął strony do pola, którego użytkownik nie widzi. */
      pole.readOnly = true;
      pole.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(pole);
      pole.select();
      pole.setSelectionRange(0, tekst.length);
      var ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(pole);
      return !!ok;
    } catch (e) { return false; }
  }

  function otworzArkusz() {
    var a = zbudujArkusz();
    a.lista.textContent = '';
    var skl = (stan.widok && stan.widok.skladniki) || [];
    skl.forEach(function (s) { a.lista.appendChild(wierszSkladnika(s, 0, 'dalej', { arkusz: true })); });
    stan.korzen.setAttribute('data-arkusz', '');
    /* Ostrość wejścia klawiaturą: pierwszy element sterujący arkusza, nie cały
       dokument. Bez tego czytnik zostaje na przycisku pod scrimem. */
    if (a.cta && a.cta.focus) a.cta.focus();
    return a.el;
  }

  function zamknijArkusz() {
    if (stan.korzen) stan.korzen.removeAttribute('data-arkusz');
    return null;
  }

  function akcjaEkranu(ktory) {
    var e = stan.ekran;
    if (e === 'start') {
      if (ktory === 'primary') return pokazKrok(1);
      /* `D-39.45` · „najpierw pokaż składniki" otwiera ARKUSZ NA EKRANIE STARTOWYM,
         a nie przechodzi do kroku 1. Zgłoszenie, makieta `S6`
         (`7545:12442`) zatwierdzona.
         **Poprzednie zachowanie było sprzeczne z własną etykietą:** przycisk mówi
         „NAJPIERW pokaż składniki", a wrzucał użytkownika w krok 1 z rozwiniętą
         listą — czyli już po starcie. Dawny komentarz powoływał się na D8/WYM §5
         („pełna lista, nie skrócona"), i ten wymóg zostaje spełniony: arkusz pokazuje
         `widok.skladniki`, czyli KOMPLET, a nie wycinek kroku. Zmienia się miejsce,
         nie zakres. */
      return otworzArkusz();
    }
    if (e === 'wznowienie') {
      if (ktory === 'primary') return pokazKrok(stan.krok);   // I-30: wznowienie na kroku
      stan.krok = 1;
      return pokazKrok(1);
    }
    if (e === 'koniec') {
      /* D-39.37 · CTA APARATU WCHODZI DO v1.0.
         Odwraca cięcie zakresu `C6`/`I-29` z 2026-08-14 w części dotyczącej CTA.
         Przesłanka cięcia była nieścisła: `INTERAKCJE.md` przypisywało CTA aparatu
         wyłącznie wariantowi `7448:128443` (z mechaniką −70 zł), a klatka WDRAŻANA
         `7195:11178` ma w BOTTOM-ie własne `cta — cta` i wiersz obiecujący aparat.
         Primary = aparat, ghost = powrót do przepisu (dawne zachowanie primary).
         Ghost „zacznij od nowa" ZNIKA — był oznaczony NIENARYSOWANE i nie ma go
         w klatce; jego rolę pełni ekran startowy osiągalny z przycisku strony. */
      if (ktory === 'primary') return akcjaAparat();
      return zamknij();
    }
    return null;
  }

  function ustawPorcje(n) {
    n = Math.max(PORCJE_MIN, Math.min(PORCJE_MAX, n | 0));
    /* Wartość SPRZED zmiany bierzemy przed strażnikiem równości, żeby zdarzenie
       niosło prawdziwy `servings_from`. Strażnik zostaje na miejscu i to on
       sprawia, że „kliknięcie bez zmiany" (np. `+` na maksimum) nie generuje
       zdarzenia o przejściu z 7 na 7. */
    var porcjeSprzed = stan.porcje;
    if (n === stan.porcje) return stan.porcje;
    stan.porcje = n;
    /* Przeliczenie widoku wymaga MODELU, nie widoku — `naPorcje` jest funkcją
       modelu. Bez modelu selektor dalej działa jako liczba (klikalność, granice),
       ale nie przelicza gramatur: to jawny stan degradacji, nie cicha awaria. */
    if (stan.model && global.MP && global.MP.przepis && global.MP.przepis.naPorcje) {
      stan.widok = global.MP.przepis.naPorcje(stan.model, n);
    }
    if (stan.ekran) pokazEkran(stan.ekran);
    POMIAR.porcje(porcjeSprzed, stan.porcje);
    return stan.porcje;
  }

  function pokazEkran(rodzaj) {
    zbuduj();
    zamknijTooltip();
    /* D-44.3 — żaden ekran poza krokiem nie ma minutnika do zaoferowania:
       start, wznowienie i koniec zdejmują kafel startowy bezwarunkowo. */
    odswiezKafelStartu(null);
    stan.ekran = rodzaj;
    stan.listaOtwarta = false;
    var top = stan.czesci.top;
    top.textContent = '';
    var cz = stan.czesci;
    var N = stan.widok ? stan.widok.kroki.length : 9;
    if (rodzaj === 'koniec') {
      POMIAR.zakonczono(N, stan.porcje);
      cz.etykieta.textContent = ETYKIETA_TRYBU;
      ustawPostep(N, N);                       // R5: pasek pełny na zakończeniu
      ekranKoniec(top);
      cz.akcjaPrimary.textContent = 'zrób zdjęcie';      // D-39.37 · `cta — cta` z `7195:11178`
      cz.akcjaGhost.textContent = 'wróć do przepisu';    // D-39.37 · `cta — ghost`
    } else if (rodzaj === 'wznowienie') {
      cz.etykieta.textContent = ETYKIETA_TRYBU;
      ustawPostep(stan.krok, N);
      ekranWznowienie(top);
      cz.akcjaPrimary.textContent = 'wróć do gotowania';
      cz.akcjaGhost.textContent = 'zacznij od nowa';
    } else {
      cz.etykieta.textContent = ETYKIETA_TRYBU;
      ustawPostep(0, N);                       // R5: kikut 8 px, nie zero
      ekranStart(top);
      cz.akcjaPrimary.textContent = 'zacznij gotować';
      cz.akcjaGhost.textContent = 'najpierw pokaż składniki';
    }
    trybBottomu(false);
    /* Domiar po złożeniu całego ekranu — patrz komentarz przy torze karty S1. */
    if (rodzaj === 'wznowienie' && stan.czesci.kartaS1Tor) {
      stan.czesci.kartaS1Wyp.style.width =
        Math.round((stan.krok / (N || 1)) *
                   stan.czesci.kartaS1Tor.getBoundingClientRect().width) + 'px';
    }
    return top;
  }

  function pokazKrok(n) {
    if (!stan.widok) return null;
    stan.ekran = null;
    /* D-39.22 · ZMIANA KROKU ZAWSZE ZWIJA LISTĘ,
       dosłownie: „gdy klikam dalej bądź wstecz, lista powinna się automatycznie
       zwijać, zawsze, bez wyjątku". Do tej poprawki `stan.listaOtwarta` przeżywało
       przejście, a `rysujKrok` odtwarzało rozwinięcie na nowym kroku (był na to
       nawet jawny komentarz: „render świeżego kroku przy otwartej liście NIE
       animuje"). Rozwinięcie jest odpowiedzią na PYTANIE O TEN KROK — „co jeszcze
       będzie potrzebne" — więc przeniesione na następny krok odpowiada na pytanie,
       którego nikt nie zadał, i przy okazji zabiera ekran w chwili, gdy użytkownik
       chce przeczytać nową instrukcję.
       Zerowanie stoi TU, a nie w obsłudze przycisków, bo `pokazKrok` jest jedyną
       drogą do kroku — wpięcie w `dalej`/`wstecz` ominęłoby wznowienie sesji
       i skok z ekranu startowego. */
    stan.listaOtwarta = false;
    trybBottomu(true);
    var N = stan.widok.kroki.length;
    if (n < 1 || n > N) return null;
    stan.krok = n;
    /* TOP jest czyszczony przy przerysowaniu, więc węzeł tooltipa i tak by zniknął —
       ale uchwyt w module zostałby i `zamknijTooltip` szukałby rodzica sieroty. */
    zamknijTooltip();
    var krok = stan.widok.kroki[n - 1];
    stan.czesci.etykieta.textContent = ETYKIETA_TRYBU;   // D-40.15 — licznik jest w pigułce kroku
    /* Jeden renderer, nie dwa. `stan.listaOtwarta` jest teraz stanem ROZWINIĘCIA
       bloku składników, a nie wyborem ekranu — ekran listy zniknął razem
       z `rysujListe()`. */
    rysujKrok(krok);
    przeliczBottom();
    ustawPostep(n, N);
    /* D-39.19 — `wstecz` NIE jest już wygaszane na kroku 1: prowadzi na ekran
       startowy, więc ma dokąd prowadzić. Linia zostaje jako jawne włączenie,
       a nie milczące usunięcie — inaczej przycisk odziedziczyłby `disabled`
       po poprzednim renderze i objaw wróciłby bez śladu w kodzie. */
    stan.czesci.wstecz.disabled = false;
    /* Zapis przy KAŻDEJ zmianie kroku, nie przy zamknięciu: sesja urywa się
       zamknięciem karty albo wygaszeniem telefonu, czyli dokładnie wtedy, gdy
       żaden handler zamknięcia nie zdąży się wykonać. */
    zapiszSesje();
    POMIAR.krok(n, N, !!krok.minutnik);
    return krok;
  }

  /* Blokada przewijania strony pod overlayem. Nie jest kosmetyką: bez niej strona
     zachowuje własny pasek przewijania, przez co `position: fixed; inset: 0` jest
     o jego szerokość WĘŻSZE niż viewport (na desktopie 15 px) i kolumna treści
     przestaje być „szerokość ekranu − 32". Na telefonie pasek nic nie zabiera,
     więc bez tej blokady defekt byłby niewidoczny w pomiarze i widoczny dopiero
     w podglądzie na desktopie. Stan poprzedni zapamiętany, nie nadpisany na stałe. */
  var poprzedniOverflow = null;
  var poprzedniOverflowBody = null;   // D-39.23 — patrz `otworz`

  /* ================= wake lock (D-39.17) =====================================
     WYMAGANIA §106 („S5 — wake lock") i INTERAKCJE `I-23`. Do 2026-08-16 tego
     mechanizmu NIE BYŁO w kodzie ani w jednym miejscu — zmierzone przeglądem
     całego pliku i sondą `navigator.wakeLock` na żywej stronie (API dostępne,
     runtime nieużywający). Ekran `S5` opisuje sytuację PO wygaszeniu, więc plik
     od początku zakładał, że wygaszenie bywa; brakowało tego, co je opóźnia.

     Cztery rzeczy, których ta implementacja NIE robi, i każda jest celowa:
     (1) nie obiecuje, że zadziała — `wakeLock` nie istnieje na części przeglądarek
         (m.in. Safari poniżej 16.4), więc brak API jest zwykłą ścieżką, nie błędem;
     (2) nie woła `console.warn` — konsola jest mierzoną powierzchnią (wiersz I1);
     (3) nie trzyma blokady po zamknięciu overlaya — zwolnienie idzie w `zamknijWewn`,
         bo blokada przeżywająca tryb gotowania byłaby wadą, nie funkcją;
     (4) nie zakłada, że blokada przeżyje schowanie karty. Przeglądarka zwalnia ją
         SAMA przy `visibilitychange`, i to jest udokumentowane zachowanie, a nie
         usterka — dlatego przy powrocie do karty prosimy o nią PONOWNIE.
     Stan wystawiony do pomiaru przez `MP.tryb.wakeLock()`: `null` (nie proszono),
     `true` (trzymana), `false` (proszono i nie wyszło — brak API albo odmowa). */
  var blokadaEkranu = null;
  var wakeStan = null;

  function trzymajEkran() {
    if (!stan.korzen || !stan.korzen.hasAttribute('data-otwarty')) return wakeStan;
    var api = global.navigator && global.navigator.wakeLock;
    if (!api || typeof api.request !== 'function') { wakeStan = false; return wakeStan; }
    if (blokadaEkranu) return wakeStan;
    try {
      api.request('screen').then(function (b) {
        /* Overlay mógł się zamknąć, zanim obietnica wróciła — wtedy blokadę
           zwalniamy od razu, zamiast trzymać ją dla zamkniętego ekranu. */
        if (!stan.korzen || !stan.korzen.hasAttribute('data-otwarty')) {
          try { b.release(); } catch (e) {}
          return;
        }
        blokadaEkranu = b;
        wakeStan = true;
        b.addEventListener('release', function () { blokadaEkranu = null; });
      }, function () { wakeStan = false; });
    } catch (e) { wakeStan = false; }
    return wakeStan;
  }

  function puscEkran() {
    if (blokadaEkranu) { try { blokadaEkranu.release(); } catch (e) {} }
    blokadaEkranu = null;
    wakeStan = null;
    return wakeStan;
  }

  /* ==================== PRZEJŚCIA WEJŚCIA I WYJŚCIA (D-40.19) ====================
     Wejście: pływająca pigułka ze strony przepisu podjeżdża i ROZWIJA SIĘ w pasek.
     Wyjście: to samo, odtworzone wstecz (`reverse()`).

     TRZY ZASADY, KTÓRE TU RZĄDZĄ — każda z zapłaconej lekcji:

     1. **Animacja NIGDY nie wprowadza interfejsu w stan końcowy.** `otworz()`
        i `zamknijWewn()` robią swoje w całości i natychmiast; to, co tu stoi, jest
        wyłącznie warstwą widoku. Gdyby było odwrotnie, nieprzyjście `finish`
        (karta w tle, przerwana animacja) zostawiałoby tryb w stanie pośrednim.
     2. **Każde sprzątanie ma budzik.** `finished` w karcie bez renderowania może
        nie przyjść nigdy — bo `requestAnimationFrame` i oś czasu dokumentu są tam
        zamrożone. Dlatego `sprzataj` jest idempotentne i woła je ZARÓWNO `finished`,
        JAK I `setTimeout` z zapasem. Dwie drogi do jednego stanu.
     3. **`prefers-reduced-motion: reduce` NIE znaczy „zero animacji".** Znaczy
        „zero ruchu na dużą skalę" — bo to ruch dużych powierzchni przez ekran
        wywołuje mdłości przy zaburzeniach przedsionkowych, a nasz element
        przelatuje przez ~85 % wysokości ekranu, jeszcze się skalując. Przenikanie
        krycia jest bezpieczne i jest zalecanym zamiennikiem, więc przy `reduce`
        zostaje krótkie przenikanie — przejście dalej czyta się jak przejście,
        a nie jak przeskok. Stan końcowy jest identyczny w obu drogach.

     PUŁAPKA WAAPI, ZMIERZONA I OMIJANA NIŻEJ: `easing` podany w OPCJACH EFEKTU
     psuje jawne `offset` — ruch zapisany na .20 → .76 kończył się przy .50.
     Easing należy do KLATKI rozpoczynającej interwał. Druga z tej samej rodziny:
     lista, której ostatni `offset` < 1, przestaje animować za nim (`fill` nie
     ratuje), więc każda lista jest domykana kopią ostatniej klatki na `offset: 1`. */
  var RUCH = {
    trwanie: 1000,      // wejście i wyjście symetrycznie
    krzywa: 'cubic-bezier(.4,0,.2,1)',   // `--mp-mnav-ease`, krzywa domowa serwisu
    /* PRZENIKANIE — droga, którą tryb wchodzi DZIŚ NA KAŻDYM TELEFONIE, nie tylko
       przy `reduce`. Odkąd baner wejściowy chowa `.recipe-floating-cta` (≤ 479 px),
       `pigulkaWejsciowa()` nie ma czego znaleźć i `przejscie()` schodzi tutaj.
       Komentarz mówiący „droga przy `reduce`" opisywał stan sprzed tej zmiany
       i był mylący co do tego, ile ta liczba waży.

       140 ms na przenikaniu PEŁNOEKRANOWYM to nie przejście, to mrugnięcie:
       przy 60 Hz mieści się w ośmiu klatkach, z których pierwsza i ostatnia i tak
       przypadają na skrajne krycia. Zgłoszenie operatora 2026-08-28: „fade in
       trybu jest zbyt gwałtowny".

       Trzy zmiany, każda z powodem:
       1. WEJŚCIE 260 ms. Witryna ma dwa własne czasy przejść — 280 ms (akordeon
          FAQ, `.mp-faq-item__heading`) i 240 ms (`mp-mnav__group-chevron`).
          260 leży między nimi i nie wprowadza czasu spoza serwisu.
       2. WYJŚCIE 160 ms, czyli KRÓTSZE od wejścia. Symetria była wygodą
          implementacji (`reverse()`), nie decyzją: wyjście ma zejść z drogi,
          wejście ma się przedstawić.
       3. KRZYWE ROZDZIELONE. Do dziś obie strony brały `krzywa`
          (`cubic-bezier(.4,0,.2,1)`), która hamuje NA OBU KOŃCACH — na wejściu
          znaczy to, że przez pierwsze klatki prawie nic się nie dzieje, a potem
          wszystko naraz. Wejście dostaje wyhamowanie (`0,0,.2,1` — rusza od
          razu, dochodzi łagodnie), wyjście rozpęd (`.4,0,1,1`).
       `RUCH.trwanie + RUCH.zapas` (budzik sprzątania) zostaje 1300 ms i pokrywa
       obie te liczby z zapasem — nie ma tu drugiej wartości do podniesienia. */
    przenikanie: 260,          // WEJŚCIE
    przenikanieWyjscie: 160,   // WYJŚCIE
    krzywaWejscia: 'cubic-bezier(0,0,.2,1)',
    krzywaWyjscia: 'cubic-bezier(.4,0,1,1)',
    zapas: 300          // ile budzik czeka PONAD czas trwania
  };

  /* DWIE RÓŻNE BRAMKI, i to rozróżnienie jest całą treścią obsługi `reduce`.
     `ruchWolno` pyta o MOŻLIWOŚĆ (czy jest czym animować).
     `duzyRuchWolno` pyta o POZWOLENIE na ruch dużej powierzchni przez ekran.
     Zlanie ich w jedną dawało przy `reduce` ZERO animacji — a to nadmiar:
     `prefers-reduced-motion` prosi o brak RUCHU, nie o brak sprzężenia zwrotnego,
     i przenikanie krycia jest uznanym, bezpiecznym zamiennikiem. */
  function ruchWolno() {
    return !!(global.Element && Element.prototype.animate);
  }
  function duzyRuchWolno() {
    if (!ruchWolno()) return false;
    try { if (global.matchMedia &&
               matchMedia('(prefers-reduced-motion: reduce)').matches) return false; }
    catch (e) { /* brak matchMedia to nie powód, żeby nie animować */ }
    return true;
  }

  /* Źródłem i celem lotu jest pigułka wejściowa ze strony przepisu. Jej widoczność
     zależy od progu przewinięcia i szerokości (`mptogglegotowania`), więc przy
     WYJŚCIU może jej nie być — i to jest normalny stan, nie awaria. */
  function pigulkaWejsciowa() {
    var el = document.querySelector('a[data-mp-gotowanie-toggle]');
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var s = getComputedStyle(el);
    if (s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) return null;
    return { el: el, r: r };
  }

  function klatki(lista) {                       // domknięcie + easing NA KLATKACH
    var k = lista.map(function (x) { var o = {}; for (var q in x) o[q] = x[q]; return o; });
    var ost = k[k.length - 1];
    if (ost.offset != null && ost.offset < 1) {
      var kop = {}; for (var q2 in ost) kop[q2] = ost[q2]; kop.offset = 1; k.push(kop);
    }
    for (var i = 0; i < k.length - 1; i++) if (k[i].easing == null) k[i].easing = RUCH.krzywa;
    return k;
  }

  /* Buduje warstwę widoku przejścia i zwraca `{ grajWstecz, sprzataj }`.
     `wstecz` = true odtwarza tę samą choreografię od końca. */
  function przejscie(wstecz) {
    if (!ruchWolno() || !stan.korzen || !stan.czesci) return null;
    /* Przy `reduce` CELOWO udajemy brak źródła — schodzimy na to samo przenikanie,
       którym obsługujemy „nie ma dokąd lecieć". Jedna droga zapasowa, nie dwie. */
    var zr = duzyRuchWolno() ? pigulkaWejsciowa() : null;
    var korzen = stan.korzen, cz = stan.czesci;
    var belka = cz.belka, etyk = cz.etykieta;
    var przel = korzen.querySelector('.mp-tryb__przelacznik');
    if (!belka || !etyk || !przel) return null;
    var rBel = belka.getBoundingClientRect();
    if (!rBel.width) return null;

    var poza = [cz.top, cz.bottom].filter(Boolean);
    var anims = [], duch = null, sprzatniete = false;
    var zrodloUkryte = false, zrodloWidocznoscPrzed = '';

    function sprzataj() {
      if (sprzatniete) return; sprzatniete = true;
      if (duch && duch.parentNode) duch.parentNode.removeChild(duch);
      if (zrodloUkryte) { zr.el.style.visibility = zrodloWidocznoscPrzed; zrodloUkryte = false; }
      belka.style.opacity = ''; etyk.style.visibility = ''; przel.style.visibility = '';
      korzen.style.backgroundColor = '';
      poza.forEach(function (e) { e.style.opacity = ''; });
      korzen.removeAttribute('data-wyjscie');
    }

    /* DROGA ZAPASOWA — samo przenikanie, zero przelotu i zero skalowania.
       Wchodzi w DWÓCH przypadkach: `prefers-reduced-motion: reduce` oraz brak
       widocznej pigułki wejściowej (próg przewinięcia, szerokość > 479 px).
       Stan końcowy jest identyczny jak przy pełnej animacji. */
    if (!zr) {
      /* Klatki układane WPROST w kierunku odtwarzania, zamiast `reverse()` na
         liście wejściowej. `reverse()` odwraca też krzywą, więc przy rozdzielonych
         easingach nie da się już nim uzyskać wyjścia z rozpędem — dawałoby
         wyhamowanie wejścia odtworzone od tyłu, czyli rozpęd tam, gdzie ma być
         hamowanie. Easing podany JAWNIE na klatce otwierającej interwał przeżywa
         `klatki()`, bo ta dopisuje `RUCH.krzywa` tylko tam, gdzie easingu nie ma. */
      var kl = wstecz
        ? [{ opacity: 1, easing: RUCH.krzywaWyjscia }, { opacity: 0 }]
        : [{ opacity: 0, easing: RUCH.krzywaWejscia }, { opacity: 1 }];
      anims.push(korzen.animate(klatki(kl), {
        duration: wstecz ? RUCH.przenikanieWyjscie : RUCH.przenikanie,
        fill: 'both'
      }));
      return { anims: anims, sprzataj: sprzataj, tryb: 'przenikanie' };
    }

    // ── DUCH: kopia tego, w co użytkownik dotknął ─────────────────────────────
    duch = zr.el.cloneNode(true);
    duch.removeAttribute('data-mp-gotowanie-toggle');   // żeby nie łapał nasłuchu
    duch.removeAttribute('href');
    duch.setAttribute('aria-hidden', 'true');
    duch.className = (duch.className || '') + ' mp-tryb__duch';
    var sZr = getComputedStyle(zr.el);
    duch.style.left = zr.r.left + 'px'; duch.style.top = zr.r.top + 'px';
    duch.style.width = zr.r.width + 'px'; duch.style.height = zr.r.height + 'px';
    duch.style.right = 'auto'; duch.style.bottom = 'auto'; duch.style.transform = 'none';
    duch.style.opacity = '1'; duch.style.margin = '0';
    /* Tekst rozpycha przełącznik na prawo w miarę, jak duch rośnie do paska.
       Po przestawieniu pigułki (D-40.18) tekst JEST pierwszym dzieckiem, więc nie
       ma tu żadnej zamiany stron — jest tylko rozjeżdżanie się. */
    if (duch.firstElementChild) duch.firstElementChild.style.marginRight = 'auto';
    korzen.appendChild(duch);
    /* ZRODLO ZNIKA W TEJ SAMEJ KLATCE, W KTOREJ POWSTAJE DUCH — i to jest cala
       roznica miedzy prototypem a pierwszym wydaniem. Bez tej linii na ekranie sa
       DWIE identyczne pigulki: przez pierwsze 200 ms leza na sobie (widac tylko
       przesuwajace sie oczko ducha), a potem duch odlatuje i odslania oryginal,
       ktory zostaje na dole z oczkiem po lewej. ZMIERZONE na migawce staging:
       duch [143,647] -> [0,0], zrodlo przez cale 1000 ms [143,647], visibility
       „visible". Opisano dokladnie ten obraz: „the dot moves left to
       right, it remains at the bottom of the screen".
       `visibility`, nie `display` — zdjecie z ukladu przesunefoby sasiadow w
       `.recipe-floating-cta`; `visibility` nie przechodzi tez przez `transition`
       klasy `.recipe-toggle` (transform + opacity), wiec znika natychmiast.
       Wartosc sprzed zmiany wraca w `sprzataj()`, ktore idzie dwiema drogami. */
    zrodloWidocznoscPrzed = zr.el.style.visibility;
    zr.el.style.visibility = 'hidden';
    zrodloUkryte = true;

    var pl = parseFloat(sZr.paddingLeft) || 0, pr = parseFloat(sZr.paddingRight) || 0;
    var m = W.margines;

    anims.push(duch.animate(klatki([
      { left: zr.r.left + 'px', top: zr.r.top + 'px',
        width: zr.r.width + 'px', height: zr.r.height + 'px', offset: 0 },
      { left: zr.r.left + 'px', top: zr.r.top + 'px',
        width: zr.r.width + 'px', height: zr.r.height + 'px', offset: .20 },
      { left: '0px', top: '0px', width: rBel.width + 'px', height: rBel.height + 'px', offset: .76 }
    ]), { duration: RUCH.trwanie, fill: 'both' }));
    anims.push(duch.animate(klatki([
      { borderRadius: sZr.borderRadius, boxShadow: sZr.boxShadow,
        borderColor: sZr.borderColor, paddingLeft: pl + 'px', paddingRight: pr + 'px', offset: 0 },
      { borderRadius: sZr.borderRadius, boxShadow: sZr.boxShadow,
        borderColor: sZr.borderColor, paddingLeft: pl + 'px', paddingRight: pr + 'px', offset: .20 },
      { borderRadius: '0px', boxShadow: 'none', borderColor: 'rgba(0,0,0,0)',
        paddingLeft: m + 'px', paddingRight: m + 'px', offset: .76 }
    ]), { duration: RUCH.trwanie, fill: 'both' }));

    /* `D-40.20` · BARWA DUCHA PRZECHODZI W LOCIE, A NIE PO WYLĄDOWANIU.
       Zgłoszenie operatora: pigułka jest beżowa, belka trybu biała, a kolor
       „zmienia się dopiero po wykonaniu przejścia, gwałtownie".
       Tak było, bo duch animował GEOMETRIĘ, promień, cień, obrys i padding —
       ale nie `backgroundColor`. Beż dolatywał na miejsce i dopiero przenikanie
       belki (.76 → .90) podmieniało go na biel. Skok był więc na końcu ruchu,
       czyli dokładnie tam, gdzie oko już odpoczywa.

       DOCELOWA BIEL JEST KRYJĄCA, i to jest tu jedyna nieoczywista decyzja.
       Belka ma `color-mix(--mp-bialy 80%, transparent)` na `blur(8px)`, więc
       kusi, żeby prowadzić ducha do tej samej wartości. Byłby to błąd: korzeń
       dochodzi do pełnego krycia dopiero w .88, więc przez cały przelot duch
       stałby się PRZEŚWITUJĄCY i przez pigułkę widać by było przewijającą się
       stronę. Prowadzimy więc do `--mp-bialy` bez alfy — pigułka zostaje kryjąca
       i zmienia wyłącznie odcień. Biel czytana z korzenia, nie wpisana drugi raz.

       BARWA IDZIE PRZEZ TEN SAM PRZEDZIAŁ CO GEOMETRIA (.20 → .76) I TĄ SAMĄ
       KRZYWĄ — bo prośba brzmiała „stopniowo, WRAZ Z TYM jak porusza się toggle".
       Wspólny przedział i wspólna krzywa znaczą, że postęp barwy równa się
       postępowi położenia: kolor jest sprzężony z ruchem, a nie odmierzany obok
       niego. Pierwsza wersja kończyła barwę w .68, dobranym na oko — pomiar
       pokazał, że przy krzywej domowej biel wypada wtedy już około .60, czyli
       ostatnie 40 % lotu nie niosło żadnej zmiany koloru.
       „Już biały, gdy dociera" wychodzi mimo to SAM: `cubic-bezier(.4,0,.2,1)`
       zwalnia na końcu, więc zaokrąglona wartość osiąga biel przed lądowaniem.
       To jest własność krzywej, nie dobrana liczba — i dlatego nie ma tu offsetu,
       który ktoś musiałby stroić przy każdej zmianie tempa.
       Cofnięcie: usuń tę animację, a barwa wróci do skoku po wylądowaniu. */
    var bialy = (getComputedStyle(korzen).getPropertyValue('--mp-bialy') || '#FFFDFB').trim();
    anims.push(duch.animate(klatki([
      { backgroundColor: sZr.backgroundColor, offset: 0 },
      { backgroundColor: sZr.backgroundColor, offset: .20 },
      { backgroundColor: bialy, offset: .76 }
    ]), { duration: RUCH.trwanie, fill: 'both' }));

    // przełącznik w duchu przechodzi na stan ON — jeśli go znajdziemy
    /* Zieleń czytana Z KORZENIA, nie wpisana drugi raz — jedno źródło wartości. */
    var zielen = (getComputedStyle(korzen).getPropertyValue('--mp-zielen') || '#487622').trim();
    var dTor = duch.querySelector('.toggle'), dOko = duch.querySelector('.toggle__eye');
    if (dTor && dOko) {
      var sTor = getComputedStyle(dTor), pr2 = parseFloat(sTor.paddingRight) || 0;
      var pl2 = parseFloat(sTor.paddingLeft) || 0;
      var skok = dTor.getBoundingClientRect().width - pr2 - pl2 -
                 dOko.getBoundingClientRect().width;
      anims.push(dOko.animate(klatki([
        { transform: 'translateX(0px)', backgroundColor: getComputedStyle(dOko).backgroundColor, offset: 0 },
        { transform: 'translateX(' + Math.max(0, skok) + 'px)', backgroundColor: '#FFFFFF', offset: .26 }
      ]), { duration: RUCH.trwanie, fill: 'both' }));
      anims.push(dTor.animate(klatki([
        { backgroundColor: sTor.backgroundColor, borderColor: sTor.borderColor, offset: 0 },
        { backgroundColor: zielen, borderColor: zielen, offset: .26 }
      ]), { duration: RUCH.trwanie, fill: 'both' }));
    }

    // pasek i jego zawartość odsłaniają się dopiero, gdy duch dojedzie
    belka.style.opacity = '0'; etyk.style.visibility = 'hidden'; przel.style.visibility = 'hidden';
    anims.push(belka.animate(klatki([{ opacity: 0, offset: 0 }, { opacity: 0, offset: .76 },
                                     { opacity: 1, offset: .90 }]),
                             { duration: RUCH.trwanie, fill: 'both' }));
    // biel i treść wchodzą POD przyjeżdżającym paskiem
    anims.push(korzen.animate(klatki([{ backgroundColor: 'rgba(255,253,251,0)', offset: 0 },
                                      { backgroundColor: 'rgba(255,253,251,0)', offset: .42 },
                                      { backgroundColor: 'rgba(255,253,251,1)', offset: .88 }]),
                              { duration: RUCH.trwanie, fill: 'both' }));
    poza.forEach(function (e) {
      anims.push(e.animate(klatki([{ opacity: 0, offset: 0 }, { opacity: 0, offset: .46 },
                                   { opacity: 1, offset: .92 }]),
                           { duration: RUCH.trwanie, fill: 'both' }));
    });
    if (wstecz) anims.forEach(function (a) { a.reverse(); });
    return { anims: anims, sprzataj: sprzataj, tryb: wstecz ? 'wstecz' : 'wprzod' };
  }

  /* Uruchamia przejście i GWARANTUJE sprzątnięcie dwiema niezależnymi drogami. */
  function graj(wstecz, poZakonczeniu) {
    var p = null;
    try { p = przejscie(wstecz); } catch (e) { p = null; }
    if (!p) { if (poZakonczeniu) poZakonczeniu(); return null; }
    var domkniete = false;
    function domknij() {
      if (domkniete) return; domkniete = true;
      p.sprzataj(); if (poZakonczeniu) poZakonczeniu();
    }
    var ostatnia = p.anims[p.anims.length - 1];
    if (ostatnia && ostatnia.finished && ostatnia.finished.then) {
      ostatnia.finished.then(domknij, domknij);       // droga normalna
    }
    setTimeout(domknij, RUCH.trwanie + RUCH.zapas);   // siatka bezpieczeństwa
    return p.tryb;
  }

  function otworz(widok, opcje) {
    opcje = opcje || {};
    zbuduj();
    stan.widok = widok;
    /* Model jest OPCJONALNY i to jest decyzja, nie niedopatrzenie: bez niego widok
       działa w całości poza selektorem porcji, bo `naPorcje` to funkcja modelu. */
    if (opcje.model) stan.model = opcje.model;
    if (opcje.porcje) stan.porcje = opcje.porcje;
    /* D-39.23 — `overflow:hidden` na `<html>` NIE WYSTARCZA i to jest zmierzone,
       nie przypuszczane: przy `documentElement` ustawionym na `hidden` gest
       przewinął stronę do `window.scrollY === 500`. Kontekstem przewijania tej
       strony jest `<body>`, więc blokada musi objąć oba elementy. Poprzednie
       wartości zapamiętujemy osobno — nadpisanie ich na stałe zostawiłoby artykuł
       niedziałający po zamknięciu trybu. */
    /* `D-39.76` — NIE MA CZEGO PRZYWRACAĆ i to jest zamierzone. Odhaczenia żyją
       wyłącznie w pamięci modułu (`zaznaczone`), nie idą do `localStorage`
       (patrz `zapiszSesje`) i są zerowane przy zamknięciu trybu (`zamknijWewn`).
       Otwarcie w tej samej sesji ich NIE cofa — zerowanie wisi na zamknięciu,
       a nie na otwarciu, więc ponowne `otworz()` bez zamknięcia zastaje zbiór
       nietknięty. */
    if (poprzedniOverflow === null) {
      poprzedniOverflow = document.documentElement.style.overflow;
      poprzedniOverflowBody = document.body ? document.body.style.overflow : null;
    }
    document.documentElement.style.overflow = 'hidden';
    if (document.body) document.body.style.overflow = 'hidden';
    stan.korzen.setAttribute('data-otwarty', '');
    /* D-43.1 — przełącznik wraca do stanu ON przy KAŻDYM otwarciu. Szkielet
       overlaya buduje się raz (`zbuduj`) i przeżywa zamknięcie, więc `aria-checked`
       ustawione na `false` przy wyjściu zostałoby na drugie wejście. */
    if (stan.czesci && stan.czesci.przelacznik)
      stan.czesci.przelacznik.setAttribute('aria-checked', 'true');
    /* WEJŚCIEM DOMYŚLNYM JEST EKRAN STARTOWY (poprawka).
       Do tej poprawki `else` szedł prosto w `pokazKrok(opcje.krok || 1)`, więc `ekranStart()`
       był osiągalny WYŁĄCZNIE przez jawne `{ekran:'start'}` — a żaden wywołujący go nie podawał.
       Skutek: „ugotuj" wrzucało użytkownika w środek przepisu, bez zdjęcia, makro, czasu
       i selektora porcji. Reguła jest teraz trójdzielna i wyczerpuje przestrzeń opcji:
         `{ekran:X}`  → ten ekran (nadrzędne, bo najbardziej jawne),
         `{krok:N}`   → wznowienie / link do kroku, świadome ominięcie startu,
         brak obu     → EKRAN STARTOWY.
       Uwaga dla wywołującego: `{krok:1}` NIE jest tym samym co brak opcji i dalej omija
       start — embed wiążący przycisk musi przestać je podawać, żeby poprawka była widoczna. */
    /* D-39.17 — blokada ekranu żyje dokładnie tyle, co otwarty tryb gotowania. */
    trzymajEkran();
    /* D-39.18 · WZNOWIENIE JEST TERAZ OSIĄGALNE Z INTERFEJSU.
       Do tej poprawki `sesja.wznow()` miało JEDYNEGO wywołującego w publicznym API,
       czyli nikogo z interfejsu: sesja zapisywała się poprawnie, ekran `S1` istniał,
       a wejście z przycisku zawsze pokazywało ekran startowy. Trzeci przypadek tej
       samej klasy w tym produkcie, obok minutników (`D-39.14`) i ekranu zakończenia
       (`D-39.13`) — funkcja gotowa, wyzwalacza brak.
       Warunek (, wprost): `S1` pokazuje się **tylko wtedy, gdy
       użytkownik przeszedł już do właściwego gotowania** — zatwierdził porcje
       i wszedł w krok. Test jest darmowy i dokładnie równoważny: `zapiszSesje()`
       ma **jedno** wywołanie w całym pliku, w `pokazKrok()`. Istnienie zapisu
       ZNACZY WIĘC „był na kroku"; samo obejrzenie ekranu startowego nie zapisuje nic.
       Jawne `{ekran:…}` i `{krok:…}` mają pierwszeństwo — wywołujący, który wie,
       czego chce, nie może dostać ekranu, o który nie prosił. */
    var wznowiono = false;
    if (opcje.ekran) { stan.krok = opcje.krok || stan.krok; pokazEkran(opcje.ekran); }
    else if (opcje.krok) pokazKrok(opcje.krok);
    else if (czytajSesje() && wznow()) { wznowiono = true; /* S1 — ekran ustawiony przez `wznow()` */ }
    else pokazEkran('start');
    /* POMIAR stoi PO rozstrzygnięciu ekranu, bo `is_resumed` znane jest dopiero
       tutaj — i PRZED `wejdzDoHistorii()`, żeby otwarcie było zapisane nawet gdy
       wpis historii rzuci.

       `source` NIE bierze się z `mpGotowanie.zrodloWidocznosci`, choć przekazanie
       tak instruowało. ZMIERZONE 2026-08-21 na dwóch różnych drogach wejścia:
       zwykłej i przez QR (`?tryb=gotowanie`) — oba razy `"css"`. To pole mówi,
       DLACZEGO przycisk startu jest widoczny (media query), a nie JAK użytkownik
       wszedł; jako `source` byłoby stałą, czyli właściwością, która nigdy nie
       rozróżni dwóch sesji. Wyprowadzamy je więc z rzeczy, które faktycznie się
       różnią, i wszystkie są tutaj pod ręką. */
    /* D-40.19 — przejście wejścia. Stoi PO zbudowaniu ekranu i PO `data-otwarty`,
       czyli na gotowym, sprawnym trybie: gdyby nie ruszyło, użytkownik dostaje
       ten sam ekran, tylko bez animacji. */
    graj(false, null);
    POMIAR.otwarto({
      steps_total: stan.widok && stan.widok.kroki ? stan.widok.kroki.length : null,
      /* `MP.tryb.porcje()`, nie `mpGotowanie.porcje` — ZMIERZONE 2026-08-21:
         strona pokazywała 4, tryb 2. Selektor strony i selektor trybu to dwie
         różne liczby i tylko druga opisuje to, co użytkownik widzi w overlayu. */
      servings: stan.porcje,
      servings_base: (stan.model && stan.model.porcjeBazowe) ||
                     (global.MP && global.MP.model && global.MP.model.porcjeBazowe) || null,
      source: wznowiono ? 'wznowienie'
            : opcje.ekran ? 'ekran'
            : opcje.krok ? 'krok'
            : /[?&]tryb=gotowanie(?:&|$)/.test(String(global.location && global.location.search || '')) ? 'qr'
            : 'cta',
      is_resumed: wznowiono
    });
    /* NIENARYSOWANE (G11) / F4 / I-09: wpis historii dokładamy PO zbudowaniu widoku. Gdyby szedł przed,
       a budowa rzuciła, w historii zostałby wpis bez overlaya do zamknięcia. */
    wejdzDoHistorii();
    /* NIENARYSOWANE (G11) / F14 / D13 (spec §17, WYMAGANIA §3): klasę loadera zdejmujemy DOPIERO TU —
       po zamontowaniu i wypełnieniu overlaya, nie na `DOMContentLoaded`. Wcześniej
       loader zgasłby przed pierwszą klatką trybu i przebłysk artykułu wróciłby
       tylnymi drzwiami. Bezpiecznik 3 s zostaje przy skrypcie z `<head>` — runtime
       go nie duplikuje, bo dwa timeouty na tę samą klasę to dwie prawdy o tym,
       kto ją zdjął. Nazwa klasy dosłownie ze spec §17. */
    var h = document.documentElement;
    h.className = h.className.replace(/ ?mp-wchodzi-w-gotowanie/g, '');
    return stan.korzen;
  }

  /* `zHistorii` odróżnia zamknięcie wywołane gestem „wstecz" od zamknięcia
     krzyżykiem. Tylko to drugie ma sprzątać po sobie w historii — pierwsze już
     w niej jest. Publiczne `zamknij()` nie przyjmuje argumentu celowo: gdyby
     przyjmowało, każde przypadkowe `zamknij(event)` zostawiałoby wpis. */
  function zamknijWewn(zHistorii) {
    if (!stan.korzen) return;
    /* D-40.19 — przejście wyjścia: TA SAMA choreografia, `reverse()`.
       Uruchamiane PRZED zdjęciem `data-otwarty`, bo musi zmierzyć pasek, póki
       jeszcze stoi. `data-wyjscie` trzyma overlay widocznym na czas animacji,
       ale z `pointer-events:none` — zamknięcie funkcjonalne poniżej dzieje się
       natychmiast i nie czeka na nic.
       Gdy pigułki wejściowej nie ma na ekranie (próg przewinięcia, szerokość
       > 479), `przejscie()` schodzi na samo przenikanie — bo nie ma dokąd lecieć.
       To jest normalny stan, nie awaria. */
    var byloWyjscie = graj(true, null);
    if (byloWyjscie) {
      stan.korzen.setAttribute('data-wyjscie', '');
      setTimeout(function () {
        if (stan.korzen && !stan.korzen.hasAttribute('data-otwarty'))
          stan.korzen.removeAttribute('data-wyjscie');
      }, RUCH.trwanie + RUCH.zapas);
    }
    stan.korzen.removeAttribute('data-otwarty');
    /* D-44.6 — WYJŚCIE PAUZUJE WSZYSTKIE MINUTNIKI. Stoi tu, a nie w `zamknij()`,
       bo obie drogi wyjścia (przełącznik i gest wstecz) schodzą się właśnie tutaj —
       wpięcie wyżej pauzowałoby tylko jedną z nich. */
    pauzujWszystkie();
    puscEkran();   // D-39.17 — blokada nie przeżywa trybu gotowania
    zamknijTooltip();
    zamknijDialog();
    zamknijArkusz();   // D-39.45 — arkusz nie przeżywa zamknięcia trybu
    /* `D-39.76` — odhaczenia NIE PRZEŻYWAJĄ zamknięcia trybu. Stoi obok
       `zamknijArkusz()`, bo obie drogi wyjścia schodzą się właśnie tutaj;
       wpięcie tego w `zamknij()` wyzerowałoby tylko wyjście przełącznikiem,
       a gest wstecz zostawiłby zbiór żywy. */
    zaznaczone = {};
    if (poprzedniOverflow !== null) {
      document.documentElement.style.overflow = poprzedniOverflow;
      /* D-39.23 — przywracamy OBA, w tej samej gałęzi. Rozdzielenie ich na dwa
         warunki dałoby stan, w którym artykuł zostaje zablokowany po zamknięciu
         trybu, i nikt by tego nie powiązał z trybem gotowania. */
      if (document.body) document.body.style.overflow = poprzedniOverflowBody || '';
      poprzedniOverflow = null;
      poprzedniOverflowBody = null;
    }
    if (zHistorii) wpisHistorii = false; else zdejmijZHistorii();
    /* `reason` rozróżnia dokładnie tyle, ile runtime NAPRAWDĘ wie: gest wstecz
       (`nawigacja`) od krzyżyka i „wróć do przepisu" (`user`). Trzeciej wartości
       z przekazania — `uspienie` — nie wystawiamy, bo `zamknijWewn` nie jest
       wołane przy wygaszeniu ekranu; udawanie, że umiemy je rozpoznać, dałoby
       właściwość, która nigdy nie przyjmuje tej wartości. */
    POMIAR.zamknieto(zHistorii ? 'nawigacja' : 'user',
                     stan.widok && stan.widok.kroki ? stan.widok.kroki.length : null,
                     stan.porcje);
  }

  function zamknij() { return zamknijWewn(false); }

  podlaczSiec();
  podlaczWidocznosc();
  podlaczHistorie();

  global.MP = global.MP || {};
  global.MP.tryb = {
    otworz: otworz, zamknij: zamknij, pokazKrok: pokazKrok,
    /* Powierzchnia POMIAROWA instrumentacji — wystawiona po to, żeby wiersze
       matrycy dało się zmierzyć bez sieci, bez PostHoga i bez klikania w baner
       zgody. `dziennik()` zwraca TE SAME obiekty, które poszły do `capture`. */
    pomiar: POMIAR,
    korzen: function () { return stan.korzen; },
    czesci: function () { return stan.czesci; },
    wymiary: W,
    tokeny: TOKENY,
    /* I4 — zbiór ligatur, których runtime FAKTYCZNIE używa, plus adresy subsetu.
       Pomiar czyta stąd, zamiast odtwarzać zbiór z lektury widoków. */
    zbiorLigatur: function () { return LIGATURY.slice(); },
    fontIkon: function () {
      return FONT_IKON.map(function (f) { return { waga: f[0], url: FONT_IKON_BAZA + f[1] }; });
    },
    ostrzezenia: function () { return ostrzezeniaRuntime.slice(); },
    /* `D-39.76` — powierzchnia POMIAROWA odhaczeń, WYŁĄCZNIE DO ODCZYTU.
       `odhacz()` celowo NIE wraca do publicznego API. Wiersz matrycy `D3` pyta,
       czy da się w checkbox TRAFIĆ palcem; wystawiony setter pozwoliłby asercji
       zaświecić się na zielono bez ani jednego trafienia. To ta sama fałszywa
       zieleń, którą wykrył `F2b`: asercja wołała `.click()` na referencji i przez
       trzydzieści przebiegów meldowała sprawność przycisku fizycznie nieklikalnego. */
    zaznaczone: function () { return Object.keys(zaznaczone); },
    lista: przelaczListe,
    listaOtwarta: function () { return stan.listaOtwarta; },
    ekran: pokazEkran,
    ekranTeraz: function () { return stan.ekran; },
    /* D-39.17 — stan blokady ekranu wystawiony do POMIARU, nie do sterowania:
       `null` nie proszono · `true` trzymana · `false` proszono i nie wyszło
       (brak API albo odmowa). Bez tego wiersz matrycy musiałby wnioskować
       o blokadzie z zachowania telefonu, czyli z niczego mierzalnego. */
    wakeLock: function () { return wakeStan; },
    /* F12: produkcja woła bez argumentu przez nasłuch `visibilitychange`;
       pomiar wymusza stan, bo karta pomiarowa jest w tle na stałe. */
    widocznosc: naWidocznosc,
    uspione: function () { return bieglyPrzyUkryciu.slice(); },
    komunikatS5: KOMUNIKAT_S5,
    /* F4: `wpis()` mówi, czy overlay trzyma swój wpis w historii sesji. */
    historia: {
      wpis: function () { return wpisHistorii; },
      wlaczona: historiaWlaczona
    },
    sesja: {
      zapisz: zapiszSesje, czytaj: czytajSesje, zapomnij: zapomnijSesje,
      wznow: wznow, klucz: function () { return KLUCZ + idPrzepisu(); }
    },
    porcje: function (n) { return n == null ? stan.porcje : ustawPorcje(n); },
    zakresPorcji: [PORCJE_MIN, PORCJE_MAX],
    dialog: {
      otworz: otworzDialog,
      zamknij: zamknijDialog,
      el: function () { return dialog ? dialog.el : null; },
      rodzaj: function () { return dialog ? dialog.rodzaj : null; },
      wiersze: function () { return dialog && dialog.wiersze ? dialog.wiersze.slice() : []; }
    },
    offline: {
      pokaz: pokazBaner,
      ukryj: ukryjBaner,
      sprawdz: sprawdzPolaczenie,
      el: function () { return baner; }
    },
    arkusz: {
      otworz: otworzArkusz,
      zamknij: zamknijArkusz,
      el: function () { return arkusz ? arkusz.el : null; },
      otwarty: function () { return !!(stan.korzen && stan.korzen.hasAttribute('data-arkusz')); },
      kopiuj: function () { return kopiujSkladniki(arkusz ? arkusz.kopiuj : null); },
      tekstDoSchowka: tekstDoSchowka
    },
    tooltip: {
      przelacz: przelaczTooltip,
      zamknij: zamknijTooltip,
      el: function () { return tooltip ? tooltip.el : null; },
      stan: function () { return tooltip ? { klucz: tooltip.klucz, flip: tooltip.flip } : null; }
    },
    minutniki: {
      uruchom: uruchomMinutnik,
      pauzuj: pauzujWszystkie,
      wznow: wznowMinutnik,
      zKroku: uruchomZKroku,
      lista: function () { return minutniki.slice(); },
      przelacz: przelacz,
      usun: usun,
      uruchomPonownie: uruchomPonownie,
      wyczysc: wyczyscMinutniki,
      tyk: tyk,
      formatuj: formatOdliczania,
      limit: W.limitMinutnikow
    }
  };
})(typeof window !== 'undefined' ? window : this);
