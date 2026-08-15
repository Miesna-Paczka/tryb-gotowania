# MATRYCA zgodności — embed trybu gotowania (jednostka 0b)

Założona w przebiegu 2 (2026-08-14). **100 % zieleni tej matrycy w części LOKALNEJ
= definicja „100 % zgodności z Figmą" i warunek końca pętli** (STAN.md, inwentarz 0b).

## Jak czytać

| kolumna | znaczenie |
|---|---|
| **poz.** | identyfikator wiersza; stały, nie zmienia się przy przenumerowaniu |
| **pozycja** | co dokładnie ma być prawdą — sformułowane tak, żeby dało się to zmierzyć, a nie ocenić |
| **źródło** | skąd wzięty wymóg. `R*` = reguła z `GEOMETRIA.md` §4.1 · `§*` = sekcja `GEOMETRIA.md` · `I-*` i `G*` = tabela interakcji i luki z `INTERAKCJE.md` · `C*` czytane jako **konflikt** z `INTERAKCJE.md` §4 (nie mylić z identyfikatorami wierszy sekcji C, które mają dwie cyfry: `C01`…`C17`) · `A*` = pozycja aneksu pomiarowego · `W§*` = sekcja `WYMAGANIA.md` · `inw. *` = pozycja inwentarza w `STAN.md` · `dec. *` = decyzja operatora z HANDBACK §4 |
| **szer.** | `5×` = 320/360/390/440/480 portret · `land.` = 844×390 i 667×375 · `1×` = pomiar niezależny od szerokości · `próg` = 499 i 500 |
| **metoda** | `DOM` = asercja `getComputedStyle`/DOM · `GIF` = nagranie (zachowanie w czasie) · `oko` = zrzut ekranu · `JS-off` = pomiar z wyłączonym JS |
| **status** | 🔴 niezmierzone lub niezgodne · 🟢 zmierzone i zgodne |
| **przeb.** | numer przebiegu, w którym pozycja stała się zielona |

**Zasada:** wiersz robi się zielony **z pomiaru, nie z przeglądu kodu** (aneks,
kryterium wyjścia). Zielony na jednej szerokości to nie zielony wiersz — dopiero
komplet szerokości z kolumny `szer.`

**Czego tu nie ma i dlaczego.** Konflikty otwarte **C1** (pin BOTTOM) i **C8**
(ramka `buttons` 40 px) czekają na operatora i nie wchodzą do matrycy — mierzenie
ich przesądzałoby decyzję, która nie należy do łańcucha. Microcopy nie jest
pozycją: wiersz dotyczy **obecności i zachowania** elementu, nie brzmienia tekstu
(finalne brzmienia dostarcza pipeline treści).

**Sekcja Z jest poza liczeniem zieleni.** To pozycje wykonalne wyłącznie na
stagingu albo na fizycznym urządzeniu. Nie blokują końca pętli lokalnej; ich
przygotowanie to jednostka 10 (pakiet integracyjny).

---

## A · Parser i model danych

| poz. | pozycja | źródło | szer. | metoda | status | przeb. |
|---|---|---|---|---|---|---|
| A1 | `?debug=1` → panel błędów widoczny, zero błędów na payloadzie teriyaki | A1 · W§2 | 1× | DOM | 🟢 | 3 |
| A2 | klasy walidacji wg instrukcji §7 wyzwalają się na spreparowanych wpisach | A1 | 1× | DOM | 🟢 | 3 |
| A3 | klasa „`#klucz` bez odpowiednika w `skladniki`" wyzwala się i nie fałszywuje | A1 · inw. 3 | 1× | DOM | 🟢 | 4 |
| A4 | `skladniki` / `kroki` czytane z bloków `<script type="text/plain">` | A2 | 1× | DOM | 🟢 | 3 |
| A5 | puste pole → sekcja ukryta, nie pusta ramka | A2 | 5× | DOM | 🟢 | 4 |
| A6 | pola kartowe dzielą się po pustej linii na N kart, pytanie pogrubione | A2 · inw. 2 | 1× | DOM | 🟢 | 4 |
| A7 | opcjonalny link w karcie Q→A renderuje się jako link, nie tekst | inw. 2 | 1× | DOM | 🟢 | 4 |
| A8 | **treść pól kartowych czytelna w HTML-u bez JS** (server-visible) | A2 · W§3 | 1× | JS-off | 🟢 | 3 |
| A9 | skrypt przekształca istniejący DOM w miejscu, nie buduje go od zera | W§3 | 1× | DOM | 🟢 | 4 |
| A10 | fix regexa gramatury: spacja jako separator tysięcy („1 000 g") | inw. 5 | 1× | DOM | 🟢 | 4 |
| A11 | opcjonalne `krótko:` parsowane; brak nie jest błędem | W§2 | 1× | DOM | 🟢 | 4 |
| A12 | ostrzeżenie „wpis przechowywania bez czasu w formacie kanonicznym" | W§2 | 1× | DOM | 🟢 | 4 |
| A13 | `MP.przepis` wystawia sparsowane wpisy kartowe w modelu | W§3 | 1× | DOM | 🟢 | 4 |
| A14 | **pasek meta ekranu startowego pochodzi z MODELU** (`czas` + `wartosci-porcja`), nie z widoku; trzy kolumny, treść zgodna z `naPorcje(...).meta` | `7263:10715` · CR 2026-08-15 | 7× | DOM | 🟢 zmierzone: 3 kolumny, `30 min · 417 kcal · **B39 W26 T16**`, identycznie z modelem. **Do przeb. 23 pasek nie renderował się NIGDY**: runtime czytał `stan.widok.meta`, a model takiego pola nie zwracał. **Przeb. 27: payload harnessu podmieniony z podstawki (B41 W27) na wartość KANONICZNĄ z CMS**; asercja porównuje render z modelem, więc liczby jej nie dotyczą — zmieniła się prawdziwość fixture'u, nie wynik | 23 · 27 |
| A15 | brak / niepełne `wartosci-porcja` → pasek meta ukryty **W CAŁOŚCI**, nie sama kolumna czasu (test negatywny, reguła z CR-u) | CR §3 | 5× | DOM | 🟢 zmierzone: pusty → 0 kolumn, niepełny („energia" bez makro") → 0 kolumn, `czas` w modelu nietknięty | 23 |
| A16 | **pasek meta NIE skaluje się selektorem porcji** — `wartosci-porcja` jest stringiem NA PORCJĘ, więc mnożnik nie ma prawa go dotknąć (test negatywny, inwentarz 7) | pakiet §3c · CR | 7× | DOM | 🟢 zmierzone 7/7: 1 porcja i 7 porcji dają identyczne `[30 min \| 417 kcal \| B39 W26 T16]`, **a składniki w tej samej asercji różnią się** (150 g → 1 050 g). Asercja zapowiedziana w §3c w przeb. 15 i dopisana dopiero teraz | 27 |

## B · Układ i geometria

| poz. | pozycja | źródło | szer. | metoda | status | przeb. |
|---|---|---|---|---|---|---|
| B1 | `TOP` = przepływ pionowy: padding-top 88, gap 16, kolumna przy marginesie 16 | R1 | 5× | DOM | 🟢 | 5 |
| B2 | opis kroku skaluje się co do wiersza (2/3/4 wiersze), reszta zjeżdża o różnicę | R2 | 5× | DOM | 🟢 | 6 |
| B3 | zdjęcie kroku i blok składników **niezależnie opcjonalne**; brak → brak dziury | R3 · A11 | 5× | DOM | 🟢 | 6 |
| B4 | `belka` 72 px, niezmienna na każdym ekranie i każdej szerokości | R4 | 5× | DOM | 🟢 | 5 |
| B5 | `belka` ma wyłącznie `backdrop-filter` (blur), **bez cienia** | C4 | 5× | DOM | 🟢 | 5 |
| B6 | pasek postępu = `round(n/N × szerokość toru)`; start kikut, koniec pełny | R5 · I-32 | 5× | DOM | 🟢 | 5 |
| B7 | `BOTTOM` liczony z reguły składania, nie z listy wartości | R6 · §4.1 | 5× | DOM | 🟢 | 6 |
| B8 | kafle w `stos`: odstęp 8, dopełnienie dolne 12 | R7 | 5× | DOM | 🟢 | 6 |
| B9 | wnętrze pigułki i banera: padding 16, odstęp między blokami 12 | R8 | 5× | DOM | 🟢 | 6 |
| B10 | pasek nawigacji 80 px: cel `←` **44×44**, odstęp 12, CTA wypełnia resztę | R13 · §2.1 | 5× | DOM | 🟢 | 5 |
| B11 | ekrany start / S1 / zakończenie: dwa CTA pełnej szerokości, **bez** `←` | §4.1 | 5× | DOM‡ | 🟢 | 8 |
| B12 | `TOP` przewija się w całości pod belką i pod `BOTTOM`, nic nie jest ucięte | I-13 | 5× | oko | 🟢 | 5 |
| B13 | adnotacje projektanta (`↕ treść przewija się`, teksty legendy) **nie renderują się** | §3.8 · §3.5 | 5× | DOM | 🟢 | 5 |
| B14 | atrapy `marker — cel koloru` **nie renderują się** jako prostokąty | R14 · §3.13 | 5× | DOM | 🟢 | 5 |
| B15 | overlay to `position: fixed` w tym samym dokumencie, nie iframe | W§2 | 1× | DOM | 🟢 | 5 |
| B16 | glify tylko z subsetu; brak glifu = błąd zgłoszony, nie własny fallback | A9 · W§4 | 1× | DOM | 🔴 **naruszone konstrukcyjnie: `m.glif \|\| '·'`**; potw. na żywo: `@font-face` = **0** | 11 · 15 |
| B17 | cień `drop_shadow_ui` wg decyzji 11 (ambient + key, rzucany DO GÓRY) | W§4 | 5× | DOM | 🟢 | 8 |
| B18 | **inwariant odległości**: 25 własności (marginesy, gapy, paddingi, wysokości pasów, promienie, cele dotyku) **identycznych co do piksela** na 320/360/390/440/480; kontrola dodatnia — kolumna treści SKALUJE się (288/328/358/408/448 = szer. − 32) | 0aa · dec. operatora | 5× | sonda rodzica `inwariantOdleglosci()` | 🟢 25/25, `ok:true` | 21 |
| B20 | pasek meta: **trzy kolumny elastyczne**, odstęp 16 stały, wysokość pasa 81 | `7263:10715` | 5× | DOM | 🟢 zmierzone: odstęp 16, wys. 81 (80,6 przy dpr 1,25), kolumna 88 przy 360 i równa na wszystkich pięciu. Pierwsza wersja miała sztywne 88 px + `space-between` — **ten sam obraz przy 360, rozjazd przy 320**: rósłby odstęp zamiast kolumny | 23 |
| B21 | **zdjęcie przepisu na ekranie startowym** (`7195:10901`, 328×150 @ y88) | `7195:10901` | 5× | DOM | 🔴 **nie renderuje się nigdy**: `zdjecieEkranu()` czyta `stan.widok.fotoUrl`, a `fotoUrl` jest polem KROKU — widok przepisu takiego pola nie ma. Źródło zdjęcia = **D-23.1**, decyzja operatora | 23 |
| B19 | rząd nagłówka kroku (`7212:10899`): `space-between`, tytuł na `flex: 1`, pigułka czasu przy PRAWEJ krawędzi, rząd ≥ 26 px | `7212:10899` · §3.2 | DOM | 🟢 zmierzone (7 ramek): odstęp od prawej 0, wysokość 26, `space-between`. Do przeb. 22 pigułka wisiała samotnie jako dziecko TOP-u | 22 |

## C · Minutniki

| poz. | pozycja | źródło | szer. | metoda | status | przeb. |
|---|---|---|---|---|---|---|
| C01 | trzy stany czasu: `czas:` · `minutnik: MM:SS` · `czas: bez minutnika` | A4 · inw. 6 | 5× | DOM+oko | 🟢 | 6 |
| C02 | czas nigdy nie powtórzony w treści kroku | A4 | 1× | DOM | 🟢 | 6 |
| C03 | pigułka zwinięta 40 px; stan nie zmienia jej wysokości | §3.5 | 5× | DOM | 🟢 | 6 |
| C04 | pigułka rozwinięta krótka 126 = 16+34+12+48+16 | R7 · §2.2 | 5× | DOM | 🟢 | 6 |
| C05 | pigułka rozwinięta pełna = `198 + wysokość podpowiedzi` (zmierzone 236 i 255) | R7 · §3.11 | 5× | DOM | 🟢 | 6 |
| C06 | czas prawo-przypięty do krawędzi treści; szewron odbiera 28 px | R9 | 5× | DOM | 🟢 | 6 |
| C07 | szewron obecny ⟺ pigułka rozwinięta **pełna**; niezależnie od liczby minutników | R10 | 5× | DOM | 🟢 | 6 |
| C08 | szewron **na liście składników** obraca się `⌄`↔`⌃` przy rozwinięciu i zwinięciu | G5 · **I-12** | 5× | DOM †† | 🟢 | 15 · **20 (decyzja D-15.3/A)** |
| C09 | kropka 8×8 przy > 60 s | R11 · I-19 | 5× | DOM | 🟢 | 6 |
| C10 | ≤ 60 s: kropka 12×12, kolor akcentu, **puls 1×/s**, obrys pigułki 1,5 px | I-19 | 5× | WAAPI ※ | 🟢 **BIEG ZMIERZONY** — okno widoczne przez ~90 s w przeb. 18; przyrost animacji **1 300 ms** wobec zegara ściennego **1 303 ms**, 5/5 ramek ✽✽ | 12 · 13 · 17 · **18** |
| C11 | ostatnie 10 s: ten sam kolor, **puls 2×/s** (eskalacja tempem, nie barwą) | I-20 · G3 | 5× | WAAPI ※ | 🟢 **BIEG ZMIERZONY** — przyrost **1 300 ms** wobec **1 308 ms**, 5/5 ramek; eskalacja tempem 1×/s → 2×/s przy identycznej barwie ✽✽ | 12 · 13 · 17 · **18** |
| C12 | `0:00`: kropka 12×12 statyczna, **puls wygaszony** | I-21 · G4 | 5× | WAAPI ※ | 🟢 | 12 |
| C13 | oś kropki nie przesuwa się przy zmianie rozmiaru — rośnie promień | R11 | 5× | DOM | 🟢 | 6 |
| C14 | drugi minutnik układa się w `stos`, nie zastępuje pierwszego | I-17 | 5× | DOM | 🟢 | 6 |
| C15 | tap pigułki rozwija; tap nagłówka zwija; stan przeżywa zmianę kroku | I-15/I-16 | 5× | DOM | 🟢 | 6 |
| C16 | „uruchom ponownie" po `0:00` restartuje minutnik | I-22 · G10 | 5× | DOM | 🟢 | 6 |
| C17 | minutnik biegnie dalej, gdy użytkownik przechodzi do kolejnego kroku | §3.16 (07) | 1× | DOM | 🟢 | 6 |
## D · Lista składników

| poz. | pozycja | źródło | szer. | metoda | status | przeb. |
|---|---|---|---|---|---|---|
| D1 | **dwa** stany wiersza (niezaznaczony / zaznaczony-przekreślony), nie trzy | §3.1 | 5× | DOM | 🟢 | 6 |
| D2 | przynależność do sekcji niesie nagłówek + linia + kolejność, nie styl wiersza | §3.1 | 5× | DOM | 🟢 | 6 |
| D3 | „odhaczony w bieżącym kroku": checkbox z ✓, **bez** przekreślenia | G2 · I-10 | 5× | DOM | 🟢 | 6 |
| D4 | `byk` nieobecny w wierszach trybu gotowania | dec. 5 · W§3 | 5× | DOM | 🟢 | 6 |
| D5 | lista skrócona na ekranie kroku: tylko sekcja „w tym kroku" | §3.2 | 5× | DOM | 🟢 | 6 |
| D6 | lista pełna: trzy sekcje z nagłówkami i liniami | §3.8 · I-11 | 5× | DOM | 🟢 | 6 |
| D7 | „zobacz pozostałe" otwiera **pełną** listę (cel, nie etykieta) | I-11 · G7 | 5× | DOM | 🟢 | 6 |
| D8 | „najpierw pokaż składniki" otwiera pełną listę; oznaczone `// NIENARYSOWANE:` | I-02 · G6 | 5× | DOM‡ | 🟢 | 8 |
| D9 | zamknięcie listy tym samym celem dotyku co otwarcie | I-12 · G5 | 5× | DOM | 🟢 | 6 |
| D10 | lista przewija się w całości; przewijanie natywne, bez własnego toru | I-13 | 5× | DOM | 🟢 | 6 |
| D11 | odstęp wierszy: 12 na ekranie kroku, 8 na pełnej liście | W§4 · R15 | 5× | DOM | 🟢 | 6 |
| D12 | zaznaczenia przeżywają przejście krok → krok i powrót | I-10 | 1× | DOM | 🟢 | 6 |
## E · Zamienniki, markery i tooltip

| poz. | pozycja | źródło | szer. | metoda | status | przeb. |
|---|---|---|---|---|---|---|
| E1 | wpis z `#klucz` daje marker tylko na wierszu pasującego składnika | A5 · inw. 3 | 5× | DOM | 🟢 | 5 |
| E2 | wpis **bez** klucza nie pojawia się w trybie gotowania (zostaje na stronie) | A5 · W§5 | 1× | DOM | 🟢 | 5 |
| E3 | maks **2** markery na krok | A5 | 1× | DOM | 🟢 | 5 |
| E4 | marker w opisie = `<mark>` z `box-decoration-break: clone`; łamie się z wierszem | R14 | 5× | oko | 🟢 | 7 |
| E5 | marker w liście = kropkowane podkreślenie + kółko `i` **zaraz za nazwą** | C2 · §3.14 | 5× | DOM | 🟢 | 6 |
| E6 | cel dotyku markera **44×44** wokół kółka 20 px (pełna wysokość wiersza) | G9 · R13 | 5× | DOM | 🟢 | 6 |
| E7 | tooltip **296 px**, wsunięty o 16 względem kolumny treści, radius 12 | I-24 · R12 | 5× | DOM | 🟢 | 7 |
| E8 | tooltip kotwiczy się **8 px pod wierszem**, który go wywołał | R12 | 5× | DOM | 🟢 | 7 |
| E9 | wnętrze tooltipa: padding 14/12, odstęp 8 | R12 | 5× | DOM | 🟢 | 7 |
| E10 | `×` tooltipa: glif 16 px w celu dotyku **44×44**, bez rozpychania pudełka | I-25 · G9 | 5× | DOM | 🟢 | 7 |
| E11 | tooltip **nie ma scrima** — popover, nie modal | §3.14 | 5× | oko | 🟢 | 7 |
| E12 | tooltip **nie minimalizuje minutników** — pomiar z aktywnym minutnikiem | I-26 · A5 | 5× | oko | 🟢 | 7 |
| E13 | „flipped-above" dla wierszy przy dolnej krawędzi; oznaczone `// NIENARYSOWANE:` | G8 · W§5 | 5× | oko | 🟢 | 7 |
| E14 | krok bez ramki składników + wpis kluczowany → fallback + ostrzeżenie w `?debug=1` | W§5 | 1× | DOM | 🟢 | 5 |

## F · Nawigacja i stany ekranów

| poz. | pozycja | źródło | szer. | metoda | status | przeb. |
|---|---|---|---|---|---|---|
| F1 | krok → krok wyłącznie tapem (CTA „dalej" + `←`); **bez swipe** | G1 · I-04/I-05 | 5× | oko | 🟢 | 7 |
| F2 | `×` w belce otwiera S2; scrim pełnoekranowy 45 % | I-07 | 5× | oko | 🟢 | 7 |
| F3 | „wyjdź mimo to" zamyka overlay | I-08 | 5× | oko | 🟢 | 7 |
| F4 | systemowy „wstecz" wychodzi z overlaya (`history.pushState`) | I-09 · W§3 | 1× | DOM‡ | 🟢 | 9 |
| F5 | dialog 328 px, padding 24, odstęp 12; **wyśrodkowany pionowo** | §3b.1 | 5× | DOM | 🟢 | 7 |
| F6 | przy otwartym dialogu `BOTTOM` zostaje pod scrimem, nie znika z DOM | §3b.1 | 5× | DOM | 🟢 | 7 |
| F7 | próba trzeciego minutnika → S4, minutniki nie startują | I-18 · D11 | 5× | oko | 🟢 | 8 |
| F8 | S1 wznawia na właściwym kroku i właściwej liczbie porcji (localStorage) | I-30 | 1× | DOM‡ | 🟢 | 8 |
| F9 | karta stanu S1: padding 16, odstęp **8** (inny rytm niż kafle) | §3b.0 | 5× | DOM | 🟢 | 8 |
| F10 | S3: baner offline w `stos`, ta sama reguła co pigułki | §3b.2 | 5× | DOM | 🟢 | 8 |
| F11 | „sprawdź ponownie" (S3) działa w miejscu, bez przeładowania | I-31 | 5× | oko | 🟢 | 8 |
| F12 | S5 po powrocie z wygaszonego ekranu; komunikat i trzy przyciski | I-23 · §3.11 | 5× | DOM+oko‡ ¶¶¶ | 🟢 | 9 · **16** |
| F13 | zakończenie = `7195:11178`, pasek pełny, karta „pochwal się" | I-29 | 5× | DOM‡ | 🟢 | 8 |
| F14 | loader D13: klasa zdejmowana **po** zamontowaniu overlaya, nie na DOMContentLoaded | W§3 · G11 | 1× | DOM | 🟢 | 8 |
| F15 | wejście/wyjście overlaya bez zgadywanego czasu i easingu | G12 | 1× | DOM‡ | 🟢 | 8 |

## G · Porcje, wejścia i progi

| poz. | pozycja | źródło | szer. | metoda | status | przeb. |
|---|---|---|---|---|---|---|
| G01 | selektor porcji 1–7; blok wyśrodkowany w kolumnie treści | A3 · §3.1 | 5× | DOM | 🟢 | 8 |
| G02 | odmiana z mianownika (1 łyżka / 2 łyżki / 5 łyżek / 1½ łyżki) | A3 | 1× | DOM | 🟢 | 3 |
| G03 | policzalne w górę (2 limonki, nie 1,5) | A3 | 1× | DOM | 🟢 | 3 |
| G04 | `=` przypięte — nie rośnie | A3 | 1× | DOM | 🟢 | 3 |
| G05 | wiersze bez liczby nietknięte | A3 | 1× | DOM | 🟢 | 3 |
| G06 | zakresy skalują **oba** końce | W§2 | 1× | DOM | 🟢 | 3 |
| G07 | przycisk startu widoczny na **499**, ukryty na **500** | A12 · W§1 | próg | DOM | 🟢 | 3 |
| G08 | landscape: scrim zakrywa overlay w całości | A13 · I-27 | land. | oko | 🟢 | 7 |
| G09 | pod scrimem odliczanie **NIE zatrzymuje się** | A13 | land. | DOM† | 🟢 | 7 |
| G10 | powrót do portretu zdejmuje scrim **bez utraty stanu** | A13 | land. | DOM‡ | 🟢 | 8 |
| G11 | mechanizmem jest CSS `@media (orientation: landscape)`, nie `orientation.lock()` | W§1 | land. | DOM | 🟢 | 7 |

## H · Testy negatywne (WYMAGANIA §6 — wykonać, nie założyć)

| poz. | pozycja | źródło | szer. | metoda | status | przeb. |
|---|---|---|---|---|---|---|
| H1 | **nie** skaluje kroków przy zmianie porcji | W§6 · A3 | 5× | DOM | 🟢 | 3 |
| H2 | **nie** skaluje minutników przy zmianie porcji | W§6 · A3 | 5× | DOM | 🟢 | 3 |
| H3 | **nie** skaluje czasu przepisu przy zmianie porcji | W§6 | 1× | DOM | 🟢 | 3 |
| H4 | **nie** renderuje QR poniżej 992 px | W§6 | 5× + 991/992/1024 ¶ | DOM | 🟢 | 3 · **16** |
| H5 | **nie** dotyka pól poza kontraktem DOM | W§6 · W§3 | 1× | DOM | 🟢 | 5 |
| H6 | **nie** zapisuje nic poza swoim kluczem localStorage | W§6 | 1× | DOM | 🟢 | 5 |
| H7 | **nie** uruchamia trzeciego minutnika | W§6 · D11 | 5× | DOM | 🟢 | 6 |
| H8 | **nie** pokazuje przycisku startu od 500 px w górę | W§6 | próg | DOM | 🟢 | 3 |
| H9 | **nie** wpuszcza `czas:` i `minutnik:` naraz bez ostrzeżenia | W§6 | 1× | DOM | 🟢 | 3 |
| H10 | **nie** czyta kwoty zniżki z Site Settings | W§6 · C6 | 5× | DOM | 🟢 | 9 |
| H11 | **nie** renderuje mechaniki zdjęciowej na ekranie zakończenia | W§6 · C6 | 5× | DOM‡ | 🟢 | 8 |
| H12 | **nie** renderuje trzeciego stanu wiersza składnika | §3.1 | 5× | DOM | 🟢 | 7 |

## I · Higiena runtime'u

| poz. | pozycja | źródło | szer. | metoda | status | przeb. |
|---|---|---|---|---|---|---|
| I1 | **zero błędów i ostrzeżeń konsoli** na każdej mierzonej szerokości | A10 | 5× | DOM | 🟢 ¶¶ | 3 |
| I2 | zero błędów i ostrzeżeń w orientacji poziomej | A10 · A13 | land. | DOM | 🟢 | 3 |
| I3 | zależność QR **zadeklarowana i obecna w artefakcie parsera**, nigdy zakładana z `global` | A10 · inw. 8 · **D-13.1/B** | 1× ¶ | DOM | 🟢 **D-13.1 wariant B WYKONANY i zmierzony, przeb. 28** (`qr.html`, ramki 991/992/1024). Cztery pytania osobno, wszystkie zielone: **zadeklarowana** (`MP.przepis.zaleznosci.qr` = `qrcode-generator@2.0.4 MIT`, `globalna:false`) · **obecna w artefakcie** (992 i 1024 rysują `<svg>` 192×192, viewBox 164, 1 ścieżka, `fill #2b2118`, `aria-label` ustawiony) · **`window` PUSTE** (`QrCreator` i `qrcode` = `undefined` na trzech ramkach) · **nie zakładana z globala** (dubler wstrzyknięty, `wywolan === 0` na trzech ramkach). Konsola na desktopie: **0 wpisów** — ostrzeżenie `[MP] brak QrCreator` zniknęło razem ze strażnikiem. Parser min. **39 369 zn.**, zapas do 50 000 = **10 631**. Baner licencyjny MIT przeżywa `terser -c -m` (zmierzone) | 16 · 19 · 20 · **28** |
| I4 | ligatury Material używane przez runtime istnieją w żywym subsecie | A9 | 1× | plik+DOM | 🔴 **zbiór używanych ligatur PUSTY**; kontrakt meta zredagowany (pakiet §3c) | 11 · 15 |
| I5 | rozmiar runtime'u < 40 000 znaków (limit twardy 50 000) | W§4 | 1× | DOM | 🟢 **ARTEFAKT: 39 346 zn. / 39 435 B [V] przeb. 28** — zielone na powierzchni zminifikowanej, czyli na tej, która pójdzie do embedu. Powierzchnia źródłowa (114 237 zn.) pada z definicji i tak ma być: do Webflow nie idzie źródło. **Jednostką wiersza są ZNAKI** (przeb. 19). Zapas do progu **654 znaki** — wariant (3) kosztował **308 zn. odczytanych z builda**, nie 140–200 z szacunku | 9 · 14 · 17 · 19 · **28** |
| I6 | każda luka **G1–G12** jest w kodzie rozstrzygnięta i udokumentowana znacznikiem `// NIENARYSOWANE (Gn):` przy miejscu wykonania; dla luk rozstrzygniętych **zaniechaniem** znacznik stoi tam, gdzie stanąłby kod, i wskazuje asercję negatywną jako właściwy dowód. Wiersz dotyczy **zamkniętej listy luk zachowań z INTERAKCJE §4**; braki szczegółu i brzmienia są poza jego zakresem | W§5 · REJESTR-LUK | 1× | DOM §§ | 🟢 **pokrycie 12/12** | 11 · 14 · **20 (decyzja D-14.1/B)** |
| I7 | każdy zamiennik tokenu niesie **opis migracji w danych** (`TOKENY[i][2]`) — nazwa zmiennej Webflow albo jawne uzasadnienie jej braku; zero definicji `--mp-*` spoza listy | STAN piny · **D-kształt-builda/3** | 1× | DOM | 🟢 **wariant (3) WYKONANY i zmierzony, przeb. 28: 6 asercji × 7 ramek × 2 powierzchnie, zero padnięć.** (a) 10/10 tokenów z opisem w `t[2]` · (a) **kontrola pozytywna walidatora: odrzuca 12/12** pustych, białych, placeholderowych i nie-stringów · (a′) każdy opis OBECNY w pobranym artefakcie, nie tylko w obiekcie · (b) zero definicji `--mp-*` spoza listy · (c) **zero linii tokenu z komentarzem `staging:`** — informacja przeniesiona, nie skopiowana. Nazwy zmiennych ODCZYTANE z witryny (33 kolory) [V], nie przepisane z Figmy | 9 · 17 · 19 · 20 · **28** |

---

## W · Wykończenie powierzchni (klasa założona 2026-08-15, polecenie operatora)

**Dlaczego ta sekcja istnieje.** Sekcje A–I mierzą **położenia, wymiary, zachowania
i higienę**. Wypełnienia, obrysy, efekty i promienie pojawiały się w nich **doraźnie** —
tam, gdzie ktoś napisał wiersz (B17 cień, E-tooltip fill, obrys pigułki) — i nigdzie
nie było reguły pokrycia. Skutkiem był pas dolny **bez tła i bez kreski** przy 113
zielonych wierszach: brak nie miał czym paść. Znalazł go operator wzrokiem, nie matryca.

**REGUŁA POKRYCIA (obowiązująca, nie uznaniowa).** Dla **każdej ramki i każdej
instancji** z zestawu `7195:10893` matryca musi mieć wiersz o **czterech** własnościach:
**wypełnienie · obrys (kolor, grubość, promień) · efekt (cień, rozmycie tła) ·
typografia powierzchni (krój, grubość, stopień, kolor)**. Własność nierysowana w Figmie
zapisuje się jako **jawne „brak"**, nie pomija. Wiersz bez odczytu z Figmy nie ma prawa
być zielony — dopuszczalny status to 🔴 albo `[U]`, nigdy 🟢 z lektury kodu.

**Stan pokrycia po przeb. 26: 71 wierszy liczonych + 4 ⏸, wszystkie osiemnaście
powierzchni zestawu.** Backlog pod tabelą jest pusty — zdanie „nic nie jest czerwone"
i zdanie „wszystko jest pokryte" po raz pierwszy znaczą to samo. Odczyt z `get_design_context`
2026-08-15, plik `T0QnV1TrpngJhq2m1E9ZlI`, węzły `7212:10897` i `7212:10898`. [V]

| poz. | pozycja | źródło (Figma) | metoda | status | przeb. |
|---|---|---|---|---|---|
| W01 | `BOTTOM`: wypełnienie **`white-full-bg` #FFFFFF** (biel pełna, NIE `white-off-bg`) | `7195:10948` | DOM | 🟢 zmierzone: `rgb(255, 255, 255)` | 21 |
| W02 | `BOTTOM`: **górna kreska 1 px, `secondary-text (h1)` #487622** (zieleń) | `7195:10948` | DOM | 🟢 zmierzone: `::before` 1 px `rgb(72, 118, 34)`; wysokość pasa NIETKNIĘTA (bottom = naw + stos) | 21 |
| W03 | `BOTTOM`: cień `drop_shadow_ui` rzucany do góry | W§4 · dec. 11 | DOM | 🟢 (mierzy **B17**, tu tylko odsyłacz — nie duplikować) | 8 |
| W04 | `←` (`7195:10949`): **obrys 1 px `primary-text` #3E2B22, promień 22, 44×44** — kółko | `7195:10949` | DOM | 🟢 zmierzone: dekl. `1px solid`, użyte 0.8px przy dpr 1,25 (przycięcie do piksela urządzenia), r22, 44×44 | 21 |
| W05 | CTA „dalej": wypełnienie **`primary-cta` #CF411A** | `7290:10905` | DOM | 🟢 zmierzone: `rgb(207, 65, 26)` | 21 |
| W06 | CTA „dalej": **promień 100**, padding 24/14, rozkład `justify-between` | `7290:10905` | DOM | 🟢 zmierzone: r100, padding 14/24, `space-between`, h48 | 21 |
| W07 | CTA „dalej": **glif `arrow_forward` 20 px** po prawej stronie etykiety | `I7290:10905;6968:5090` | DOM | 🟢 zmierzone: glif 20 px, `left ≥ etykieta.right` | 21 |
| W08 | CTA „dalej": tekst **DM Sans SemiBold 16**, kolor `white-off-bg` #FFFDFB | `I7290:10905;6968:5089` | DOM | 🟢 zmierzone: 600 / 16px / `rgb(255, 253, 251)` | 21 |
| W09 | `belka`: wypełnienie **`white-off-80%` rgba(255,253,251,.8)** | `7212:10898` | DOM | 🟢 zmierzone: `color(srgb 1 0.992157 0.984314 / 0.8)` | 21 |
| W10 | `belka`: efekt **BACKGROUND_BLUR r=8** (eksport MCP: `backdrop-blur 4px`) | `7212:10898` | DOM | 🟢 zmierzone: `blur(4px)` | 21 |
| W11 | `×` w belce: **obrys 1,5 px `primary-cta` #CF411A, promień 100**, własne tło 80 % + rozmycie, glif `close` 20 px | `7283:10787` | DOM | 🟢 zmierzone: dekl. `1.5px solid`, użyte 0.8px (dpr 1,25 — patrz nota o gęstości), r100, tło 80 % + blur | 21 |
| W12 | pasek postępu: tor **`beige-1-bg` #F1ECDF, promień 100**; wypełnienie `beige-3` #816D44, promień 100 | `7283:10791/10792` | DOM | 🟢 zmierzone: tor `rgb(241, 236, 223)` r100, wypełnienie `rgb(129, 109, 68)` r100 | 21 |
| W13 | pigułka minutnika: promień **wg FORMY** — zwinięta **8** (`7254:10913`), rozwinięta **12** (`7195:11078`) | `7254:10913` · `7195:11078` | DOM | 🟢 zmierzone obie formy: zwinięta 8px, rozwinięta 12px (320/360/480) | 21 |
| W14 | pigułka minutnika: **`drop_shadow_ui`** (0/−1 r2 α5 % + 0/−4 r8 spread −2 α10 %) — ten sam co B17 | `7254:10913` · styl | DOM | 🟢 zmierzone: `0,-1,2` + `0,-4,8,-2`, identycznie jak B17 | 21 |
| W15 | pigułka minutnika: wypełnienie **`beige-1-bg` #F1ECDF** | `7254:10913` | DOM | 🟢 zmierzone: `rgb(241, 236, 223)` | 21 |
| W16 | kropka: wypełnienie **`primary-text` #3E2B22**, 8×8, promień 4 (koło) | `I7254:10913;7224:10896` | DOM | 🟢 zmierzone: `rgb(62, 43, 34)`, 8 px, `50%` | 21 |
| W17 | nazwa minutnika: styl **`Caption`** — DM Sans **Medium 500**, 14/16, `primary-text` | `I7254:10913;7224:10897` | DOM | 🟢 zmierzone: 500 / 14px / 16px / `rgb(62, 43, 34)` | 21 |
| W18 | czas w pigułce ZWINIĘTEJ: styl **`Price Small`** — 16 px, interlinia 1, prawo-równany | `I7254:10913;7224:10898` | DOM | ⏸ **KANDYDAT NA KONFLIKT, poza liczeniem** — GEOMETRIA §2.3 mierzy w formie ROZWINIĘTEJ pole 34 px; runtime ma jedną klasę na obie formy. Do operatora | 21 |
| W19 | szewron `keyboard_arrow_down`: Material Symbols **16 px**, `primary-text` | `I7254:10913;7237:105152` | DOM | 🟢 zmierzone: 16px / `rgb(62, 43, 34)` | 21 |
| W21 | `cta — primary` w pigułce: **promień 100**, tekst styl `Button` — DM Sans **SemiBold 600**, 16/20 | `7293:10902` | DOM | 🟢 zmierzone: r100px, 600, 16px/20px | 21 |
| W22 | **ramka** bloku składników (`7195:10935`, ekran KROKU — nie pełna lista): obrys 1 px `beige-2` #C5B18A, promień 12, **lico 16** (obrys + padding), rytm 12, **BEZ wypełnienia** | `7195:10935` | DOM | 🟢 zmierzone (7 ramek): dekl. `1px solid`, użyte 0.8px przy dpr 1,25, `rgb(197,177,138)`, r12, **lico 16**, tło `rgba(0,0,0,0)`, gap 12. Runtime nie rysował tu ŻADNEJ ramki; „background: beige-1” z przeb. 21 dotyczyło `.mp-tryb__lista`, czyli innego pudełka | 21 · 22 |
| W23 | checkbox składnika: **obrys 1 px `primary-text` #3E2B22, promień 3**, 16×16 | `I7273:10794;7224:10912` | DOM | 🟢 zmierzone: dekl. `1px solid var(--mp-atrament)`, użyte 0.8px, `rgb(62,43,34)`, r3, 16×16 (było 1,5 px `beige-3` r4 — trzy rozjazdy po jednym stopniu, żaden rzucający się w oczy osobno) | 21 · 22 |
| W24 | tekst składnika: styl **`Body Small`** — DM Sans **Regular 400**, 14, `primary-text`; interlinia 1,35 (18,9) wobec 19 w runtimie | `I7273:10794;7224:10913` | DOM | 🟢 zmierzone: 400 / 14px / **19** / `rgb(62,43,34)`. Runtime trzyma 19, bo skok 31 jest zmierzony w DWÓCH klatkach (§3.2, §3.12); asercja dopuszcza 18,8–19,1 i raportuje wartość — różnica wobec 1,35 wynosi 0,1 px | 21 · 22 |
| W25 | kreska pod listą **skróconą** (`7195:10945`): 1 px `primary-text` #3E2B22 — w runtimie realizuje ją `border-top` wywoływacza, nie osobny element | `7195:10945` | DOM | 🟢 zmierzone: 0.8px (dpr) `rgb(62,43,34)`. Reguła **zawężona do tej ramki**: `.mp-tryb__linia` listy PEŁNEJ to inny, nieczytany węzeł i nie wolno jej przemalować tym odczytem | 21 · 22 |
| W26 | etykieta „w tym kroku” (`7195:10936`): **OBECNOŚĆ**, styl `Caption` — Medium 500, 14/16, `primary-text` | `7195:10936` | DOM | 🟢⚠ zmierzone: „w tym kroku” 500 / **14**px / 16px / `rgb(62,43,34)` — **stopień WARUNKOWY, D-22.1**: `get_variable_defs` podaje `typo/Caption` = 12. Elementu **nie było w runtimie w ogóle** — uwaga z przeb. 21 o barwie `beige-3` dotyczyła nagłówka sekcji w liście PEŁNEJ | 21 · 22 |
| W27 | wiersz „zobacz pozostałe” (`7209:10899`): rozkład **`justify-between`**, `Body Small` 14, `primary-text` | `7209:10899` · `7195:10946` | DOM | 🟢 zmierzone: `space-between` / 14px / `rgb(62,43,34)`. Było `margin-left:auto` na glifie, czyli ten sam obraz przy `justify-content: normal` — wiersz pytał o regułę, której w kodzie nie było | 21 · 22 |
| W28 | szewron przy „zobacz pozostałe” (`7304:13194`): **16 px**, `primary-text`. KRÓJ (`keyboard_arrow_down` vs substytut `⌄`) mierzy **B16**, nie ten wiersz | `7304:13194` | DOM | 🟢 zmierzone: 16px / `rgb(62,43,34)`, glif `⌄` (substytut — KRÓJ mierzy B16) | 21 · 22 |
| W29 | **nagłówek „składniki”** (`7477:12562`) NAD ramką, w ramce zewnętrznej `7477:12561`: OBECNOŚĆ, `Caption` Medium 500, 14/16, `primary-text`, odstęp 8 do ramki | `7477:12562` | DOM | 🟢⚠ **wiersz założony i zmierzony w przeb. 22**: „składniki” 500 / **14**px / 16px / `rgb(62,43,34)`, odstęp 8 — **stopień WARUNKOWY, D-22.1** (jak W17 i W26). Elementu nie było w runtimie, a w matrycy nie było o niego pytania — przeb. 21 czytał ramkę wewnętrzną i nie wyszedł piętro wyżej | 22 |
| W30 | **nazwa kroku** (`7195:10930`): OBECNOŚĆ i treść z modelu; **DM Serif Display Regular 400, 22 px** (`typo/H4`), interlinia 1,1, `secondary-text (h1)` **#487622** | `7195:10930` · `7212:10899` | DOM | 🟢 **wiersz założony i zmierzony w przeb. 22** po etapie 0a: „przygotuj sos" wobec 9 tytułów w modelu, `DM Serif Display` 400 22px/24.2px `rgb(72,118,34)`. Runtime **nie renderował tytułu w ogóle**, choć parser go zwraca | 22 |
| W31 | pigułka czasu (`7195:10931`): tło `beige-1-bg` #F1ECDF, wysokość 26, padding poziomy 12, **promień 13**, tekst `Body Small` 14 `primary-text` | `7195:10931` | DOM | 🟢 zmierzone: `rgb(241,236,223)` h26 p12 r13 14px. Wykończenie było poprawne PRZED przebiegiem 22 — wiersz zapisuje to jawnie, bo reguła pokrycia nie zna „widocznie dobrze" | 22 |

| W32 | pasek meta (`7263:10715`): obrys **1 px `beige-2` #C5B18A**, promień **16**, **lico 16**, BEZ wypełnienia | `7263:10715` | DOM | 🟢 zmierzone: dekl. 1 px (użyte 0,8 przy dpr 1,25), `rgb(197,177,138)`, r16, lico 16, tło `rgba(0,0,0,0)`. Pierwsza wersja miała `padding:12/16` i dała **lico 17, pas 83** — obrys Figmy rysuje się do środka, `border` CSS poza paddingiem; poprawne jest `1 + 11/15`, dokładnie jak w W22 | 23 |
| W33 | glif meta: Material Symbols Outlined **Light 300**, **32 px**, `secondary-text (h1)` **#487622** (zieleń, nie atrament) | `7263:10717` | DOM | 🟢 zmierzone: 32px / 300 / `rgb(72,118,34)` / h32. KRÓJ mierzy B16 — runtime nie ma `@font-face`, rysuje substytut Unicode, a nazwa ligatury jedzie w `data-mp-ligatura` | 23 |
| W34 | etykieta meta: **DM Sans SemiBold 600, 14 / 1,2 (16,8)**, `primary-text`, odstęp **8** od glifu | `7263:10719` | DOM | 🟢 zmierzone: 600 / 14px / 16.8px / `rgb(62,43,34)`, odstęp 8 | 23 |
| W35 | blok selektora porcji (`7195:10911`): tło **`beige-1-bg` #F1ECDF**, promień **100**, padding 4, odstęp 16 | `7195:10911` | DOM | 🟢 zmierzone: `rgb(241,236,223)`, r100, p4, gap 16. Runtime rysował blok **bez tła i bez kapsuły** — geometria (192 px, G01) była zielona od przeb. 8, wykończenia nie pytał nikt | 23 |
| W36 | przyciski `−`/`+` (`7263:10728`): **biel złamana #FFFDFB**, obrys **1,5 px `primary-cta` #CF411A**, promień **100**, 40×40 | `7263:10728` | DOM | 🟢 zmierzone: `rgb(255,253,251)`, dekl. 1,5 px `rgb(207,65,26)` (użyte 0,8 przy dpr), r100, 40×40. Było: tło beżowe, promień 8, **zero obrysu**. Rozmiar 40 zostaje wg C8 (dec. operatora) | 23 |
| W37 | etykieta „N porcji": **SemiBold 600, `typo/H6` = 18 px**; wszystkie 7 odmian mieszczą się w polu 72 px | `7263:10730` | DOM | 🟢 zmierzone: 600 / 18px; szerokości odmian **66,70,71,72,65,66,64** — „4 porcje" wypada **dokładnie 72**, czyli tyle, ile ma węzeł Figmy. Było 16 px | 23 |
| W38 | **tytuł ekranu** (`7195:10902`): styl **H4** — DM Serif Display Regular 400, **22/1,1**, `secondary-text (h1)` #487622, **wyśrodkowany** | `7195:10902` | DOM | 🟢 zmierzone: `DM Serif Display` 400 22px/24.2px `rgb(72,118,34)` center. Było **DM Sans Bold 700, atrament, do lewej** — ten sam napis rangi co nazwa kroku (W30), narysowany innym krojem, bo o krój tytułu EKRANU nikt nie pytał | 23 |

| W39 | karta S1 (`7196:10902`): tło **`beige-1-bg` #F1ECDF**, promień **12**, padding **16**, odstęp **8**, BEZ obrysu | `7196:10902` | DOM | 🟢 zmierzone: `rgb(241,236,223)`, r12, p16, gap 8, obrys 0 — wykończenie było poprawne przed przeb. 23; wiersz zapisuje to jawnie, bo reguła pokrycia nie zna „widocznie dobrze" | 23 |
| W40 | tor postępu **W KARCIE** (`7284:10851`): **pusty, obrys 1 px `beige-2` #C5B18A, promień 100**; wypełnienie **`beige-3` #816D44**, promień 100 | `7284:10851/10852` | DOM | 🟢 zmierzone: tło `transparent`, dekl. 1 px `rgb(197,177,138)`, r100, wypełnienie `rgb(129,109,68)` r100. Było: tor **wypełniony** `beige-2`, promień **3**, wypełnienie **atramentem** — trzy rozjazdy naraz na pasku 6 px, żaden widoczny osobno. **Tor w karcie NIE jest torem z belki** (W12: wypełniony `beige-1`, bez obrysu) — runtime traktował je jak jeden | 23 |
| W41 | ptaszek w checkboxie (`7224:10919`): **DM Sans SemiBold 600, 10 px, interlinia 1,5 (15)**, kolor **`white-full-bg` #FFFFFF** (biel PEŁNA, nie `white-off-bg`) | `7224:10919` | DOM | 🟢 zmierzone (7 ramek + 7 zminifikowanych): **600 / 10px / 15px / `rgb(255, 255, 255)`**. Było **11 / 13 / waga odziedziczona 400 / `--mp-bialy` #FFFDFB** — cztery rozjazdy po jednym stopniu na glifie 10-pikselowym, czyli konfiguracja, w której żaden nie jest widoczny osobno (trzeci raz ten kształt: W23, W40) | 24 |
| W42 | wiersz `stan=zużyty`: nazwa zostaje **`primary-text` #3E2B22**; przekreślenie jest CAŁĄ deltą wobec `teraz` | `7224:10917` · `7273:10878` | DOM | 🟢 zmierzone (7+7): `rgb(62, 43, 34)` w `zużyty` **i** w `teraz` — asercja pyta o RÓWNOŚĆ obu stanów, nie o wartość. Było: nazwa przygaszona do **`beige-3` #816D44**. Plik nie ma na to źródła: wariant wiąże dwa kolory (`primary text`, `white full bg`), a **pięć instancji na klatce produkcyjnej `7196:10982` wiąże to samo, bez nadpisania wypełnienia** — sprawdzone na OBU pudełkach wg lekcji W22 | 24 |
| W43 | tooltip zamiennika: cień **`0 4px 14px rgba(61,43,33,0.18)`** | `7468:103138` | DOM | 🟢 zmierzone (7+7): `rgba(61, 43, 33, 0.18) 0px 4px 14px 0px`. Było `0 8px 24px` przy trafionej przezroczystości 18 %: **odsunięcie dwukrotne, rozmycie o 70 % za duże**. Komentarz twierdził, że „I-24 podaje surowy DROP_SHADOW bez wartości" — prawda o METODZIE, nie o pliku (jak przy W23) | 24 |
| W44 | tooltip zamiennika: głowa (`7473:103098`) rozkłada dzieci **`items-center`** | `7473:103098` | DOM | 🟢 zmierzone (7+7): `center`. Było `flex-start` | 24 |
| W45 | pytanie tooltipa (`7473:103099`): **DM Sans Bold 700**, `typo/Body small` 14, interlinia 1,35 | `7473:103099` | DOM | 🟢 zmierzone (7+7): `700 / 14px`. Było: waga domyślna, z komentarzem „grubości pisma plik nie podaje" — ta sama pomyłka metody co W43, w tym samym bloku CSS | 24 |
| W48 | kółko `i` (`7473:12562`): **wypełnienie `secondary-text (h1)` #487622**, **BEZ obrysu**, promień 100, 20×20; litera (`7473:12564`) **DM Sans Medium 500, 13 px, `white-off-bg` #FFFDFB** | `7473:12562` · `7473:12564` | DOM | 🟢 zmierzone (7+7): `rgb(72, 118, 34)` obrys `0px` r100, litera `rgb(255, 253, 251)` 500/13px. Runtime rysował **odwrotność**: kółko przezroczyste z obrysem 1 px `beige-3` i literą `primary-text` 12/18. **Nie rozjazd o stopień — inny element wizualny**, przetrwał piętnaście przebiegów, bo sekcja E pytała wyłącznie o POŁOŻENIE (E5) i cel dotyku (E6). Wymiar i odstęp mierzy E5, wiersz ich nie dubluje | 24 |
| W49 | baner S3 (`7196:10945`): wypełnienie **`beige-1-bg` #F1ECDF**, promień **12**, padding **16**, układ kolumnowy, odstęp **12** | `7196:10945` | DOM | 🟢 zmierzone (7+7): `rgb(241,236,223)` r12, lico 16/16, `column`, gap 12. Jedyny z czterech wierszy banera, w którym runtime miał rację — i **dlatego był potrzebny**: `W.wnetrze`/`W.blok` to zmienne wspólne z pigułką, więc zgodność wynikała z cudzej liczby, nie z odczytu banera. Wiersz przypina ją do TEGO węzła | 25 |
| W50 | baner S3: **efekt `drop_shadow_ui`** — `0/−1 r2 α5 %` + `0/−4 r8 spread −2 α10 %`, baza #3E2B22 (rzucany DO GÓRY), ten sam styl nazwany co B17/W14 | `7196:10945` · styl | DOM | 🟢 zmierzone (7+7): `rgba(62,43,34,0.05) 0 −1px 2px 0, rgba(62,43,34,0.1) 0 −4px 8px −2px`. Było: **żadnego `box-shadow`** — element rysowany, wykończenia brak. Ta sama klasa co pas dolny bez tła i jak tamta niewidoczna dla wierszy o układzie. Asercja porównuje **cały ciąg**, bo pytanie „czy jest cień" przepuściłoby jedną warstwę z dwóch | 25 |
| W51 | treść banera (`7202:10893`): **DM Sans Regular 400, `typo/Body small` 14**, interlinia 1,35, `primary-text` #3E2B22, pełna szerokość | `7202:10893` | DOM | 🟢 zmierzone (7+7): 400 / 14px / 19 / `rgb(62,43,34)`, szerokość = lico banera. Barwa dziedziczona z korzenia overlaya — wiersz pyta o WARTOŚĆ u elementu, nie o zapis w arkuszu, więc zmiana korzenia go przewróci | 25 |
| W52 | wiersz akcji (`7209:10922`): odstęp **8**, `items-center`; glif `refresh` rysowany na **20 px**; napis „sprawdź ponownie" **`primary-cta` #CF411A**, Regular 400, 14/1,35, **bez podkreślenia** | `7209:10922` · `7202:10894` · `7202:10897` | DOM | 🟢 zmierzone (7+7), dwa wiersze asercji. Trzy rozjazdy naraz: glif **16 px w pudełku 20** (pudełko mierzy F10 i było zielone — sam glif nie), barwa `color:inherit` czyli **atrament zamiast CTA** (potwierdzone DWOMA wiązaniami: napis `7202:10897` i ramka glifu `7202:10894`), oraz **podkreślenie bez źródła** — wynalazek runtime'u, którego nie mierzył żaden wiersz. Zdjęte; skutek a11y na liście decyzji, **D-25.3** | 25 |
| W53 | zakreślenie `<mark>` w opisie kroku: tło **`primary text` #3E2B22** — zakreślenie jest CIEMNE, nie jasne | `7231:10894` (SPEC §3.13) | DOM | 🟢 zmierzone (7+7): `rgb(62,43,34)`. Było `beige-1` #F1ECDF, czyli **odwrotność obrazu**. Prostokąt `marker — cel koloru` ma wypełnienie `primary text` z `mix-blend-multiply`; blend NIE przechodzi do CSS-a, bo w Figmie leży POD tekstem, a `<mark>` tekst ZAWIERA — multiply zmieszałby wybitą biel z tłem i skasował ją. Multiply #3E2B22 na `white-off-bg` daje ≈#3E2B22, więc płaskie wypełnienie odtwarza skutek. **Mierzymy skutek, nie mechanizm** | 25 |
| W54 | tekst w zakreśleniu wybity **`white full bg` #FFFFFF** | `7229:10907` (wiązanie na frazie) | DOM | 🟢 zmierzone (7+7): `rgb(255,255,255)`. Osobny wiersz od W53 celowo: samo ciemne tło bez wybicia tekstu daje **ciemne na ciemnym**, czyli stan gorszy niż przed poprawką — kontrast jest tu własnością PARY. Biel jest **związana ZMIENNĄ**, nie surowa (odróżnia to ten przypadek od W46) | 25 |
| W55 | pudełko dialogu S2/S4 (`7196:10925`): wypełnienie **`white full bg` #FFFFFF**, promień **16** | `7196:10925` | DOM | 🟢 zmierzone (7+7): `rgb(255,255,255)` r16. Było: biel ZŁAMANA #FFFDFB i promień **12** z komentarzem „NIENARYSOWANE: promienia dialogu plik nie podaje". Komentarz był nieprawdą o PLIKU — `get_design_context` zwraca `rounded-[16px]` wprost. **Trzeci raz ten sam kształt pomyłki** (W43, W45): brak odczytu zapisany jako brak danych | 25 |
| W56 | tytuł dialogu (`7196:10926`): **DM Sans SemiBold 600**, `typo/H6` = **18**, interlinia 1,2 → 22, `primary-text` | `7196:10926` | DOM | 🟢 zmierzone (7+7): 600 / 18px / 22. Stopień i interlinia były trafione, **waga nie**: `<h2>` bierze z przeglądarki 700 i nikt o to nie pytał. Uwaga do D-22.1: podpowiedź w kodzie mówi `typo/H6, 24`, a zmienna mówi **18** — trzeci pomiar potwierdzający, że fallback kłamie systemowo | 25 |
| W57 | CTA dialogu (`7291:10917`) jest instancją `cta — cta`: **`primary-cta` #CF411A**, pigułka **r100**, SemiBold **600**, 16/20, napis `white-off-bg` #FFFDFB | `7291:10917` | DOM | 🟢 zmierzone (7+7): `rgb(207,65,26)` r100 600/16px/20. Było: **atrament #3E2B22, promień 8, waga odziedziczona** — przycisk zbudowany osobno zamiast odwzorowania tej samej instancji co „dalej" w pasie dolnym (W05). Wysokość 48 zostaje i **nie jest dublowana** — mierzy ją F7; w Figmie wychodzi ze składu 14+20+14, więc centruję flexem, nie interlinią | 25 |
| W58 | „wyjdź mimo to" (`7196:10931`): **`primary-text` #3E2B22**, **wyśrodkowany** na pełnej szerokości, **bez podkreślenia**, 14/1,35 | `7196:10931` | DOM | 🟢 zmierzone (7+7): `rgb(62,43,34)` · `center` · `none` · szerokość = lico dialogu. Było `beige-3` #816D44, do lewej, podkreślone — **trzy rozjazdy w jednym elemencie**, żaden nigdy niemierzony. Zachowanie (link, nie drugi przycisk) bez zmian. Skutek: akcja nie odróżnia się już niczym od tekstu treści — **D-25.3** | 25 |
| W59 | ramka listy PEŁNEJ (`7196:10993`): **obrys 1 px `beige-2` #C5B18A, BEZ wypełnienia**, promień 12, lico 16, rytm 8 | `7196:10993` | DOM | 🟢 zmierzone (7+7): tło `rgba(0,0,0,0)`, obrys 1 px `rgb(197,177,138)`, lico 15+1=16. Było **odwrotnie**: wypełnienie `beige-1` #F1ECDF i zero obrysu. To ten sam kształt pudełka co ramka ekranu kroku (W22) i **ta sama pomyłka co w przeb. 21** — dwa pudełka jednego kształtu, poprawione jedno. Padding 15, nie 16, z tego samego powodu co przy W22: obrys Figmy idzie DO ŚRODKA | 25 |
| W60 | nagłówki sekcji listy pełnej (`7196:10998` „dalej", `7196:11014` „zużyte"): styl `Caption` — **DM Sans Medium 500**, 14/16, **`primary-text` #3E2B22** | `7196:10998` · `7196:11014` | DOM | 🟢 zmierzone (7+7): 500 / 14px / 16 / `rgb(62,43,34)`. Było `beige-3` #816D44 i waga odziedziczona 400 — mimo że nagłówek „w tym kroku" (W29) dostał w tym samym runtimie 500 + atrament. **Dwie klasy CSS na jedną rolę**, poprawiona jedna | 25 |
| W61 | kreska między sekcjami (`7196:10997` / `7196:11013`): **`primary-text` #3E2B22**, 1 px, pełna szerokość | `7196:10997` · `7196:11013` | DOM | 🟢 zmierzone (7+7): `rgb(62,43,34)`. Było `beige-2` #C5B18A. Komentarz przy W25 zawężał tamten odczyt do listy SKRÓCONEJ, bo „kreska listy pełnej to inny węzeł, nieczytany" — zawężenie było uczciwe, ale wpisana w kod wartość `beige-2` **nie miała żadnego źródła**. Węzeł przeczytany: obie kreski są tym samym kolorem | 25 |
| W62 | ghost pigułki pełnej (`7293:10935` / `7293:10938` „cta — ghost"): **kapsuła r100**, obrys **1,5 px `beige-3` #816D44** (`brązowy-2`), **SemiBold 600**, 16/20 | `7293:10935` · `7293:10938` | DOM | 🟢 zmierzone (7+7): r100, dekl. `1.5px solid`, waga 600, 16/20, obrys `rgb(129,109,68)`. Było: promień **8**, obrys 1 px `beige-2`, waga odziedziczona. **Ghost został z tyłu za poprawką W21** (przeb. 21), która naprawiła sąsiedni `.mp-tryb__primary` w tym samym bloku CSS i nazwała przyczynę — „jedna liczba rozlana po trzech miejscach". Ghost był czwartym miejscem. **Grubość 1,5 px nie jest mierzalna użyciem** przy dpr 1,25 (podłoga do jednego piksela urządzenia = 0.8px, tak samo jak 1 px) — wiersz pyta więc o deklarację ORAZ o to, że użyta równa się temu, co silnik z niej może narysować; ta sama para co przy W11 | 25 |
| W63 | podpowiedź w pigułce pełnej (`7240:10923`): `Body small` 400, 14/1,35, **`primary-text` #3E2B22** | `7240:10923` | DOM | 🟢 zmierzone (7+7): `rgb(62,43,34)` 14/19. Było `beige-3` #816D44 — przygaszenie wpisane tam, gdzie plik rysuje zwykłą treść. Ten sam kształt co W60 | 25 |
| W64 | odliczanie w pigułce pełnej (`7240:10922`): styl `Timer` — **DM Sans Bold 700**, `typo/Timer` = **34** (nie 48 z podpowiedzi), interlinia **1**, w stanie `0:00` barwa **`primary-cta` #CF411A**, prawo-przypięte | `7240:10922` | DOM | 🟢 zmierzone (7+7): `rgb(207,65,26)` 34px/34px waga 700 na pigułce PEŁNEJ w stanie `zero` (jedyne miejsce, gdzie forma i stan występują razem — S5). **Obawa z przeb. 25 była nietrafiona i to jest wynik**: interlinia 1 × 34 = `W.wiersz`, więc pole pisma urosło o dziesięć pikseli, a wysokość wiersza nie drgnęła — B9/C04/C05/C06 przemierzone obok, bez zmiany. Barwa jest własnością PARY (forma, stan): W66 wymaga atramentu przy minutniku biegnącym | 25 · **26** |
| W65 | scrim (`7196:10924` „przyciemnienie"): **BRAK obrysu, BRAK cienia, BRAK rozmycia tła**; wypełnienie `primary-text` @ 45 % mierzy F2 i nie jest tu dublowane | `7196:10924` | DOM | 🟢 zmierzone (7+7): obrys `0px`, cień `none`, `backdrop-filter` `none`. Wiersz istnieje z reguły pokrycia: własność NIERYSOWANA zapisuje się jako jawne „brak". Trzy braki są tu jedyną rzeczą, której F2 nie mówi, a która **odróżnia scrim od belki** — belka ma rozmycie tła jako swoją cechę (W03), scrim go nie ma | 25 |
| W66 | odliczanie w pigułce ROZWINIĘTEJ przy minutniku biegnącym (`7195:11078`): `Timer` — Bold **700**, **34**/1, pole **96 px prawo-równane**, barwa `primary-text` #3E2B22 | `7195:11078` | DOM | 🟢 zmierzone (7+7): 34px/34px/700, `text-align:right`, pole 96, `rgb(62,43,34)`. Było **24 px, waga odziedziczona, bez pola**. Klatka daje `w-[96px]`; runtime ma `min-width`, bo formatuje też `G:MM:SS`, którego plik nie narysował — sztywne 96 przycięłoby godzinę. **Kontrola negatywna w tym samym wierszu**: pigułka ZWINIĘTA została przy 24 px, bo jej oracle to `Price Small` 16 (W18, otwarty) — podniesienie stopnia globalnie rozstrzygnęłoby W18 po cichu | 26 |
| W67 | `cta — cta` pasa dolnego ekranów start / S1 / zakończenie (`7291:10911`): wypełnienie **`primary-cta` #CF411A**, promień **100**, lico 48, etykieta `Button` — SemiBold **600**, 16/20, **`white-off-bg` #FFFDFB** | `7291:10911` | DOM | 🟢 zmierzone (7+7): `rgb(207,65,26)`, r100, 600/16px/20px, `rgb(255,253,251)`, h48. Było: **atrament** i promień **8** — brąz to `cta — primary` pigułki (W21), czyli drugi poziom nacisku, nie synonim. Ósemka kart treści po raz **czwarty** na kapsule (W06, W21, W62, tu) | 26 |
| W68 | `cta — ghost` tego samego pasa (`7290:10944`): **BEZ wypełnienia**, obrys **1,5 px `beige-3` #816D44** (`brązowy-2`), promień **100**, **rozmycie tła blur(4px)** (BACKGROUND_BLUR r8), etykieta SemiBold 600, 16/20, `primary-text` | `7290:10944` | DOM | 🟢 zmierzone (7+7): tło `rgba(0,0,0,0)`, dekl. `1.5px solid` → użyte 0.8px przy dpr 1,25, `rgb(129,109,68)`, r100, `blur(4px)`, 600/16/20. Było: obrys **1 px atramentu**, promień 8, **zero rozmycia**. Trzeci element zestawu z rozmyciem tła (belka W10, `×` W11) i pierwszy, w którym runtime go nie miał | 26 |
| W69 | nadtytuł zakończenia „gotowe, smacznego" (`7195:11186`): styl **H4** — DM Serif Display 400, **22/1,1**, `secondary-text (h1)` #487622, **DO LEWEJ** | `7195:11186` | DOM | 🟢 zmierzone (7+7): `DM Serif Display` 400 22px/24.2px `rgb(72,118,34)`, `text-align:start`. Było **20/24 DM Sans w atramencie**. Osobna klasa od tytułu ekranu (W38) zostaje właśnie dlatego, że tamten jest WYŚRODKOWANY, a ten nie — jedna klasa zlałaby dwie różne decyzje projektanta | 26 |
| W70 | podtytuł zakończenia (`7195:11187`): `Body small` 400, 14/1,35, `primary-text` #3E2B22 | `7195:11187` | DOM | 🟢 zmierzone (7+7): 400 / 14px / 19 / `rgb(62,43,34)`. Runtime miał rację przed poprawką — wiersz istnieje z reguły pokrycia, nie z podejrzenia | 26 |
| W71 | karta „pochwal się" (`7195:11189`): **BEZ wypełnienia**, obrys **1 px `beige-2` #C5B18A**, promień **12**, **lico 16**, odstęp **16** | `7195:11189` | DOM | 🟢 zmierzone (7+7): tło `rgba(0,0,0,0)`, dekl. 1 px → 0.8px przy dpr, `rgb(197,177,138)`, r12, lico 16 (obrys 1 + padding 15, jak W22/W32), gap 16. Runtime rysował ją klasą karty S1 (W39): **wypełnienie `beige-1`, zero obrysu, odstęp 8**. Piąty przypadek „dwa elementy w jednej roli" (W22↔W59, W29↔W60, W25↔W61, W21↔W62) i pierwszy, w którym różni je WYPEŁNIENIE, a nie stopień pisma. Karta S1 nietknięta — poprawka jest zakresowana atrybutem `data-mp-karta` | 26 |
| W72 | nagłówek tej karty (`7200:10893`): styl **H4** — DM Serif Display 400, 22/1,1, `secondary-text (h1)` #487622 | `7200:10893` | DOM | 🟢 zmierzone (7+7): `DM Serif Display` 400 22px `rgb(72,118,34)`. Było **18/22 DM Sans w atramencie**, czyli ranga kroku z karty S1 — ta sama klasa niosła dwie różne rangi | 26 |
| W73 | numer instrukcji (`7200:10895`): **KÓŁKO** — obrys 1 px `beige-3` #816D44, promień **10**, 20×20, **BEZ wypełnienia** | `7200:10895` | DOM | 🟢 zmierzone (7+7): dekl. 1 px → 0.8px przy dpr, `rgb(129,109,68)`, r10, tło `rgba(0,0,0,0)`, 20×20. Runtime rysował **samą cyfrę w pustym polu**: kółka nie było w ogóle. Ten sam kształt co W48 (kółko `i`) — element wizualny, nie rozjazd o stopień; pole 20×20 i odstęp 28 mierzy F13 i były zielone | 26 |
| W74 | cyfra w kółku (`7200:10896`): styl `Caption` — DM Sans **Medium 500**, interlinia **16**, barwa **`beige-3` #816D44**, wyśrodkowana | `7200:10896` | DOM | 🟢 zmierzone (7+7): 500 / 16px / `rgb(129,109,68)` / center. Było: waga odziedziczona 400, interlinia 20, barwa odziedziczona (atrament). **Stopień pisma świadomie NIETKNIĘTY** (14) — `typo/Caption` czeka na **D-25.5** | 26 |
| W75 | efekty na ekranie zakończenia: karta i **oba** CTA **BEZ cienia**; rozmycie tła ma **wyłącznie** ghost | `7195:11189` · `7291:10911` · `7290:10944` | DOM | 🟢 zmierzone (7+7): `box-shadow:none` ×3, `backdrop-filter:none` na CTA, `blur(4px)` na ghoście. Wiersz z reguły pokrycia — własność nierysowana zapisuje się jako jawne „brak" (tak samo jak W65). Asercja jest PARĄ: cień „dla głębi" przewróci pierwszą połowę, rozlane rozmycie — drugą | 26 |
| W76 | ramka zdjęcia na ekranie zakończenia (`7195:11188`): promień **12**, wysokość **150**, wypełnienie — **dwa odczyty Figmy się nie zgadzają** | `7195:11188` | — | ⏸ **poza liczeniem, za D-23.1.** Element nie renderuje się w ogóle (ta sama przyczyna co B21: `fotoUrl` jest polem KROKU). Do tego `get_design_context` podaje wypełnienie `black` #1A1A1A, a render `get_screenshot` tej samej ramki pokazuje **jasną szarość** — dwa odczyty z jednego pliku, więc wiersz nie ma prawa być zielony ani czerwony „z jednego z nich". Do rozstrzygnięcia razem ze źródłem zdjęcia | 26 |
| W77 | kreska nad pasem dolnym **na ekranie zakończenia** (`7195:11205`): pełny obrys **1 px `primary-text` #3E2B22** + wypełnienie `white-full-bg` | `7195:11205` | — | ⏸ **KANDYDAT NA KONFLIKT, poza liczeniem.** Ekran KROKU rysuje ten sam pas z **górną kreską `secondary-text (h1)` #487622** (`7195:11084`, potwierdzone w tym przebiegu przy okazji odczytu `7195:11065`) — i to jest wiersz W02, zielony od przeb. 21. Widocznie różni je **barwa kreski**, bo pozostałe trzy boki pokrywają się z krawędzią ramki. Runtime rysuje zieleń na wszystkich ekranach. Do operatora, patrz **D-26.1** | 26 |
| W46 | tooltip zamiennika: kolor tekstu — plik daje **surową czerń #000000, bez wiązania** (`get_variable_defs` na `7468:103138` zwraca wyłącznie `typo/Body small` i `beige 1 bg`) | `7468:103138` | — | ⏸ **KANDYDAT NA KONFLIKT, poza liczeniem.** Runtime dziedziczy `primary-text` #3E2B22, jak cała reszta zestawu. Czerń w jednym popoverze wygląda na niezwiązany domyślny, nie na decyzję — ale rozstrzyga to projektant, nie łańcuch. Do operatora, patrz **D-24.1** | 24 |
| W47 | glif `close` tooltipa (`7473:103100`): **Material Symbols ROUNDED Medium 500, 16 px** | `7473:103100` | — | ⏸ **KANDYDAT NA KONFLIKT, poza liczeniem.** Reszta zestawu używa **Outlined** (W33: Outlined Light 300), a subset `subset-2026-08-15-v4` zawiera wyłącznie Outlined 300/400/500. Zaciągnięcie drugiej rodziny to drugi plik fontu dla jednego glifu. Do operatora, patrz **D-24.2** | 24 |

**⚠ D-22.1 — PRZEBIEG 23 DOKŁADA DWA DOWODY ROZSTRZYGAJĄCE, oba geometryczne.**
`typo/H6`: fallback `get_design_context` = **24**, `get_variable_defs` = **18**, węzeł
„porcje" ma wysokość **22** = 18 × 1,2 (24 × 1,2 dałoby 28,8). `typo/H4` na tytule
ekranu: fallback **32**, zmienna **22**, węzeł 328×**48** = dwa wiersze po 24,2 = 22 × 1,1
(32 dałoby 70,4). **Trzeci dowód jest szerokościowy i niezależny od interlinii:**
napis „4 porcje" wyrenderowany w żywym DM Sans SemiBold **18 px** ma **dokładnie 72 px**,
czyli szerokość węzła Figmy; przy 24 px byłby o połowę szerszy.

**SAMOKOREKTA W TYM SAMYM PRZEBIEGU — „fallback kłamie systemowo" było za mocne.**
Odczyt karty S1 (`7196:10902`) podaje `--typo/body-small,14px`, a runtime rysuje tam
14/19 i zgadza się z klatką co do piksela (14 × 1,35 = 18,9). Czyli **fallback jest
prawdziwy dla `Body small` i fałszywy dla `H4` i `H6`** — rozjazd dotyczy jak dotąd
wyłącznie skali NAGŁÓWKOWEJ. To osłabia wniosek przez indukcję dla `Caption`: nie
wystarczy powiedzieć „fallback zawsze kłamie", bo przy `Body small` nie kłamie.
**Dla `Caption` (12 czy 14) geometria milczy** — interlinia jest stała 16, więc oba
stopnie dają tę samą wysokość węzła — **i decyzja operatora jest niezbędna**, nie
formalna. W17/W26/W29 zostają zielone warunkowo. Nowe wiersze przebiegu 23
(W34, W37, W38) są już zbudowane na wartościach ZE ZMIENNYCH, nie z fallbacku.

**⚠ D-22.1 (przeb. 22) — WIADOMO JUŻ, KTÓRE NARZĘDZIE KŁAMIE, i dotyczy to TRZECH
wierszy: W17, W26, W29.** Dla `typo/H4` `get_design_context` podaje w fallbacku **32**,
`get_variable_defs` — **22**, a metadane węzła dają wysokość **24** = 22 × 1,1. Fallback
jest fałszywy, zmienna prawdziwa, potwierdzone niezależnym pomiarem. Ponieważ `Caption`
rozjeżdża się tak samo (14 wobec 12), **trzy zielenie stoją przy stopniu, który najpewniej
jest o dwa punkty za duży**. Nie przestawiam bez decyzji — rekomendacja w STAN.md, D-22.1.
Reszta każdego z tych wierszy (grubość 500, interlinia 16, kolor) jest zmierzona i pewna.

**⚠ W17 MA STATUS WARUNKOWY (D-21.5, przeb. 21).** Wiersz przeszedł przeciw
**14 px**, bo tyle podaje `get_design_context` jako fallback tokenu. Ale
`get_variable_defs` na tym samym pliku podaje **`typo/Caption` = 12**. Jedno z dwóch
narzędzi Figmy kłamie i nie wiadomo które, więc **zieleń W17 dotyczy grubości (500),
interlinii (16) i koloru — nie stopnia.** Jeśli wiążące okaże się 12, ten wiersz jest
pierwszą fałszywą zielenią łańcucha. Nie przestawiać bez decyzji operatora.

**ZAMKNIĘTE 2026-08-15 (druga jednostka przeb. 21) — to nie były konflikty.**
Odczyt pigułki ROZWINIĘTEJ (`7195:11078`) pokazał, że zwinięta i rozwinięta to dwa
różne komponenty o różnych wartościach, a nie jeden komponent opisany sprzecznie:
promień **8 / 12**, odstęp **8 / 12**, czas `Price Small 16` / `Timer Bold 700 · 34`.
Runtime ma po jednej wartości na obie formy, więc w każdej z trzech pozycji jedna
forma jest niepoprawna. **Naprawa jednoznaczna: rozdzielić po `[data-forma]`** —
zadanie dla ogniwa 22, nie pozycja dla operatora. Przy okazji: `cta — primary`
w pigułce (`7293:10902`) ma promień **100**, runtime **8**.

**Kandydat na konflikt zapisany przy okazji W-13…W-19 (treść nieaktualna, patrz akapit wyżej):**
pigułka **zwinięta** ma w Figmie `gap: 8` między kropką, nazwą, czasem i szewronem,
a wiersz pigułki **rozwiniętej** (GEOMETRIA §2.3) stawia nazwę na `x=20` przy kropce
8 px, czyli z odstępem **12**. Runtime realizuje 12 w obu formach jednym
`margin-right` na kropce. Dwie formy tego samego komponentu mogą mieć różne odstępy
całkiem legalnie — ale runtime nie może mieć obu naraz, więc to jest rozstrzygnięcie
operatora, nie poprawka. Szczegóły w STAN.md, lista decyzji.

**PRZEBIEG 22 — sekcja W domknięta po raz drugi, tym razem na bloku składników.**
Osiem wierszy (W22–W29) zmierzonych na siedmiu ramkach, **2 359 asercji, 7 padnięć —
wszystkie I5**, konsola zero. Trzy rzeczy warte zapamiętania poza samą zielenią:

1. **Wiersz W22 z przebiegu 21 nie miał jak być prawdziwy ani fałszywy.** Mówił
   „blok składników”, a runtime ma DWA pudełka o tym kształcie: `.mp-tryb__blok-skladnikow`
   (ekran kroku, bez żadnego wykończenia) i `.mp-tryb__lista` (pełna lista, wypełnienie
   `beige-1`). Odczyt `7195:10935` rozstrzygnął, że chodzi o pierwsze. Diagnoza
   z przebiegu 21 („runtime ma tu `background: beige-1`”) opisywała **drugie pudełko**.
2. **Brak elementu nie ma czym paść.** Dwa napisy narysowane w Figmie — nagłówek
   „składniki” i etykieta „w tym kroku” — nie istniały w runtimie w ogóle. Żadna
   asercja o kolorze, stopniu ani interlinii nie mogła ich złapać, bo wszystkie pytają
   o element, który musi najpierw być. Dlatego W26 i W29 zaczynają się od OBECNOŚCI.
3. **Obrys Figmy jest rysowany do środka, a `border` CSS na zewnątrz paddingu.**
   `border:1 + padding:16` dałoby lico 33 i wiersz 294 zamiast 296 — rozjazd o piksel
   z DWIEMA rzeczami zmierzonymi wcześniej (`tooltipX: 32`, szerokość wiersza 296).
   Runtime ma `1 + 15`, a wiersz mierzy LICO, nie liczbę `padding`.

**Inwariant odległości (B18) rozszerzony do 33 własności** (było 25): doszły padding,
obrys, promień i trzy rytmy bloku składników. **33/33 zgodne** na 320/360/390/440/480,
kontrola dodatnia dalej działa (kolumna 288/328/358/408/448). Lico 16 i skok 31 na
wszystkich pięciu szerokościach; pierwszy skok 32 to wiersz z markerem `i`, o 1 px
wyższy od tekstu — zachowanie udokumentowane w §3.14, nie dryf.

**ZNALEZISKO PRZEBIEGU 22, POZA SEKCJĄ W — brak NAZWY KROKU w renderze.** Porównanie
ekranowe 1:1 (etap 0a) pokazało, że `rysujKrok()` nie renderuje tytułu kroku, choć jest on
parsowany (`== tytuł`), niesiony przez model (`krok.tytul`), opisany w interfejsie
(`instrukcja-pisania-przepisow.md` §3) i narysowany w Figmie (`7195:10930`) w tym samym
rzędzie co pigułka czasu. Wiersze **B19** (rząd) i **W30** (wykończenie tytułu) założone
niżej, na czerwono. Żaden ze 146 wierszy o to nie pytał — bo matryca pilnowała pokrycia
RAMEK Figmy, a nie pokrycia POLA MODELU, które nie ma swojej ramki w kodzie.

**PRZEBIEG 23 — REGUŁA POKRYCIA PÓL MODELU, założona i od razu opłacona czterema
znaleziskami.** Reguła (postulat z przebiegu 22, wdrożona tutaj): *każde pole zwracane
przez parser musi mieć wiersz mówiący, gdzie jest renderowane albo dlaczego nie.*
Przejście sitem po `naPorcje()` dało:

1. **`widok.meta` — pole, którego model NIE ZWRACAŁ, a runtime je czytał.** Pas trzech
   kolumn (czas · kcal · makro), drugi element ekranu startowego zaraz po tytule, nie
   renderował się nigdy: `meta.hidden` zapalało się w każdym renderze. Reguła pokrycia
   RAMEK go nie łapała, bo pas nie ma osobnej ramki w kodzie — ma pole w modelu.
2. **`widok.czas` bez odbiorcy.** `data-czas` jechało do modelu i tam się kończyło.
3. **`widok.fotoUrl` — pole KROKU czytane na ekranie PRZEPISU** (B21). Zdjęcie 328×150
   z klatki startowej nie ma jak się pojawić, bo widok przepisu tego pola nie ma.
4. **Tytuł ekranu innym krojem niż tytuł kroku** (W38) — znalezione przy okazji
   porównania współrzędnych, nie przy okazji czytania kodu.

**Etap 0a wykonany WSPÓŁRZĘDNIE, nie wzrokowo — i to jest mocniejsza wersja tego etapu.**
Zakładka operatora miała `document.visibilityState === 'hidden'`, a `Page.captureScreenshot`
przy ukrytej zakładce **przekracza limit 30 s** (dwie próby, potem próba po nawigacji).
Nota z przebiegu 19 („zrzut działa przy zminimalizowanym oknie") nie jest obalona, tylko
uściślona: liczy się widoczność ZAKŁADKI, nie stan okna. Zamiast zrzutu porównano
**drzewo pudełek** harnessu przy 360 ze współrzędnymi `get_metadata` klatki `7195:10894`:

| element | Figma @360 | harness @360 | werdykt |
|---|---|---|---|
| belka | 0,0 · 360×72 | 0,0 · 360×72 | ✓ |
| zdjęcie | x16 y88 · 328×150 | **BRAK** | B21 🔴 |
| tytuł | x16 y254 · 328×48 | x16 y88 · 328×24 | pozycja = skutek braku zdjęcia; krój/barwa/oś → W38 |
| meta | x16 y318 · 328×81 | x16 y128 · **328×81** | ✓ wymiar |
| „ile porcji?" | x16 y415 · 328×16 | x16 y225 · 328×16 | ✓ |
| selektor | x16 y447 · 328×48 | x16 y257 · 328×48 | ✓ |
| BOTTOM | y648 · 360×132 | y648 · 360×132 | ✓ |

Rytm pionowy **16 px między wszystkimi sąsiadami** zgadza się w obu kolumnach; cały
rozjazd pozycji to przesunięcie o 166 px, czyli dokładnie wysokość brakującego zdjęcia
z odstępem. Porównanie liczbowe mówi to, czego zrzut by nie powiedział: że przesunięcie
ma **jedną** przyczynę, a nie pięć.

**Inwariant odległości (B18) rozszerzony do 42 własności** (było 33): doszły padding,
odstęp, wysokość, promień i rytm kolumny paska meta oraz padding, odstęp, promień i bok
przycisku selektora. **42/42 zgodne** na 320/360/390/440/480, kontrola dodatnia dalej
działa. Pas meta jest jedynym elementem overlaya, którego kolumny MAJĄ się rozciągać,
więc jest też jedynym miejscem, gdzie „kolumna rośnie" łatwo pomylić z „odstęp rośnie" —
sztywne 88 px z pierwszej wersji wyglądało poprawnie przy 360 i rozjeżdżało się przy 320.

**I4 — zbiór używanych ligatur przestał być pusty i wszystkie trzy SĄ w subsecie.**
Sonda szerokości z kontrolą negatywną w żywym renderze (subset v4, waga 300, 20 px):
`hourglass` **20 px**, `local_dining` **20 px**, `leaderboard` **20 px** — po jednym
glifie; nieistniejąca nazwa — **400 px**, czyli słowo. Wiersz I4 zostaje 🔴, bo mierzy
`@font-face` w RUNTIMIE (dalej 0, B16 · D-15.1), ale przeszkoda treściowa zniknęła:
gdy operator rozstrzygnie wpięcie fontu, pasek meta ma czym się narysować bez zamawiania
nowego subsetu. Nazwy ligatur są w DOM-ie jako `data-mp-ligatura`, więc migracja B16
dostaje listę maszynowo czytelną.

**BACKLOG pokrycia — ramki bez ani jednego wiersza W** (do odczytu w kolejnych ogniwach):
~~pigułka minutnika zwinięta~~ (W13–W19) · ~~pigułka rozwinięta~~ (W13/W21) ·
~~wiersz składnika~~ (W22–W28) — wszystkie przeb. 21. Zostaje: **stany** wiersza
składnika (zużyty, zamiennik),
~~tooltip zamiennika~~ (W43–W45, przeb. 24) · ~~marker `i`~~ (W48, przeb. 24) ·
~~dialogi S2/S4~~ (W55–W58, przeb. 25) · ~~baner offline S3~~ (W49–W52, przeb. 25) ·
~~`mark` zakreślenia~~ (W53–W54, przeb. 25) · ~~ekran startowy~~ (W32–W38, przeb. 23) ·
~~selektor porcji~~ (W35–W37, przeb. 23) · ~~S1~~ (przeb. 23, współrzędnie).
~~pełna lista~~ (W59–W61, przeb. 25).
**S5 pokryte W CZĘŚCI** (W62–W63: ghost i podpowiedź; kafel, kropka i wiersz minutnika
mają wiersze w sekcjach B/C). ~~scrim~~ (W65, przeb. 25).
~~ekran zakończenia (`7195:11178`)~~ — **przemierzony w przeb. 26** (W69–W77: nadtytuł,
podtytuł, karta „pochwal się", jej nagłówek, kółko numeru, cyfra, oba CTA pasa dolnego,
efekty jako jawne „brak", plus dwa wiersze ⏸ — ramka zdjęcia i barwa kreski pasa).
**BACKLOG POKRYCIA JEST PUSTY.** Zestaw `7195:10893` ma wiersz W dla każdej ramki
i każdej instancji, którą rysuje; jedyne, czego sekcja W nie obejmuje, to loader —
i to nie z braku pracy, tylko dlatego, że nie ma go w Figmie (patrz akapit niżej).
**Loader WYPADA z sekcji W, a nie czeka w niej** (ustalone przeb. 25): INTERAKCJE G11 i I-28
mówią wprost, że ma **zero klatek** w Figmie i że „Figma nie jest tu źródłem i nie należy
jej pytać" — buduje się go z WYMAGANIA §1/§3 i spec §17. Skoro wiersz W bez odczytu z Figmy
nie ma prawa być zielony, loader nie ma jak dostać wiersza W i **nie jest luką pokrycia**.
Trzymanie go na tej liście przez cztery przebiegi zawyżało backlog o pozycję niewykonalną — plus **jeden niedokończony oracle S5**: `typo/Timer` przy
odliczaniu — **przeczytany, `typo/Timer` = 34**, wiersz W64.
**Ekran startowy pokryty W CZĘŚCI**: pasek meta, selektor i tytuł mają wiersze, ramka
zdjęcia (`7195:10901`) czeka na D-23.1, a dwa CTA pasa dolnego mierzy W05–W08. **Nie wolno zamykać sekcji W przed przemierzeniem
tej listy** — 54 zielone wiersze to jeszcze nie zestaw, tylko trzynaście z osiemnastu
powierzchni. Bilans 54/54 mówi „nic nie jest czerwone", nie „wszystko jest pokryte";
te dwa zdania rozjeżdżają się dokładnie na długości tej listy.

**Znalezisko poboczne, ale ostre: runtime nie zna dwóch tokenów.** `white-full-bg`
(#FFFFFF) i `secondary-text (h1)` (#487622) **nie istnieją w tablicy `TOKENY`**, która
ma siedem pozycji. Trzeciej rzeczy warto nie przeoczyć: `primary-cta` w Figmie to
**#CF411A**, czyli dokładnie wartość runtime'owego `--mp-alarm` — jeden kolor, dwie
nazwy, dwa znaczenia. Nazewnictwo tokenów runtime'u rozjeżdża się z design systemem
i to jest osobna pozycja na listę decyzji, sprzężona z wariantem (3) dla I7.

---

## M · Pokrycie PÓL MODELU (reguła założona 2026-08-15, przebieg 23)

**Po co ta sekcja.** Sekcja W pilnuje, żeby każda RAMKA Figmy miała wiersz. To za mało:
pas meta ekranu startowego nie ma w kodzie własnej ramki — ma pole w modelu — i dlatego
nie renderował się przez dwadzieścia dwa przebiegi przy 149 zielonych wierszach.
**Druga reguła, komplementarna: każde pole zwracane przez parser musi mieć wiersz mówiący,
gdzie jest renderowane albo dlaczego nie.** Pole bez odbiorcy jest albo martwym kodem,
albo brakującym elementem — i tego, które z dwóch, nie widać z pola.

Ta sekcja **nie liczy się do bilansu zieleni**: jest inwentarzem, nie pomiarem. Defekty,
które znajdzie, zakłada się jako wiersze w A / B / W i tam są liczone (w tym przebiegu:
A14, A15, B20, B21, W32–W38).

**Przejście przebiegu 23 — poziom PRZEPISU (`naPorcje()`), pięć pól:**

| pole | odbiorca w runtimie | werdykt |
|---|---|---|
| `tytul` | `ekranStart` / `ekranWznowienie` / zakończenie (`.mp-tryb__ekran-tytul`) | ✓ renderowane · krój → **W38** |
| `czas` | **żaden** do przeb. 23 → pierwsza kolumna paska meta | usterka → **A14** |
| `meta` | `ekranStart`, `.mp-tryb__meta` — **model tego pola nie zwracał** | usterka → **A14 · A15** |
| `porcje` | selektor, przeliczenie składników | ✓ renderowane · wykończenie → **W35–W37** |
| `fotoUrl` (czytane na tym poziomie) | `zdjecieEkranu()` — **pole KROKU, nie przepisu** | usterka → **B21**, decyzja **D-23.1** |
| `zamienniki` (mapa) | źródło dla `krok.zamiennikiWgKlucza` | ✓ pochodna, nie rysowana wprost |
| `bledy` / `ostrzezenia` | panel `?debug=1` **warstwy strony**, nie overlaya | ✓ świadomie poza overlayem (**A1**) |

**Przejście przebiegu 24 — poziomy KROKU, SKŁADNIKA i WPISU, PRZEMIERZONE.**
Metoda: pola wyliczone z ŻYWEGO modelu (parser uruchomiony w node na payloadzie
harnessu — `Object.keys()` na `wid.kroki` / `wid.skladniki`, nie z lektury deklaracji),
odbiorcy policzeni w runtimie po **kodzie z wymaskowanymi komentarzami**. Maskowanie
jest częścią pomiaru, nie kosmetyką: `tytul` daje 8 trafień w surowym pliku i 6 w kodzie,
a różnica to dwie wzmianki w komentarzach, czyli dwa fałszywe „ma odbiorcę". Trzy pola
mają odbiorcę WYŁĄCZNIE w komentarzu opisującym, że go nie mają.

**Poziom KROKU — 19 pól:**

| pole | odbiorca | werdykt |
|---|---|---|
| `tytul` | `rysujKrok` → `.mp-tryb__nazwa-kroku` | ✓ (naprawione W30, przeb. 22) |
| `badge` · `czas` · `minutnik` | pigułka czasu, kafle minutników | ✓ |
| `tekstHtml` · `kryteriumHtml` · `fotoUrl` | treść kroku | ✓ |
| `tekst` · `kryterium` · `foto` (surowe) | skonsumowane w parserze przez wersje `*Html` / `fotoUrl` | ✓ pochodne |
| `skladniki` (klucze) | skonsumowane przez `skladnikiTeraz/Dalej/Zuzyte` | ✓ pochodne |
| `skladnikiTeraz` · `skladnikiDalej` · `skladnikiZuzyte` | listy kroku i pełna lista | ✓ |
| `zamienniki` (surowe) | skonsumowane przez `zamiennikiWgKlucza` | ✓ pochodne |
| `zamiennikiWgKlucza` | marker `i` w `wierszSkladnika` | ✓ |
| `zamiennikiPominiete` | **parser**, ostrzeżenie przy limicie 2 (linie 487–493) | ✓ diagnostyczne, świadomie poza overlayem |
| `numer` · `zIlu` | **zero, w kodzie i w komentarzach** | **M-A** — dwie drogi do jednej liczby |

**Poziom SKŁADNIKA — 11 pól:**

| pole | odbiorca | werdykt |
|---|---|---|
| `etykieta` | `.mp-tryb__nazwa-skl`, `aria-label` ptaszka, tooltip | ✓ |
| `key` | `data-mp-klucz`, `zaznaczone[]`, lookup zamiennika | ✓ |
| `nazwa` | etykieta + gałąź opakowaniowa w parserze | ✓ |
| `ilosc` · `iloscDo` · `jednostka` · `pin` · `tresc` | skonsumowane przez `etykieta` (mierzy **G02–G06**) | ✓ pochodne |
| `produkt` · `produktSlug` | `podepnijProdukty()` + gałąź „n × N g" w parserze; join = **Z7/Z8** | ✓ pochodne, staging |
| `iloscPrzeliczona` | **zero, w całym drzewie** — także w parserze po przypisaniu | **M-B** — wartość pośrednia wystawiona na zewnątrz |
| `opakowania` | **zero** — przypisane obok `etykieta`, która i tak niesie tę samą liczbę | **M-B** |

**Poziom WPISU / ZAMIENNIKA — 5 pól:**

| pole | odbiorca | werdykt |
|---|---|---|
| `klucz` · `pytanie` | `data-mp-tooltip`, głowa tooltipa | ✓ |
| `odpowiedzHtml` | skonsumowane przez `tekstHtml` wpisu (parser 468) | ✓ pochodne |
| `link` | świadomie pominięty w tooltipie; karta STRONY → **A7** | ✓ |
| `krotko` | **zero w overlayu**; `data-mp-krotko` na karcie STRONY (parser 566) | **M-C** — patrz niżej |

**M-A · `krok.numer` i `krok.zIlu` — nie brak elementu, tylko drugie źródło liczby.**
Belka liczy „krok n z N" z `stan.krok` i `widok.kroki.length`, obok modelu. Element
NA EKRANIE ISTNIEJE i jest zmierzony (**B4**, tor postępu **W40**), więc to nie jest
kształt `meta`: tam pola nie miał kto narysować, tu rysuje je kto inny. Rozjazd jest
dziś niemożliwy (obie liczby z tej samej listy), a stanie się możliwy dopiero, gdyby
widok kiedykolwiek podawał podzbiór kroków. **Nie zakładam wiersza w A/B** — pole bez
odbiorcy, którego odbiorca istnieje pod inną nazwą, nie jest defektem. `[V]`

**M-B · `iloscPrzeliczona` i `opakowania` — martwe pola parsera, nie braki rysunku.**
Oba są wartościami pośrednimi wyliczenia `etykieta` i oba zostają na kopii składnika
po tym, jak etykieta je już skonsumowała. Wiersz Figmy (`7224:10917`) ma dokładnie
trzy dzieci — checkbox, `nazwa`, ukryty `byk` — więc **nie ma gdzie ich narysować**
i nie ma czego szukać. Zostawiam jako pola pochodne; usunięcie ich jest zmianą parsera
bez skutku na ekranie, czyli ruchem o ujemnej wartości w tej fazie. `[V]`

**M-C · `krotko` — jedyny przypadek, w którym komentarz obiecuje miejsce, którego rysunek nie ma.**
Parser (linia 466) opisuje pole jako „krótka forma **do wiersza**; pełna idzie do tooltipa",
a runtime powtarza to zdanie przy tooltipie („krótka forma jest dla wiersza"). Wiersz
składnika w Figmie takiego napisu nie ma: `7224:10917` = checkbox + `nazwa` + ukryty
`byk`, zmierzone w tym przebiegu przez `get_metadata`, i identycznie w `stan=teraz`
oraz `stan=dalej` (INTERAKCJE §3.1, diff rekurencyjny). HANDBACK §4 mówi zresztą
wprost, że `krótko:` **zdegradowano do opcjonalnego, bo pełny tekst niesie tooltip**.
**Werdykt: pole ma odbiorcę i jest nim karta STRONY (`data-mp-krotko`), nie overlay.**
Defektu nie ma; jest **dryf dokumentacyjny** — dwa komentarze wskazują miejsce, którego
projekt nie przewiduje. To ta sama klasa ryzyka co `meta`, tylko odwrócona: tam kod
milczał o polu, które trzeba narysować, tu kod obiecuje rysunek, którego nie ma.
Poprawka komentarzy: **W-DOK-1** (niżej, poza bilansem — komentarz nie jest ekranem). `[V]`

**Bilans sita po trzech poziomach: 35 pól, 0 nowych defektów.** Przebieg 23 znalazł
cztery usterki na pięciu polach poziomu przepisu; poziomy niższe są czyste. To jest
wynik, nie brak wyniku — reguła pokrycia pól modelu zamyka się tu jako **przemierzona
w całości**, a nie „przejrzana". Klasa „pole modelu bez elementu w kodzie" jest zamknięta.

## Z · Poza pętlą lokalną (pakiet integracyjny, jednostka 10)

Nie wchodzą do liczenia zieleni. Wymieniam je, żeby faza integracyjna była
wykonaniem, a nie projektowaniem — to jest wsad do jednostki 10.

| poz. | pozycja | źródło | gdzie wykonalne |
|---|---|---|---|
| Z1 | wake lock — ekran nie gaśnie podczas odliczania | A6 · I-23 | fizyczne urządzenie |
| Z2 | offline: załadowany DOM działa po odcięciu sieci | A7 · F10 | realna strona |
| Z3 | QR koduje origin **produkcyjny** + `?tryb=gotowanie` | A8 · inw. 8 | staging (kod z `*.webflow.io` = błąd blokujący) |
| Z4 | payload dostarczony przez publisher Webflow, nie z harnessu | A2 | staging |
| Z5 | `?debug=1` widoczny także w podglądzie Webflow (CR6) | W§2 | staging |
| Z6 | canonical przy `?tryb=gotowanie` wskazuje czysty adres | lista decyzji | staging |
| Z7 | join produktów po `@slug` przez ukrytą Collection List | W§2 | staging (CMS) |
| Z8 | `ceil(gramy/opakowanie)` → „2 × 325 g" | W§2 | staging (CMS) |
| Z9 | zdjęcia kroków: match po fragmencie nazwy | A11 | staging (assety) |

---

## Bilans

| sekcja | wierszy | 🟢 | 🔴 |
|---|---|---|---|
| A · parser i model | **16** | **16** | 0 |
| B · układ i geometria | **21** | 19 | **2** |
| C · minutniki | 17 | **17** | 0 |
| D · lista składników | 12 | **12** | 0 |
| E · zamienniki i tooltip | 14 | **14** | 0 |
| F · nawigacja i stany | 15 | **15** | 0 |
| G · porcje, wejścia, progi | 11 | **11** | 0 |
| H · testy negatywne | 12 | **12** | 0 |
| I · higiena | 7 | **6** | **1** |
| W · wykończenie powierzchni | **71** | **71** | **0** |
| **RAZEM (pętla lokalna)** | **196** | **193** | **3** |
| Z · poza pętlą | 9 | — | — |
| ⏸ poza liczeniem (kandydaci na konflikt) | 5 | — | — |

**⏸ poza liczeniem:** W18 (stopień czasu w pigułce zwiniętej), **W46** (czerń tekstu
tooltipa), **W47** (`Material Symbols Rounded` na jednym glifie), **W76** (wypełnienie
ramki zdjęcia zakończenia — dwa sprzeczne odczyty Figmy, za D-23.1), **W77** (barwa kreski
nad pasem dolnym: zieleń na ekranie kroku, atrament na zakończeniu). Każdy czeka na jedno
zdanie operatora, żaden nie blokuje pozostałych wierszy.

**Pomiar przebiegu 28 (stan końcowy): MATRYCA 193/196.** Trzy czerwone, wszystkie
decyzyjne: **B16 · B21 · I4**. Regresja po wpięciu biblioteki QR do parsera:
powierzchnia pełna **2 758 asercji, 14 padnięć** (7 × I5 źródłowe, 7 × B21),
pieczęć `1786798860088`; **zminifikowana 2 653 asercje, ZERO padnięć**, pieczęć
`1786798874322`; konsola **zero wpisów na czternastu ramkach** mimo 22 kB nowego
kodu w parserze. Powierzchnia `qr.html`: `ok: true`, H4 falsyfikowalny i zielony.

**Wcześniejszy zapis w tym samym przebiegu (po jednostce I7): MATRYCA 192/196.** Powierzchnia pełna **2 758
asercji w 7 ramkach, 14 padnięć** (7 × I5 — źródło z definicji nad progiem, 7 × B21 —
znana czerwień decyzyjna), pieczęć `1786798180120`; powierzchnia **zminifikowana
2 653 asercje, ZERO padnięć** — pierwszy raz od założenia tej powierzchni.
**Konsola: zero błędów i ostrzeżeń na czternastu ramkach.** Dwie nowe zielenie:
**I7** (wariant (3) wykonany) i **I5** (na artefakcie, 39 346 zn.). Regresja poza
matrycą: `prog.html` — próg 499/500 `zgodne: true` po obu stronach, bez zmiany.

**Cztery czerwone, które zostały: B16 · B21 · I3 · I4.** Z nich **I3 nie jest decyzją
operatora** — decyzja D-13.1 zapadła (wariant B, biblioteka doklejona do artefaktu
parsera) i wiersz czeka na WYKONANIE, tak jak I7 czekał do tego przebiegu.

**Wcześniejszy zapis (przebieg 27): MATRYCA 190/196.** Powierzchnia pełna **2 737
asercji w 7 ramkach, 14 padnięć** (7 × I5, 7 × B21 — znane czerwienie decyzyjne),
pieczęć `1786796701679`; powierzchnia **zminifikowana 2 632 asercje, 7 padnięć**
(7 × I7). **Konsola: zero błędów i ostrzeżeń na czternastu ramkach.** Sonda świeżości
potwierdza oba minifikaty młodsze od źródeł (39 124 B i 17 663 B). Jedna nowa zieleń:
**A16**, test negatywny paska meta wobec selektora porcji.

**A16 padło przy pierwszym pomiarze — na kontroli pozytywnej, nie na tezie.** Połowa
negatywna („meta identyczne przy 1 i 7 porcjach") przeszła od razu; padła kontrola,
bo czytała `s.tekst || s.ilosc`, czyli pola BAZOWE, których skalowanie z definicji nie
rusza. Poprawiona na `iloscPrzeliczona` — 150 g → 1 050 g. **Gdyby asercja miała samą
połowę negatywną, byłaby zielona od pierwszego uruchomienia i nie dowodziłaby niczego**;
to jest ten sam kształt co kontrola negatywna przy ligaturach w przeb. 21, tylko odwrócony.

**Przebieg 26 — sekcja W bez ani jednej czerwieni i bez luki pokrycia.** Wszystkie
sześć czerwonych w matrycy to **wyłącznie** decyzje operatora: B16 · B21 · I3 · I4 · I5 · I7.
Ostatnia niepokryta powierzchnia zestawu (ekran zakończenia `7195:11178`) dostała
dziesięć wierszy, a W64 — jedyna czerwień pomiarowa, założona świadomie w przeb. 25 —
została zamknięta wraz z obawą, która ją wstrzymywała.

**Pomiar przebiegu 25 (stan końcowy):** powierzchnia pełna **2 646 asercji w 7 ramkach,
14 padnięć** (7 × I5, 7 × B21 — obie znane czerwienie decyzyjne), pieczęć `1786793859081`;
powierzchnia **zminifikowana 2 548 asercji, 7 padnięć** (7 × I7, znana czerwień decyzyjna).
Cztery serie pomiarowe, cztery uzbrojenia `chrome.lock`: W49–W58, W59–W61, W62–W63, W65.
**Konsola: zero błędów i ostrzeżeń na wszystkich czternastu ramkach.**
Inwariant odległości **50/50** (było 42/42) — osiem nowych odległości dołożonych razem
z wierszami W49–W58: `dialog.padding`, `dialog.gap`, `dialog.promien`, `dialog.cta.promien`,
`baner.padding`, `baner.gap`, `baner.promien`, `baner.glif.bok`. Wszystkie identyczne co do
piksela na 320 / 360 / 390 / 440 / 480; kontrola dodatnia (`kolumnaTresci`) dalej się różni.

**Pomiar przebiegu 26 (stan końcowy):** powierzchnia pełna **2 730 asercji w 7 ramkach
(390 na ramkę), 14 padnięć** (7 × I5, 7 × B21 — obie znane czerwienie decyzyjne);
powierzchnia **zminifikowana 2 632 asercji (376 na ramkę), 7 padnięć** (7 × I7, znana
czerwień decyzyjna). **Konsola: zero błędów i ostrzeżeń na wszystkich czternastu ramkach.**
JEDNO uzbrojenie `chrome.lock` na całą serię — dwanaście wierszy (W64, W66–W75) plus dwa
pełne przemiary regresyjne obu powierzchni, przy oknie `hidden` (czwarty przebieg z rzędu),
`outerWidth === 0`, dpr 1,25. Zrzutów nie robiłem i **to jest powód, nie przeoczenie**:
przy oknie ukrytym regresja wzrokowa jest niewiarygodna (W42, przeb. 20), a wszystkie
dwanaście wierszy da się zmierzyć asercją, która nie zależy od widoczności okna.

**Sekcja W: 59 zielonych, jedna czerwień POMIAROWA (W64) założona świadomie na koniec
przebiegu 25** — oracle przeczytany, poprawka odłożona, bo zmienia geometrię mierzoną przez
inne zielone wiersze. To jest jedyny rodzaj czerwieni, który łańcuch zakłada sam sobie:
zapłacony odczyt czekający na jednostkę, która go uniesie. Po raz pierwszy od jej założenia nie ma w niej wiersza
czerwonego pomiarowo — zostały trzy wstrzymane decyzyjnie (W18, W46, W47) i one nie liczą się
do bilansu. Sześć czerwonych w całej matrycy to **wyłącznie** decyzje operatora: B16 · B21 ·
I3 · I4 · I5 · I7.

**Asymetria pary `*-min`, nazwana w przeb. 25.** Bloki ASERCJI w `fixture.html` i
`fixture-min.html` są identyczne i muszą takie zostać — one badają artefakt po minifikacji.
Blok SOND ODLEGŁOŚCI identyczny **nie jest** i nie musi: `fixture-min.html` stoi na wersji
sprzed przeb. 23 (bez `meta.*`, `selektor.*` i bez ośmiu nowych z tego przebiegu).
Minifikacja nie zmienia układu, więc inwariant jest własnością kodu, nie artefaktu, i mierzy
się go raz — na powierzchni pełnej, przy pięciu szerokościach. Zapisuję to jako różnicę
ZAMIERZONĄ, żeby następne ogniwo nie „naprawiało" jej ani nie czytało zdania „para
zsynchronizowana" szerzej, niż ono znaczy.

**Przebieg 21 — 133/138. Największy skok zieleni od przebiegu 8 (+18) i pierwszy
od dziewięciu przebiegów, który nie czekał na operatora.** Domknięta CAŁA sekcja W
w dotychczasowym zakresie (11 czerwonych naprawionych + 6 nowych wierszy pigułki
minutnika, wszystkie zmierzone), plus nowy wiersz B18 (inwariant odległości).

Pomiar: **2 303 asercje w siedmiu ramkach, 7 padnięć — wszystkie to I5 ×7**
(89 952 znaki źródła runtime'u), czyli jedyny wiersz, który pada z powodu
nieostrzygniętej decyzji o kształcie builda. **Konsola: zero na siedmiu ramkach.**
Pieczęć `1786786579131`, adres `…/git/tech/tryb-gotowania/harness/matrix.html`.

**Zostało pięć czerwonych i wszystkie pięć to decyzje operatora:** B16 · I3 · I4 ·
I5 · I7. Zero czerwonych, które łańcuch umie ruszyć sam.

**Przebieg 20 (poprzedni): bilans bez zmian — 112/118.** Sonda D-12.1 po raz
**dziesiąty** czerwono: `outerWidth 0` · `outerHeight 0` · `hasFocus false` ·
`visibilityState "hidden"` · `document.timeline.currentTime` **0** przy
`performance.now()` 6 761 ms, dpr 1,25. **F12 przy widocznym oknie zostaje [I]** —
warunek nie zaszedł ani razu przez cztery przebiegi po przebiegu 18.

Regresja: **cztery kolejne pieczęcie, cztery razy 2 170/2 177** — źródła
`…029344` (`p20a`) i `…064012` (`p20b`), pada wyłącznie **I5** ×7 (`81 996 zn.`);
minifikat `…112529` (`p20c`) i `…135235` (`p20d`), pada wyłącznie **I7** ×7
(detal: siedem tokenów bez znacznika, bo `terser` zdejmuje komentarze).
**Rozłączność padnięć potwierdzona szósty raz.** Konsola **zero na obu
powierzchniach, [V]** — procedurą `clear` → nawigacja → odczyt (nota ✽✽✽✽).
Łącznie osiem niezależnych pieczęci z identyczną liczbą w przebiegach 17–20.

`c1012seek()` z **zimnego startu w TRZECIEJ sesji i trzecim rendererze**: **15/15**
na obu powierzchniach, `ok: true`, przy oknie ukrytym. Podpisy scaleX co do znaku
identyczne z przebiegami 18 i 19 na wszystkich pięciu ramkach portretowych
(`1,0.9,0.8,0.7,0.6,0.7,0.8,0.9,1` / okres 1 000 ms / `1s` / 1 cykl na sekundę;
`1,0.8,0.6,0.8,1,0.8,0.6,0.8,1` / 500 ms / `0.5s` / 2 cykle), barwa i barwa obrysu
`rgb(207, 65, 26)`, kropka 12×12, obrys `0.8px`, `eskalacjaTempem: true`,
`eskalacjaNieBarwa: true`, C12 `stan "zero"` · `animacji 0` · `animationName "none"` ·
odliczanie `0:00`. **Powtarzalność przyrządu jest teraz twierdzeniem o trzech
sesjach, nie o jednej.**

Regresja **wzrokowa** (zrzut przy `outerWidth 0`, zgodnie z faktem z przebiegu 19):
cztery ramki portretowe renderują kartę teriyaki, pola kartowe rozbite na osobne
karty z pytaniem w bold, belka matrycy `błędów konsoli: 0`, jedyna czerwień to
siedem linii I5.

**Nowa, PIĄTA pułapka narzędzia pomiarowego — blokowana WARTOŚĆ, nie nazwa.**
Licznik padnięć zwrócony jako `{ "I7: … `staging: zmienna Webflow` …": 7 }` wrócił
jako `[BLOCKED: Sensitive key]` w miejscu **liczby 7**; ta sama wielkość podana jako
`'liczba=' + n` przeszła bez przeszkód. Trzy pułapki z przebiegu 19 gubiły nazwę
klucza albo cały wynik, ta gubi **wartość liczbową pod „podejrzanym" kluczem** —
i produkuje fałszywy negatyw, który wygląda jak brak pomiaru. Reguła: **liczby
raportuj jako łańcuchy z prefiksem, nie jako gołe wartości pod długim kluczem.**

Pozostałe sześć czerwonych bez zmian: **B16 · C08 · I3 · I4 · I5 · I6** — wszystkie
sześć czekają na decyzję operatora, żadna na pracę łańcucha.

**Przebieg 19: bilans bez zmian — 112/118 — a zieleń C10/C11 przestała zależeć
od jednej sesji.** `c1012seek()` uruchomiony z **zimnego startu w drugiej sesji
i drugim rendererze** zdał **15/15** (5 ramek × C10 · C11 · C12) na OBU powierzchniach
— źródłach i minifikacie — przy oknie zminimalizowanym. Podpisy scaleX co do znaku
identyczne z przebiegiem 18: `1,0.9,0.8,0.7,0.6,0.7,0.8,0.9,1` (okres 1 000 ms)
oraz `1,0.8,0.6,0.8,1,0.8,0.6,0.8,1` (500 ms), barwa `rgb(207, 65, 26)` w obu stanach,
kropka 12×12, obrys 1,5 px po docięciu do dpr 1,25. Kontrola negatywna powtórzona:
czuła na okres i na brak animacji, świadomie ślepa na pauzę jawną, wraca do bazy.
**Zastrzeżenie „jedna sesja, jeden renderer" z przebiegu 18 zdjęte.**

Regresja: **cztery** niezależne pieczęcie, cztery razy **2 170/2 177**
(`…703928` i `…167859` — źródła, pada wyłącznie **I5** ×7; `…925181` i `…054138` —
minifikat, pada wyłącznie **I7** ×7). Rozłączność padnięć potwierdzona **piąty raz**.
Konsola **zero komunikatów na obu powierzchniach, tym razem [V]** — z buforem
wyczyszczonym i trackerem wpiętym PRZED nawigacją (nota ✽✽✽✽).

Przemierzone powierzchnie boczne, wszystkie bez zmian: **`prog.html`** — przycisk
startu widoczny na 499, ukryty na 500, `zgodne: true` obie ramki (G07/H8);
**`qr.html`** — bramka 992 działa (991 zamknięta, 992 i 1024 otwarte),
`h4Falsyfikowalny: true`, **I3 nadal czerwone** (`zadeklarowana: false`,
`ladowana: false`, `zakladana: true`, ostrzeżenie `[MP] brak QrCreator …` na desktopie);
**`nojs.html`** — A8 potwierdzone wzrokowo, pola kartowe czytelne jako surowy tekst.

Zmierzone dodatkowo: **przyrząd nie zanieczyszcza powierzchni** — po serii `c1012seek()`
+ kontroli wszystkie 7 ramek mają overlay zamknięty, 0 minutników i 0 animacji
(łącznie z dwiema poziomymi, których przyrząd nie dotyka). **Okno Chrome ukryte
przy dziewięciu sondach** (`outerWidth 0`, `document.timeline.currentTime 0`) —
**ósme i dziewiąte** potwierdzenie blokady; **F12 przy widocznym oknie zostaje [I]**.

**Uwaga jednostkowa do wiersza I5:** `znakiRuntime` matrycy liczy ZNAKI, a wiersz
i tabela pakietu cytują BAJTY. Minifikat to **34 439 znaków** / 34 516 B (różnica 77 —
polskie znaki w UTF-8); źródła **81 996 znaków** / 83 510 B. Limit embedu i próg
WYM §4 są wyrażone w znakach, więc matryca mierzy właściwą jednostkę, a opis wiersza
— nie. Poprawka redakcyjna do wykonania razem z decyzją o I5.

Pozostałe sześć czerwonych bez zmian: **B16 · C08 · I3 · I4 · I5 · I6**.

**Przebieg 18: pierwsza nowa zieleń od przebiegu 9 — 112/118.** Okno Chrome było
**naprawdę widoczne przez ~90 s** (09:30–09:31): `outerWidth 1536`, `hasFocus true`,
`document.timeline` przyrastający razem z zegarem ściennym. W tym oknie wykonane
`MP_MATRYCA.c1012()` — przyrząd, na który wiersze **C10** i **C11** czekały sześć
przebiegów — i zdało 5/5 ramek: przyrost animacji **1 300 ms** wobec **1 303 / 1 308 ms**
ściennych, puls **1×/s → 2×/s**, barwa identyczna, `0:00` gasi animację całkowicie.
Zaraz potem okno wróciło do zminimalizowanego (`outerWidth 0`) — warunek był
**przechodni i nie jest odtwarzalny na żądanie** (patrz nota ✽✽).
Regresja czysta: 2 177 asercji, **2 170** zielonych, jedyne padnięcie **I5** ×7 —
zmierzone dwa razy (pieczęcie `…004008`, `…123603`), konsola **zero komunikatów**
przy trackerze wpiętym PRZED nawigacją. Trzeci przemiar na powierzchni
zminifikowanej (`…458269`): **2 170/2 177**, pada wyłącznie **I7** ×7 — trzecie
potwierdzenie rozłączności padnięć z przebiegu 17. **Puls zmierzony także na
minifikacie** (`c1012seek()` przeniesione do `matrix-min.html`, 15/15, podpisy co
do znaku identyczne ze źródłami) — pomiar wykonany przy oknie już zminimalizowanym,
czyli możliwy wyłącznie dzięki przyrządowi przewijanemu (nota ✽✽✽).
Pozostałe sześć czerwonych: **B16 · C08 · I3 · I4 · I5 · I6** — wszystkie na decyzję
operatora, żadna na pracę łańcucha.

**Przebieg 16: regresja czysta, bilans bez zmian — 110/118, ale jeden zielony wiersz
przestał być zielony z niewłaściwego powodu.** 2 177 asercji w siedmiu ramkach, jedyne
padnięcie I5 (`81 996 zn.`), konsola czysta, pieczęć zgodna. Nowa powierzchnia
`harness/qr.html` + `harness/qr-ramka.html` (991 / 992 / 1024 px) domyka dwa wiersze
naraz: **H4 stał się falsyfikowalny** (nota ¶) i **I3 dostał pomiar zamiast kreski**.
Drugą jednostką rozbrojona **mina pod F12** (nota ¶¶¶): wiersz padał przy widocznym
oknie operatora, czyli dokładnie przy jedynej interwencji, o którą łańcuch prosi.
Okno Chrome nadal ukryte (`outerWidth: 0`) — **szóste** niezależne potwierdzenie
blokady C10/C11.

**Przebieg 15: regresja czysta, bilans bez zmian — 110/118.** 2 177 asercji w siedmiu
ramkach (311 × 7), **jedyne padnięcie: I5** (`81 996 zn.`, zgodnie z przebiegiem 14),
konsola bez błędów i ostrzeżeń. Runtime nie dotknięty w tym przebiegu; zmiany są
wyłącznie w dokumentach. Nowe w tym przebiegu: **C08 zmierzone na obu powierzchniach**
(nota ††) i **B16 potwierdzone na żywo** (`@font-face` = 0 w załadowanym runtimie,
rodziny fontów to wyłącznie DM Sans i stosy systemowe — czerwień nie jest już
wnioskiem z lektury kodu). Okno Chrome nadal ukryte (`outerWidth: 0`), **piąte
niezależne potwierdzenie blokady C10/C11**.

**Przebieg 13: regresja czysta, bilans bez zmian.** 2 177 asercji w siedmiu ramkach
(311 × 7 — liczba identyczna z przebiegiem 12), **jedno padnięcie: I5** (`81 309 zn.`),
czerwone z pomiaru. Konsola bez błędów i ostrzeżeń na pięciu szerokościach portretowych
i obu poziomych, więc I1 i I2 trzymają. Runtime nie dotknięty — `*.min.js` i wiersz I5
zostają ważne. C10/C11 przemierzone trzecim niezależnym podejściem, patrz nota ※.

**Sekcje F i H domknięte w przebiegu 9.** ~~Osiem~~ **Sześć** pozostałych czerwonych nie czeka
już na pracę, tylko na decyzję: **C08** (sprzeczność wiersza z R10),
~~**C10–C11** (okno Chrome ukryte — patrz nota ※; C12 zzieleniało w przebiegu 12)~~
**— C10 i C11 zzieleniały w przebiegu 18, patrz nota ✽✽**, **B16/I4**
(NIE „subset poza originem" — zmierzone w przebiegu 11, patrz niżej), **I3** (biblioteka QR niewpięta), **I5**
(rozmiar — wymaga kroku budowania), **I6** (wiersz bez mechanicznego oracle'a).
Wszystkie na liście decyzji w STAN.md. **Zieleń zależna wyłącznie od łańcucha jest
wyczerpana** — 109 to sufit pętli lokalnej bez ruchu operatora.

†† **C08 ROZSTRZYGNIĘTE 2026-08-15 (D-15.3, wariant A — operator).** Wiersz dotyczy
**powierzchni listy składników**; źródło poprawione z `I-15/I-16` (pigułka) na `I-12`
(„zamknięcie listy rozwiniętej", ta sama luka `§4/G5`, adnotacja „glif
`keyboard_arrow_down` / `⌄` obecny w wierszu"). Numery pigułki stały w kolumnie źródła
przez pomyłkę i to ona robiła z wiersza sprzeczność z R10. Powierzchnia jest teraz
nazwana w treści wiersza wprost, żeby ta sama pomyłka nie wróciła.
Zachowanie pigułki NIE jest regresją i nie ma własnego wiersza: opisuje je zielony
**C07** (szewron obecny ⟺ pigułka rozwinięta `pelna`) i pozostaje jak było.

Pomiar leżał gotowy pod obie odpowiedzi od przebiegu 15, metoda „oko" → `DOM`:

- **powierzchnia listy składników** (`.mp-tryb__wiecej-glif`): zwinięta `⌄` → rozwinięta
  `⌃` → z powrotem `⌄`, **zgodnie na 320 / 360 / 390 / 440 / 480**, przez
  `MP.tryb.lista(false|true)` i `listaOtwarta()`. Obrót jest i jest odwracalny. [V]
- **powierzchnia pigułki minutnika** (`.mp-tryb__szewron`): glif to `⌃` w OBU stanach;
  przy zwinięciu szewron nie obraca się, tylko **znika** (`hidden === true`,
  `display: none`) — zmierzone na tych samych pięciu szerokościach na pigułce
  uruchomionej z `rozwinieta: true` + podpowiedź. [V]

Czyli: **na pigułce wiersz nie może zzielenieć bez zmiany R10** (szewron istnieje
wyłącznie w formie `pelna`, więc `⌄` nie ma kiedy się pokazać — to samo, co mierzy
zielony C07), a **na liście składników jest zielony już dziś**. Decyzja o brzmieniu
należy do operatora i jej nie wyprzedzam; pomiar leży gotowy pod obie odpowiedzi.
Sprzężenie z brakiem `⌃` w subsecie (§3b pakietu) dotyczy wyłącznie migracji na
ligatury i nie zmienia tego wyniku.

※ **C10–C12: metoda zmieniona z GIF na Web Animations API (przebieg 12) — w GÓRĘ.**
GIF odpowiada na pytanie „czy coś się rusza i mniej więcej jak szybko"; przy ~10 fps
rozróżnienie 1×/s od 2×/s to liczenie klatek na oko. `Animation.currentTime` biegnącej
animacji daje okres z dokładnością do milisekundy. Zastrzeżenie, przez które te wiersze
były czerwone, jest jednak prawdziwe i zostało zamknięte, a nie obejściem przykryte:
`getComputedStyle().animationDuration` mówi wyłącznie, co ZADEKLAROWANE — dokładnie to
mierzą asercje „(wsparcie)" w `fixture.html` i dlatego same nigdy nie wystarczały.
Sonda `MP_MATRYCA.c1012()` dokłada brakującą połowę: `currentTime` odczytany dwa razy
w odstępie mierzonym `performance.now()` musi przyrosnąć o tyle, co zegar ścienny.

**Przebieg 13 domknął pytanie o obejście: nie ma go.** Zamrożona jest oś czasu
dokumentu, a nie JavaScript — `performance.now()` i `setTimeout` biegną normalnie,
`document.timeline.currentTime` nie przyrasta ani o milisekundę (0 ms / 1 866 ms).
Sprawdzone i negatywne: `window.focus()` + `top.focus()` ze strony, świeża karta
(przebieg 12), sterowanie pulpitem (uprawnienia puste, tryb tłowy z definicji nie
wynosi okna na wierzch). **Jedynym wejściem do C10 i C11 jest niezminimalizowane okno
operatora z aktywną kartą harnessu** — koszt po stronie łańcucha ~4 s.

**Domknięte w przebiegu 18: to wejście naprawdę otworzyło się na ~90 s i wystarczyło.**
Zdanie „jedynym wejściem jest niezminimalizowane okno operatora" było prawdziwe co do
`c1012()` i **niepełne co do wierszy** — przebieg 18 zbudował drugie dojście, które
zegara nie potrzebuje, bo go USTAWIA (nota ✽✽✽). Oba przyrządy zgodne. Wycena „~4 s
po stronie łańcucha" potwierdzona: seria zajęła 2,6 s.

**C12 nie potrzebuje zegara i dlatego jest zielone.** „Puls wygaszony" to STAN, nie
zdarzenie w czasie: `getAnimations()` zwraca pustą listę, `animation-name: none`,
kropka 12×12, `0:00`, `pozostalo === 0`. Zmierzone w pięciu ramkach portretowych,
dwa niezależne przebiegi sondy, konsola czysta.

**C10/C11 mają zmierzone WSZYSTKO poza biegiem** (5×, dpr 1.25): stan `ostatnia-minuta`
/`koncowka`, kropka 12×12, `rgb(207, 65, 26)` identyczny w obu stanach (eskalacja
tempem, nie barwą — G3 potwierdzone pomiarem), okres BIEGNĄCEJ animacji 1000 ms → 500 ms
(dokładnie 2×), `iterations === Infinity`, obrys 0.8px = floor(1.5 × 1.25) zgodnie
z regułą docinania. Czerwone jest jedno: przyrost `currentTime` = **0 ms przy 2297 ms
zegara ściennego**.

**Powód nazwany dokładnie, i jest inny niż zapisano w przebiegu 6.** Nie „karta
pomiarowa w tle, więc GIF nie nagra", tylko: okno Chrome operatora jest ukryte, więc
`document.timeline.currentTime` **nie przyrasta w ogóle** (0 ms / 994 ms zmierzone
wprost) i renderer bywa zamrożony (`Page.captureScreenshot` padło po 30 s). W takim
dokumencie nie działa ŻADEN przyrząd czasowy — ani GIF, ani rAF, ani WAAPI. Świeżo
utworzona karta też startuje jako `hidden`, więc nie da się tego obejść od strony
łańcucha. Do zieleni potrzeba **niezminimalizowanego okna Chrome z aktywną kartą
harnessu**; wtedy pomiar to jedno wywołanie `MP_MATRYCA.c1012()` trwające ~4 s, a nie
sesja nagraniowa. Pozycja na liście decyzji przeformułowana z „zgoda na kartę na
wierzchu" na to.

**Przebieg 14 dołożył czwartą próbę i zamknął ostatnią otwartą drogę.** Sprawdzone:
`window.open` z `popup=yes` — przebieg 12 testował świeżą KARTĘ, a karta dziedziczy
widoczność okna; popup to nowe okno na poziomie systemu, więc hipoteza była realna.
Wynik: `window.open` zwraca `null`, bo brakuje aktywacji użytkownika. Domiar, który
z tego wyszedł, jest ważniejszy od samej próby: **kliknięcie wykonane narzędziami
Claude-in-Chrome NIE produkuje aktywacji użytkownika** — po `left_click`
`navigator.userActivation.hasBeenActive` pozostaje `false`. To zamyka nie tylko
popup, lecz całą rodzinę obejść wymagających gestu (Fullscreen API, `wakeLock`
z gestu, Web Share, zapis do schowka). Zapisane tutaj, żeby żadne przyszłe ogniwo
nie liczyło na gest.

**Audyt fałszywej zieleni — negatywny, i to jest dobra wiadomość.** Skoro dokument
jest zamrożony, a `playState` kłamie, powstało pytanie, czy któryś ZIELONY wiersz
nie stoi na przyrządzie czasowym. Sprawdzone `grepem` po harnessie: `playState`
występuje **wyłącznie** w `MP_MATRYCA.c1012()` i wyłącznie w koniunkcji z przyrostem
`currentTime`; `requestAnimationFrame` **0 ×**. Wiersze, które wyglądają na czasowe
(C17, G09, F15), mierzą stan po ręcznym przewinięciu zegara albo obliczony styl —
żaden nie potrzebuje osi czasu dokumentu. **Zamrożony dokument niczego w matrycy
nie nadmuchał.**

**Pułapka warta zapamiętania: `playState` kłamie.** W zamrożonym dokumencie animacja
raportuje `playState === 'running'` i poprawny `animationDuration`, a mimo to nie
posuwa się o milisekundę. Asercja oparta na `playState` byłaby zielona i fałszywa —
jedynym oracle'em biegu jest PRZYROST `currentTime` porównany z zegarem niezależnym.

† **G09 zmierzone metodą DOM, nie GIF-em (przebieg 7).** Karta pomiarowa jest w tle,
więc animacji nie da się nagrać (przebieg 6, C10–C12). Pytanie wiersza dotyczy jednak
stanu minutnika, nie ruchu piksela: przewinięcie zegara przy widocznym scrimie zmienia
napis odliczania, a to jest dokładnie „nie zatrzymuje się". Zmiana metody, nie wiersza —
odnotowana, żeby nie wyglądała na obniżenie poprzeczki.

‡ **F4 i F12 — zmiana metody odnotowana (przebieg 9).** F4 przeszło z „oko" na `DOM`:
pytanie wiersza brzmi „czy «wstecz» wychodzi z overlaya", a to jest stan wpisu
w historii plus atrybut `data-otwarty` — okiem widać tylko, że coś zniknęło, nie czy
zniknął też wpis. Mierzy RODZIC matrycy (`MP_MATRYCA.f4()`) i mierzy w JEDNEJ ramce,
bo historia sesji jest wspólna dla ramki i dokumentu nadrzędnego; pozostałe ramki
dostają `MP_BEZ_HISTORII = true`. F12 ma OBIE metody: `DOM` na pięciu szerokościach
(forma pigułki, stan `zero`, komunikat, trzy przyciski, składanie BOTTOM z R6) i „oko"
raz, w ramce 390, bo „komunikat i trzy przyciski" to zdanie o tym, co widać.

‡ **F15 i G10 zmierzone metodą DOM zamiast „oko" (przebieg 8) — w GÓRĘ, nie w dół.**
F15 pyta o brak zgadywanej animacji: „nie widzę ruchu" i „nie ma przejścia" to przy
60 Hz dwa różne zdania, a `transitionDuration`/`animationName` odpowiadają na drugie.
G10 pyta o powrót do portretu **bez utraty stanu** — okiem widać, że scrim znikł,
ale nie widać, czy minutnik dalej ma te same 1934 s i czy overlay to wciąż ten sam
węzeł. Rotację wykonuje RODZIC matrycy (`MP_MATRYCA.g10()`): zmiana `width`/`height`
iframe'a jest dla treści tym samym zdarzeniem, co obrót telefonu, bo media query pyta
o viewport, nie o urządzenie. Ramka sama siebie nie przewymiaruje — dlatego probe
mieszka w `matrix.html`, a nie w `fixture.html`.

## Stan na przebieg 9 — 109/118 (F4 · F12 · I7 · H10; sekcje F i H domknięte)

**310/311 asercji w siedmiu ramkach** (było 293), konsola czysta. Jedyna czerwona
jest czerwona z pomiaru i zostaje: **I5**, patrz niżej.

**H10 — test negatywny o ŹRÓDLE DANYCH, nie o wyglądzie.** „Nie czyta kwoty zniżki
z Site Settings" nie da się zmierzyć ekranem: *na ekranie nie widać kwoty* jest
prawdą także wtedy, gdy runtime kwotę czyta i chowa. Wiersz dostał więc trzy
niezależne oracle: **(a)** zero identyfikatorów zniżki w KODZIE pobranym po HTTP,
z **wyciętymi komentarzami** — bo plik ma prawo o wykluczeniu wspominać i wspomina;
**(b)** budowa ekranu zakończenia nie wykonuje **ani jednego** zapytania do
dokumentu (podmieniony `querySelector`/`querySelectorAll`/`getElementById` liczy
odczyty, nie ich skutek) — skoro nie pyta, nie ma skąd czytać; **(c)** zero kwot
i zero znaku waluty w tekście overlaya, bo „zero zapytań" nie wyklucza literału.
Wiersz przeszedł z `1×` na `5×`: skoro mierzy się przy okazji ekranu zakończenia,
kosztuje tyle samo na pięciu szerokościach.

To jest odpowiedź na to, dlaczego **C6 był świadomym cięciem zakresu, a nie
uchyleniem D9**: D9 wraca razem z mechaniką, a do tego czasu wiersz pilnuje, żeby
odczyt kwoty nie wrócił bokiem — bez powierzchni, która by go pokazała.

**F12 — S5 to nie ekran, to stan pigułki.** Klatka `7240:10900` składa się z reguł,
które już stoją: BOTTOM 347 = `stos` 267 + nawigacja 80, a 267 = pigułka pełna 255
+ 12. Zmierzone w ramce 390: pigułka 255 przy podpowiedzi 57 — czyli `198 + H`
piąty raz z rzędu. „Trzy przyciski" z wiersza to primary 48 + dwa ghosty po 48,
czyli skład pigułki PEŁNEJ w stanie `zero`; S5 nie dokłada widżetów, tylko wymusza
formę. Zrzut wzrokowy potwierdza komplet: kropka alarmu, `0:00`, szewron `⌃`,
trzywierszowy komunikat, „uruchom ponownie" + „dodaj minutę" + „zamknij minutnik".

**Nasłuch zmierzony zdarzeniem PRAWDZIWYM, powrót — wymuszeniem.** Karta pomiarowa
jest w tle, więc `visibilityState` czyta 'hidden' przez cały pomiar. To jest zaleta,
nie przeszkoda: `document.dispatchEvent(new Event('visibilitychange'))` odpala
dokładnie tę gałąź, którą odpala wygaszenie telefonu, więc brak nasłuchu zostawiłby
`uspione()` puste i wiersz by się zapalił. Powrotu do widoczności karta w tle nie
zobaczy nigdy — ta połowa idzie przez wymuszenie stanu, tak samo jak hak `MP.zegar`
przy minutnikach. Zmiana metody odnotowana, nie przemilczana.

**TEST NEGATYWNY, bez którego wiersz byłby pusty:** minutnik, który doszedł do zera
przy WIDOCZNYM ekranie, S5 nie dostaje. Bez tego przeszłaby implementacja „rozwiń
wszystko, co stoi na zerze" — czyli kara za każde przełączenie się do przeglądarki.
S5 należy się wyłącznie minutnikowi, którego koniec został PRZEGAPIONY, więc runtime
zapamiętuje przy wygaszeniu, co biegło.

**F4 — mierzone pozycją w historii, nie jej długością.** `history.length` po
pierwszym pomiarze przestaje rosnąć (kolejny `pushState` nadpisuje wpis „do
przodu"), więc przyrost długości mierzyłby to, czy sonda biegnie pierwszy raz.
Oracle jest stan wpisu: `{mpTryb:true}` po otwarciu, brak po „wstecz".

**Pierwsze przejście F4 czerwone — i znów w asercji, nie w runtimie.** Sonda pytała
„czy po `back()` wpis zniknął", stojąc na historii, w której leżały TAKIE SAME wpisy
zostawione przez sam blok samosprawdzenia: blok otwiera i zamyka overlay kilka razy
w jednej turze pętli zdarzeń, a `history.back()` jest asynchroniczny, więc sync-owe
`pushState` wyprzedzają swoje `back()`. Produkcja tego nie robi — między zamknięciem
a otwarciem zawsze mija tura — więc poprawka poszła do sondy, nie do runtime'u:
sonda najpierw ODSĄCZA wpisy `{mpTryb}` do czystej linii bazowej. Efekt uboczny jest
lepszy od wymaganego: przebieg zostawia historię KRÓTSZĄ, niż zastał (11 → 8), a
druga sonda z rzędu odsącza już zero. To czwarty raz w tym łańcuchu, kiedy defekt
siedzi w asercji; wszystkie cztery miały tę samą postać — **asercja pytała o coś
innego niż wiersz, bo milcząco zakładała warunki, których nikt nie ustawił.**

**I7 — „oznaczone" znaczy dwie rzeczy i obie są mierzone.** (a) każdy zadeklarowany
token ma znacznik w swojej linii, (b) w źródle nie ma ANI JEDNEJ definicji `--mp-*`
spoza listy. Bez (b) wiersz pilnowałby wyłącznie higieny tablicy, którą sam wskazuje,
a token dałoby się przemycić prosto do arkusza. Oracle to plik pobrany po HTTP —
ten sam, który pójdzie do embedu — a nie moja lektura kodu.

**I5 — czerwone z LICZBĄ, i to jest najważniejszy wynik tego przebiegu.**
`tryb-gotowania.js` ma **81 309 znaków**, `przepis-parser.js` **39 124**. Limit
embedu Webflow to 50 000 na element, a WYM §4 chce < 40 000. Runtime SAM przekracza
limit twardy o 63 %; razem z parserem to 120 433 znaków, czyli 2,4 × limit. Pin
z STAN.md „22 KB mieści się" opisuje parser sprzed rozbudowy i **jest nieaktualny**.
Wiersz nie jest do zamknięcia pracą redakcyjną — wymaga decyzji o kroku budowania.
Szczegóły i trzy warianty: lista decyzji, przebieg 9.

**I6 — wiersz bez mechanicznego oracle'a, i to jest odpowiedź, nie porażka.**
„KAŻDE zachowanie nienarysowane oznaczone" wymaga wyliczenia zbioru zachowań
nienarysowanych, a tego nie da się wyprowadzić ze źródła — trzeba go mieć skądś.
Wymyślenie oracle'a po to, żeby wiersz zzieleniał, jest dokładnie tym, przed czym
ostrzega nagłówek tej matrycy. Pozycja na liście decyzji: albo rejestr luk
(G1–G12 + nazwane w STAN) jako oracle, albo przeformułowanie wiersza.

---

## Stan na przebieg 8, seria czwarta — 105/118 (sesja w localStorage)

**293/293 asercji w siedmiu ramkach**, konsola czysta, dwa przeładowania. Wiersz **F8**.
Jeden klucz `mp-tryb:<id>` niesie cały stan sesji (WYM §6: „nic poza swoim kluczem"),
zapis idzie przy KAŻDEJ zmianie kroku — sesja urywa się zamknięciem karty albo
wygaszeniem telefonu, czyli wtedy, gdy żaden handler zamknięcia się nie wykona.

**Dwa czerwone pierwszego przejścia, oba w asercji, oba pouczające.** (1) Symulacja
„zamknąłem i wróciłem" robiona przez `pokazKrok(1)` NADPISYWAŁA zapis, który miała
odtworzyć — zapis był 6/3, a wznowienie wracało na krok 1. Test mierzył własny skutek
uboczny. (2) Kontrola „nie zapisuje nic poza swoim kluczem" porównywała cały magazyn,
więc zapalała się na własnym, oczekiwanym kluczu — wiersz mówi „poza swoim", a asercja
pytała „nic". Poprawione na porównanie kluczy CUDZYCH.

## Stan na przebieg 8, seria trzecia — 104/118 (cień `drop_shadow_ui`)

**290/290 asercji w siedmiu ramkach**, konsola czysta. Jeden wiersz: **B17**. Cień
siedzi na BOTTOM, nie na belce — belka ma wyłącznie `backdrop-filter` (B5), i to jest
osobne rozstrzygnięcie, nie niekonsekwencja. Asercja pyta o ZNAK offsetu, nie tylko
o obecność `box-shadow`: cień rzucany w dół byłby na pasie przy krawędzi ekranu
niewidoczny, więc „jest cień" przepuściłoby defekt na stałe. Zmierzone:
`rgba(62, 43, 34, 0.05) 0px -1px 2px 0px, rgba(62, 43, 34, 0.1) 0px -4px 8px -2px`.

## Stan na przebieg 8, seria druga — 103/118 (ekrany start / S1 / zakończenie)

Jednostka W7 zamknięta. **288/288 asercji w każdej z siedmiu ramek** (było 278), zero
wpisów w konsoli, dwa niezależne przeładowania, zrzut trzech ekranów. Sześć nowych
zielonych: **B11 · D8 · F9 · F13 · H11 · G01**. Sekcje **A, D i G w 100 % zielone**.

**Defekt runtime'u złapany pomiarem — i tylko w ramce poziomej.** Wypełnienie paska
w karcie S1 wyszło 402 zamiast 392 przy 667×375: szerokość toru była liczona w trakcie
budowania TOP-u, a dalsza treść dokładała potem pasek przewijania i zwężała kolumnę
o 15 px. 402 = round(6/9 × 603) — poprawna reguła na nieostatecznej liczbie. Ta sama
rodzina co E7 z przebiegu 7, tylko z drugiej strony: tam pasek zmylił asercję, tu
runtime. **Pomiar szerokości wzięty w trakcie budowania poddrzewa jest pomiarem stanu
przejściowego.**

## Stan na przebieg 8, seria pierwsza — 97/118 (dialog S4, baner offline S3, loader, rotacja)

Jednostka W6 zamknięta. **278/278 asercji w każdej z siedmiu ramek** (było 261), zero
wpisów w konsoli, potwierdzone dwoma niezależnymi przeładowaniami, plus zrzut ramek
320/360/390 z otwartym S4 i ramek 440/480 z banerem offline nad biegnącą pigułką.
Sześć nowych zielonych: **F7 · F10 · F11 · F14 · F15 · G10**.

**Jeden defekt, wyłącznie w harnessie, i pouczający.** Pierwsze przejście dało 276/278
w każdej ramce: dwa czerwone E11 („tooltip nie stawia scrima"). Przyczyna nie leżała
ani w tooltipie, ani w banerze — od tego przebiegu odmowa trzeciego minutnika OTWIERA
dialog S4, a test negatywny H7 z sekcji C zostawiał ten dialog otwartym. Scrim dożywał
do sekcji E i zapalał cudzy wiersz. Nauka na przyszłe jednostki: **gdy zachowanie
zyskuje widoczny skutek, starsze testy negatywne tego zachowania stają się jego
producentami stanu** — trzeba je przejrzeć, nie tylko dopisać nowe.

## Stan na przebieg 7 — 91/118 (tooltip zamiennika, dialog S2, domiar orientacji)

Jednostka W4 zamknięta. **253/253 asercji w każdej z siedmiu ramek** (było 231), zero
wpisów w konsoli w każdej ramce, potwierdzone dwoma niezależnymi przeładowaniami, plus
zrzut pięciu ramek portretowych z otwartym tooltipem, aktywnym kaflem minutnika
i nawigacją na wierzchu. Dwanaście nowych zielonych: **E4 · E7 · E8 · E9 · E10 · E11 ·
E12 · E13 · G08 · G09 · G11 · H12**. **Sekcja E domknięta w 100 %.**

**Pierwsze przejście dało 248/249 w pionie i 242–243/249 w poziomie.** Wszystkie pięć
defektów siedziało w ASERCJACH, nie w runtimie — i każdy z nich mierzył ramkę zamiast
reguły:

1. **E7 pytał o `innerWidth`, a kolumna treści to `clientWidth` TOP-u.** W ramkach
   poziomych TOP ma własny pasek przewijania i kolumna jest o 15 px węższa; tooltip
   idzie za kolumną i dostawał 588 przy oknie 667. Skutek uboczny, wart zapamiętania:
   **296 px jest prawdziwe tylko bez paska przewijania** — na telefonie (paski
   nakładkowe) wyjdzie 296, w podglądzie desktopowym 281.
2. **E8 zakładał, że tooltip zawsze jest POD wierszem.** W ramce 375 px wysokości ten
   sam wiersz odbija się nad siebie — czyli asercja kotwicy przeczyła E13. Kotwica jest
   teraz odległością 8 px po tej stronie, po której popover wypadł.
3. **E11 liczył scrim ORIENTACJI jako scrim tooltipa.** W ramkach poziomych jest on
   widoczny z definicji (media query, WYMAGANIA §1) — inny mechanizm, wykluczony jawnie.
4. **Kontrola negatywna E13 mierzyła wysokość BOTTOM-u, nie warunek odbicia.** Z pigułką
   rozwiniętą pełną BOTTOM ma ~336 px, więc w ramce 390 granica odbicia wypada 54 px od
   góry i „wiersz z zapasem miejsca" nie istnieje. Kafel sprzątany jest teraz PRZED E13.
5. **E4 pytał o wysokość fragmentu 24 px.** Pudełko inline ma wysokość pola czcionki
   (21 px przy piśmie 16), a 24 to skok WIERSZA. Regułą jest więc odległość między
   kolejnymi fragmentami, nie ich wysokość.

**Tooltip zbudowany jako popover, nie modal**, i to jest różnica wykonawcza, nie opisowa:
brak scrima, brak `aria-modal`, treść pod spodem zostaje interaktywna, minutnik biegnie
dalej (zmierzone: 9:51 na zrzucie, napis zmienia się przy otwartym tooltipie).
Szerokość dana jako `left/right: 32`, nie `width: 296` — 296 jest wartością reguły
w klatce kanonicznej 360, a mierzymy pięć szerokości.

## Stan na przebieg 5 · seria druga: 42/118 — szkielet overlaya

Jednostka W1 (szkielet warstwy widoku) zamknięta w tym samym przebiegu, drugą serią
pomiarową. **145/145 asercji w każdej z siedmiu ramek** (było 113), zero wpisów
w konsoli. Dziewięć nowych zielonych: **B1 · B4 · B5 · B6 · B10 · B12 · B13 · B15**
oraz **B14**.

**Pierwsze przejście serii dało 142/145 — trzy czerwone, obie przyczyny realne.**
Zapisuję je, bo są dokładnie tym, po co jest pomiar:

- **`box-sizing` — defekt runtime'u.** `height: 80` na pasku nawigacji z dopełnieniem
  18/16 dawało **116 px** border-box. Wszystkie liczby w `GEOMETRIA.md` to wymiary
  PUDEŁKA (Figma nie zna content-boxa), więc runtime dostał `box-sizing: border-box`
  na overlayu i wszystkim w środku. Przegląd kodu tego nie łapie — CSS wyglądał
  poprawnie.
- **Pasek przewijania strony — defekt, który na telefonie byłby niewidoczny.**
  `position: fixed; inset: 0` bez zablokowania przewijania strony jest o szerokość
  paska WĘŻSZE niż viewport (na desktopie 15 px: 305 zamiast 320), więc kolumna
  treści przestawała być „szerokość ekranu − 32". Runtime blokuje teraz przewijanie
  strony pod overlayem i przywraca poprzednią wartość przy zamknięciu. Kuszące było
  osłabienie asercji do `documentElement.clientWidth` — to zamiotłoby defekt pod
  dywan i zostawiło go na podglądzie desktopowym.

- **B6** zmierzone na trzech punktach toru (1/9, 6/9, 9/9), nie na jednym: reguła
  `round(n/N × tor)` przy jednym punkcie jest nieodróżnialna od stałej.
- **B12** mierzone po faktycznym przewinięciu do końca (`scrollTop = scrollHeight`),
  nie z samego `padding-bottom`. Dopełnienie może się zgadzać, a treść i tak wpaść
  pod pasek, jeśli BOTTOM urośnie po renderze.
- **B13 · B14** to wiersze o tym, czego NIE ma: zero adnotacji projektanta w tekście
  overlaya, marker jako `<mark>` z `box-decoration-break: clone` i `display: inline`,
  zero prostokątów-atrap.
- **I7 celowo NIE zaliczone.** Asercja sprawdza, że tokeny są zadeklarowane w jednym
  nazwanym miejscu — a wiersz pyta o komentarz `/* staging: zmienna Webflow */`
  w kodzie. Komentarz jest własnością źródła, nie runtime'u; zaliczenie go byłoby
  „zielonym z przeglądu kodu". Zostaje czerwony do pakietu integracyjnego, gdzie
  ma naturalne miejsce.

## Kontekst historyczny — przebieg 5 · seria pierwsza: 33/118, warstwa danych wyczerpana

Jednostka 4 (zamienniki na warstwie danych) zamknięta. **113/113 asercji w każdej
z siedmiu ramek** (było 85), zero wpisów w konsoli w każdej ramce — potwierdzone
dwoma kanałami (przechwytywanie w ramce + `read_console_messages` po przeładowaniu),
`prog.html` 2/2 bez zmian, `nojs.html` potwierdzony wzrokowo na nowym kształcie.
Sześć nowych zielonych: **E1 · E2 · E3 · E14 · H5 · H6**.

- **E1** mierzone na MODELU, nie na rysunku: wiersz pyta, KTÓRY wiersz KTÓREGO
  kroku dostaje marker, a nie jak marker wygląda (to E5). Teriyaki daje trzy
  przypadki bez preparowania treści: krok 1 ma dwa klucze w ramce (`#sojowy`,
  `#limonka` — dokładnie limit), kroki 3 i 9 po jednym, reszta zero. Osobna
  asercja pilnuje, że marker **nie wycieka między krokami**: `#limonka` jest
  w kroku 1 i 9, a w kroku 5 nie ma go ani śladu. To nie jest formalność —
  obiekt składnika jest współdzielony przez kroki, więc flaga postawiona na nim
  zapaliłaby markery wszędzie; stąd `zamiennikiWgKlucza` per krok.
- **E2** ma dwa kierunki: trzy wpisy kluczowane wchodzą, czwarty („Co zamiast
  kurczaka?", bez klucza) nie wchodzi — i jest policzony (`zamiennikiBezKlucza`),
  żeby „nie ma go w trybie" dało się odróżnić od „zgubiliśmy go".
- **E3** zmierzone na obu stronach progu: teriyaki mieści się w limicie (0 pominięć),
  payload spreparowany z trzema kluczami w jednej ramce daje markery `a,b`,
  a `c` wraca na stronę z **ostrzeżeniem, nie błędem** (reguła gęstości to
  wskazówka redakcyjna, nie bramka builda).
- **E14** ma osobną asercję **na brak fałszywego alarmu**: krok 4 teriyaki mówi
  o skrobi („szczypta skrobi wrzucona do oleju"), ale MA ramkę składników, więc
  ostrzeżenie się nie zapala. Bez tej asercji heurystyka przechodziłaby test,
  będąc bezużytecznie czułą.
- **H5** mierzone wokół świeżego `zaladuj()` **bez `pola:`** — czyli tego, co
  runtime robi na produkcji bez opt-inu. Na stronie stoi `#h5-kontrola`: blok
  `text/plain` o innym id, `data-mp-produkty-stare`, `data-mp-polei`,
  `data-mp-surowe-kiedys`, element z klasą `mp-karta`. Porównanie `outerHTML`
  co do znaku przed i po. Gdyby parser kiedykolwiek zaczął selektorować po
  PREFIKSIE `data-mp-` zamiast po nazwach z kontraktu, ten wiersz zapali się
  natychmiast — a bez powierzchni kontrolnej test negatywny byłby pusty.
- **H6** sonduje localStorage kluczami **unikalnymi dla ramki**: siedem ramek
  dzieli jeden origin i wspólna nazwa dawałaby wyścig (ramka B kasuje sondę
  ramki A między jej dwoma snapshotami). Runtime dostał zadeklarowany
  `MP.przepis.kluczLS = 'mp-tryb-gotowania'` — jeden klucz, cała reszta stanu S1
  w jego wartości, bo „nie zapisuje nic poza swoim kluczem" jest sprawdzalne
  tylko wtedy, gdy „swój klucz" ma jedną, nazwaną wartość.

**Warstwa DANYCH jest wyczerpana.** Wszystkie 33 zielone wiersze leżą na modelu
albo na zachowaniu strony bez overlaya. Każdy z 85 pozostałych wymaga warstwy
widoku — od następnej jednostki nie ma już wiersza, który dałoby się zdjąć bez
narysowania overlaya i zmierzenia go wobec `GEOMETRIA.md` §4.1.

## Kontekst historyczny — przebieg 4: 27/118, sekcja A domknięta

Jednostka 2 (pola kartowe Q→A) zamknięta. **85/85 asercji w każdej z siedmiu ramek**
matrycy szerokości, zero wpisów w konsoli w każdej ramce (dwa kanały: przechwytywanie
w ramce + odczyt konsoli karty po przeładowaniu), `prog.html` 2/2 bez zmian,
`nojs.html` potwierdzony wzrokowo. Dziewięć nowych zielonych: **A3 · A5 · A6 · A7 ·
A9 · A10 · A11 · A12 · A13**. Sekcja A jest pierwszą sekcją matrycy w 100 % zieloną —
cała warstwa DANYCH jest zmierzona.

- **A6 · A13**: `wskazowka` → 2 karty, `co-mozesz-zmienic` → 4, `przechowywanie` → 3,
  na payloadzie **dosłownie z `kurczak-teriyaki-v3.md`** (nie na treści wymyślonej —
  pomiar gramatyki na własnym przykładzie mierzyłby wyobrażenie o niej). Pytanie
  renderuje się jako `<h3 class="mp-karta__pytanie">`, `font-weight` 700 na wszystkich
  siedmiu ramkach.
- **A9**: przekształcenie w miejscu potwierdzone tożsamością elementów — kontener
  `[data-mp-pole]` to ten sam obiekt po przekształceniu, a element serwerowy
  `[data-mp-surowe]` zostaje przejęty na PIERWSZĄ kartę zamiast być usuniętym.
  Treść serwerowa przeżywa przekształcenie znak w znak.
- **A7**: link z wpisu → `<a href>` z etykietą bez adresu w treści; placeholder
  `{{url:…}}` **świadomie NIE staje się linkiem** (L-17) i idzie na listę ostrzeżeń.
- **A5**: pole puste → `display: none` na sekcji razem z jej nagłówkiem, zero kart.
- **A3**: trzy klucze istniejące (`#skrobia`, `#sojowy`, `#limonka`) → zero błędów
  (nie fałszywuje); klucz bez odpowiednika → błąd. Dwa kierunki, nie jeden.
- **A10**: `1 x 1 000 g` = 1000 g, także ze spacją twardą i wąską; `2 x 330 g`
  i `1 x 1,5 kg` bez regresji.
- **A12**: ostrzeżenie, nie błąd — model dostał osobną listę `ostrzezenia`, bo `bledy`
  są bramką zero-tolerancyjną (instrukcja §7) i nie wolno ich rozmiękczać.

**Kontekst historyczny — przebieg 3: 18/118.** Pierwsza zieleń w historii łańcucha. Zmierzone
w przeglądarce operatora, przez `http://localhost:8123/` (blokada `file://`
i jej obejście: `STAN.md`, sekcja „BLOKADA (przebieg 3)").

- **48/48 asercji w każdej z siedmiu ramek** matrycy szerokości (320/360/390/440/480
  portret + 844×390 i 667×375 landscape), **zero wpisów w konsoli** w każdej ramce
  — potwierdzone dwoma niezależnymi kanałami: przechwytywaniem w ramce
  (`console.error`/`warn` + `onerror` + `unhandledrejection`) i odczytem konsoli
  karty po przeładowaniu. → **I1, I2, A4, H1, H2, H3, H4**
- **`prog.html`: 2/2 zgodne** — przycisk startu widoczny na 499 px, ukryty na 500 px.
  → **G07, H8**
- **`nojs.html`: ramka z zablokowanymi skryptami renderuje tytuł, badge'e i obie
  karty Q→A**, identycznie z ramką kontrolną; różni je wyłącznie pasek
  diagnostyczny harnessu. → **A8**
- **Panel `?debug=1`**: na payloadzie teriyaki zero błędów i panel się **nie**
  pokazuje (bo nie ma czego pokazać), na payloadzie spreparowanym pokazuje się
  z kompletem wpisów. → **A1**
- **Dziesięć klas walidacji z instrukcji §7** wyzwolonych na dwóch spreparowanych
  payloadach, wszystkie dziesięć trafiły. → **A2, H9**
- **Skalowanie i odmiana** na osobnym payloadzie: `1 łyżka` → `2 łyżki` → `5 łyżek`
  → `1½ łyżki`, `1 limonka` przy ×1,5 → `2 limonki` (w górę), `=` przypięte nie
  rośnie, wiersz bez liczby nietknięty, zakres `2–3` → `4–6`. → **G02–G06**

**Czego ta zieleń NIE obejmuje.** Wszystkie 18 wierszy leży na warstwie DANYCH.
Warstwa widoku nie istnieje, więc sekcje B–F stoją nietknięte, a wiersze A5–A7
i A9–A13 czekają na render. Nic tu nie zostało zaliczone „z przeglądu kodu".

**Pięć wierszy wymaga GIF-a** (C10, C11, C12, C17, G09) — zachowań w czasie nie da
się zmierzyć asercją stanu. Planować je razem, nie po jednym: każde nagranie to
osobne uzbrojenie przeglądarki. Cztery z nich to stany minutnika, które da się
nagrać jednym przebiegiem, jeśli harness pozwoli ustawić start odliczania na
kilkanaście sekund przed `0:00` — inaczej pomiar C11 trwa tyle, co realne
odliczanie. **To jest wymóg wobec harnessu, nie wobec runtime'u** — zanotować przy
budowie jednostki 1.

**Jeden wiersz wymaga wyłączenia JS** (A8) i jeden — pomiaru po obu stronach progu
(G07/H8). Oba są nietypowe dla harnessu iframe'owego i mogą wymagać osobnej ramki
pomiarowej; do rozważenia przy budowie jednostki 1.

→ **Rozstrzygnięte w przebiegu 3.** A8 dostał `nojs.html` (ramka `sandbox` bez
`allow-scripts` obok kontrolnej; ocena wzrokowa, bo sandbox blokuje `postMessage`),
G07/H8 — `prog.html` (ramki 499 i 500 px, asercja na `startWidoczny`). Wymóg
przewijania odliczania dla C10–C12 spełnia hak `MP_TEST.przewin(sek)` w harnessie;
warunkiem jest to, żeby warstwa widoku czytała czas przez `MP.zegar.teraz()`,
a nie `Date.now()` — pozycja na liście decyzji.

---

### Seria druga przebiegu 7 — dialog S2 (F1 · F2 · F3 · F5 · F6)

**261/261 asercji w każdej z siedmiu ramek, pierwsze przejście bez poprawki**, konsola
czysta, zrzut pięciu ramek portretowych z otwartym dialogiem, przyciemnieniem i kaflem
minutnika (6:58) widocznym POD scrimem. Pięć nowych zielonych.

- **`×` w belce nie zamyka już overlaya** — otwiera S2 (I-07). Wyjście jest o jeden tap
  dalej i to jest cała treść wiersza F2.
- **Scrim zmierzony jako 45 % krycia na atramencie**: `color(srgb 0.243 0.169 0.133 / 0.45)`.
  Pytamy o kanał alfa zmierzony, nie o zapis `color-mix` w arkuszu.
- **Dialog to kolumna treści, nie stała 328** — 328 w ramce 360, 288 w 320, 448 w 480.
  Ta sama reguła co przy tooltipie i pigułce.
- **Wyśrodkowany pionowo w obu wariantach** (przesunięcie środka: 0 px). §3b.1 mierzy S2
  8 px poniżej środka i sam nazywa to dryfem; wykonana rekomendacja pliku.
- **F6 jest konsekwencją drzewa, nie osobną mechaniką**: scrim jest rodzeństwem po
  `bottom`, więc BOTTOM zostaje w DOM-ie z niezmienioną wysokością (80 vs 80) i minutnik
  biegnie dalej. Usunięcie BOTTOM-u kosztowałoby przerysowanie kafli i zerwanie odliczania.
- **F1 zmierzone jako test negatywny**: seria zdarzeń wskaźnika i dotyku nad TOP-em nie
  rusza kroku (I-06: „brak jakiegokolwiek zapisu" gestu w Figmie).

## Stan na przebieg 6 — 58/118 (kafle minutników)

Seria: **198/198 asercji w każdej z siedmiu ramek**, zero wpisów w konsoli w każdej
ramce, potwierdzone dwukrotnie (dwie niezależne karty). Szesnaście wierszy zrobiło
się zielonych: **B7 · B8 · B9 · C01 · C03 · C04 · C05 · C06 · C07 · C09 · C13 ·
C14 · C15 · C16 · C17 · H7**.

**Reguła składania BOTTOM (R6) zmierzona, nie przepisana.** Pięć układów w jednej
serii: brak kafli → 80 · jedna zwinięta → 132 · dwie zwinięte → 180 · zwinięta +
rozwinięta krótka → 266 · zwinięta + rozwinięta pełna → 80+40+8+(198+H)+12.
Ostatni układ dał **376** na pięciu szerokościach portretowych (podpowiedź zawija
się do 38 px) i **357** w obu ramkach poziomych (podpowiedź w jednym wierszu, 19 px)
— czyli ta sama reguła daje dwie różne liczby przy tej samej treści. To jest
argument rozstrzygający do **C1** mocniejszy od poprzednich: lista wartości nie
domknie się nawet dla JEDNEGO układu, bo wysokość zależy od zawijania tekstu.

**Zmiana metody w sześciu wierszach.** C13 · C14 · C15 · C16 · C17 miały w kolumnie
`metoda` wpisane `oko`/`GIF`, a zostały zmierzone asercją DOM — bo dają się zmierzyć,
a zrzut i nagranie oceniają. C01 dostał `DOM+oko`: sześć asercji plus zrzut pięciu
ramek portretowych. Zmiana jest w stronę mocniejszej metody, więc ją wpisuję;
w drugą stronę (z DOM na oko) nie wolno jej robić bez pozycji na liście decyzji.

**C10 · C11 · C12 zostają CZERWONE — i to jest wynik pomiaru, nie brak pomiaru.**
Karta pomiarowa w Chrome operatora ma `document.visibilityState === 'hidden'`
(sprawdzone także na świeżo utworzonej karcie): `requestAnimationFrame` nie odpala
się wcale, a `setInterval(…, 16)` jest dławiony do ~1 Hz — 2600 ms próbkowania dało
**trzy** próbki. Animacji, która nie jest renderowana, nie zmierzy ani nagranie GIF,
ani próbkowanie. Zmierzone bezpiecznie: obiekt animacji istnieje i biegnie po
osi czasu (`getAnimations()[0].playState === 'running'`, `duration` 1000 ms), ale to
odczyt deklaracji przez WAAPI, a nie pomiar ruchu — na zieleń nie wystarcza.
Wiersze wsparcia (tempo, kolor, ramka) są w serii i zapalą się, gdy tempo pójdzie
w rozjazd; sam pomiar tempa wymaga karty na wierzchu. Pozycja na liście decyzji.

## Stan na przebieg 6, seria druga — 71/118 (wiersze składników i pełna lista)

Seria: **226/226 asercji w każdej z siedmiu ramek**, zero wpisów w konsoli.
Trzynaście wierszy zielonych: **D1 · D2 · D3 · D4 · D5 · D6 · D7 · D9 · D10 ·
D11 · D12 · E5 · E6**. Sekcja D jest domknięta poza **D8** (przycisk „najpierw
pokaż składniki" należy do ekranu startowego, jednostka późniejsza).

Osiem wierszy miało w kolumnie `metoda` wpisane `oko`, a zostało zmierzonych
asercją DOM (D2 · D3 · D5 · D6 · D7 · D9 · D10 · D12) — zmiana w stronę mocniejszej
metody, tak samo jak w serii pierwszej.

**Trzy asercje trzeba było przeformułować, żeby mierzyły regułę, a nie payload.**
Wszystkie trzy pierwsze wersje przechodziły przez recenzję kodu i padły na pomiarze:

1. **Skok 31 px nie jest regułą — regułą jest odstęp 12.** Wiersz z markerem ma
   20 px (§3.14), więc jego skok to 32. Liczba z klatki opisywała wiersz bez
   zamiennika i tylko jego.
2. **Trzy sekcje pełnej listy nie występują w każdym kroku.** W teriyaki krok 5 ma
   rozkład 0+1+10, więc asercja o trzech nagłówkach mierzyłaby wybór kroku. Krok
   do pomiaru wybierany jest teraz z modelu (pierwszy z trzema niepustymi sekcjami
   — dla teriyaki to krok 3, czyli ta sama klatka, którą Figma rysuje jako kanoniczną).
3. **Skok wiersza mierzy się wewnątrz sekcji.** Przez granicę sekcji leży nagłówek
   i linia; pierwsza wersja zmierzyła 60 px i nazwała to skokiem listy.

**Reguła docinania kresek do pikseli urządzenia (wyprowadzona, `[V]` na dwóch
pomiarach).** Chrome bierze `floor(deklarowane × dpr)`, nie mniej niż 1 piksel
urządzenia: przy DPR 1.5 obrys 1,5 px → `1.33333px` (2 piksele), obramowanie 1 px →
`0.666667px` (1 piksel). Asercje kresek idą teraz przez wspólny predykat `kreskaOK`.
Bez tego każda kreska w projekcie jest wiecznie czerwona na ekranie HiDPI.

## Stan na przebieg 6, seria trzecia — 74/118 (domiar bez nowego kodu)

Seria: **231/231 asercji w każdej z siedmiu ramek**, konsola czysta. Trzy wiersze
zielone bez ani jednej nowej linii runtime'u: **B2 · B3 · C02** — wszystkie dały
się zmierzyć na widoku zbudowanym w seriach 1–2, a przeglądarka była już uzbrojona.

**B2 zmierzone jako podzielność, nie jako 48/72/96.** Liczby z §4.1 R2 są prawdziwe
dla ramki 360; na pięciu szerokościach opis łamie się inaczej, więc regułą jest
„całkowita wielokrotność wiersza 24 px", a nie konkretna wysokość. Odstęp przepływu
16 px sprawdzony na KAŻDEJ parze sąsiednich bloków we wszystkich dziewięciu krokach.

**C02 to test negatywny, więc mierzony na wszystkich krokach naraz**, nie na jednym.


‡‡ **B16 i I4 — powód czerwieni zmieniony w przebiegu 11, po pomiarze pliku fontu.**
Do przebiegu 10 oba wiersze były opisane jako czekające na zasób: subset leży poza
korzeniem serwera pomiarowego, więc „wystarczy drugi katalog w serwerze". Subset
zmierzony `fontTools`em bezpośrednio z `local/tech/fonts/subset-2026-08-12-v3/` —
bez serwera i bez przeglądarki, bo do odczytu pliku żadne z nich nie jest potrzebne.

Font jest w porządku: **83 ligatury, identycznie w trzech wagach, 80/80 pozycji
manifestu obecnych**. Czerwony jest runtime. Zmierzone `grepem` po źródle:
zero `@font-face`, zero deklaracji rodziny ikon, a `stan.widok.meta` nie jest
wypełniane przez żaden kod — **zbiór ligatur używanych przez runtime jest pusty**.
Zieleń I4 przy pustym zbiorze byłaby zielenią pustą, czyli tym samym gatunkiem fałszu,
który odrzuciliśmy przy I6 („każde oznaczone jest oznaczone"). B16 jest naruszone
mocniej niż „niezmierzone": `m.glif || '·'` (linia 1258) to dosłownie własny fallback,
czyli drugie zdanie wiersza.

**Wniosek metodologiczny — trzeci raz w tym łańcuchu, więc już nie przypadek: opis
blokady starzeje się szybciej niż sama blokada.** H10 i I7 (przebieg 9) okazały się
mierzalne, gdy przyrząd urósł; B16/I4 okazały się mierzalne od zawsze — nikt po prostu
nie sprawdził, czy „poza originem" jest właściwym powodem. Za każdym razem koszt
sprawdzenia był poniżej kwadransa. **Pozycję na liście blokad trzeba czytać jako
hipotezę o powodzie, nie jako fakt o wierszu.**

Skutki dla planu: B16/I4 potrzebują TRZECH rzeczy (subset z originu + model dający
nazwy glifów + runtime z `@font-face` i ścieżką błędu), a nie jednej zmiany polecenia
serwera. Do tego subset **nie zawiera** `keyboard_arrow_up`/`expand_less` ani żadnego
`refresh`/`restart_alt`/`replay` — dwa braki wobec substytutów `⌃` i `↻` używanych dziś
w runtimie. Pierwszy sprzęga się z **C08**. Mapa migracji ośmiu substytutów:
`PAKIET-INTEGRACYJNY.md` §3b.

§§ **I6 ROZSTRZYGNIĘTE 2026-08-15 (D-14.1, wariant B — operator).** Wiersz przyjął
brzmienie z `REJESTR-LUK.md` **plus klauzulę o populacji**: dotyczy zamkniętej listy
luk zachowań z INTERAKCJE §4 (G1–G12), a nie braków szczegółu i brzmienia. Klauzula
stoi w samym wierszu, nie w nocie, żeby zastrzeżenie o tautologii z przebiegu 9 było
odparte także dla kogoś, kto czyta matrycę bez STAN.md. Pokrycie **12/12** zmierzone
w przebiegu 14, zmiana czysto komentarzowa (minifikat bajt w bajt identyczny).
**Wiersz 🟢.**

Historia pomiaru, zachowana bo tłumaczy kształt brzmienia: rejestr zbudowany
w przebiegu 11, pokrycie **4/12** przy odczycie dosłownym i 10/12 przy „numer G
cytowany gdziekolwiek w kodzie". Pomiar dołożył do sprawy dwie rzeczy, których
przebieg 9 nie miał: **znaczniki obsługują dwie populacje** (26 znaczników, przy 23
brak numeru `G` — to braki szczegółu, nie luki zachowań, i tej populacji nie da się
zmierzyć na kompletność), oraz **dwie luki są rozstrzygnięte zaniechaniem** (G1 bez
swipe, G12 bez przejść: `transition:` 0 ×, `ease`/`cubic-bezier` 0 ×, `touchstart`
/`pointerdown` 0 ×), więc licznik miejsc ze znacznikiem karałby poprawny kod.

¶ **H4 i I3 — powierzchnia `harness/qr.html` (przebieg 16). Test negatywny, który
do przebiegu 15 nie mógł paść.** H4 był zielony od przebiegu 3 na pięciu ramkach
portretowych, czyli **wyłącznie poniżej progu 992 px** — a przy braku biblioteki
`rysujQR()` kończył na strażniku biblioteki niezależnie od szerokości. Asercja
„kontener pusty" wychodziła więc prawdziwa z niewłaściwego powodu i wyszłaby prawdziwa
także przy zepsutej bramce szerokości. To ta sama rodzina co pułapka cache'a
z przebiegu 14: **przyrząd odpowiada pewnie i odpowiada nie na to pytanie.**

Nowa powierzchnia wstrzykuje **test-double biblioteki** (rejestruje fakt wywołania,
wstawia `<svg>`) i mierzy trzy szerokości. Zmierzone [V]:

| ramka | `innerWidth` | media query | dubler wołany | kontener po |
|---|---|---|---|---|
| 991 | 991 | `false` | **0 ×** | pusty |
| 992 | 992 | `true` | **1 ×** | `<svg>` + `aria-label` |
| 1024 | 1024 | `true` | **1 ×** | `<svg>` + `aria-label` |

Bramka otwiera się dokładnie na 992 i dokładnie tam, gdzie ma. **H4 zostaje zielony,
ale od tego przebiegu jest zielony z pomiaru, który mógł wyjść inaczej.** Ramka ma
`overflow:hidden` celowo: pasek przewijania odjąłby ~15 px od viewportu i ramka
nominalnie 992-pikselowa odpowiadałaby na media query jak 977 — czyli przyrząd
mierzyłby pasek.

Przy okazji zmierzone dla I3, każda odpowiedź osobno [V]:
`QrCreator` nieobecny na wszystkich trzech szerokościach · **nikt go nie ładuje**
(w źródle nie ma ani jednego `<script>`, `import` ani wstrzyknięcia) · **nikt nie woła
`rysujQR()` poza harnessem** (`grep`: wyłącznie `fixture.html`, `fixture-min.html`
i nowa powierzchnia — zero wywołań produkcyjnych) · `adresQR()` poprawny na desktopie
(`https://miesnapaczka.pl…?tryb=gotowanie`). Czyli reszta wiersza to nie „wybrać
wersję": to **jedna sprzężona edycja — loader + miejsce wywołania + leniwy wyzwalacz** —
i ona czeka na D-13.1.

¶¶ **I1 jest zielone na swojej powierzchni i to trzeba czytać dosłownie.** Kolumna
`szer.` mówi `5×`, czyli 320–480, a tam bramka QR nigdy się nie otwiera. **Powyżej
992 px konsola dostaje dziś ostrzeżenie przy każdym wejściu na stronę:**
`[MP] brak QrCreator — kod QR nie zostanie narysowany` — zmierzone na 992 i 1024
(przebieg 16). Wiersza nie przekreślam, bo zmiana jego zakresu jest decyzją o matrycy,
nie pomiarem; odnotowuję sprzężenie: **rozstrzygnięcie D-13.1 musi zdjąć to
ostrzeżenie, a samo dołożenie miejsca wywołania bez loadera by je rozmnożyło.**

¶¶¶ **F12 — wiersz zielony od przebiegu 9, ale do przebiegu 16 zielony WARUNKOWO,
i to pod warunkiem, którego łańcuch prosi operatora, żeby przestał spełniać.** Blok
pomiarowy zaczynał się od asercji `document.visibilityState === 'hidden'`, czyli
zamieniał stan okna operatora w warunek wstępny. Przy widocznym oknie padają **dwie**
asercje — ta wprost, i „nasłuch `visibilitychange` wpięty", bo prawdziwe zdarzenie
przy widocznej karcie wchodzi w gałąź POWROTU i `uspione()` zostaje puste. Razy siedem
ramek: **czternaście czerwonych w tej samej chwili, w której operator wystawia okno
na potrzeby C10/C11** — z komunikatem wskazującym na runtime, nie na okno.

Naprawione przez odwrócenie przydziału (przebieg 16): karta w tle → prawdziwe zdarzenie
mierzy wygaszenie, powrót wymuszony; karta widoczna → wygaszenie wymuszone, prawdziwe
zdarzenie mierzy powrót. Obie własności mierzone w obu układach, obie na prawdziwym
zdarzeniu. Gałąź „widoczna" **zmierzona**, nie tylko napisana: `?wymusWidoczna=1`
przesłania getter `visibilityState` na powierzchni otwieranej z ręki — 311 asercji,
dziewięć wierszy F12 zielonych, `uspione 1→0` [V]. Bez tego parametru gałąź byłaby
pierwszy raz uruchamiana dokładnie w momencie, przed którym ma chronić.

**Wniosek do metody, czwarty raz w tym łańcuchu: zielony wiersz opisuje warunki
pomiaru tak samo jak zachowanie kodu.** H4 był zielony, bo bramka nie mogła się
otworzyć; F12 był zielony, bo okno było ukryte; I1 jest zielone, bo matryca kończy się
na 844 px. Żadne z tych trzech nie było błędem w kodzie — wszystkie trzy były
odpowiedzią na pytanie węższe, niż wyglądało.

‖ **I5 / I7 — artefakty `*.min.js` potwierdzone treściowo w przebiegu 17, nie po
znaczniku czasu.** `terser <źródło> -c -m` odtworzone w piaskownicy (terser 5.50.0)
daje oba minifikaty **bajt w bajt** takie, jakie leżą w katalogu: `d5a93791…`
(34 516 B) i `ee7296fb…` (16 888 B) [V]. Alarm `swiezosc()` z przebiegu 16 („minifikat
starszy od źródła o 126 min") był prawdziwy o `Last-Modified` i pusty o zawartości —
edycje przebiegu 14 były komentarzowe, a komentarze nie przeżywają minifikacji. Wraca
przez to ważność przemiaru z przebiegu 15 (2 176/2 177 na zminifikowanej parze, pada
wyłącznie I7), który przebieg 16 unieważnił: nie istnieje artefakt, od którego tamten
pomiar miałby się różnić.

Wariant (2) rozstrzygnięcia I7 zmierzony przy tej samej okazji: `--format
comments=/staging:/` → runtime **34 859 B**, parser **16 888 B** (bez zmiany, czyli zero
komentarzy `staging:` w parserze) [V]. Narzut **343 B**, o 7 więcej niż szacowane 336 —
tyle, ile komentarzy: każdy komentarz liniowy musi zostać domknięty nową linią. Podana
w pakiecie górna granica „≤ 34 782" **została przekroczona o 77 B**, więc nie była
granicą. Jeden embed w wariancie (2) = 51 747 > 50 000; „dwa embedy" trzyma się już
na pomiarze w obu wariantach builda.

✽ **C10 / C11 — szósta sonda D-12.1 (przeb. 17), pierwsza przyrządem niezależnym od
runtime'u.** Dotąd niemierzalność biegu wynikała z animacji samego runtime'u, więc
przyrząd i przedmiot pomiaru były tym samym obiektem. Sonda przebiegu 17 tworzy własną,
jednorazową animację poza ekranem i porównuje DWA zegary przez 1,5 s:
`performance.now()` **+2 033 ms**, `document.timeline.currentTime` **+0 ms**,
`animation.currentTime` 0 → 0, a `playState` przez cały czas `running` [V].
Zegar ścienny idzie, zegar animacji stoi, przyrząd mówi „gra". Okno: `outerWidth 0`,
`visibilityState "hidden"`, `innerWidth 1536×791`.

**Do użytku przez następne ogniwa jako przedfiltr:** przyrost `document.timeline
.currentTime` równy 0 znaczy, że C10 i C11 są w tej sesji niemierzalne i nie ma sensu
uzbrajać pod nie ani GIF-u, ani ramek. Przyrost dodatni = okno widoczne, oba wiersze
wchodzą do serii od ręki. Koszt sondy: dwie sekundy.
**Przedfiltr zadziałał w przebiegu 18 dokładnie tak, jak opisano — w obie strony:
najpierw +0 ms (siódme potwierdzenie blokady), a po ~7 minutach przyrost dodatni,
i wiersze weszły do serii od ręki. Patrz nota ✽✽.**

✽✽ **C10 / C11 ZAMKNIĘTE W PRZEBIEGU 18 — na oryginalnym oracle'u, bez zmiany wiersza.**
Okno operatora było widoczne przez ~90 s (09:30–09:31): `outerWidth` **1 536** (a nie 0
jak w przebiegach 12–17), `hasFocus true`, `document.timeline.currentTime` **42 067 ms**
przy `performance.now()` 42 081 ms — zegary idą razem. `MP_MATRYCA.c1012()` wykonane
w tym oknie, wynik **ok na 5/5 ramek portretowych**:

| wiersz | przyrost animacji | zegar ścienny | rozjazd | tolerancja |
|---|---|---|---|---|
| C10 (`ostatnia-minuta`) | **1 300 ms** | 1 303 ms | 3 ms | 200 ms |
| C11 (`koncowka`) | **1 300 ms** | 1 308 ms | 8 ms | 200 ms |

Do tego okres efektu 1 000 ms → 500 ms (**puls 1×/s → 2×/s**), `eskalacjaTempem: true`,
`eskalacjaNieBarwa: true` (obie kropki `rgb(207, 65, 26)`), kropka 12×12, obrys pigułki
1,5 px po docięciu do dpr 1,25, C12 bez zmian.

**Warunek był przechodni i NIE jest odtwarzalny na żądanie.** Przed serią okno było
zminimalizowane, po serii wróciło do `outerWidth 0`. Łańcuch nie zna czynności, która
je wystawia — cztery próby programowe są obalone (D-14.2), a to wystawienie nastąpiło
bez udziału łańcucha. **Następne ogniwo nie powinno planować serii w oparciu o widoczne
okno**; powinno natomiast puszczać przedfiltr ✽ na starcie każdej serii, bo koszt to
dwie sekundy, a nagroda — jak dziś — bywa cała jednostka. **D-12.1 z listy operatorskiej
ZNIKA: prośba została spełniona przypadkiem i nie jest już potrzebna.**

✽✽✽ **Przyrząd PRZEWIJANY `c1012seek()` — drugie, niezależne dojście do C10/C11,
zbudowane w przebiegu 18 ZANIM okno się pokazało, i dlatego zostawione w harnessie.**
Zamiast czekać na zegar, ustawia go: `animation.currentTime = t` działa w karcie
ukrytej, a `getComputedStyle` zwraca po tym rzeczywiście wyliczony `transform`.
Dziewięć próbek co 125 ms w oknie 1 000 ms daje podpis, który rozróżnia tempa wprost:

| stan | podpis (scaleX) | cykli w 1 000 ms |
|---|---|---|
| `ostatnia-minuta` | `1, 0.9, 0.8, 0.7, 0.6, 0.7, 0.8, 0.9, 1` | **1** |
| `koncowka` | `1, 0.8, 0.6, 0.8, 1, 0.8, 0.6, 0.8, 1` | **2** |

**Kontrola negatywna (`c1012seekKontrola()`), bo przyrząd, który nie może paść, nie
mierzy** — lekcja H4 z przebiegu 16, zastosowana profilaktycznie:

| mutacja | podpis | werdykt |
|---|---|---|
| `animation-duration: 2s` | `1, 0.953, 0.9, …, 0.6` | **czuły** ✔ |
| `animation-name: none` | brak animacji | **czuły** ✔ |
| `animation-play-state: paused` | **identyczny** | **ślepy** ✘ |

Ślepota na pauzę jest wpisana w metodę: przewijanie działa tak samo na animacji
wstrzymanej. Dlatego wiersz zdaje tylko w parze z `playState !== 'paused'` —
oracle jednostronny, który **jawną** pauzę raportuje uczciwie (zmierzone: kontrola
pokazuje `playState: "paused"`), choć „running" w karcie ukrytej jest kłamstwem
(przeb. 12 i 17). Zostaje więc jedna dziura: czy UA sam tyka zegar w karcie widocznej.
**Tę dziurę zamknął dziś `c1012()` — a `c1012seek()` zostaje jako polisa: gdy okno jest
zminimalizowane, C10/C11 nie robią się z powrotem niewiadome, tylko schodzą do
„wszystko poza tykaniem UA".** Zmierzone zgodnie z `c1012()` w tym samym przebiegu,
na obu powierzchniach widoczności: 15/15 asercji przy oknie ukrytym i przy widocznym.

‡ **I5 / I7 — obie powierzchnie przemierzone w przebiegu 17 i padają ROZŁĄCZNIE.**
Siedem ramek × 311 asercji = 2 177 na każdej:
`matrix.html` → **2 170/2 177**, pada wyłącznie **I5** ×7;
`matrix-min.html` → **2 170/2 177**, pada wyłącznie **I7** ×7 [V].
Na ramkę **310/311** po obu stronach — czyli liczba z przebiegu 9, który liczył jedną
ramkę. Zapis „2 176/2 177" z przebiegu 15 był **błędem rachunkowym**: usterka jest
jedna NA RAMKĘ, więc od 2 177 odejmuje się 7, nie 1. Diagnoza bez zmian, liczba
poprawiona — i poprawiona akurat w miejscu, z którego liczy się decyzja o buildzie.

**Żadna z dwóch powierzchni nie jest „tą dobrą".** Źródła oblewają rozmiar i zdają
znaczniki, minifikaty odwrotnie; rozstrzygnięcie I5/I7 jest wyborem, którą JEDNĄ
asercję operator przyjmuje — albo zakupem obu za 343 B (wariant 2, W25). Detal I7
na minifikacie = **7**, czyli komplet zadeklarowanych tokenów, zgodnie z tym, że
`terser` zdejmuje wszystkie siedem komentarzy. Wiersz I7 ma na ramkę **cztery** różne
asercje, a pada **jedna** — trzy czwarte wiersza przechodzi także po minifikacji.
