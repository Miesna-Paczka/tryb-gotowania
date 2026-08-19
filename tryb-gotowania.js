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

  /* U-4 / B24 — ZNAK MARKI INLINE. Slot `.mp-tryb__znak` był policzony co do piksela
     i pusty od przebiegu 29: 51×40 z beżowym wypełnieniem, czyli pudełko zamiast znaku.
     Źródło: Figma `7283:10838`, pobrane przez `download_assets` jako SVG (2026-08-15,
     przeb. 36). Wcześniejsze ogniwo orzekło, że Figma wektora nie odda — to była
     nieprawda o narzędziu: `get_design_context` faktycznie oddaje tylko wygasający
     adres eksportu, ale `download_assets` oddaje plik. Mistrzem jest `znak-byczek.svg`
     w katalogu łańcucha; tu leży jego kopia, bo runtime jedzie na stronę jako JEDEN
     plik i nie ma skąd dociągnąć zasobu.
     Jedna ścieżka, zero `<image>`, zero `<defs>`, `viewBox` 0 0 50.8766 40 — czyli
     dokładnie geometria slotu. Wypełnienie przeniesione na `currentColor`, żeby jeden
     znak obsłużył belkę jasną i ciemną; kolor ustawia CSS na `--mp-atrament` (#3E2B22),
     czyli wartość, którą znak miał w Figmie. */
  var ZNAK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50.8766 40" fill="currentColor"><path d="M49.6896 0.673371C47.7838 2.87349 45.322 4.52025 42.5599 5.44252C42.4265 5.48919 42.2886 5.52253 42.1574 5.57587C40.9143 6.07812 39.5444 6.17145 38.2434 5.84699C35.9173 5.34919 33.56 4.99361 31.1894 4.78249C30.5667 4.72026 29.8173 4.63359 29.1501 4.56025V3.99133C27.9314 3.89577 26.6861 3.84244 25.4719 3.84244H25.4007C24.1865 3.84244 22.9389 3.89355 21.7225 3.99133V4.56025C21.0553 4.63359 20.3036 4.71804 19.681 4.78249C17.3103 4.99139 14.9553 5.34696 12.6269 5.84699C11.3259 6.17145 9.95605 6.07812 8.71292 5.57587C8.58171 5.52253 8.44383 5.48919 8.3104 5.44252C5.55282 4.52025 3.09102 2.87349 1.18518 0.673371C1.00505 0.462248 0.829362 0.251125 0.618096 0C0.177773 0.808934 -0.0334929 1.7201 0.00431254 2.64015C0.042118 4.01133 0.562499 5.32696 1.4765 6.35146C2.3438 7.33152 3.38457 8.1449 4.54542 8.7516C6.10434 9.57387 7.74999 10.2228 9.45346 10.685C9.60023 10.7273 9.74479 10.7873 9.88489 10.8362C11.9486 20.5834 14.0079 30.3061 16.0605 40H25.4385H34.8165C36.8691 30.3061 38.9284 20.5834 40.9921 10.8362C41.1322 10.7873 41.2746 10.7273 41.4236 10.685C43.1248 10.2228 44.7705 9.57387 46.3316 8.7516C47.4924 8.1449 48.5332 7.33152 49.4005 6.35146C50.3145 5.32696 50.8349 4.01133 50.8727 2.64015C50.9083 1.7201 50.697 0.808934 50.2567 0C50.0454 0.251125 49.8697 0.462248 49.6896 0.673371ZM31.4763 35.802H19.3963C17.5705 27.1748 15.7492 18.5699 13.9145 9.90722C16.4897 9.39608 19.0939 9.03161 21.7091 8.81604L21.6824 18.3032L25.3985 16.5743L25.4296 16.5609H25.4341L25.4696 16.5743L29.1857 18.3032L29.159 8.81604C31.7765 9.03161 34.3784 9.39608 36.9536 9.90722C35.1189 18.5699 33.2976 27.1748 31.4718 35.802H31.4763Z"/></svg>';
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
  /* D-39.32 — lista rośnie z 5 na 7. Asercje `B16`/`I4` w harnessie pytają
     `szerLig.length === 5` i po tej zmianie MUSZĄ zostać przebazowane na 7;
     to jest zamierzone przebazowanie zbioru, nie regres. */
  var LIGATURY = ['hourglass', 'local_dining', 'leaderboard',
                'arrow_back', 'arrow_forward',
                'keyboard_arrow_down', 'keyboard_arrow_up',
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
     Wariant (3) rozstrzygnięcia operatora „kształt builda" (2026-08-15): opis migracji
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
    /* Kolor alarmu minutnika. NIE jest tym samym co `--mp-akcent`: INTERAKCJE I-19
       podaje #CF411A dla kropki i ramki pigułki, spec §17 podaje #C8461D dla loadera.
       Zlanie ich byłoby cichym rozstrzygnięciem różnicy, której nikt nie zgłosił. */
    ['--mp-alarm', '#CF411A', 'BRAK zmiennej: najbliższa primary-cta-hover #CF441A, jeden kanał (D-27.1)'],
    /* Dopisane w przebiegu 21 pod sekcję W (wykończenie powierzchni). Trzy uwagi:
       1. `--mp-bialy-pelny` to biel PEŁNA #FFFFFF — witryna ma ją jako `white-bg`
          i to NIE jest `off-white-bg-100%` (#FFFDFB, u nas `--mp-bialy`). Pas dolny
          (W01) jest rysowany bielą pełną, belka — złamaną. Zlanie ich skasowałoby
          różnicę, którą Figma rysuje świadomie.
       2. `--mp-zielen` = `secondary-text` #487622 — jedyne dziś użycie to kreska
          nad pasem dolnym (W02). Figma nazywa ten styl `secondary-text (h1)`;
          w Webflow zmienna nazywa się bez nawiasu i to jej nazwa tu stoi.
       3. `--mp-cta` = `primary-cta` #E55529 — **D-27.1 ROZSTRZYGNIĘTE przez operatora
          2026-08-15: bierzemy kolor z witryny, nie z Figmy.** Do przebiegu 29 stała tu
          figmowa #CF411A z opisem „BRAK zmiennej". Rozjazd był prawdziwy i nie zniknął:
          Figma dalej rysuje #CF411A, a witryna ma #E55529. Rozstrzygnięto go na korzyść
          witryny, bo embed żyje w witrynie i to jej zmienna jest oracle'em wdrożenia.
          UWAGA na sąsiada: `--mp-alarm` ZOSTAJE przy #CF411A (I-19, kropka i obrys
          pigułki) — te dwa tokeny miały do dziś identyczną wartość i rozjechały się
          właśnie teraz. Zlanie ich po tej zmianie skasowałoby różnicę, której nikt
          nie zgłosił, a wyglądałoby na sprzątanie duplikatu. */
    ['--mp-bialy-pelny', '#FFFFFF', 'white-bg'],
    ['--mp-zielen', '#487622', 'secondary-text'],
    ['--mp-cta', '#E55529', 'primary-cta']
  ];

  /* Wymiary z GEOMETRIA.md §4.1 — liczby, nie „mniej więcej". Zmiana którejkolwiek
     jest zmianą wiersza matrycy, nie kosmetyką. */
  var W = {
    belka: 72,        // R4
    paddingTop: 88,   // R1 — 72 belki + 16 odstępu
    margines: 16,     // R1 — kolumna treści przy marginesie 16
    odstep: 16,       // R1 — gap przepływu TOP
    nawigacja: 80,    // §2.1
    celDotyku: 44,    // §2.1 / R13
    lukaCta: 12,      // §2.1 — 72 − (16 + 44)
    torPostepu: 188,  // §1.1 — tor paska postępu w klatce 360
    postepMin: 8,     // §1.1 — kikut na ekranie startowym, nie zero
    /* D-39.38 — odstępy w belce są ASYMETRYCZNE, zmierzone na `7195:10894`
       (znak 16–67 · blok 86–274 · zamknięcie 304–344). NIE jest to `W.odstep`. */
    belkaLukaZnak: 19,        // znak → blok postępu
    belkaLukaZamkniecie: 30,  // blok postępu → przycisk zamknięcia
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

       Zmierzone sondą NA URZĄDZENIU OPERATORA (iPhone 17 Pro Max, Chrome/WebKit,
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
       Po naprawie przewijania zero stało się widoczne i operator zgłosił je
       natychmiast (2026-08-17, wprost: „brak odległości między nav barem
       a rozwiniętą listą, dosłownie 0 px").
       Teraz: `gap` (16) + rozpórka (`--mp-bottom-h`, 80) = 96, więc ostatni piksel
       treści ląduje **16 px nad krawędzią pasa**. Szesnaście, bo to ten sam
       `W.odstep`, który dzieli akapit kroku od bloku składników — odległość
       wskazana przez operatora jako wzorzec. Rytm od dołu jest więc równy rytmowi
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
       idzie na listę decyzji jako [I]: obowiązuje, dopóki operator nie zmierzy
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
       ZWRÓCONY przez `elementFromPoint` otwiera dialog `S2`. */
    '#' + ID + ' .mp-tryb__belka{position:absolute;top:0;left:0;right:0;height:' + W.belka + 'px;' +
      'z-index:2;' +
      /* D-39.28 — belka idzie na `blur(8px)`, tak jak pas dolny (`D-39.24`).
         Rozstrzygnięcie operatora 2026-08-16 na wprost zadane pytanie: oba pasy są
         nav barami, więc oba biorą wykończenie z `.site-nav__links` strony
         (`blur(8px)`, biel złamana 80 % — odczytane [V]).
         **`W09/W10` przestaje obowiązywać w części dotyczącej rozmycia.** Mapowanie
         „promień Figmy / 2 → blur 4" było wnioskiem `[I]`, oznaczonym wtedy jako
         przyjęte do czasu pomiaru na urządzeniu; pomiar żywego nav baru jest tym
         pomiarem i daje 8. Krycie 80 % z tamtego ustalenia zostaje bez zmian —
         ta część się potwierdziła. */
      'box-shadow:none;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
      'background:color-mix(in srgb,var(--mp-bialy) 80%,transparent);' +
      /* D-39.38 · ODSTĘPY BELKI SĄ ASYMETRYCZNE — 19 przed blokiem, 30 za nim.
         Zmierzone 2026-08-17 w ramce 360: runtime dawał **równe 16/16**, a klatka
         `7195:10894` ma znak 16–67, blok 86–274, zamknięcie 304–344, czyli
         **19 i 30**. Znak i przycisk zamknięcia stały prawidłowo, więc całą
         różnicę pochłaniał blok postępu: 203 px zamiast 188.

         Dlatego `gap` znika z belki, a odstępy idą w MARGINESY sąsiadów. Blok
         zostaje `flex:1 1 auto` i to jest świadome: `W.torPostepu` (188) jest
         opisane w GEOMETRIA jako „tor w klatce 360", czyli wartość PRZY tej
         szerokości, nie stała produktu. Przy marginesach 19/30 blok wychodzi
         na 360 dokładnie 188 (360 − 16 − 51 − 19 − 30 − 40 − 16), a na szerszym
         telefonie rośnie sam — czego klatka nie rozstrzyga, bo istnieje tylko
         w jednej szerokości. Sztywne 188 przelewałoby belkę przy 358.
         Cofnięcie: wróć do `gap:W.odstep` i zdejmij oba marginesy. */
      'display:flex;align-items:center;' +
      'padding:0 ' + W.margines + 'px}' +
    /* Beżowe wypełnienie i promień 8 px zdjęte razem z wstawieniem znaku: były
       wypełniaczem slotu, a nie własnością powierzchni. [I] — wniosek z tego, że
       pudełko dokładnie pokrywa się z ramką znaku (51×40 wobec 50,88×40), więc
       beż byłby widoczny wyłącznie w prześwitach ścieżki. NIE zweryfikowane
       odczytem wypełnienia ramki w Figmie — pozycja na liście decyzji. */
    '#' + ID + ' .mp-tryb__znak{width:51px;height:40px;flex:0 0 auto;' +
      'margin-right:' + W.belkaLukaZnak + 'px;' +          // D-39.38
      'color:var(--mp-atrament);line-height:0}' +
    '#' + ID + ' .mp-tryb__znak svg{display:block;width:100%;height:100%}' +
    '#' + ID + ' .mp-tryb__postep-blok{flex:1 1 auto;min-width:0;' +
      'margin-right:' + W.belkaLukaZamkniecie + 'px}' +    // D-39.38
    /* U-3 (defekt zgłoszony przez operatora 2026-08-15, zmierzony w przeb. 28):
       etykieta „krok X z Y" ma być WYŚRODKOWANA nad torem postępu. Miała
       `text-align: start` odziedziczone, a że jej pudełko ma dokładnie szerokość
       toru (x=83 szer=203 przy 360), wyglądała na dosuniętą do lewej krawędzi paska.
       Jedna deklaracja; wiersz matrycy pyta o WYRÓWNANIE, nie o szerokość pudełka. */
    '#' + ID + ' .mp-tryb__etykieta{font-size:12px;line-height:16px;height:16px;margin:0;' +
      'text-align:center}' +
    /* W12 (przeb. 21): tor paska postępu to `beige-1` #F1ECDF, nie `beige-2`
       #C5B18A — beige-2 był o dwa stopnie za ciemny i zjadał kontrast wypełnienia.
       Promień 100 (pigułka), nie 3: przy wysokości 6 px oba wyglądają podobnie,
       ale 3 px to prostokąt z zaokrągleniem, a 100 to kapsuła — i tylko drugie
       jest tym, co rysuje Figma (`7283:10791/10792`). */
    '#' + ID + ' .mp-tryb__tor{height:6px;margin-top:4px;border-radius:100px;' +
      'background:var(--mp-beige-1);overflow:hidden}' +
    '#' + ID + ' .mp-tryb__wypelnienie{height:6px;background:var(--mp-beige-3);' +
      'border-radius:100px;width:0}' +
    /* W11 (przeb. 21): `×` w belce jest KÓŁKIEM z własnym tłem i rozmyciem, nie
       gołym glifem — obrys 1,5 px `primary-cta`, promień 100, tło 80 % + blur 4.
       Obrys jako `border` (nie `outline`, jak w pigułce): tu 40×40 jest wymiarem
       pudełka przy `box-sizing:border-box`, więc border nie rusza układu belki. */
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
    /* SAFE AREA (poprawka 2026-08-15, zgłoszenie operatora). Wzorzec wzięty z ŻYWEJ
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
      /* D-39.24 · PAS DOLNY WG NAV BARU WŁAŚCIWEJ STRONY — polecenie operatora
         2026-08-16: „opacity 80 % i 8 px bluru, analogicznie do nav baru na
         właściwej stronie". **Wzorzec ODCZYTANY, nie przyjęty z opisu:**
         `.site-nav__links` na stronie przepisu ma `backdrop-filter: blur(8px)`
         i `background: rgba(255,253,251,0.8)` [V] — czyli biel ZŁAMANA `--mp-bialy`
         (#FFFDFB) przy 80 %, nie biel pełna.
         **To nadpisuje dwa wcześniejsze ustalenia i zapisuję to wprost, zamiast
         udawać, że ich nie było:** `W01` mówił, że pas dolny jest jednym z dwóch
         miejsc bieli PEŁNEJ, a `W09/W10` przyjęły mapowanie „promień Figmy / 2",
         które dawało blur 4. Operator wskazał inny oracle — żywy nav bar — i ma
         pierwszeństwo przed odczytem z pliku.
         Cień zostaje: nav strony go nie ma, ale pas dolny overlaya oddziela treść
         przewijaną pod spodem, a nie stoi na tle strony. Gdyby miał zniknąć, jest
         to osobna decyzja i osobny wiersz. */
      /* POWIERZCHNIA ZESZŁA STĄD NA PASKI (2026-08-19). Do dziś tło, rozmycie,
         cień i zielona kreska siedziały na całym `BOTTOM`, czyli na sumie stosu
         i paska. Skutek był taki, że kreska wędrowała: przy jednym minutniku
         stała nad kaflem, przy dwóch wyżej — a pas dolny rósł i malał razem
         z liczbą kafli. Operator nazwał to wprost: w krokach pasek ma STAŁĄ
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
    '#' + ID + ' .mp-tryb__pigulka[data-forma="krotka"],' +
    '#' + ID + ' .mp-tryb__pigulka[data-forma="pelna"]{border-radius:12px}' +
    /* Ramka 1,5 px stanu alarmowego jako `outline` z ujemnym offsetem, NIE `border`:
       border zjadłby 3 px z wnętrza (albo dołożył 3 px do wysokości), a wszystkie
       liczby §2.2 są wymiarami pudełka. Outline nie uczestniczy w układzie. */
    '#' + ID + ' .mp-tryb__pigulka[data-stan="ostatnia-minuta"],' +
    '#' + ID + ' .mp-tryb__pigulka[data-stan="koncowka"],' +
    '#' + ID + ' .mp-tryb__pigulka[data-stan="zero"]{' +
      'outline:1.5px solid var(--mp-alarm);outline-offset:-1.5px}' +

    '#' + ID + ' .mp-tryb__pigulka[data-forma="zwinieta"]{height:' + W.pigulka + 'px;' +
      'padding:0 ' + W.wnetrze + 'px;display:flex;align-items:center}' +
    '#' + ID + ' .mp-tryb__pigulka[data-forma="krotka"],' +
    '#' + ID + ' .mp-tryb__pigulka[data-forma="pelna"]{padding:' + W.wnetrze + 'px;' +
      'display:flex;flex-direction:column;gap:' + W.blok + 'px}' +

    '#' + ID + ' .mp-tryb__wiersz-min{display:flex;align-items:center;width:100%;' +
      'border:0;background:transparent;padding:0;cursor:pointer;text-align:left;' +
      'color:inherit;font:inherit}' +
    '#' + ID + ' [data-forma="krotka"] .mp-tryb__wiersz-min,' +
    '#' + ID + ' [data-forma="pelna"] .mp-tryb__wiersz-min{height:' + W.wiersz + 'px;flex:0 0 auto}' +

    /* R11 — oś kropki stoi, rośnie promień: `align-items:center` w wierszu, więc
       środek pionowy jest ten sam przy 8 i przy 12 px. */
    '#' + ID + ' .mp-tryb__kropka{flex:0 0 auto;border-radius:50%;' +
      'width:' + W.kropkaMala + 'px;height:' + W.kropkaMala + 'px;' +
      'margin-right:' + W.kropkaLuka + 'px;background:var(--mp-atrament)}' +
    '#' + ID + ' [data-stan="ostatnia-minuta"] .mp-tryb__kropka,' +
    '#' + ID + ' [data-stan="koncowka"] .mp-tryb__kropka,' +
    '#' + ID + ' [data-stan="zero"] .mp-tryb__kropka{' +
      'width:' + W.kropkaDuza + 'px;height:' + W.kropkaDuza + 'px;background:var(--mp-alarm)}' +
    /* JEDNO TEMPO NA CAŁE 60 s — decyzja operatora 2026-08-19.
       Do dziś puls przyspieszał poniżej 10 s (stan `koncowka`, 0,5 s). Eskalacja
       była w kodzie oznaczona `NIENARYSOWANE (G3, G4)`, czyli WYMYŚLONA: adnotacja
       na klatce `7196:11087` opisuje jeden rytm — „pulsuje raz na sekundę" — dla
       ostatnich 60 s i o drugim progu nie mówi. Zachowanie bez źródła zostało
       zdjęte, zamiast dalej udawać, że coś je uzasadnia.

       Stan `koncowka` ZOSTAJE w modelu: `stanCzasu()` dalej go zwraca, dalej
       jest w atrybucie `data-stan` i dalej dokłada obrys alarmowy. Zniknęła tylko
       różnica TEMPA. Usunięcie stanu byłoby większą zmianą, niż operator zamówił,
       i skasowałoby próg I-20 z matrycy.

       Przy 0:00 puls gaśnie (I-21). Animacja skaluje kropkę, więc jej rozmiar
       mierzy się przez `getComputedStyle` (układ), nie przez
       `getBoundingClientRect` (klatka animacji). */
    '@keyframes mp-tryb-puls{0%,100%{transform:scale(1)}50%{transform:scale(.6)}}' +
    '#' + ID + ' [data-stan="ostatnia-minuta"] .mp-tryb__kropka,' +
    '#' + ID + ' [data-stan="koncowka"] .mp-tryb__kropka{animation:mp-tryb-puls 1s steps(60) infinite}' +
    '#' + ID + ' [data-stan="zero"] .mp-tryb__kropka{animation:none}' +

    /* RAMKA PULSUJE RAZEM Z KROPKĄ. Adnotacja na klatce `7196:11087` mówi wprost:
       „Ostatnie 60 s: kropka rośnie, robi się pomarańczowa i pulsuje raz na
       sekundę — RAMKA MINUTNIKA TEŻ". Runtime animował samą kropkę; ramka miała
       barwę alarmu, ale stała. Zgłoszone przez operatora 2026-08-19.

       Pulsujemy BARWĄ obrysu, nie `transform`: skala na pigułce ruszyłaby całym
       kaflem i rozjechała `stos`, a wszystkie liczby §2.2 są wymiarami pudełka.
       To jest odczyt adnotacji, nie odczyt rysunku — plik nie mówi, CO w ramce
       pulsuje, a barwa jest jedyną własnością, która nie dotyka układu. [I]

       Tempo i wygaszenie przy 0:00 idą za kropką, żeby jedna rzecz nie pulsowała
       w dwóch rytmach. */
    '@keyframes mp-tryb-puls-ramki{0%,100%{outline-color:var(--mp-alarm)}50%{outline-color:transparent}}' +
    '#' + ID + ' .mp-tryb__pigulka[data-stan="ostatnia-minuta"],' +
    '#' + ID + ' .mp-tryb__pigulka[data-stan="koncowka"]{animation:mp-tryb-puls-ramki 1s steps(60) infinite}' +
    '#' + ID + ' .mp-tryb__pigulka[data-stan="zero"]{animation:none}' +

    /* W17: styl `Caption` — DM Sans **Medium (500)**, 14/16, `primary-text`.
       Stopień i interlinia były zgodne; nieustawiona była grubość, czyli jedyna
       z trzech własności, której nie widać na zrzucie bez wpiętego fontu. */
    '#' + ID + ' .mp-tryb__nazwa-min{flex:1 1 auto;min-width:0;overflow:hidden;' +
      'white-space:nowrap;text-overflow:ellipsis;font-size:14px;line-height:16px;' +
      'font-weight:500}' +
    /* R9 — czas prawo-przypięty do krawędzi treści; przy szewronie oddaje 28 px */
    '#' + ID + ' .mp-tryb__odliczanie{flex:0 0 auto;margin-left:auto;' +
      'font-size:24px;line-height:' + W.wiersz + 'px;height:' + W.wiersz + 'px;' +
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
    '#' + ID + ' [data-forma="krotka"] .mp-tryb__odliczanie,' +
    '#' + ID + ' [data-forma="pelna"] .mp-tryb__odliczanie{font-size:34px;' +
      'font-weight:700;line-height:1;height:' + W.wiersz + 'px;' +
      'min-width:96px;text-align:right}' +
    '#' + ID + ' [data-forma="krotka"][data-stan="zero"] .mp-tryb__odliczanie,' +
    '#' + ID + ' [data-forma="pelna"][data-stan="zero"] .mp-tryb__odliczanie{' +
      'color:var(--mp-cta)}' +
    '#' + ID + ' .mp-tryb__szewron{flex:0 0 auto;width:' + W.szewron + 'px;height:22px;' +
      'margin-left:' + W.szewronLuka + 'px;font-size:16px;line-height:22px;text-align:center}' +

    /* W63 (przeb. 25) — podpowiedź w pigułce pełnej (`7240:10923`) jest zwykłą treścią
       `Body small` w `primary-text`, nie tekstem przygaszonym. Runtime dawał `beige-3`.
       Ten sam kształt pomyłki co W60: przygaszenie wpisane tam, gdzie plik go nie rysuje. */
    '#' + ID + ' .mp-tryb__podpowiedz{margin:0;font-size:14px;line-height:19px;' +
      'color:var(--mp-atrament)}' +
    /* W21 (przeb. 21, `7293:10902` „cta — primary"): promień **100**, nie 8 —
       kapsuła, tak samo jak CTA „dalej" (W06). Ósemka była tu tym samym promieniem
       kart treści, co przy pigułce; jedna liczba rozlana po trzech miejscach.
       Tekst: styl `Button` — DM Sans SemiBold **600**, 16/20. */
    /* NIEWYPEŁNIONY — decyzja operatora 2026-08-19 z odczytu Figmy: brzmienie
       „zatrzymaj" jest kanoniczne, ale CTA kafla jest obrysowane, nie wypełnione.
       Runtime malował je atramentem na biało, czyli jak CTA `dalej` w nawigacji —
       i przez to kafel konkurował o uwagę z jedynym przyciskiem, który ma prowadzić
       dalej. Obrys ten sam co `.mp-tryb__ghost`: 1,5 px `beige-3`. */
    '#' + ID + ' .mp-tryb__primary{height:' + W.przycisk + 'px;flex:0 0 auto;' +
      'border:1.5px solid var(--mp-beige-3);' +
      'border-radius:100px;font-weight:600;line-height:20px;' +
      'background:transparent;color:var(--mp-atrament);' +
      'font-size:16px;cursor:pointer;width:100%}' +
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
    /* U-2 (rozstrzygnięcie operatora 2026-08-15): pigułka czasu stoi przy PRAWEJ
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
    /* D-39.15 · ZAKREŚLENIE USUNIĘTE Z PRODUKTU — decyzja operatora 2026-08-16,
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
       przebiegu 31. **Operator rozstrzygnął 2026-08-17 na rzecz aspektu, 16:9.**

       Przesłanka jest zmierzona i to ona czyni z tego USTERKĘ, nie preferencję:
       Figma rysuje 328×150, czyli 2,19:1, ale runtime miał `height:150px` na sztywno
       przy PŁYNNEJ szerokości. Zdjęcie było więc zgodne z projektem **wyłącznie przy
       360 px** i płaszczyło się na każdym szerszym telefonie — przy ekranie 440 px
       kolumna ma 408 px, co daje **2,72:1**. Im lepszy telefon, tym gorszy kadr.
       Zgłoszenie operatora („zwyczajnie za szerokie") opisuje więc dryf, a nie sam
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
       **`D-31.1` ROZSTRZYGNIĘTE 2026-08-17** (operator): wygrywa `D-26.2`, czyli
       aspekt — patrz `D-39.44` przy regule bazowej. Poprzednie brzmienie tego akapitu
       („wysokość zostaje STAŁA, bo inwariant 0aa zabrania miary zależnej od
       szerokości") było zapisem WSTRZYMANIA, nie rozstrzygnięcia, i przestało
       obowiązywać. Modyfikator niesie odtąd wyłącznie promień 12. */
    '#' + ID + ' .mp-tryb__foto--glowne{border-radius:12px}' +
    /* Blok składników na ekranie kroku — W22/W26/W29, Figma `7477:12561` (zewnętrzne)
       i `7195:10935` (ramka). DWA pudełka, nie jedno: zewnętrzne niesie nagłówek
       „składniki" (`7477:12562`) i samo nie ma żadnego wykończenia; wewnętrzne JEST
       ramką — obrys 1 px `beige-2`, promień 12, padding 16, rytm 12 — i nie ma
       WYPEŁNIENIA. Do przebiegu 22 runtime nie rysował tu ani ramki, ani żadnego
       z DWÓCH narysowanych napisów; blok stał nago na tle strony, więc jego brak
       nie miał czym paść — dokładnie ta sama klasa braku co pas dolny (W01/W02). */
    '#' + ID + ' .mp-tryb__blok-skladnikow{display:flex;flex-direction:column;gap:8px}' +
    /* ROZWIJANIE W MIEJSCU (poprawka 2026-08-15, decyzja operatora — zmienia §3.8).
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
       „rozwinięcie listy uniemożliwia przewijanie" (zgłoszenie operatora). */
    '#' + ID + ' .mp-tryb__reszta{overflow:hidden;height:0;display:flex;' +
      'flex:0 0 auto;flex-direction:column;gap:8px}' +
    /* D-39.21 · STAN OTWARTY NIE MOŻE NICZEGO PRZYCIĄĆ — `overflow:visible` obok
       `height:auto`. Zgłoszenie operatora wracało od kilkunastu przebiegów w dwóch
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
       który jej nie dotyczy. **D-39.5 zdejmuje to zawężenie** — operator rozstrzygnął
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
       Decyzja operatora 2026-08-17, wprost: „chcę ten mechanizm. Pusty stan =
       blank, zaznaczony = check_box. Będzie to spójne z resztą projektu".
       **To jest ODSTĘPSTWO OD FIGMY podjęte świadomie**, a nie odczyt — i jest
       jedynym takim miejscem w tym produkcie. `7273:10878` rysuje pudełko 16×16
       (promień 3, obrys 1 px `primary-text`), wypełniane atramentem po zaznaczeniu,
       ze znakiem `✓` w DM Sans SemiBold 10 px BIELĄ w środku. Jednostka 2 z 2026-08-16
       zbadała to i zaleciła zostawienie znaku tekstowego; operator wybrał spójność
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
       (pin w STAN.md). Pozycja decyzyjna operatora, nie zadanie na teraz.

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
    '#' + ID + ' .mp-tryb__ptaszek-glif{display:block;width:16px;height:16px;' +
      'font-size:16px;line-height:16px}' +
    /* Odhaczony w bieżącym kroku = checkbox wypełniony + ✓, BEZ przekreślenia.
       (Dawne NIENARYSOWANE G2; przekreślenie niesie „składnik już zużyty".) */
    /* D-39.4 · ZUŻYTY DOSTAJE OBIE RZECZY NARAZ: wypełniony checkbox ORAZ przekreślenie.
       Rozstrzygnięcie operatora 2026-08-16, wprost: „zużyte wymagają zarówno odhaczenia
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
       ORZEKŁ — polecenie operatora 2026-08-16. Do tej zmiany przekreślenie dostawał
       wyłącznie stan `zużyty` (nadany przez postęp przepisu), a odhaczenie ręczne
       zmieniało tylko pudełko checkboxa. Użytkownik widział więc dwa różne
       wykończenia dla tej samej informacji: „ten składnik jest już użyty".
       To domyka kierunek z `D-39.4`: rozłączne mają być STANY, a nie ich delty
       wizualne. Dawne `G2` („odhaczony BEZ przekreślenia") jest tym samym
       unieważnione w całości — nie zostawiam go jako obowiązującego. */
    '#' + ID + ' .mp-tryb__wiersz[data-stan="zuzyty"] .mp-tryb__nazwa-skl,' +
    '#' + ID + ' .mp-tryb__wiersz[data-odhaczony] .mp-tryb__nazwa-skl{' +
      'text-decoration:line-through}' +
    /* D-39.26 — wiersz z sekcji „zużyte" nie daje się odznaczyć (polecenie
       operatora). Kursor i cel dotyku znikają razem z możliwością kliknięcia,
       inaczej przycisk obiecywałby akcję, której nie wykona. */
    '#' + ID + ' .mp-tryb__wiersz[data-stan="zuzyty"] .mp-tryb__ptaszek{cursor:default}' +
    /* E5 — marker w liście: kropkowane podkreślenie nazwy + kółko `i` ZARAZ ZA
       nazwą (C2, rozstrzygnięcie operatora), odstęp 8 px (§3.14: 182 − 174). */
    '#' + ID + ' .mp-tryb__wiersz[data-mp-zamiennik] .mp-tryb__nazwa-skl{' +
      'text-decoration:underline dotted;text-underline-offset:3px}' +
    /* W48 — kółko `i` (`7473:12562`) jest WYPEŁNIONE zielenią `secondary-text (h1)`
       #487622, BEZ obrysu, a litera jest biała złamana #FFFDFB, DM Sans Medium 500,
       13 px. Runtime rysował dokładnie odwrotność: przezroczyste kółko z obrysem
       `beige-3` i ciemną literą. To nie jest rozjazd o stopień jak W23 czy W41 —
       to inny element wizualny, i przetrwał piętnaście przebiegów, bo sekcja E
       pytała o POŁOŻENIE i cel dotyku (20 px, odstęp 8, hit 44), a o barwy nie
       pytał nikt aż do reguły pokrycia. Wymiar i odstęp zostają: były zmierzone. */
    /* U-7 (rozstrzygnięcie operatora 2026-08-15) — cel tooltipa obejmuje CAŁY WIERSZ,
       nie samo kółko. Zmierzony defekt: wiersz `li` ma 295 px, a klikalne było 20 px
       markera, czyli 7 % szerokości. Marker traci własne `position:relative`, bo jego
       cel musi się odnosić do WIERSZA — dlatego kotwicą jest teraz `li`. */
    '#' + ID + ' .mp-tryb__wiersz[data-mp-zamiennik]{position:relative}' +
    '#' + ID + ' .mp-tryb__marker{position:static;flex:0 0 auto;width:20px;height:20px;' +
      'margin-left:8px;padding:0;border:0;border-radius:100px;' +
      'background:var(--mp-zielen);color:var(--mp-bialy);font-size:13px;line-height:20px;' +
      'font-weight:500;text-align:center;cursor:pointer}' +
    /* NIENARYSOWANE (G9) / R13 — cel dotyku 44×44 przy znaczniku 20 px i wierszu 19–20 px MUSI wyjść
       poza pudełko, inaczej rytm listy (skok 31) przestaje się zgadzać. Realny
       element, nie `::before`: pseudoelementu nie da się zmierzyć asercją, a wiersz
       matrycy E6 pyta dokładnie o wymiar tego celu. */
    '#' + ID + ' .mp-tryb__cel{position:absolute;left:50%;top:50%;width:44px;height:44px;' +
      'transform:translate(-50%,-50%);border-radius:50%}' +
    /* U-7 — cel MARKERA nadpisuje regułę wspólną: pełna szerokość wiersza, wysokość
       120 % kółka `i` (20 → 24), nadmiar 4 px rozłożony po równo nad i pod wierszem
       przez centrowanie na osi pionowej. Dwie rzeczy, o które trzeba tu uważać:
       (1) checkbox ZACHOWUJE własny cel 44×44 i musi zostać NAD nakładką, inaczej
       naprawa jednego gestu psuje drugi — stąd `z-index` na ptaszku; (2) nakładka
       jest dzieckiem `<button>` markera, więc trafienie w nią to trafienie w marker
       i nie trzeba drugiego nasłuchu. Kółko `i` samo w sobie zostaje 20 px (W48). */
    '#' + ID + ' .mp-tryb__marker .mp-tryb__cel{left:0;right:0;top:50%;' +
      'width:auto;height:24px;transform:translateY(-50%);border-radius:0}' +
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
         Rozstrzygnięcie operatora 2026-08-16, wprost: „separatory noszą kolor
         3E2B22". Zdejmuje zawężenie z W25, które malowało atramentem WYŁĄCZNIE
         kreskę wewnątrz ramki składników i zostawiało tę samą kreskę poza ramką
         na beżu — a dwa kolory jednej linii zależnie od kontekstu to właśnie
         zgłoszenie operatora nr 3 („kolory separatorów niespójne").
         Cofnięcie: `var(--mp-beige-2)` z powrotem tutaj oraz przywrócenie
         `border-top-color` w regule zawężonej dwadzieścia linii wyżej. */
      'margin-top:12px;padding:12px 0 0;border:0;border-top:1px solid var(--mp-atrament);' +
      'box-sizing:content-box;background:transparent;cursor:pointer;color:inherit;' +
      'font-size:14px;line-height:19px;text-align:left}' +
    '#' + ID + ' .mp-tryb__wiecej-glif{width:16px;height:22px;' +
      'font-size:16px;line-height:22px;text-align:center}' +

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
    /* Tytuł ekranu (`7195:10902`) — styl **H4**, ten sam co nazwa kroku (W30):
       DM Serif Display Regular 400, 22/1,1, `secondary text (H1)` #487622, WYŚRODKOWANY.
       Stopień 22, nie 32 z fallbacku tokenu: klatka daje węzłowi 328×48, czyli dwa
       wiersze po 24,2 = 22 × 1,1. To trzeci niezależny dowód do D-22.1. */
    '#' + ID + ' .mp-tryb__ekran-tytul{margin:0;font-family:"DM Serif Display",Georgia,serif;' +
      'font-weight:400;font-size:22px;line-height:1.1;color:var(--mp-zielen);text-align:center}' +
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
    /* D-39.42 · „ile porcji?" jest WYŚRODKOWANE i w wadze 500. Zgłoszenie operatora
       2026-08-17, potwierdzone odczytem `7195:10910`: `text-center`, `font-medium`,
       `DM Sans Medium`, `typo/caption` 14 px, interlinia 16, `--primary-text`.
       Runtime miał wyrównanie odziedziczone (`start`) i wagę odziedziczoną (400),
       bo reguła nie ustawiała ani jednego, ani drugiego. Operator zauważył
       wyrównanie; waga to znalezisko z tego samego odczytu — styl `Caption`
       w Figmie jest zdefiniowany jako **500**, nie 400. */
    '#' + ID + ' .mp-tryb__porcje-etykieta{margin:0;font-size:14px;line-height:16px;' +
      'font-weight:500;text-align:center}' +

    /* `D-39.45` · ARKUSZ SKŁADNIKÓW NA EKRANIE STARTOWYM (`S6`).
       Zgłoszenie operatora 2026-08-17: „najpierw pokaż składniki" ma pokazywać listę
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
    /* G01: blok 192 WYŚRODKOWANY w kolumnie treści (68+192+68 = 328 ✓) — środkowanie,
       nie współrzędna x=68, bo kolumna ma pięć szerokości. */
    '#' + ID + ' .mp-tryb__porcje{height:48px;display:flex;justify-content:center}' +
    /* Blok `7195:10911`: wypełnienie `beige-1-bg`, promień 100, padding 4, gap 16.
       Szerokość 192 przy „4 porcje" jest WYNIKIEM (4+40+16+72+16+40+4), nie regułą —
       etykieta ma szerokość treści, a odmiana zmienia ją między „1 porcja" i „7 porcji". */
    '#' + ID + ' .mp-tryb__porcje-blok{height:48px;display:flex;box-sizing:border-box;' +
      'align-items:center;gap:16px;padding:4px;border-radius:100px;' +
      'background:var(--mp-beige-1)}' +
    /* C8 (KONFLIKT OTWARTY): klatka daje ramce `buttons` 40×40, czyli poniżej progu
       44 px. Zostawiamy 40 wg rysunku i NIE dokładamy celu 44 — rozstrzygnięcie
       należy do operatora, a dołożenie celu przesądzałoby je po cichu. */
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
    var znak = el('span', 'mp-tryb__znak', belka);
    znak.setAttribute('aria-hidden', 'true');
    /* `innerHTML` na WŁASNYM, stałym napisie — nie na danych z CMS-u.
       Znak jest dekoracyjny, bo rodzic ma `aria-hidden`; dlatego inline SVG
       nie niesie `role` ani `aria-label`: sprzeczne ARIA to defekt. */
    znak.innerHTML = ZNAK;
    var blok = el('div', 'mp-tryb__postep-blok', belka);
    var etykieta = el('p', 'mp-tryb__etykieta', blok);
    var tor = el('div', 'mp-tryb__tor', blok);
    var wypelnienie = el('div', 'mp-tryb__wypelnienie', tor);
    /* D-39.34 · IKS NA LIGATURĘ `close`, W RODZINIE OUTLINED. Decyzja operatora
       2026-08-17, wprost: „close to dobry wybór, ale potrzebujemy outlined".
       Odczyt Figmy `7473:103100` daje ligaturę `close`, ale w `Material Symbols
       **Rounded**` Medium i kolorze **#000000 bez zmiennej** — czyli w rodzinie,
       której nie mamy w subsecie, i w kolorze, który przeczy całej reszcie pliku
       (wszędzie indziej `--primary-text`). **Znak przyjmuję z Figmy, rodzinę
       i kolor z decyzji operatora** — i zapisuję to rozdzielenie, żeby nikt nie
       odczytał później Outlined jako mojego niedopatrzenia przy odczycie.
       Waga 400 (z `.mp-ikona`), nie 500 z Figmy: reguła `.mp-tryb__zamknij` wagi
       nie ustawia, a jedna waga ikon w całym overlayu jest warta więcej niż
       zgodność z pojedynczym węzłem w obcej rodzinie. Do zmiany jedną linią,
       gdyby operator chciał inaczej. Geometria bez zmian: 40×40, glif 20 px. */
    var zamknij = el('button', 'mp-tryb__zamknij mp-ikona', belka);
    zamknij.type = 'button';
    zamknij.setAttribute('aria-label', 'zamknij tryb gotowania');
    zamknij.textContent = 'close';
    zamknij.setAttribute('data-mp-ligatura', 'close');

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
    /* IKONA, NIE ZNAK (poprawka 2026-08-15, zgłoszenie operatora: „strzałka zdecydowanie
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
       Zgłoszenie operatora 2026-08-16: „przycisk wstecz z pierwszego kroku
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
    /* F2/I-07: `×` w belce NIE zamyka overlaya — otwiera dialog S2. Zamknięcie jest
       o jeden tap dalej i to jest cała treść tego wiersza. Brzmienia są placeholderami
       (pipeline treści, tryb ui); wiersz matrycy dotyczy obecności i zachowania. */
    zamknij.addEventListener('click', function () { otworzDialog('S2'); });
    /* Jeden nasłuch na przycisk, cel zależny od ekranu — zamiast przepinania
       handlerów przy każdym przerysowaniu. Przepinanie było najkrótszą drogą do
       dwóch nasłuchów na tym samym węźle. */
    akcjaPrimary.addEventListener('click', function () { akcjaEkranu('primary'); });
    akcjaGhost.addEventListener('click', function () { akcjaEkranu('ghost'); });

    document.body.appendChild(korzen);
    stan.korzen = korzen;
    stan.czesci = { belka: belka, etykieta: etykieta, tor: tor, wypelnienie: wypelnienie,
                    zamknij: zamknij, top: top, bottom: bottom, stos: stos,
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

  /* Forma kafla: zwinięta 40 · rozwinięta krótka 126 · rozwinięta pełna 198+H.
     NIENARYSOWANE: plik nie mówi, CO decyduje o krótkiej vs pełnej — obie występują
     przy biegnącym minutniku (`7195:11065` 126 i `7211:10893` 236). Jedyna różnica
     w rysunku to obecność podpowiedzi i rzędu ghostów, więc biorę: pigułka jest
     PEŁNA wtedy i tylko wtedy, gdy minutnik ma podpowiedź. Pozycja na liście decyzji. */
  function forma(m) {
    if (!m.rozwinieta) return 'zwinieta';
    return m.podpowiedz ? 'pelna' : 'krotka';
  }

  function rysujKafel(m) {
    var p = m.el.pigulka;
    var f = forma(m);
    p.setAttribute('data-forma', f);
    p.setAttribute('data-stan', m.stan);

    // R10: szewron towarzyszy WYŁĄCZNIE pigułce rozwiniętej pełnej — nie liczbie minutników
    m.el.szewron.hidden = f !== 'pelna';
    m.el.podpowiedz.hidden = f !== 'pelna';
    m.el.primary.hidden = f === 'zwinieta';
    m.el.ghosty.hidden = f !== 'pelna';

    // §3.6 vs §3.9: przy 0:00 rząd ma DWA ghosty po 140, przy biegnącym — jeden pełnej szerokości
    m.el.ghost2.hidden = m.stan !== 'zero';

    // NIENARYSOWANE (G10): brzmienia dostarcza pipeline treści (tryb ui); wiersz
    // matrycy pyta o obecność i zachowanie, nie o brzmienie.
    m.el.primary.textContent = m.stan === 'zero' ? 'uruchom ponownie' : 'zatrzymaj';
    m.el.odliczanie.textContent = formatOdliczania(m.pozostalo);
    m.el.nazwa.textContent = m.nazwa;
    /* D-39.15 — `innerHTML`, nie `textContent`, i to NIE jest rozluźnienie granicy.
       Pole niesie wynik `bezZakreslen()`, czyli tekst ESCAPOWANY i pozbawiony
       znaczników; pod `textContent` encje (`&amp;`, `&quot;`) pokazałyby się
       dosłownie. Zmiana idzie w parze z przejściem na `kryteriumHtml` przy
       `uruchomZKroku` — poprzednio szło tu pole SUROWE i stąd gwiazdki na ekranie. */
    m.el.podpowiedz.innerHTML = m.podpowiedz || '';
    /* D-39.32 — szewron pigułki minutnika też jest ligaturą. Odczyt `7240:10921`
       (wiersz `row` z „duś ragù" i „0:00"): tekst `keyboard_arrow_up`, Outlined
       Regular 16 px, pudełko 16×22 `[V]`. `.mp-tryb__szewron` ma już te wymiary.
       I-16 zostaje: `up` = zwiń; klatki z `down` to dryf Figmy. */
    m.el.szewron.textContent = 'keyboard_arrow_up';
    m.el.szewron.setAttribute('data-mp-ligatura', 'keyboard_arrow_up');
  }

  function tyk() {
    var t = teraz();
    minutniki.forEach(function (m) {
      var pozostalo = m.zatrzymany != null
        ? m.zatrzymany
        : Math.max(0, Math.round((m.koniec - t) / 1000));
      if (pozostalo === m.pozostalo && stanCzasu(pozostalo) === m.stan) return;
      m.pozostalo = pozostalo;
      m.stan = stanCzasu(pozostalo);
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
    m.el.ghost1.textContent = 'dodaj minutę';    // NIENARYSOWANE: brzmienie z pipeline'u treści
    m.el.ghost2.textContent = 'zamknij minutnik';

    // I-15 / I-16: tap wiersza rozwija i zwija ten sam kafel
    wiersz.addEventListener('click', function () { przelacz(m); });
    // I-22 / G10: po 0:00 primary restartuje odliczanie
    m.el.primary.addEventListener('click', function () {
      if (m.stan === 'zero') uruchomPonownie(m);
      else zatrzymaj(m);
    });
    m.el.ghost2.addEventListener('click', function () { usun(m); });
    return p;
  }

  /* AKORDEON: najwyżej JEDEN kafel rozwinięty naraz. Decyzja operatora 2026-08-19,
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

  function uruchomPonownie(m) {
    m.koniec = teraz() + m.sekundy * 1000;
    m.zatrzymany = null;
    tyk();
    przeliczBottom();
    return m;
  }

  function zatrzymaj(m) {
    m.zatrzymany = m.pozostalo;
    return m;
  }

  function usun(m) {
    var i = minutniki.indexOf(m);
    if (i < 0) return null;
    minutniki.splice(i, 1);
    if (m.el.pigulka.parentNode) m.el.pigulka.parentNode.removeChild(m.el.pigulka);
    if (!minutniki.length && interwal) { clearInterval(interwal); interwal = null; }
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
      otworzDialog('S4');
      return null;
    }
    zbuduj();
    var m = {
      nazwa: opcje.nazwa || '',
      sekundy: opcje.sekundy || 0,
      podpowiedz: opcje.podpowiedz || null,
      /* DOMYŚLNIE ROZWINIĘTY. Do 2026-08-19 było odwrotnie (`!!opcje.rozwinieta`),
         więc minutnik odpalony z kroku pokazywał się jako pasek 40 px — a obie
         klatki kroków w projekcie (`7195:11065`, `7211:10893`) rysują kafel
         rozwinięty. `rozwinieta: false` nadal da się podać jawnie. */
      rozwinieta: opcje.rozwinieta !== false,
      koniec: teraz() + (opcje.sekundy || 0) * 1000,
      zatrzymany: null,
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
    return m;
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
     Polecenie operatora 2026-08-17: *„inaczej przepuścimy wewnętrznie sprzeczny
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

    /* `D-39.56/58` · ANI W ARKUSZU, ANI NA KROKU NIE MA KONTROLKI.
       Na kroku stan nadaje postęp przepisu (sekcja „wykorzystane" + przekreślenie);
       w arkuszu nie ma stanu w ogóle, więc wiersz zaczyna się punktorem.

       Punktor rysuje CSS, nie znak i nie glif fontu: kropka nie jest ikoną, więc
       nie ma powodu wołać o nią do subsetu ani wstawiać substytutu Unicode —
       tych właśnie pozbyliśmy się dziś w `D-39.32`–`D-39.36`.

       Ani jedno, ani drugie nie jest `role="checkbox"` i nie ma celu dotyku:
       element, który niczego nie przełącza, nie ma prawa być ogłaszany jako
       kontrolka. Stan niesie nagłówek sekcji i przekreślenie. */
    if (wArkuszu) {
      var punktor = el('span', 'mp-tryb__punktor', li);
      punktor.setAttribute('aria-hidden', 'true');
    } else {
      var ptaszek = el('span', 'mp-tryb__ptaszek', li);
      var ptaszekGlif = el('span', 'mp-tryb__ptaszek-glif mp-ikona', ptaszek);
      ptaszekGlif.textContent =
        stanWiersza === 'zuzyty' ? 'check_box' : 'check_box_outline_blank';
      ptaszekGlif.setAttribute('aria-hidden', 'true');
      ptaszek.setAttribute('aria-hidden', 'true');
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
  function wierszDialoguMinutnika(m) {
    var w = el('div', 'mp-tryb__dialog-min');
    w.setAttribute('data-mp-min', '');
    var nazwa = el('span', 'mp-tryb__dialog-min-nazwa', w);
    nazwa.textContent = m.nazwa || '';
    var czas = el('span', 'mp-tryb__dialog-min-czas', w);
    czas.textContent = formatOdliczania(m.pozostalo < 0 ? m.sekundy : m.pozostalo);
    var koniec = el('button', 'mp-tryb__dialog-min-koniec', w);
    koniec.type = 'button';
    // NIENARYSOWANE: brzmienie „zakończ" jest placeholderem (pipeline treści, tryb ui)
    koniec.textContent = 'zakończ';
    el('span', 'mp-tryb__cel', koniec).setAttribute('aria-hidden', 'true');
    koniec.addEventListener('click', function () { usun(m); zamknijDialog(); });
    return w;
  }

  function otworzDialog(rodzaj) {
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
      : 'Minutniki przestaną odliczać, a postęp przepisu ' +
        'zostaną zapamiętane do następnego razu.';
    /* Wiersze minutników wchodzą MIĘDZY treść a CTA (§3b.1 skład S4), czyli w tym
       samym rytmie 12 px co reszta bloków — dlatego to ten sam szkielet, nie nowy. */
    var wiersze = s4 ? minutniki.map(function (m) {
      var w = wierszDialoguMinutnika(m);
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
    dialog = { el: d, rodzaj: rodzaj, cta: cta, link: link, wiersze: wiersze };
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
    /* D-39.35 · `↻` NA LIGATURĘ `refresh`. Decyzja operatora 2026-08-17.
       Odczyt Figmy `7202:10894` daje tu **wektor SVG 20×20**, a nie font — mimo że
       `refresh` istnieje jako ligatura i jest w subsecie (zmierzone, 20,0 px przy
       kontroli ujemnej 505,6). Zapisuję to jako ODSTĘPSTWO OD FIGMY podjęte przez
       operatora, nie jako odczyt: plik projektowy mówi „wektor", produkt dostaje
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
      bieglyPrzyUkryciu = minutniki.filter(function (m) {
        return m.zatrzymany == null && m.pozostalo > 0;
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
     I-09 ma ZERO reprezentacji w Figmie i jest wymaganiem operatora: na telefonie
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

  /* `D-39.56` · `odhacz()` I ZBIÓR `zaznaczone` USUNIĘTE W CAŁOŚCI.
     Po odebraniu krokom możliwości zaznaczania nie został im ŻADEN zapisujący —
     zbiór byłby pusty zawsze, a funkcja nieosiągalna. Zostawienie ich „na wszelki
     wypadek" byłoby szóstym wystąpieniem wzorca, który w tym pliku wypunktowano
     już pięć razy.

     Co przez to znika i dlaczego wolno: `D-39.27` (persystencja odhaczeń) opisywała
     stan, którego użytkownik już nie tworzy — jej przesłanka zniknęła razem
     z kontrolką. Zapis sesji niesie odtąd `krok` i `porcje`, czyli to, co naprawdę
     jest postępem. Odczyt starych zapisów z polem `zaznaczone` jest bezpieczny:
     nikt go nie czyta.

     Stan „wykorzystane" NIE ZNIKA — nadaje go postęp przepisu (`[data-stan=zuzyty]`,
     liczone przez parser z pierwszego użycia składnika), a nie ręczne odhaczenie. */

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
       Do rozstrzygnięcia przez operatora: czy wyzwalaczem ma być badge, czy osobny
       przycisk. Do tego czasu badge, bo funkcja bez wyzwalacza nie istnieje.

       Krok bez minutnika zostaje `<span>` — element nieinteraktywny nie ma być
       przyciskiem tylko dlatego, że sąsiedni nim jest. */
    var maMinutnik = !!krok.minutnik;
    var czas = el(maMinutnik ? 'button' : 'span', 'mp-tryb__czas', rzad);
    czas.textContent = krok.badge;
    czas.setAttribute('data-stan',
      maMinutnik ? 'minutnik' : (krok.czas === 'bez minutnika' ? 'bez' : 'czas'));
    if (maMinutnik) {
      czas.type = 'button';
      // NIENARYSOWANE brzmienie: pipeline treści (tryb ui)
      czas.setAttribute('aria-label', 'włącz minutnik: ' + (krok.minutnik.nazwa || ''));
      czas.addEventListener('click', function () {
        /* Powtórny tap na tym samym kroku NIE dokłada bliźniaczego kafla. Bez tego
           strażnika dwa tapnięcia zjadałyby cały limit dwóch minutników jednym
           minutnikiem, a trzeci — już cudzy — dostawałby dialog S4 bez powodu.
           Porównanie po nazwie, bo to jedyna cecha, którą krok nadaje kaflowi. */
        var nazwa = krok.minutnik.nazwa || '';
        var juzBiegnie = minutniki.some(function (m) { return m.nazwa === nazwa; });
        if (juzBiegnie) return null;
        return uruchomZKroku(krok);
      });
    }

    var opis = el('p', 'mp-tryb__opis', top);
    opis.innerHTML = krok.tekstHtml || '';    // R14: <mark>, nigdy prostokąt-atrapa

    // R3: zdjęcie i blok składników są NIEZALEŻNIE opcjonalne — brak nie zostawia dziury
    if (krok.fotoUrl) {
      var foto = el('img', 'mp-tryb__foto', top);
      foto.src = krok.fotoUrl;
      foto.alt = '';
    }
    /* `D-39.75` · BLOK SKŁADNIKÓW WYŁĄCZNIE NA KROKACH Z WŁASNYMI SKŁADNIKAMI.
       Decyzja operatora 2026-08-19, po obejrzeniu kroku 1 wołowiny teriyaki na
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
           Zgłoszenie operatora 2026-08-17, wprost: „szewron skierowany w dół,
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
        // NIENARYSOWANE (G5) / I-15 `down` = rozwiń · I-16 `up` = zwiń — dwa glify, nie obrót
        glif.textContent = stan.listaOtwarta ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
        glif.setAttribute('data-mp-ligatura', stan.listaOtwarta ? 'keyboard_arrow_up' : 'keyboard_arrow_down');
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
    /* KRYTERIUM GOTOWOŚCI NIE JEST TREŚCIĄ KROKU (decyzja operatora 2026-08-15).
       Do tego przebiegu render był ZDUBLOWANY: ten akapit plus pole `podpowiedz`
       na pigułce minutnika. Rysunek stawia je wyłącznie na WIDGECIE WŁĄCZONEGO
       minutnika, więc akapit znika, a `uruchomZKroku()` bierze `krok.kryterium`
       jako domyślną podpowiedź. Skutek uboczny wymieniony wprost: krok BEZ minutnika
       traci kryterium całkowicie — to jest wybór operatora, nie przeoczenie. */
    top.scrollTop = 0;
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
      /* D-39.56 — „wykorzystane", nie „zużyte". Polecenie operatora 2026-08-17.
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
      var gl = stan.czesci.wiecej.querySelector('.mp-tryb__wiecej-glif');
      if (tekst) tekst.textContent = nowa ? 'zwiń' : 'zobacz pozostałe';
      if (gl) {                                     // D-39.32 — ligatura, nie substytut
        gl.textContent = nowa ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
        gl.setAttribute('data-mp-ligatura', nowa ? 'keyboard_arrow_up' : 'keyboard_arrow_down');
      }
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
       uniemożliwia przewijanie" — dokładnie zgłoszenie operatora. Ta sama pułapka
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

  function ekranStart(top) {
    zdjecieEkranu(top);
    var t = el('h2', 'mp-tryb__ekran-tytul', top);
    t.textContent = (stan.widok && stan.widok.tytul) || '';
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
    var pyt = el('p', 'mp-tryb__porcje-etykieta', top);
    pyt.textContent = 'ile porcji?';       // NIENARYSOWANE brzmienie: pipeline treści
    var rzad = el('div', 'mp-tryb__porcje', top);
    var blok = el('div', 'mp-tryb__porcje-blok', rzad);
    /* D-39.33 · PORCJE NA LIGATURY — rozstrzygnięte SZABLONEM, nie Figmą, i to na
       wyraźne polecenie operatora („sprawdź, jak to jest na szablonie przepisu:
       jeśli DM Sans — zostaw, jeśli Symbols Outlined — przełącz").
       Zmierzone na żywym szablonie `[V]` 2026-08-17: selektor porcji strony przepisu
       ma `.icon-text` o treści **`remove`** i **`add`**, rodzina
       `"Material Symbols Outlined", Arial, sans-serif`, 16 px, waga **500**,
       kolor `rgb(62,43,34)` = #3E2B22.
       **To jest przypadek, w którym Figma NIE rozstrzyga, bo sama sobie przeczy:**
       węzły `7263:10729/10732` dają znaki U+2212 i U+002B w DM Sans Medium 20 px.
       Gdyby oracle'em była Figma, migracja byłaby regresem — i tak to zaraportowałem
       przed pytaniem. Operator wskazał szablon jako rozstrzygający dla TEJ pary
       i szablon mówi coś innego niż plik projektowy.
       Rozmiar zostaje **20 px**, nie 16 z szablonu: przycisk overlaya ma 40×40
       (`7263:…` = pudełko 40×20), a nie kontrolkę strony. Przenosimy MECHANIZM
       ikony, o który operator pytał, nie skalę cudzego komponentu.
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
       aż do zgłoszenia operatora 2026-08-17. Tekst jest w `7195:11178` jako węzły
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
       Operator zaakceptował korektę tekstu 2026-08-17 („o to chodzi!").
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
    /* D-39.27 · ODHACZENIA IDĄ DO ZAPISU — polecenie operatora 2026-08-16:
       „status zużyte powinien być persystentny, póki użytkownik go nie odznaczy".
       **NIEAKTUALNE od `D-39.56`** — odhaczenia na krokach zniknęły razem
       z kontrolką, więc nie ma czego zapisywać. Akapit zostaje jako zapis
       nieboszczyka: `D-39.27` było słuszne w swoim czasie i przestało mieć
       przedmiot, a nie zostało uchylone jako błędne. */
    /* D-39.56 — zapisujemy POSTĘP, a nie odhaczenia: te ostatnie zniknęły razem
       z kontrolką. Stare zapisy z polem `zaznaczone` czytają się bez błędu, bo
       nikt tego pola nie czyta. */
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

  /* I-30: wznowienie ustawia krok I porcje z zapisu, a potem pokazuje S1 — ekran
     wznowienia MA pokazywać stan, do którego wraca, więc kolejność jest wiążąca. */
  function wznow() {
    var s = czytajSesje();
    if (!s) return null;
    var N = stan.widok ? stan.widok.kroki.length : 0;
    stan.krok = Math.max(1, Math.min(N || s.krok, s.krok));
    if (s.porcje) ustawPorcje(s.porcje);
    pokazEkran('wznowienie');
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

     Schemat: **`instagram://story-camera`**, wybór operatora 2026-08-17 po
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
     w aparat). Test na urządzeniu: 10 sekund, po stronie operatora. */
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

    /* `D-39.46` · DRUGIE CTA „skopiuj składniki" — polecenie operatora 2026-08-17,
       przez analogię do przycisku kopiowania na szablonie przepisu (desktop).
       **Kopiujemy WYŁĄCZNIE NIEODHACZONE** i to nie jest wybór estetyczny:
       podpowiedź arkusza mówi „zaznacz, co masz w domu, reszta zostanie na liście
       zakupów", więc skopiowanie wszystkiego przeczyłoby zdaniu stojącemu 8 px wyżej.
       Ta sama logika co na stronie przepisu.
       `[!]` Szablon nazywa ten przycisk „skopiuj listę zakupów"; operator poprosił
       o „skopiuj składniki". Zostawiam brzmienie operatora i zgłaszam rozjazd —
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
         a nie przechodzi do kroku 1. Zgłoszenie operatora 2026-08-17, makieta `S6`
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
      /* D-39.37 · CTA APARATU WCHODZI DO v1.0 — decyzja operatora 2026-08-17.
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
    if (n === stan.porcje) return stan.porcje;
    stan.porcje = n;
    /* Przeliczenie widoku wymaga MODELU, nie widoku — `naPorcje` jest funkcją
       modelu. Bez modelu selektor dalej działa jako liczba (klikalność, granice),
       ale nie przelicza gramatur: to jawny stan degradacji, nie cicha awaria. */
    if (stan.model && global.MP && global.MP.przepis && global.MP.przepis.naPorcje) {
      stan.widok = global.MP.przepis.naPorcje(stan.model, n);
    }
    if (stan.ekran) pokazEkran(stan.ekran);
    return stan.porcje;
  }

  function pokazEkran(rodzaj) {
    zbuduj();
    zamknijTooltip();
    stan.ekran = rodzaj;
    stan.listaOtwarta = false;
    var top = stan.czesci.top;
    top.textContent = '';
    var cz = stan.czesci;
    var N = stan.widok ? stan.widok.kroki.length : 9;
    if (rodzaj === 'koniec') {
      cz.etykieta.textContent = 'ugotowane';
      ustawPostep(N, N);                       // R5: pasek pełny na zakończeniu
      ekranKoniec(top);
      cz.akcjaPrimary.textContent = 'zrób zdjęcie';      // D-39.37 · `cta — cta` z `7195:11178`
      cz.akcjaGhost.textContent = 'wróć do przepisu';    // D-39.37 · `cta — ghost`
    } else if (rodzaj === 'wznowienie') {
      cz.etykieta.textContent = 'wróć do gotowania';
      ustawPostep(stan.krok, N);
      ekranWznowienie(top);
      cz.akcjaPrimary.textContent = 'wróć do gotowania';
      cz.akcjaGhost.textContent = 'zacznij od nowa';
    } else {
      cz.etykieta.textContent = 'tryb gotowania';
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
    /* D-39.22 · ZMIANA KROKU ZAWSZE ZWIJA LISTĘ — polecenie operatora 2026-08-16,
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
    stan.czesci.etykieta.textContent = 'krok ' + n + ' z ' + N;
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
    /* D-39.27 — odhaczenia wracają z zapisu przy KAŻDYM otwarciu, nie tylko przy
       wznowieniu. Operator powiedział „póki go nie odznaczy", a nie „póki nie wyjdzie":
       gdyby przywracanie wisiało na `wznow()`, wejście przez „zacznij od nowa" albo
       przez jawny `{krok:N}` gubiłoby odhaczenia bez żadnego komunikatu.
       Nie nadpisujemy tego, co już jest w pamięci — otwarcie w tej samej sesji
       nie może cofnąć kliknięcia sprzed sekundy. */
    /* D-39.56 — przywracanie odhaczeń usunięte razem z odhaczeniami. */
    if (poprzedniOverflow === null) {
      poprzedniOverflow = document.documentElement.style.overflow;
      poprzedniOverflowBody = document.body ? document.body.style.overflow : null;
    }
    document.documentElement.style.overflow = 'hidden';
    if (document.body) document.body.style.overflow = 'hidden';
    stan.korzen.setAttribute('data-otwarty', '');
    /* WEJŚCIEM DOMYŚLNYM JEST EKRAN STARTOWY (poprawka 2026-08-15, zgłoszenie operatora).
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
       Warunek operatora (2026-08-16, wprost): `S1` pokazuje się **tylko wtedy, gdy
       użytkownik przeszedł już do właściwego gotowania** — zatwierdził porcje
       i wszedł w krok. Test jest darmowy i dokładnie równoważny: `zapiszSesje()`
       ma **jedno** wywołanie w całym pliku, w `pokazKrok()`. Istnienie zapisu
       ZNACZY WIĘC „był na kroku"; samo obejrzenie ekranu startowego nie zapisuje nic.
       Jawne `{ekran:…}` i `{krok:…}` mają pierwszeństwo — wywołujący, który wie,
       czego chce, nie może dostać ekranu, o który nie prosił. */
    if (opcje.ekran) { stan.krok = opcje.krok || stan.krok; pokazEkran(opcje.ekran); }
    else if (opcje.krok) pokazKrok(opcje.krok);
    else if (czytajSesje() && wznow()) { /* S1 — ekran ustawiony przez `wznow()` */ }
    else pokazEkran('start');
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
    stan.korzen.removeAttribute('data-otwarty');
    puscEkran();   // D-39.17 — blokada nie przeżywa trybu gotowania
    zamknijTooltip();
    zamknijDialog();
    zamknijArkusz();   // D-39.45 — arkusz nie przeżywa zamknięcia trybu
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
  }

  function zamknij() { return zamknijWewn(false); }

  podlaczSiec();
  podlaczWidocznosc();
  podlaczHistorie();

  global.MP = global.MP || {};
  global.MP.tryb = {
    otworz: otworz, zamknij: zamknij, pokazKrok: pokazKrok,
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
