# WYMAGANIA — runtime trybu gotowania v1.7 (2026-08-15)

Zmiana v1.7 (2026-08-15): **próg miękki rozmiaru 40 000 → 45 000 znaków** i objęcie
nim OBU artefaktów (runtime + parser). Decyzja operatora, pozycja D-28.1. Powód:
po wpięciu biblioteki QR do parsera (D-13.1) oba pliki stanęły kilkaset znaków pod
starym progiem — runtime 39 536, parser 39 369 — czyli próg zaczął blokować pracę
wykończeniową zamiast ostrzegać przed limitem platformy. Limit twardy 50 000 bez
zmian. Nagłówek pliku poprawiony przy okazji: stał na „v1.5", choć lista zmian
otwierała się wpisem „v1.6". Wprowadzone przez łańcuch `tryb-gotowania-embed`
na wyraźne polecenie operatora (plik wiążący — normalnie edytuje go wyłącznie operator).

Zmiana v1.6 (2026-08-15): **pas dolny ma DWA TRYBY** (rząd / stos) i jest
NIEZALEŻNY od pływających widżetów — decyzja operatora po inspekcji `przeglad.html`.
Unieważnia i pin 80/132/218/266 (v1.4), i regułę składania `BOTTOM = 80 + stos`
(v1.5): obie brały ramkę „BOTTOM" z Figmy za granicę komponentu, a ona grupuje
nawigację razem ze stosem pigułek. §4 przepisane. Wprowadzone przez łańcuch na
wyraźną autoryzację operatora.

Zmiana v1.5 (2026-08-15): **C1 zamknięty** decyzją operatora — BOTTOM opisuje
REGUŁA SKŁADANIA (INTERAKCJE §4.1), a nie lista dozwolonych wysokości. Pin
80/132/218/266 przestaje obowiązywać jako lista; §4 przepisane. Wprowadzone przez
łańcuch `tryb-gotowania-embed` na wyraźne polecenie operatora 2026-08-15 (plik
wiążący — normalnie edytuje go wyłącznie operator).
Zmiana v1.4 (2026-08-14): rewizja po ekstrakcji INTERAKCJE v1.5 — poprawka C9
(§3: pin progu 480 → **500**, literówka), §6 test negatywny 480 → 500, §2 zakres
≤479 → ≤499, liczba klatek 31 → **29** (C5), INTERAKCJE dopisane do hierarchii
źródeł (§0), `zobacz pozostałe` rozstrzygnięte (G7: zmiana etykiety, nie celu),
BOTTOM z odsyłaczem do reguły składania (INTERAKCJE §4.1).
Zmiana v1.3 (2026-08-14): ekran zakończenia bez mechaniki zniżkowej — **świadome
cięcie zakresu v1.0** (decyzja operatora 2026-08-14), wdrażany wariant `7195:11178`;
D9 pozostaje w mocy i wraca razem z mechaniką. Konsekwencja w §6 jako test negatywny.
Podstawa ustalenia klatek: `INTERAKCJE.md` v1.5 §4/C6.
Zmiana v1.2 (2026-08-12): próg = **500** (S25 Ultra przy QHD+ raportuje 480 CSS px,
więc granica 480 odcinałaby realny telefon); zakres wsparcia overlaya do 499;
szerokości pomiarowe 320/360/390/440/480; nowy wymóg SEO/GEO — pola kartowe
renderują się server-side jako WIDOCZNY tekst, skrypt przekształca DOM w miejscu.
Zmiana v1.1: próg jako reguła śledząca największy telefon (nie granica Webflow);
landscape rozstrzygnięty — blokada przez scrim (lock() niedostępny na iOS Safari).

Wiążące dla łańcucha embed. Czytane po ścieżce, weryfikowane po SHA-256 ze STAN.md.
Zasada redakcyjna pliku: co ma kanoniczne źródło, jest tu WSKAZANE, nie przepisane —
przepisanie forkowałoby prawdę. Zapisane w całości jest tylko to, co rozstrzygnięto
w rozmowie operatorskiej 2026-08-12 i nie istnieje nigdzie indziej.

## 0. Źródła prawdy i ich hierarchia

1. `przepisy-hub/spec-tryb-gotowania-v1.md` — spec + decyzje D1–D14 (WYGRYWA każdy konflikt).
2. Figma `T0QnV1TrpngJhq2m1E9ZlI`, zestaw `7195:10893` (**29** klatek — C5) —
   źródło prawdy wyglądu. **Odczyt klatek PRZED pierwszą linią kodu** (skill
   webflow). Aktualny inwentarz: `INTERAKCJE.md` §1 (HANDBACK §1 = zapis
   historyczny).
2a. `git/tech/tryb-gotowania/INTERAKCJE.md` (v1.5) — ekstrakcja ZACHOWAŃ
   + rozstrzygnięcia operatorskie 2026-08-14 (m.in. dwa stany wiersza zamiast
   trzech, klatka kanoniczna listy `7196:10982`, cięcie zakresu zakończenia).
   Zestaw jest prototypowo NIEOKABLOWANY (§0 tamże) — o zachowania nie pytaj
   Figmy ponownie, pytaj tego pliku; tabela I-01…I-32 + luki G + konflikty C.
3. `przepisy-hub/przepis-parser.js` — kontrakt DOM w nagłówku pliku; punkt startu kodu.
4. `przepisy-hub/instrukcja-pisania-przepisow.md` §2–3, §6 — gramatyka pól, mapowanie embed.
5. HANDBACK §2+§4 — tooltip, markery, decyzje operatora 1–12, wysokości BOTTOM.
6. Aneks pomiarowy (wersja i hash w STAN.md) — definicja „zmierzone".

## 1. Rozstrzygnięcia z 2026-08-12 (istnieją tylko tutaj)

- **Tryb gotowania jest wyłącznie telefoniczny.** Wsparcie: szerokości ≤499 px
  (poniżej progu ukrycia), portret. Największe sprzedawane telefony [V 2026-08-12]:
  iPhone 17 Pro Max **440** CSS px; Galaxy S25 Ultra **480** CSS px przy opt-in
  QHD+ (domyślnie FHD+ ≈384–412). Foldables poza zakresem (decyzja operatora).
- **Próg ukrycia przycisku startu: 500 px, własne media query.** Reguła: próg
  śledzi największy sprzedawany telefon (bez foldables), tuż nad jego szerokością
  CSS, bez oglądania się na natywne breakpointy Webflow (decyzja operatora
  2026-08-12). Wartość bieżąca = **500**: S25 Ultra przy QHD+ siedzi NA 480, więc
  granica 480 odcinałaby ten telefon; w paśmie 481–499 nie ma żadnego znanego
  urządzenia, więc 500 nie wpuszcza tabletów. Implementacja: `min-width: 500px`
  na fleksie-rodzicu przycisku (strona szablonu). Wartość jest PINEM wspólnym
  obu połów; rewizja przy terminie reverify aneksu.
- **Ścieżka desktopowa = QR** (spec §8: blok QR renderuje się wyłącznie ≥992 px,
  leniwie). Konsekwencja do potwierdzenia przez operatora: w oknie 480–991 px
  (tablet) nie ma ani przycisku, ani QR — brak wejścia w tryb gotowania.
- **Landscape: ZABLOKOWANY (decyzja operatora 2026-08-12).** Tryb gotowania jest
  portretowy; w poziomie użytkownik dostaje scrim „obróć telefon" zakrywający
  overlay (`@media (orientation: landscape)` wewnątrz trybu). Mechanizmem jest
  scrim CSS, nie `screen.orientation.lock()` — lock nie istnieje na iOS Safari,
  a na Chrome wymaga fullscreen [zweryfikowane 2026-08-12: caniuse/MDN].
  Copy scrima wg U3/U5 (małą literą, bez wykrzykników), do pipeline'u treści.
- **Szerokości pomiarowe pętli lokalnej: 320 / 360 / 390 / 440 / 480, portret**
  (440 = iPhone 17 Pro Max, 480 = S25 Ultra QHD+ — obie realne, nazwane).

## 2. Zakres v1.0 (jednostki w STAN.md; szczegół każdej pozycji — w źródle)

Overlay `position: fixed` w tym samym dokumencie (spec §9, NIE iframe), wejścia:
przycisk (strona, ≤499) i `?tryb=gotowanie` (QR); wyjście wstecz przez
`history.pushState`. Ekrany wg 29 klatek zestawu: start (selektor porcji 1–7),
ekrany kroków, rozwinięta lista składników, dwa minutniki maks (D11, klatka S4;
restart = „uruchom ponownie" po `0:00`, D10), stany S1 (wznowienie, localStorage),
S3 (offline — załadowany DOM działa dalej), S5 (wake lock), krok bez zdjęcia
(`7240:10936`), zakończenie — wariant `7195:11178` („pochwal się swoim daniem"),
BEZ mechaniki zniżkowej. Mechanika −70 zł i odczyt kwoty z Site Settings (D9) są
ŚWIADOMIE POZA ZAKRESEM v1.0 (decyzja operatora 2026-08-14); klatka `7448:128443`
czeka gotowa. D9 pozostaje w mocy i wchodzi razem z mechaniką.

Parser: gramatyka spec §4 (skladniki/kroki) + delty z HANDBACK §4: split pól
kartowych po pustej linii (Q→A), `#klucz` na poziomie wpisu w `co-mozesz-zmienic`
(+ klasa walidacji „klucz bez odpowiednika"), opcjonalne `krótko:`, ostrzeżenie
„wpis przechowywania bez czasu w formacie kanonicznym". Skalowanie: spec §5
w całości (zaokrąglenia, odmiana z tabelą ODMIANY + kreska-escape, policzalne
w górę, `=`, zakresy skalują oba końce). Produkty: join po `@slug` przez ukrytą
Collection List, `ceil(gramy/opakowanie)` → „2 × 325 g" (spec §6). Zdjęcia: match
po fragmencie nazwy (spec §7). QR: runtime, SVG, `https://miesnapaczka.pl` +
pathname + `?tryb=gotowanie` (spec §8). `?debug=1`: czerwony panel błędów,
widoczny też w podglądzie Webflow (CR6) — harness go odtwarza.

## 3. Kontrakty między połowami (PINY — zmiana wyłącznie przez operatora)

- **Kontrakt DOM** = nagłówek `przepis-parser.js` (mount `#mp-tryb-gotowania`,
  `#mp-skladniki`, `#mp-kroki`, `[data-mp-produkt]`, `[data-mp-foto-kroku]`,
  `[data-mp-qr]`). Runtime nie wymaga od szablonu niczego ponad to.
- **Loader D13** (spec §17, kod dosłowny w specu): markup `#mp-loader` i przełącznik
  w `<head>` = strona szablonu; runtime ZDEJMUJE klasę `mp-wchodzi-w-gotowanie`
  dopiero PO zamontowaniU overlaya (nie na DOMContentLoaded); bezpiecznik 3 s
  należy do head-skryptu. Nazwy klas/id — dosłownie ze specu §17.
- **Próg 500** (§1) — wspólny pin przycisku i pomiaru. (Do v1.3 stało tu „480"
  — literówka, C9, rozstrzygnięta przez operatora 2026-08-14.)
- **Karty Q→A na stronie**: runtime WYSTAWIA sparsowane wpisy w modelu
  (`MP.przepis`); kto wstrzykuje karty na stronę (loader stronowy vs szablon) —
  rozstrzyga tabela v2 sesji CMS. Nie buduj wstrzykiwania bez tego rozstrzygnięcia.
  **Wymóg SEO/GEO niezależny od właściciela (operator 2026-08-12):** pola kartowe
  (`wskazowka`, `co-mozesz-zmienic`, `przechowywanie`) są związane server-side
  z WIDOCZNYMI elementami tekstowymi — surowe wpisy czytelne w wyjściowym HTML-u
  bez JS (crawlery AI nie renderują skryptów; Google renderuje, więc karty widzi
  tak czy inaczej). Skrypt dzielący PRZEKSZTAŁCA ten DOM w miejscu na karty.
  Wzorzec `skladniki`/`kroki` (treść rodzona z ukrytych bloków `text/plain`)
  jest dla pól kartowych ZAKAZANY — tamten zakład przyjęto świadomie w D2 dla
  trybu gotowania i nie rozszerza się go na treść, której racją bytu jest
  liftability. Literalne `**` w stanie sprzed enhancementu: akceptowane.
- **Tooltip zamienników**: wymiary i zachowanie wg HANDBACK §2 Task 2 (296 px,
  `beige 1 bg` — w harness zamiennik z komentarzem, `×` hit 44 px, nie minimalizuje
  minutników, maks 2 markery/krok, pełna wysokość wiersza jako cel dotyku).
- **Byk usunięty z wierszy trybu gotowania** (decyzja 5); zostaje na stronie
  i ekranie startowym.

## 4. Reguły budowy

Vanilla JS, ES2019+, bez zależności poza biblioteką QR (~10 kB, do SVG, spec §8);
zależność ZADEKLAROWANA w kodzie, nie zakładana. Jeden plik runtime'u; limit
twardy 50 000 znaków (droga integracyjna przez embed), cel **< 45 000**. Próg dotyczy
**OBU artefaktów wysyłanych do embedu** — runtime'u i parsera — bo od wpięcia biblioteki
QR (D-13.1) oba są plikami tej samej klasy i oba jadą tą samą drogą. Zapas do limitu
twardego zostaje wtedy 5 000 znaków (10 %) po każdej stronie: próg miękki ma być
sygnałem, a nie awarią wdrożenia, a przy 42 000 zapalałby się przy każdej jednostce
wykończeniowej i przestałby cokolwiek znaczyć. `<mark>`
z `box-decoration-break: clone` (instrukcja §3). Typografia i tokeny: DM Sans;
Caption 14→12, Body Small 14, Body Large 18→16; cień `drop_shadow_ui` dokładnie
wg HANDBACK decyzja 11 (ambient 0/−1 blur 2 α5% · key 0/−4 blur 8 spread −2 α10%,
baza #3E2B22, rzucany DO GÓRY); belka 72;

  **PAS DOLNY MA DWA TRYBY I JEST NIEZALEŻNY OD PŁYWAJĄCYCH WIDŻETÓW**
  (v1.6, operator 2026-08-15). Pas to WYŁĄCZNIE nawigacja i przyjmuje jedną z dwóch
  form: **dwa przyciski w rzędzie** albo **dwa przyciski w stosie**. Nie ma trzeciej
  formy i nie ma wysokości „wynikowej": pas nie rośnie od tego, co nad nim pływa.

  **Pigułki minutników są WARSTWĄ PŁYWAJĄCĄ nad pasem, nie jego częścią.** Stos
  pigułek ma własną geometrię (`Σ wysokości + 8×(n−1) + 12`) i własne pozycjonowanie
  względem dolnej krawędzi ekranu — do wysokości pasa nie wchodzi.

  **Co to unieważnia.** Pin 80/132/218/266 z v1.4 ORAZ reguła składania
  `BOTTOM = 80 + stos` z v1.5 opisywały to samo nieporozumienie z dwóch stron:
  ramka nazwana „BOTTOM" w pliku Figmy grupuje nawigację RAZEM ze stosem pigułek
  (np. `7195:11065`: BOTTOM 218 = stos 138 + nawigacja 80), więc łańcuch policzył
  granicę GRUPY jako granicę komponentu. Nazwa ramki w pliku projektowym nie jest
  granicą komponentu w kodzie i nigdy nią nie była — to jest ta sama klasa błędu
  co czytanie nazwy zmiennej z Figmy jak nazwy zmiennej z Webflow (D-27.1).

  **Konsekwencja dla runtime'u:** `przeliczBottom()` liczy dziś wysokość, która nie
  jest wysokością niczego. Do przepisania razem z warstwą pływającą; wiersze matrycy
  mierzące wysokość pasa są `[U]` do czasu przemiaru pod nowym modelem.

  Odstępy wierszy odstępy wierszy
12 (ekran kroku) / 8 (pełna lista); kolory loadera ze spec §17 (#fdfbf7, #e8e0d4,
#c8461d). Glify: wyłącznie ligatury obecne w subsecie (STAN: pin fontu); brakujący
glif = pozycja decyzyjna, nie własny fallback.

## 5. Stany nienarysowane — reguła postępowania

Figma nie rysuje wszystkiego (HANDBACK §6). Obowiązuje: zbuduj zachowanie
NAJMNIEJ zaskakujące, oznacz w kodzie `// NIENARYSOWANE:`, dopisz na listę
decyzji w STAN.md. Konkretnie: `najpierw pokaż składniki` → otwiera rozwiniętą
listę (`7196:10982`); `zobacz pozostałe` → cel ROZSTRZYGNIĘTY (G7, operator
2026-08-14): pełna lista `7196:10982`; zmienia się ETYKIETA (propozycja „cała
lista składników" — microcopy przez pipeline treści, tryb ui); tooltip
„flipped-above" dla dolnych wierszy →
odbij nad wiersz symetrycznie, oznacz; krok bez ramki składników z wpisem
kluczowanym → zamiennik zostaje tylko na stronie (fallback), ostrzeżenie
w `?debug=1`.

## 6. Czego runtime NIE robi (testy negatywne — wykonaj je)

Nie skaluje kroków, minutników ani czasu przepisu przy zmianie porcji (D10/§18).
Nie renderuje QR poniżej 992 px. Nie dotyka pól poza kontraktem DOM. Nie zapisuje
nic poza swoim kluczem localStorage (S1). Nie uruchamia trzeciego minutnika (D11).
Nie pokazuje przycisku startu ≥500 px (test na stronie harnessa; do v1.3 stało
tu „480" — ta sama literówka C9). Nie wpuszcza
`czas:` i `minutnik:` naraz bez ostrzeżenia (spec §4.2). Nie czyta kwoty zniżki
z Site Settings i nie renderuje mechaniki zdjęciowej na ekranie zakończenia
(cięcie zakresu v1.0, §2) — ekran kończy się na „pochwal się swoim daniem".
