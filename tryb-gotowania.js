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
  var ID_STYL = 'mp-tryb-styl';

  /* Substytuty Unicode ligatur Material Symbols używanych przez pasek meta.
     Znikają razem z B16, gdy font ikon wejdzie do runtime'u — do tego czasu
     tablica jest jedynym miejscem, w którym rozjazd „nazwa ligatury ↔ znak
     zastępczy" jest zapisany raz, a nie rozsypany po widokach. */
  var SUBSTYTUT_GLIFU = {
    hourglass: '⧗',
    local_dining: '♨',
    leaderboard: '▥'
  };

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
       3. `--mp-cta` MA wartość identyczną z `--mp-alarm`, ale w witrynie nie ma
          zmiennej o tej wartości: `primary-cta` = #E55529. To jest rozjazd Figma ↔
          witryna, nie duplikat do usunięcia — pozycja D-27.1, do rozstrzygnięcia
          przez operatora. Do tego czasu opis mówi, czego NIE MA, a nie zgaduje. */
    ['--mp-bialy-pelny', '#FFFFFF', 'white-bg'],
    ['--mp-zielen', '#487622', 'secondary-text'],
    ['--mp-cta', '#CF411A', 'BRAK zmiennej: primary-cta = #E55529, nie #CF411A (D-27.1)']
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
    '#' + ID + ' .mp-tryb__top{position:absolute;inset:0;overflow-y:auto;' +
      '-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;' +
      'gap:' + W.odstep + 'px;' +
      'padding:' + W.paddingTop + 'px ' + W.margines + 'px var(--mp-bottom-h,' + W.nawigacja + 'px)}' +

    /* belka — wyłącznie rozmycie tła, BEZ cienia (C4, zweryfikowane na 29 klatkach) */
    /* W09/W10 (przeb. 21): krycie 80 %, nie 72 %, oraz rozmycie 4 px, nie 12 px.
       Figma podaje BACKGROUND_BLUR o promieniu 8; eksport MCP tłumaczy to na
       `backdrop-blur 4px`, czyli promień/2 — i to jest przyjęte mapowanie, bo
       Figma liczy promień jądra, a CSS `blur()` odchylenie standardowe. Mapowanie
       idzie na listę decyzji jako [I]: obowiązuje, dopóki operator nie zmierzy
       inaczej na urządzeniu. Przedtem runtime miał 12 px, czyli trzykrotność. */
    '#' + ID + ' .mp-tryb__belka{position:absolute;top:0;left:0;right:0;height:' + W.belka + 'px;' +
      'box-shadow:none;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);' +
      'background:color-mix(in srgb,var(--mp-bialy) 80%,transparent);' +
      'display:flex;align-items:center;gap:' + W.odstep + 'px;' +
      'padding:0 ' + W.margines + 'px}' +
    '#' + ID + ' .mp-tryb__znak{width:51px;height:40px;flex:0 0 auto;' +
      'background:var(--mp-beige-2);border-radius:8px}' +
    '#' + ID + ' .mp-tryb__postep-blok{flex:1 1 auto;min-width:0}' +
    '#' + ID + ' .mp-tryb__etykieta{font-size:12px;line-height:16px;height:16px;margin:0}' +
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
    '#' + ID + ' .mp-tryb__bottom{position:absolute;left:0;right:0;bottom:0;' +
      'background:var(--mp-bialy-pelny);' +
      'box-shadow:0 -1px 2px 0 rgba(62,43,34,.05),0 -4px 8px -2px rgba(62,43,34,.10)}' +
    /* W02 (przeb. 21): kreska 1 px `secondary-text (h1)` #487622 nad pasem dolnym.
       PSEUDOELEMENT, nie `border-top` — i to nie jest ozdobnik implementacyjny.
       `BOTTOM` nie ma zadanej wysokości: wg reguły składania (INTERAKCJE §4.1)
       jest sumą stosu i paska nawigacji, więc `border-top` przy `box-sizing:
       border-box` dołożyłby 1 px do KAŻDEJ z wysokości 80/132/218/266 i wywrócił
       wiersz B7. W Figmie obrys jest rysowany wewnątrz ramki i nie zmienia jej
       wysokości; `::before` jest jedynym odpowiednikiem, który tak samo nie
       uczestniczy w układzie. Ta sama logika, co `outline` zamiast `border`
       na pigułce alarmowej. Pomiar: `getComputedStyle(bottom,"::before")`. */
    '#' + ID + ' .mp-tryb__bottom::before{content:"";position:absolute;top:0;' +
      'left:0;right:0;height:1px;background:var(--mp-zielen)}' +
    '#' + ID + ' .mp-tryb__nawigacja{height:' + W.nawigacja + 'px;display:flex;align-items:flex-start;' +
      'padding:' + ((W.nawigacja - W.celDotyku) / 2) + 'px ' + W.margines + 'px;gap:' + W.lukaCta + 'px}' +
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
    /* NIENARYSOWANE (G3, G4) + I-19/I-20/I-21: eskalacja TEMPEM, nie barwą; przy 0:00 puls gaśnie.
       Animacja skaluje kropkę, więc jej rozmiar mierzy się przez `getComputedStyle`
       (układ), nie przez `getBoundingClientRect` (klatka animacji). */
    '@keyframes mp-tryb-puls{0%,100%{transform:scale(1)}50%{transform:scale(.6)}}' +
    '#' + ID + ' [data-stan="ostatnia-minuta"] .mp-tryb__kropka{animation:mp-tryb-puls 1s steps(60) infinite}' +
    '#' + ID + ' [data-stan="koncowka"] .mp-tryb__kropka{animation:mp-tryb-puls .5s steps(30) infinite}' +
    '#' + ID + ' [data-stan="zero"] .mp-tryb__kropka{animation:none}' +

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
    '#' + ID + ' .mp-tryb__primary{height:' + W.przycisk + 'px;flex:0 0 auto;border:0;' +
      'border-radius:100px;font-weight:600;line-height:20px;' +
      'background:var(--mp-atrament);color:var(--mp-bialy);' +
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
    '#' + ID + ' .mp-tryb__czas{align-self:flex-start;height:26px;padding:0 12px;' +
      'border-radius:13px;font-size:14px;line-height:26px;background:var(--mp-beige-1);' +
      'color:var(--mp-atrament)}' +
    /* „bez minutnika" ma zmierzony MNIEJSZY stopień pisma (16 px wysokości tekstu
       wobec 19 przy „ok. 8 min") — potwierdzone dwoma niezależnymi pomiarami
       w Figmie, pozycja na liście decyzji „zostawić czy ujednolicić". Odwzorowuję
       plik, bo hierarchia prawdy każe iść za pomiarem, nie za intuicją. */
    '#' + ID + ' .mp-tryb__czas[data-stan="bez"]{font-size:12px;color:var(--mp-beige-3)}' +

    '#' + ID + ' .mp-tryb__opis{margin:0;font-size:16px;line-height:24px}' +
    /* W53/W54 (przeb. 25) — zakreślenie `<mark>` jest CIEMNE z wybitym tekstem, nie
       jasne. Klatka SPEC §3.13 `7229:10893`: prostokąt `marker — cel koloru`
       (`7231:10894`) ma wypełnienie `primary text` #3E2B22 z `mix-blend-multiply`,
       a zakreślona fraza jest w niej związana z `white full bg` #FFFFFF — nie surową
       bielą, tylko ZMIENNĄ, więc to decyzja projektowa, nie sztuczka makiety.
       Runtime rysował dotąd odwrotność: tło `beige-1` #F1ECDF i tekst odziedziczony
       `--mp-atrament`, czyli ciemne na jasnym.
       `mix-blend-multiply` NIE przechodzi do CSS-a: w Figmie prostokąt leży POD
       tekstem i mnoży się z podłożem, u nas `<mark>` ZAWIERA tekst, więc blend
       zmieszałby też wybitą biel z tłem i skasował ją. Multiply #3E2B22 na
       `white-off-bg` #FFFDFB daje (61,5 · 42,7 · 33,5) ≈ #3E2B22, więc płaskie
       wypełnienie odtwarza skutek co do zaokrąglenia. Mierzymy SKUTEK, nie mechanizm. */
    '#' + ID + ' .mp-tryb__opis mark{background:var(--mp-atrament);' +
      'color:var(--mp-bialy-pelny);' +
      '-webkit-box-decoration-break:clone;box-decoration-break:clone}' +   /* R14 */
    '#' + ID + ' .mp-tryb__foto{width:100%;height:150px;object-fit:cover;border-radius:8px;display:block}' +
    /* Blok składników na ekranie kroku — W22/W26/W29, Figma `7477:12561` (zewnętrzne)
       i `7195:10935` (ramka). DWA pudełka, nie jedno: zewnętrzne niesie nagłówek
       „składniki" (`7477:12562`) i samo nie ma żadnego wykończenia; wewnętrzne JEST
       ramką — obrys 1 px `beige-2`, promień 12, padding 16, rytm 12 — i nie ma
       WYPEŁNIENIA. Do przebiegu 22 runtime nie rysował tu ani ramki, ani żadnego
       z DWÓCH narysowanych napisów; blok stał nago na tle strony, więc jego brak
       nie miał czym paść — dokładnie ta sama klasa braku co pas dolny (W01/W02). */
    '#' + ID + ' .mp-tryb__blok-skladnikow{display:flex;flex-direction:column;gap:8px}' +
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
       W25: kreska pod listą SKRÓCONĄ jest `primary-text`. Zawężenie jest tu równie
       świadome: kreska listy PEŁNEJ to inny węzeł Figmy (`.mp-tryb__linia`), nieczytany
       — nie wolno jej przemalować odczytem, który jej nie dotyczy. */
    '#' + ID + ' .mp-tryb__ramka-skladnikow .mp-tryb__wiecej{margin-top:0;' +
      'border-top-color:var(--mp-atrament)}' +
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
    '#' + ID + ' .mp-tryb__ptaszek{position:relative;flex:0 0 auto;width:16px;height:16px;' +
      'margin-right:8px;padding:0;border:1px solid var(--mp-atrament);border-radius:3px;' +
      'background:transparent;cursor:pointer;font-size:10px;line-height:15px;font-weight:600;' +
      'color:transparent;text-align:center}' +
    /* NIENARYSOWANE (G2): odhaczony w bieżącym kroku = checkbox wypełniony + ✓, BEZ przekreślenia.
       Przekreślenie niesie „składnik już zużyty" i zlanie obu odbiera stan S1 czytelność. */
    '#' + ID + ' .mp-tryb__wiersz[data-odhaczony] .mp-tryb__ptaszek{' +
      'background:var(--mp-atrament);border-color:var(--mp-atrament);color:var(--mp-bialy-pelny)}' +
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
    '#' + ID + ' .mp-tryb__wiersz[data-stan="zuzyty"] .mp-tryb__nazwa-skl{' +
      'text-decoration:line-through}' +
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
    '#' + ID + ' .mp-tryb__marker{position:relative;flex:0 0 auto;width:20px;height:20px;' +
      'margin-left:8px;padding:0;border:0;border-radius:100px;' +
      'background:var(--mp-zielen);color:var(--mp-bialy);font-size:13px;line-height:20px;' +
      'font-weight:500;text-align:center;cursor:pointer}' +
    /* NIENARYSOWANE (G9) / R13 — cel dotyku 44×44 przy znaczniku 20 px i wierszu 19–20 px MUSI wyjść
       poza pudełko, inaczej rytm listy (skok 31) przestaje się zgadzać. Realny
       element, nie `::before`: pseudoelementu nie da się zmierzyć asercją, a wiersz
       matrycy E6 pyta dokładnie o wymiar tego celu. */
    '#' + ID + ' .mp-tryb__cel{position:absolute;left:50%;top:50%;width:44px;height:44px;' +
      'transform:translate(-50%,-50%);border-radius:50%}' +
    '#' + ID + ' .mp-tryb__kryterium{margin:0;font-size:14px;line-height:20px;color:var(--mp-beige-3)}' +

    /* Wywoływacz pełnej listy w liście skróconej (§3.2): linia 1 px, rytm 12 px
       po obu jej stronach, wiersz 22 px = tekst 19 + glif 16×22.
       NIENARYSOWANE (G7): etykieta jest placeholderem — cel jest narysowany, brzmienie nie. */
    /* W27 — rozkład wiersza to `space-between` (`7209:10899`), nie „glif dopchnięty
       marginesem". Wynik na ekranie ten sam, ale wiersz matrycy pyta o ROZKŁAD,
       a `margin-left:auto` daje `justify-content: normal` i pytanie zostaje bez
       odpowiedzi. Tam, gdzie Figma nazywa regułę, runtime ma nazywać ją tak samo. */
    '#' + ID + ' .mp-tryb__wiecej{display:flex;align-items:center;' +
      'justify-content:space-between;width:100%;height:22px;' +
      'margin-top:12px;padding:12px 0 0;border:0;border-top:1px solid var(--mp-beige-2);' +
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
    '#' + ID + ' .mp-tryb__porcje-etykieta{margin:0;font-size:14px;line-height:16px}' +
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
    var blok = el('div', 'mp-tryb__postep-blok', belka);
    var etykieta = el('p', 'mp-tryb__etykieta', blok);
    var tor = el('div', 'mp-tryb__tor', blok);
    var wypelnienie = el('div', 'mp-tryb__wypelnienie', tor);
    var zamknij = el('button', 'mp-tryb__zamknij', belka);
    zamknij.type = 'button';
    zamknij.setAttribute('aria-label', 'zamknij tryb gotowania');
    zamknij.textContent = '×';

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
    wstecz.textContent = '←';
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
    dalejGlif.textContent = '→';
    dalejGlif.setAttribute('aria-hidden', 'true');

    /* Scrim dialogów PO `bottom` w drzewie — F6: BOTTOM zostaje, tylko pod nim. */
    var scrimDialogu = el('div', 'mp-tryb__scrim', korzen);
    var scrim = el('div', 'mp-tryb__scrim-poziom', korzen);
    // NIENARYSOWANE: brzmienie tekstu dostarcza pipeline treści (tryb ui)
    scrim.textContent = 'obróć telefon';

    // NIENARYSOWANE (G1) / I-04/I-05: krok → krok wyłącznie tapem, bez swipe.
    // Luka rozstrzygnięta ZANIECHANIEM: dowodem jest asercja negatywna sekcji H
    // (`touchstart`/`pointerdown`/`swipe` 0 ×), nie sam ten znacznik.
    dalej.addEventListener('click', function () { pokazKrok(stan.krok + 1); });
    wstecz.addEventListener('click', function () { pokazKrok(stan.krok - 1); });
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
    m.el.podpowiedz.textContent = m.podpowiedz || '';
    m.el.szewron.textContent = '⌃';   // I-16: `up` = zwiń; klatki z `down` to dryf Figmy
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
      szewron: el('span', 'mp-tryb__szewron', wiersz),
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

  function przelacz(m) {
    m.rozwinieta = !m.rozwinieta;
    rysujKafel(m);
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
      rozwinieta: !!opcje.rozwinieta,
      koniec: teraz() + (opcje.sekundy || 0) * 1000,
      zatrzymany: null,
      pozostalo: -1,
      stan: 'w-toku',
      el: null
    };
    stan.czesci.stos.appendChild(zbudujKafel(m));
    minutniki.push(m);   // C14: drugi kafel dokłada się do `stos`, nie zastępuje pierwszego
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
      podpowiedz: opcje.podpowiedz || null,
      rozwinieta: !!opcje.rozwinieta
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
  var zaznaczone = Object.create(null);

  function wierszSkladnika(s, krok, stanWiersza) {
    var li = el('li', 'mp-tryb__wiersz');
    li.setAttribute('data-mp-klucz', s.key);
    li.setAttribute('data-stan', stanWiersza);          // teraz · dalej · zuzyty
    if (zaznaczone[s.key]) li.setAttribute('data-odhaczony', '');

    var ptaszek = el('button', 'mp-tryb__ptaszek', li);
    ptaszek.type = 'button';
    ptaszek.textContent = '✓';
    ptaszek.setAttribute('role', 'checkbox');
    ptaszek.setAttribute('aria-checked', zaznaczone[s.key] ? 'true' : 'false');
    ptaszek.setAttribute('aria-label', s.etykieta);
    el('span', 'mp-tryb__cel', ptaszek).setAttribute('aria-hidden', 'true');
    ptaszek.addEventListener('click', function () { odhacz(s.key); });

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
    var x = el('button', 'mp-tryb__tooltip-zamknij', glowa);
    x.type = 'button';
    x.textContent = '×';
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
      : 'Minutniki przestaną odliczać, a zaznaczone składniki ' +
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
    var glif = el('span', 'mp-tryb__baner-glif', akcja);
    glif.textContent = '↻';
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
      bieglyPrzyUkryciu = minutniki.filter(function (m) {
        return m.zatrzymany == null && m.pozostalo > 0;
      });
      return null;
    }

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

  function odhacz(key, wartosc) {
    var nowa = wartosc == null ? !zaznaczone[key] : !!wartosc;
    if (nowa) zaznaczone[key] = true; else delete zaznaczone[key];
    if (stan.korzen) {
      Array.prototype.forEach.call(
        stan.korzen.querySelectorAll('.mp-tryb__wiersz[data-mp-klucz="' + key + '"]'),
        function (li) {
          if (nowa) li.setAttribute('data-odhaczony', ''); else li.removeAttribute('data-odhaczony');
          var p = li.querySelector('.mp-tryb__ptaszek');
          if (p) p.setAttribute('aria-checked', nowa ? 'true' : 'false');
        });
    }
    return nowa;
  }

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
    var czas = el('span', 'mp-tryb__czas', rzad);
    czas.textContent = krok.badge;
    czas.setAttribute('data-stan',
      krok.minutnik ? 'minutnik' : (krok.czas === 'bez minutnika' ? 'bez' : 'czas'));

    var opis = el('p', 'mp-tryb__opis', top);
    opis.innerHTML = krok.tekstHtml || '';    // R14: <mark>, nigdy prostokąt-atrapa

    // R3: zdjęcie i blok składników są NIEZALEŻNIE opcjonalne — brak nie zostawia dziury
    if (krok.fotoUrl) {
      var foto = el('img', 'mp-tryb__foto', top);
      foto.src = krok.fotoUrl;
      foto.alt = '';
    }
    if (krok.skladnikiTeraz && krok.skladnikiTeraz.length) {
      /* W26/W29 — DWA napisy, obydwa narysowane w Figmie i obydwa nieobecne
         w runtimie do przebiegu 22: nagłówek „składniki" (`7477:12562`) NAD ramką
         i etykieta „w tym kroku" (`7195:10936`) W ramce. To nie jest microcopy
         placeholderowe: brzmienia są w pliku, więc idą do kodu wprost. */
      var blok = el('div', 'mp-tryb__blok-skladnikow', top);
      el('p', 'mp-tryb__naglowek-skladnikow', blok).textContent = 'składniki';
      var ramka = el('div', 'mp-tryb__ramka-skladnikow', blok);
      el('p', 'mp-tryb__etykieta-sekcji', ramka).textContent = 'w tym kroku';
      var lista = el('ul', 'mp-tryb__skladniki', ramka);
      krok.skladnikiTeraz.forEach(function (s) {
        lista.appendChild(wierszSkladnika(s, krok, 'teraz'));
      });
      /* D5: lista skrócona pokazuje WYŁĄCZNIE „w tym kroku"; reszta jest o jeden tap
         dalej. NIENARYSOWANE (G7) / D7: cel prowadzi do listy PEŁNEJ (wszystkie trzy sekcje) —
         zmieniamy etykietę, nie cel, więc tekst jest tu placeholderem. */
      var wiecej = el('button', 'mp-tryb__wiecej', ramka);
      wiecej.type = 'button';
      el('span', 'mp-tryb__wiecej-tekst', wiecej).textContent = 'zobacz pozostałe';
      var glif = el('span', 'mp-tryb__wiecej-glif', wiecej);
      glif.textContent = '⌄';                  // NIENARYSOWANE (G5) / I-15: `down` = rozwiń
      glif.setAttribute('aria-hidden', 'true');
      wiecej.addEventListener('click', function () { przelaczListe(); });
    }
    if (krok.kryteriumHtml) {
      var kr = el('p', 'mp-tryb__kryterium', top);
      kr.innerHTML = krok.kryteriumHtml;
    }
    top.scrollTop = 0;
  }

  /* Pełna lista (§3.8) jest INNĄ TREŚCIĄ TOP-u, nie panelem nad nim: klatka
     kanoniczna ma w TOP wyłącznie wiersz nagłówka i listę. Dzięki temu przewijanie
     listy (D10) jest tym samym przewijaniem, co przewijanie kroku — natywnym,
     bez własnego toru. */
  function rysujListe(krok) {
    var top = stan.czesci.top;
    top.textContent = '';

    var czas = el('span', 'mp-tryb__czas', top);
    czas.textContent = krok.badge;
    czas.setAttribute('data-stan',
      krok.minutnik ? 'minutnik' : (krok.czas === 'bez minutnika' ? 'bez' : 'czas'));

    var lista = el('div', 'mp-tryb__lista', top);
    lista.setAttribute('data-mp-lista-pelna', '');

    /* D2: przynależność do sekcji niesie NAGŁÓWEK + LINIA + KOLEJNOŚĆ, nie styl
       wiersza. Dlatego sekcje różnią się tu tylko obudową, a `dalej` ma dokładnie
       ten sam wygląd wiersza co `teraz` (D1 — dwa stany, nie trzy). */
    var sekcje = [
      ['w tym kroku', krok.skladnikiTeraz || [], 'teraz'],
      ['dalej', krok.skladnikiDalej || [], 'dalej'],
      ['zużyte', krok.skladnikiZuzyte || [], 'zuzyty']
    ];
    var pierwsza = true;
    sekcje.forEach(function (sek) {
      if (!sek[1].length) return;
      if (!pierwsza) el('div', 'mp-tryb__linia', lista);
      pierwsza = false;
      var h = el('p', 'mp-tryb__naglowek-sekcji', lista);
      h.textContent = sek[0];
      var ul = el('ul', 'mp-tryb__skladniki', lista);
      sek[1].forEach(function (s) { ul.appendChild(wierszSkladnika(s, krok, sek[2])); });
    });

    // NIENARYSOWANE (G5) / D9: zamknięcie tym samym celem dotyku co otwarcie; glif obraca się
    var wiecej = el('button', 'mp-tryb__wiecej', lista);
    wiecej.type = 'button';
    el('span', 'mp-tryb__wiecej-tekst', wiecej).textContent = 'zobacz pozostałe';
    var glif = el('span', 'mp-tryb__wiecej-glif', wiecej);
    glif.textContent = '⌃';                    // NIENARYSOWANE (G5) / I-16: `up` = zwiń
    glif.setAttribute('aria-hidden', 'true');
    wiecej.addEventListener('click', function () { przelaczListe(); });

    top.scrollTop = 0;
  }

  function przelaczListe(wartosc) {
    stan.listaOtwarta = wartosc == null ? !stan.listaOtwarta : !!wartosc;
    pokazKrok(stan.krok);
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

  function zdjecieEkranu(rodzic) {
    var url = stan.widok && stan.widok.fotoUrl;
    if (!url) return null;                 // R3: brak zdjęcia nie zostawia dziury
    var f = el('img', 'mp-tryb__foto', rodzic);
    f.src = url;
    f.alt = '';
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
      var g = el('span', 'mp-tryb__meta-glif', kol);
      /* Substytut Unicode w miejsce ligatury subsetu — ta sama droga co `⌄`, `←`, `→`.
         Nazwa prawdziwej ligatury zostaje w `data-mp-ligatura`, żeby migracja (B16)
         i pomiar zbioru używanych ligatur (I4) nie musiały czytać kodu. */
      g.textContent = SUBSTYTUT_GLIFU[m.glif] || '·';
      g.setAttribute('data-mp-ligatura', m.glif || '');
      g.setAttribute('aria-hidden', 'true');
      el('span', 'mp-tryb__meta-wartosc', kol).textContent = m.wartosc || '';
    });
    if (!meta.children.length) meta.hidden = true;
    var pyt = el('p', 'mp-tryb__porcje-etykieta', top);
    pyt.textContent = 'ile porcji?';       // NIENARYSOWANE brzmienie: pipeline treści
    var rzad = el('div', 'mp-tryb__porcje', top);
    var blok = el('div', 'mp-tryb__porcje-blok', rzad);
    var minus = el('button', 'mp-tryb__porcje-krok', blok);
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'mniej porcji');
    var ile = el('span', 'mp-tryb__porcje-ile', blok);
    ile.setAttribute('data-mp-porcje', '');
    var plus = el('button', 'mp-tryb__porcje-krok', blok);
    plus.type = 'button';
    plus.textContent = '+';
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
    ogon.textContent = 'minutniki nie odliczały w tle, a zaznaczone składniki czekają.';
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
    nagl.textContent = 'pochwal się';        // NIENARYSOWANE brzmienie: pipeline treści
    var lista = el('div', 'mp-tryb__karta-lista', karta);
    /* WYM §6 / C6 (H10 · H11): wariant v1.0 zakończenia jest BEZ mechaniki −70 zł.
       Runtime nie czyta kwoty zniżki, nie renderuje uploadu zdjęcia i nie zna słowa
       „rabat" — trzy wiersze to instrukcja, nie formularz. */
    ['zrób zdjęcie tak, jak wyszło', 'oznacz nas w relacji',
     'wróć po przepis, kiedy zechcesz'].forEach(function (tekst, i) {
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
  function akcjaEkranu(ktory) {
    var e = stan.ekran;
    if (e === 'start') {
      if (ktory === 'primary') return pokazKrok(1);
      /* NIENARYSOWANE (G6) / D8 / WYM §5: „najpierw pokaż składniki" otwiera PEŁNĄ listę (wszystkie
         trzy sekcje), a nie listę skróconą pierwszego kroku. */
      pokazKrok(1);
      return przelaczListe(true);
    }
    if (e === 'wznowienie') {
      if (ktory === 'primary') return pokazKrok(stan.krok);   // I-30: wznowienie na kroku
      stan.krok = 1;
      return pokazKrok(1);
    }
    if (e === 'koniec') {
      if (ktory === 'primary') return zamknij();
      // NIENARYSOWANE: cel ghosta na zakończeniu — wzięte „od nowa", pozycja na liście
      return pokazEkran('start');
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
      cz.akcjaPrimary.textContent = 'wróć do przepisu';
      cz.akcjaGhost.textContent = 'zamknij tryb gotowania';
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
    trybBottomu(true);
    var N = stan.widok.kroki.length;
    if (n < 1 || n > N) return null;
    stan.krok = n;
    /* TOP jest czyszczony przy przerysowaniu, więc węzeł tooltipa i tak by zniknął —
       ale uchwyt w module zostałby i `zamknijTooltip` szukałby rodzica sieroty. */
    zamknijTooltip();
    var krok = stan.widok.kroki[n - 1];
    stan.czesci.etykieta.textContent = 'krok ' + n + ' z ' + N;
    if (stan.listaOtwarta) rysujListe(krok); else rysujKrok(krok);
    przeliczBottom();
    ustawPostep(n, N);
    stan.czesci.wstecz.disabled = n === 1;
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

  function otworz(widok, opcje) {
    opcje = opcje || {};
    zbuduj();
    stan.widok = widok;
    /* Model jest OPCJONALNY i to jest decyzja, nie niedopatrzenie: bez niego widok
       działa w całości poza selektorem porcji, bo `naPorcje` to funkcja modelu. */
    if (opcje.model) stan.model = opcje.model;
    if (opcje.porcje) stan.porcje = opcje.porcje;
    if (poprzedniOverflow === null) poprzedniOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    stan.korzen.setAttribute('data-otwarty', '');
    if (opcje.ekran) { stan.krok = opcje.krok || stan.krok; pokazEkran(opcje.ekran); }
    else pokazKrok(opcje.krok || 1);
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
    zamknijTooltip();
    zamknijDialog();
    if (poprzedniOverflow !== null) {
      document.documentElement.style.overflow = poprzedniOverflow;
      poprzedniOverflow = null;
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
    odhacz: odhacz,
    zaznaczone: function () { return Object.keys(zaznaczone); },
    lista: przelaczListe,
    listaOtwarta: function () { return stan.listaOtwarta; },
    ekran: pokazEkran,
    ekranTeraz: function () { return stan.ekran; },
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
