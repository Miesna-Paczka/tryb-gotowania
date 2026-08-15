# INTERAKCJE — tryb gotowania, ekstrakcja z Figmy v1.5 (2026-08-14)

**Zmiana v1.5 (2026-08-14):** poprawka z §4.2 **wprowadzona** do WYMAGANIA (v1.2 →
v1.3) na polecenie operatora; §4.2 jest teraz zapisem wykonanej zmiany, nie propozycją.
**Zmiana v1.4 (2026-08-14):** dwa rozstrzygnięcia operatorskie domykają §3.1 —
klatką kanoniczną listy jest `7196:10982` (różnica była wyłącznie w nazwie),
a `dalej` **nie dostaje delty wizualnej**: rozdziela nagłówek, linia i kolejność.
Runtime buduje dwa stany wiersza, nie trzy.
**Zmiana v1.3 (2026-08-14):** potwierdzone dwiema metodami, że `7266:10720` jest
nieodróżnialna od `7196:10982` (identyczny render, identyczny SHA-256 PNG) —
obietnica z nazwy („lżejsza") nie miała pokrycia w pliku.
**Zmiana v1.2 (2026-08-14):** C6 domknięte — zakończenie bez mechaniki −70 zł to
świadome cięcie zakresu v1.0, D9 pozostaje w mocy; propozycja poprawki WYMAGANIA §2
w §4.2 (nie wprowadzona).
**Zmiana v1.1 (2026-08-14, po turze operatorskiej):** rozstrzygnięte C2 (marker za
nazwą), C7 (zestaw `przycisk` do zbudowania), C9 (próg 500); G7 przeformułowane —
dwie klatki listy okazały się identyczne, decyzja dotyczy etykiety, nie klatki;
C1 rozłożone na regułę składania zamiast listy wartości.

Ekstrakcja, nie projekt. Zawiera to, co plik Figma faktycznie zapisuje, i nazywa po
imieniu to, czego nie zapisuje. Nic tu nie zostało dorysowane „bo tak by wypadało".

**Źródło.** Figma `T0QnV1TrpngJhq2m1E9ZlI` (MP-WWW-UI-FIN-2), strona `Claude`
(`7048:83653`), zestaw `7195:10893`, komponenty `7224:10893`. Sesja tylko do odczytu
(seat: View); w pliku nie zmieniono niczego.

**Kontekst wiążący zweryfikowany po SHA-256 przed pracą:**

- `git/tech/tryb-gotowania/WYMAGANIA.md` v1.2 — `b95c737e…a58a73fb54` ✅ zgodny
  *(plik podbity w tej sesji do v1.3 na polecenie operatora — §4.2; hash z powyższej
  weryfikacji dotyczy stanu SPRZED poprawki)*
- `git/content/handoffs/ANEKS-POMIAR--tryb-gotowania-embed--v1.3.md` — `6ab07c4f…fbc87c54fe` ✅ zgodny

**Hierarchia.** `przepisy-hub/spec-tryb-gotowania-v1.md` (D1–D14) i HANDBACK §3
(decyzje 1–12) wygrywają z każdym zapisem w Figmie. Rozjazdy raportuję w §4, nie
„poprawiam".

**Provenance.** `[V]` odczytane w pliku w tej sesji · `[I]` wniosek (z pary klatek,
z geometrii, z sekwencji) · `[U]` z dokumentu operatorskiego (spec / HANDBACK /
WYMAGANIA), nie z Figmy.

---

## 0. Werdykt: trzy światy

**Świat trzeci — zestaw jest NIEOKABLOWANY prototypowo.**

Twierdzenie do sfalsyfikowania brzmiało: „Figma gromadzi wszystkie te rzeczy, więc
model mógłby to wszystko sam wywnioskować". Falsyfikacja wypadła negatywnie dla
twierdzenia:

- 74 obiekty `reactions` w całym poddrzewie `7195:10893` — **wszystkie 74 to
  `ON_HOVER`** na instancjach przycisków z bibliotek `buttons` (`191:2447`)
  i `buttons_2` (`6968:5081`), z akcją `NODE / CHANGE_TO` na warianty leżące
  **poza** zestawem (`191:2611`, `6968:5242`, `6968:5248`, `6968:5266`,
  `6968:5370`, `6968:5376`), `DISSOLVE / EASE_OUT / 300 ms`. To hover-state
  wspólnego komponentu, nie okablowanie trybu gotowania. [V]
- **Zero** wyzwalaczy `ON_CLICK`, `ON_PRESS`, `ON_DRAG`, `AFTER_TIMEOUT`,
  `MOUSE_ENTER/LEAVE` związanych z jakąkolwiek klatką zestawu. [V]
- `page.flowStartingPoints` = **pusta tablica** — w tym pliku nie ma ani jednego
  punktu startowego prototypu. [V]
- `get_motion_context(7195:10893, recursive)` → `{"nodes":[]}` — **zero** danych
  keyframe/animacji. [V]
- Warianty trzech zestawów komponentów mają **0 reakcji** — brak smart-animate
  między stanami. [V]

Konsekwencja dla deliverable'u: §2 nie jest ekstrakcją okablowania, bo okablowania
nie ma. Jest inwentarzem afordancji z podaniem, skąd wiemy o każdym przejściu.
Jedyne zapisane w pliku **czasy animacji** pochodzą z tekstu adnotacji w klatce
`LEGENDA · kropka minutnika` (`7221:10893`), nie z prototypu.

---

## 1. Spis wiring — 29 klatek

Kolumna „reakcje" liczy cały poddrzewo klatki. Kolumna „własne" liczy reakcje
należące do trybu gotowania (nie odziedziczone z bibliotecznych przycisków).

| # | node | klatka | reakcje | typ | własne |
|---|---|---|---|---|---|
| 1 | `7195:10894` | 00 · start — nowe gotowanie | 3 | ON_HOVER (biblioteka) | 0 |
| 2 | `7195:10922` | 01 · krok 1 — przygotuj warzywa | 2 | ON_HOVER (biblioteka) | 0 |
| 3 | `7195:10953` | 02 · krok 2 — podsmaż warzywa | 2 | ON_HOVER (biblioteka) | 0 |
| 4 | `7195:10978` | 03 · krok 3 — zarumień mięso | 2 | ON_HOVER (biblioteka) | 0 |
| 5 | `7195:11006` | 04 · krok 4 — dodaj koncentrat | 3 | ON_HOVER (biblioteka) | 0 |
| 6 | `7195:11036` | 05 · krok 5 — wlej passatę | 2 | ON_HOVER (biblioteka) | 0 |
| 7 | `7195:11065` | 06 · krok 6 — duś ragù | 3 | ON_HOVER (biblioteka) | 0 |
| 8 | `7195:11088` | 07 · krok 7 — nastaw wodę | 2 | ON_HOVER (biblioteka) | 0 |
| 9 | `7195:11118` | 08 · krok 8 — ugotuj makaron | 3 | ON_HOVER (biblioteka) | 0 |
| 10 | `7195:11153` | 09 · krok 9 — połącz i podaj | 2 | ON_HOVER (biblioteka) | 0 |
| 11 | `7195:11178` | 10 · zakończenie — **wariant wdrażany w v1.0**, bez mechaniki −70 zł | 3 | ON_HOVER (biblioteka) | 0 |
| 12 | `7448:128443` | 10 · zakończenie — wariant z mechaniką −70 zł, **poza zakresem v1.0** | 3 | ON_HOVER (biblioteka) | 0 |
| 13 | `7196:10893` | S1 · powrót do przerwanego gotowania | 3 | ON_HOVER (biblioteka) | 0 |
| 14 | `7196:10912` | S2 · ostrzeżenie — wyjście z gotowania | 2 | ON_HOVER (biblioteka) | 0 |
| 15 | `7196:10932` | S3 · brak połączenia | 2 | ON_HOVER (biblioteka) | 0 |
| 16 | `7196:10955` | S4 · trzeci minutnik — odmowa | 2 | ON_HOVER (biblioteka) | 0 |
| 17 | `7240:10900` | S5 · minutnik przy wygaszonym ekranie | 5 | ON_HOVER (biblioteka) | 0 |
| 18 | `7196:10982` | W · krok 3 — lista: teraz, dalej, zużyte — **klatka kanoniczna (operator, 2026-08-14)** | 2 | ON_HOVER (biblioteka) | 0 |
| 19 | `7266:10720` | W · krok 3 — lista na obrysie (lżejsza) — **duplikat, pomijać** (różnica wyłącznie w nazwie) | 2 | ON_HOVER (biblioteka) | 0 |
| 20 | `7196:11059` | W · krok 4 — minutnik w trakcie (rozwinięty) | 4 | ON_HOVER (biblioteka) | 0 |
| 21 | `7211:10893` | W · krok 7 — pigułka rozwinięta (ragù) | 4 | ON_HOVER (biblioteka) | 0 |
| 22 | `7196:11087` | W · krok 8 — ostatnia minuta | 2 | ON_HOVER (biblioteka) | 0 |
| 23 | `7196:11116` | W · krok 8 — czas minął | 5 | ON_HOVER (biblioteka) | 0 |
| 24 | `7196:11144` | W · krok 8 — stos dwóch | 3 | ON_HOVER (biblioteka) | 0 |
| 25 | `7240:10936` | W · krok bez zdjęcia (przepis od influencera) | 2 | ON_HOVER (biblioteka) | 0 |
| 26 | `7221:10893` | LEGENDA · kropka minutnika | **0** | — | 0 |
| 27 | `7229:10893` | SPEC · marker na słowie (nie pigułka) | 2 | ON_HOVER (biblioteka) | 0 |
| 28 | `7457:12530` | TEST C · zamiennik w normalnym flow (karta 1:1) | 2 | ON_HOVER (biblioteka) | 0 |
| 29 | `7468:103095` | TEST E · tooltip po tapnięciu w składnik | 2 | ON_HOVER (biblioteka) | 0 |

**Suma: 74 reakcje, 0 własnych. Klatka rodzic `7195:10893` — 0 reakcji.
Strona `7048:83653` — 0 reakcji na poziomie dzieci strony.** [V]

**Liczba klatek: 29, nie 31.** WYMAGANIA §0 i HANDBACK §1 mówią o 31. Rozjazd — §4/C5.

---

## 2. Tabela interakcji

„Animacja" wypełniona tylko tam, gdzie plik cokolwiek zapisuje. Puste = brak danych,
nie „domyślne".

| # | Wyzwalacz | Źródło → cel | Animacja | Prov. | Dotyka |
|---|---|---|---|---|---|
| I-01 | tap „tryb gotowania" (CTA, `00`) | `7195:10894` → `7195:10922` | — | [I] para klatek 00→01, pasek 8→21 px | WYM §2 · Aneks 12 |
| I-02 | tap „najpierw pokaż składniki" (`00`) | `7195:10894` → **brak celu w pliku** | — | [V] brak · [U] WYM §5 każe otworzyć `7196:10982` | WYM §5 |
| I-03 | tap `−` / `+` selektora porcji | `7263:10729` / `7263:10732`, in-place | — | [U] D6, spec §5; brak drugiej klatki | Aneks 3 |
| I-04 | tap CTA „dalej" w `BOTTOM` | krok n → krok n+1 (`7195:10922`…`7195:11153`) | — | [I] sekwencja 9 klatek + monotoniczny pasek | WYM §2 |
| I-05 | tap `←` (ramka 44×44 na `x=16, y=18` w `BOTTOM`) | krok n → krok n−1 | — | [V] geometria celu dotyku · [I] kierunek | WYM §2 |
| I-06 | **swipe poziomy między krokami** | — | — | [V] **brak jakiegokolwiek zapisu**; zero `ON_DRAG` | §4/G1 |
| I-07 | tap `×` w belce (instancja `buttons` 40×40, `x=304`) | krok → `7196:10912` (S2) | scrim `przyciemnienie` 360×780, `#3E2B22` @ **45 %**, zmienna `VariableID:173:3197` | [V] scrim · [I] wyzwalacz | WYM §2 |
| I-08 | tap „wyjdź mimo to" (`7196:10931`) | S2 → zamknięcie overlaya | — | [I] · [U] `history.pushState`, WYM §2 | WYM §2 |
| I-09 | systemowy „wstecz" | overlay → strona | — | [U] WYM §2/§3 (D13). **Zero reprezentacji w Figmie** | WYM §3 |
| I-10 | tap checkboxa w wierszu składnika | `stan=teraz` → stan odhaczony | — | [V] tylko `stan=zużyty` niesie ✓; wariantu „odhaczony w bieżącym kroku" **nie ma** | Aneks 5 · §4/G2 |
| I-11 | tap „zobacz pozostałe" (`7211:10913`, `7468:103114`) | krok → **`7196:10982`** (klatka kanoniczna; `7266:10720` to jej duplikat, pomijać) | — | [V] cel jednoznaczny: **pełna lista**, wszystkie trzy sekcje · [U] etykieta do zmiany, §4/G7 | WYM §5 |
| I-12 | zamknięcie listy rozwiniętej | `7196:10982` → krok | — | [V] brak klatki; glif `keyboard_arrow_down` / `⌄` obecny w wierszu | §4/G5 |
| I-13 | scroll listy rozwiniętej | wewnątrz `7196:10982` | — | [V] adnotacja `↕ treść przewija się w całości` (`7196:11031`); `scroll rail` 3×437 z `thumb` 3×408 na `x=353` w `7211:10893` | Aneks 5 |
| I-14 | uruchomienie minutnika | krok bez pigułki → krok z pigułką (`7195:11088`, `7195:11118`) | — | [I] para klatek; brak klatki „przed uruchomieniem" | Aneks 4 |
| I-15 | tap pigułki — rozwinięcie | `7195:11088` (pigułka 328×40) → `7211:10893` (blok 328×236) | — | [V] geometria obu · [I] wyzwalacz; glif `keyboard_arrow_down` (`7211:10928`) | Aneks 4 |
| I-16 | tap nagłówka — zwinięcie | rozwinięty → pigułka | — | [V] glif `keyboard_arrow_up` (`7240:10921`) w S5 · [I] kierunek | Aneks 4 |
| I-17 | drugi minutnik — stos | `7196:11144`: `stos` 360×186 = pigułka 40 + odstęp 8 + blok rozwinięty 126; `BOTTOM` 266 | — | [V] geometria | Aneks 4 · D11 |
| I-18 | próba trzeciego minutnika | krok → `7196:10955` (S4), dialog 328×311, scrim 45 % | — | [V] geometria · [U] D11 | WYM §6 · D11 |
| I-19 | licznik przekracza 60 s od końca | `stan=w toku` → `stan=ostatnia minuta` | **kropka 8→12 px, `#3E2B22`→`#CF411A`, puls 1×/s; ramka pigułki 1,5 px `#CF411A`** | [V] LEGENDA `7221:10893` + różnica wariantów | Aneks 4 |
| I-20 | licznik wchodzi w ostatnie 10 s | `ostatnia minuta` → **stan bez wariantu** | **ten sam kolor, puls przyspiesza do 2×/s — „eskalacja tempem, nie barwą"** | [V] LEGENDA; brak wariantu komponentu | §4/G3 |
| I-21 | licznik osiąga `0:00` | → `stan=czas minął` | **puls gaśnie, kropka pomarańczowa statyczna** | [V] LEGENDA | Aneks 4 |
| I-22 | restart po `0:00` („uruchom ponownie") | — | — | [U] D10, WYM §2. **Etykiety „uruchom ponownie" nie ma w żadnej klatce** | §4/G10 |
| I-23 | powrót do karty po wygaszeniu ekranu | → `7240:10900` (S5), `BOTTOM` 347 | — | [V] geometria i copy · [U] wake lock, Aneks 6 | Aneks 6 |
| I-24 | tap markera zamiennika (`info` 20×20) | `7468:103095` → tooltip `7468:103138` **296×89**, `x=32` (lico kolumny składników), 8 px pod wierszem, radius 12, fill `beige 1` (`VariableID:173:3194`), cień surowy `DROP_SHADOW` | — | [V] pełna geometria | Aneks 5 · HANDBACK §2 |
| I-25 | tap „zamknij" (`7473:103100`) | tooltip → zamknięty | — | [V] glif **16×19**, nie 44×44 · [U] decyzja 7 wymaga hit-area 44 px | §4/G9 |
| I-26 | tooltip nie minimalizuje minutników | — | — | [U] decyzja 8. `7468:103095` ma `BOTTOM`=80 (krok bez minutnika) — **w pliku nietestowalne** [V] | Aneks 5 |
| I-27 | zmiana orientacji na poziomą | → scrim „obróć telefon" | — | [U] WYM §1. **Zero klatek** | Aneks 13 |
| I-28 | wejście w overlay (loader D13) | strona → overlay | — | [U] spec §17, WYM §3. **Zero klatek** | WYM §3 |
| I-29 | ekran zakończenia | krok 9 → `7195:11178` („pochwal się swoim daniem") | — | [U] cięcie zakresu v1.0, §4/C6. Mechanika zdjęciowa i CTA aparatu (`7448:128443`) **poza zakresem v1.0** | WYM §2 |
| I-30 | wznowienie przerwanego gotowania | `7196:10893` (S1) → krok 6 | — | [I] pasek 197/296 ≈ 6/9 · [U] localStorage, WYM §2 | Aneks 7 |
| I-31 | tap „sprawdź ponownie" (S3) | `7196:10932`, in-place | — | [I] copy · [U] Aneks 7 | Aneks 7 |
| I-32 | postęp w belce | wypełnienie = `round(188 × n / N)` przy torze 188 px | — | [V] zgodne dla n=1…9 (21/42/63/84/104/125/146/167/188) | WYM §4 |

**Bilans provenance:** `[V]` jako główne źródło wiersza — 11 · `[I]` — 13 ·
`[U]` (brak lub prawie brak zapisu w Figmie) — 8. Wierszy z zapisaną animacją: **3**
(I-19, I-20, I-21), wszystkie z adnotacji tekstowej, żaden z danych prototypu.

---

## 3. Macierz stanów komponentów

Kontener `7224:10893` „KOMPONENTY · tryb gotowania" — trzy zestawy. Uwaga: handoff
wskazywał `7224:10893` jako *component set*; to zwykła ramka z trzema zestawami. [V]

### 3.1 `rząd składnika` — `7224:10921`, oś `stan`

| wariant | node | wygląd | stan runtime |
|---|---|---|---|
| `stan=teraz` | `7224:10911` | checkbox 16×16, obrys `#3E2B22` 1 px, radius 3, bez wypełnienia · nazwa DM Sans Regular 14 `#3E2B22`, bez dekoracji | składnik użyty w bieżącym kroku |
| `stan=dalej` | `7224:10914` | **identyczny co do piksela z `stan=teraz`** | składnik z kroków dalszych |
| `stan=zużyty` | `7224:10917` | checkbox wypełniony `#3E2B22` + `✓` biały · nazwa `STRIKETHROUGH` | składnik z kroków wcześniejszych / odhaczony |

**Oś `stan` nie jest osią wyglądu — jest osią pozycji względem bieżącego kroku.**
Porównanie `teraz` z `dalej` objęło rekurencyjnie oba warianty i wszystkie ich dzieci
po: `fills`, `strokes`, `strokeWeight`, `cornerRadius`, `effects`, `effectStyleId`,
`fillStyleId`, `textStyleId`, `opacity`, `visible`, `textDecoration`, `fontName`,
`fontSize`, `boundVariables` oraz geometrii (`x`, `y`, `width`, `height`) każdego
dziecka. **Jedyna różnica w całym drzewie: `y` samego wariantu w siatce zestawu
(24 vs 59)** — czyli miejsce, w którym Figma parkuje wariant na kanwie. To nie jest
właściwość projektowa. [V]

Wizualnie rozróżnialny jest wyłącznie `zużyty`. Grupowanie niosą nagłówki sekcji
(„w tym kroku" / „dalej" / „zużyte") i linie rozdzielające, nie styl wiersza. Na
ekranie kroku występują zresztą wyłącznie wiersze `teraz`, więc tam oś jest bezczynna
podwójnie.

**Konsekwencja dla runtime'u:** nie wyprowadzaj trzech klas z tej osi. Buduj **dwa**
stany wizualne wiersza — niezaznaczony i zaznaczony-przekreślony — a przynależność do
sekcji rozstrzygaj strukturą listy. `dalej` jest w Figmie wygodą nazewniczą, nie
tokenem.

**ROZSTRZYGNIĘTE (operator, 2026-08-14): `dalej` nie dostaje delty wizualnej.**
Rozdzielenie niosą nagłówek sekcji, linia rozdzielająca i kolejność — „w tym kroku"
stoi pierwsze. To wystarczy. Brak różnicy między `teraz` a `dalej` jest stanem
docelowym, nie długiem projektowym; **nie zgłaszać go ponownie jako defektu.**

Runtime buduje więc **dwa** stany wiersza. Oś `stan` zostaje w Figmie jako etykieta
porządkowa dla projektanta.

**Klatka kanoniczna listy: `7196:10982`.** `7266:10720` to duplikat różniący się
wyłącznie nazwą — pomijać. Nazwa „na obrysie (lżejsza)" nie ma pokrycia w treści
klatki; sprawdzone dwiema niezależnymi metodami: [V]

1. rekurencyjny diff obu drzew zwraca trzy różnice — `name`, `x`, `y` klatki
   nadrzędnej; zero różnic w treści, stylach, wypełnieniach, obrysach, odstępach
   i geometrii dzieci;
2. render 360×780 obu klatek daje **ten sam plik PNG** — identyczny SHA-256
   (`4a65547d…def3592`), identyczne 1 123 980 bajtów surowych pikseli.

`byk` (26×20) obecny i **ukryty we wszystkich trzech wariantach** — zgodne
z decyzją 5. [V]

Użycie w zestawie: `teraz` 26 · `dalej` 14 · `zużyty` 10. [V]

### 3.2 `pigułka minutnika` — `7224:10910`, oś `stan`

| wariant | node | wygląd | stan runtime |
|---|---|---|---|
| `stan=w toku` | `7224:10895` | tło `#F1ECDF`, radius 8, bez obrysu · kropka **8×8** `#3E2B22` | > 60 s do końca |
| `stan=ostatnia minuta` | `7224:10900` | tło `#F1ECDF`, obrys **1,5 px `#CF411A`** · kropka **12×12** `#CF411A` | ≤ 60 s, puls 1×/s |
| `stan=czas minął` | `7224:10905` | **statycznie identyczny z `ostatnia minuta`** | `0:00`, puls wygaszony |

Każdy wariant: `kropka` · `label` · `czas` · `keyboard_arrow_down`. Wysokość 40,
szerokość 328. [V]

Użycie: `w toku` 4 · `ostatnia minuta` 1 · `czas minął` **0**. Klatki rysujące `0:00`
(`7196:11116`, `7240:10900`) używają lokalnych ramek, nie instancji. [V]

### 3.3 `przycisk` — `7224:10926`, oś `waga`

`waga=primary` (`7224:10922`) · `secondary` (`7224:10924`) · `tertiary` (`7234:10893`),
wszystkie 296×44, dzieci `label` + `ikona`.

**Zero instancji w całym zestawie `7195:10893`.** [V] Wszystkie przyciski w klatkach
pochodzą z bibliotek `buttons` (`191:2447`) i `buttons_2` (`6968:5081`).

### 3.4 Warianty bez stanu runtime i stany bez wariantu

| pozycja | kierunek | uwaga |
|---|---|---|
| `przycisk` — cały zestaw | wariant bez użycia | martwy; runtime odwzorowuje `buttons_2`, nie ten zestaw |
| `pigułka · czas minął` | wariant bez instancji | stan runtime istnieje, ale klatki go nie instancjonują |
| „ostatnie 10 s" (puls 2×/s) | **stan bez wariantu** | opisany wyłącznie tekstem w LEGENDZIE |
| „odhaczony w bieżącym kroku" | **stan bez wariantu** | `zużyty` łączy odhaczenie ze strikethrough |
| minutnik rozwinięty | **stan bez wariantu** | `7211:10925` to zwykła ramka, nie instancja |
| `teraz` vs `dalej` | wariant bez delty | **zamierzone** (operator 2026-08-14) — rozdzielają nagłówek, linia i kolejność; nie jest to defekt |

### 3.5 Nazwy instancji nie odpowiadają wariantom

Mapowanie stanów po nazwach warstw da błąd. Zmierzone przypadki: [V]

- `cta — primary` → main `wersja=ghost…` (`6968:5290`)
- `cta — cta` → main `wersja=ghost…` (`6968:5296`)
- `przycisk — primary` → main `wersja=primary…` z `buttons_2`, nie z zestawu `przycisk`
- `buttons_2` (nazwa instancji) → main `wersja=cta…`

---

## 4. Luki i konflikty

### Luki — brak zapisu, runtime i tak tego potrzebuje

| # | Luka | Rekomendacja | Dlaczego |
|---|---|---|---|
| G1 | Nawigacja krok↔krok: żadnego gestu, żadnej reakcji | tap-only (CTA „dalej" + `←`), **bez swipe** | ta sama przesłanka, którą HANDBACK §2 odrzucił karuzelę: poziomy gest w pionowo przewijanym `position: fixed` overlayu koliduje ze scrollem |
| G2 | „odhaczony w bieżącym kroku" nie ma wariantu | checkbox wypełniony + `✓`, **bez** strikethrough | strikethrough w `zużyty` niesie „składnik już wykorzystany", nie „użytkownik odhaczył"; zlanie obu odbierze stan S1 czytelność |
| G3 | „ostatnie 10 s" bez wariantu | ten sam styl co `ostatnia minuta`, puls 2×/s | LEGENDA jest jednoznaczna, komponent po prostu za nią nie nadąża |
| G4 | `ostatnia minuta` i `czas minął` statycznie nierozróżnialne | rozróżnienie **wyłącznie** animacją (puls vs jego brak) | inaczej użytkownik przy `0:00` widzi to samo co przy 40 s |
| G5 | Zamknięcie listy rozwiniętej — brak klatki | ten sam cel dotyku co otwarcie, glif obraca się `⌄`↔`⌃` | glify obu kierunków są w pliku, brakuje tylko pary klatek |
| G6 | „najpierw pokaż składniki" bez celu | wg WYM §5: otwiera `7196:10982`; oznaczyć `// NIENARYSOWANE:` | potwierdza HANDBACK §6, pozycja nadal otwarta |
| G7 | „zobacz pozostałe" prowadzi do listy pokazującej **wszystko** (w tym kroku 1 · dalej 8 · zużyte 5), więc etykieta kłamie | zmienić **etykietę**, nie cel — np. `cała lista składników` | cel jest narysowany raz i jednoznacznie; sekcje z nagłówkami filtrują wzrokowo za darmo, a czytelnik otwierający listę w trakcie gotowania równie często sprawdza to, co już zużył. Potwierdza ostrzeżenie HANDBACK §6 |
| G8 | Tooltip „flipped-above" nienarysowany | odbicie symetryczne nad wiersz, oznaczyć w kodzie | WYM §5 i Aneks 5 już to przewidują |
| G9 | Hit-area 44×44 dla `zamknij` nie istnieje w pliku | zbudować wg decyzji 7 (glif 16×19 w celu 44×44) | rysunek pokazuje glif, nie cel dotyku — łatwo zaimplementować dosłownie i źle |
| G10 | Etykiety „uruchom ponownie" nie ma w żadnej klatce | wg D10; skopiować register z sąsiednich CTA | D10 wskazuje „istniejącą afordancję", której w pliku nie ma |
| G11 | Scrim landscape, loader D13, `history.pushState` — zero klatek | budować wyłącznie z WYMAGANIA §1/§3 i spec §17 | Figma nie jest tu źródłem i nie należy jej pytać |
| G12 | Przejścia wejścia/wyjścia overlaya | brak danych — **nie zgaduj czasu ani easingu** | jedyne czasy w pliku (300 ms DISSOLVE) należą do hover-state bibliotecznych przycisków i nie dotyczą trybu gotowania |

### Konflikty — Figma kontra decyzja

| # | Rozjazd | Co wygrywa |
|---|---|---|
| C1 | `BOTTOM` zmierzone: **80, 108, 132, 180, 213, 218, 266, 328, 347**. WYMAGANIA §4 pinuje cztery: 80/132/218/266 | `BOTTOM` **nie jest listą wartości, jest sumą**: pasek nawigacji + stos kart minutnika (rozkład w §4.1 poniżej). Pin czterech wartości opisuje cztery częste ekrany kroku i milcząco pomija dwie zwinięte pigułki (180), obie wysokie formy rozwinięte (328, 347) i ekran offline (213). **Do operatora**: rozszerzyć pin albo zapisać go jako regułę składania. `108` do pinu nie należy — to artefakt adnotacji |
| C2 | Marker `i` w `7468:103095` stoi zaraz za nazwą (`x=182` w wierszu 296 px), nie na końcu wiersza | **ROZSTRZYGNIĘTE (operator, 2026-08-14): zaraz za nazwą składnika.** Sformułowanie „at row end" z HANDBACK §2 Task 2 / decyzji 6 jest tym samym uchylone; `7468:103095` (decyzja 12) pozostaje konsensusem |
| C3 | Tooltip `7468:103138` niesie **surowy** `DROP_SHADOW`, nie styl `drop_shadow_ui` | Decyzja 11 wiąże styl z elementami minutnika, więc tooltip formalnie jest poza jej zakresem; efekt niestylowany zostaje długiem. Obserwacja, nie blokada |
| C4 | `belka` we wszystkich 29 klatkach ma wyłącznie `BACKGROUND_BLUR`, bez cienia | Potwierdza otwartą pozycję HANDBACK §6 — **zweryfikowane [V]**, nie tylko odziedziczone |
| C5 | Zestaw ma **29** klatek, nie 31 (WYMAGANIA §0, HANDBACK §1). Nie istnieją już: `7448:128344` (paste-test operatora), `7450:12421`, `7451:12470`, `7458:12544` (klatki dowodowe), ani kontener `7433:128189` „Group 4868" | **Przyjęte do wiadomości (operator, 2026-08-14), bez działania.** Liczbą bieżącą jest 29; inwentarz HANDBACK §1 czytać jako zapis historyczny |
| C6 | Dwie klatki zakończenia. `7195:11178` = „pochwal się swoim daniem", **bez** mechaniki −70 zł. `7448:128443` = z mechaniką. (HANDBACK §1 przypisuje mechanikę do `7195:11178` — nieaktualne) | **ROZSTRZYGNIĘTE (operator, 2026-08-14): wdrażamy `7195:11178`. To ŚWIADOME CIĘCIE ZAKRESU, nie uchylenie D9.** D9 („kwota zniżki z Site Settings") pozostaje w mocy i wraca razem z mechaniką; w v1.0 po prostu nie ma powierzchni, która by ją czytała. Runtime v1.0 **nie czyta** kwoty zniżki z Site Settings i nie renderuje kroków 1–3 mechaniki zdjęciowej. `7448:128443` zostaje w pliku jako wariant gotowy do włączenia. Propozycja poprawki WYMAGANIA §2 — §4.2 poniżej |
| C7 | Zestaw `przycisk` (`7224:10926`) nie ma ani jednej instancji; przyciski pochodzą z `buttons_2` (`6968:5081`) | **ROZSTRZYGNIĘTE (operator, 2026-08-14): komponent zostanie zbudowany.** Przycisk trybu gotowania i tak nie żyje w Webflow, więc nie ma ograniczenia zewnętrznego. Do czasu zbudowania źródłem wyglądu jest `buttons_2` |
| C8 | Instancja `buttons` raportuje 44 px treści w ramce 40 px (HANDBACK §6) | **Nie weryfikowane w tej sesji** [U]; przenoszę wyłącznie jako pozycję otwartą |
| C9 | *(poboczne)* WYMAGANIA §3 wymienia pin „**Próg 480**", podczas gdy §1 tego samego pliku rozstrzyga **500** | **ROZSTRZYGNIĘTE (operator, 2026-08-14): próg wynosi 500.** `480` w §3 jest literówką do poprawienia przy najbliższej rewizji WYMAGANIA — nie poprawiam z tego pliku |

### 4.1 `BOTTOM` jako reguła składania

`BOTTOM = stos + pasek nawigacji`. Pasek nawigacji ma 80 px (`←` 44×44 + CTA 272×48)
albo 132 px na ekranach bez `←` (start, S1, zakończenie: dwa CTA 328×48 jeden pod
drugim). Stos to karty minutnika ułożone pionowo, odstęp 12 px pod ostatnią. [V]

| `BOTTOM` | stos | zawartość stosu | ekrany |
|---|---|---|---|
| 80 | — | brak minutnika | `01`–`03`, `05`, `09`, krok bez zdjęcia, SPEC, TEST C, TEST E |
| 108 | 28 | **adnotacja projektowa** `↕ treść przewija się w całości` | `7196:10982` — **nie jest wysokością runtime** |
| 132 | 52 · lub pasek 132 | jedna pigułka zwinięta (40) · albo dwa CTA bez `←` | `07` · `00`, S1, zakończenie |
| 180 | 100 | dwie pigułki zwinięte (40 + 40) | `W · ostatnia minuta` |
| 213 | 133 | komunikat offline (121) | S3 |
| 218 | 138 | jeden minutnik rozwinięty, forma krótka (126) | `04`, `06` |
| 266 | 186 | pigułka zwinięta (40) + minutnik rozwinięty krótki (126) | `08`, `W · stos dwóch` |
| 328 | 248 | jeden minutnik rozwinięty, forma wysoka (236: wiersz 34 + kryterium 38 + dwa przyciski 48) | `W · krok 4`, `W · czas minął`, `W · krok 7` |
| 347 | 267 | minutnik rozwinięty + dłuższy komunikat + trzy przyciski (255) | S5 |

### 4.2 Poprawka WYMAGANIA — WPROWADZONA 2026-08-14

Na polecenie operatora (2026-08-14) poprawka została wprowadzona; WYMAGANIA podbite
do **v1.3**. Zakres zmiany:

- **§2** — zdanie o zakończeniu zastąpione: wdrażany wariant `7195:11178`, bez
  mechaniki zniżkowej; mechanika −70 zł i odczyt kwoty z Site Settings (D9) świadomie
  poza zakresem v1.0; `7448:128443` czeka gotowa; D9 pozostaje w mocy.
- **§6** — dopisany test negatywny: runtime nie czyta kwoty zniżki z Site Settings
  i nie renderuje mechaniki zdjęciowej na ekranie zakończenia. Test negatywny ma
  wartość tylko wykonany.
- **nagłówek** — nota zmian v1.3.

**Skutek dla łańcucha:** hash WYMAGANIA się zmienił, więc pin w STAN.md wskazuje na
wartość nieaktualną i przy najbliższym odczycie zadziała reguła STOP. To działanie
zamierzone bramki, nie usterka — pin musi zostać podmieniony ręcznie przez operatora.
Nowy SHA-256 podany w raporcie sesji. **Aneks pomiarowy v1.3 nietknięty** — jego hash
bez zmian.

---

## Wskaźnik do przypięcia w STAN.md

Hash nie może stać w pliku, którego dotyczy — wpisanie go zmieniłoby wartość, którą
opisuje. Zgodnie z konwencją aneksu (wskaźnik + hash żyją na zewnątrz) hash tego
pliku podaję w raporcie sesji i to on wchodzi do STAN.md. Poniżej blok do wklejenia;
uzupełnij `<hash>` wartością z raportu.

```
git/tech/tryb-gotowania/INTERAKCJE.md  v1.0 (2026-08-14)
sha256: <hash>
Czytaj po ścieżce, weryfikuj po SHA-256. Hash niezgodny = STOP i raport,
nie praca na „mniej więcej tym pliku".
```
