# REJESTR LUK G1–G12 — wsad do rozstrzygnięcia wiersza I6

Powstał w przebiegu 11. **Nie rozstrzyga wiersza I6** — dostarcza rejestr, którego
rekomendacja (a) z listy decyzji wymaga, i mierzy, jak wygląda pokrycie dzisiaj.
Źródło luk: `INTERAKCJE.md` §4 (v1.5, hash zweryfikowany). Źródło pokrycia: `grep`
po `tryb-gotowania.js` i `przepis-parser.js`, nie pamięć.

**PRZEBIEG 14: pokrycie doprowadzone do 12/12, rejestr poprawiony o dwa
przeszacowania.** Wszystkie znaczniki mają dziś formę kanoniczną
`NIENARYSOWANE (Gn)` przy miejscu wykonania, więc wiersz I6 jest mierzalny jednym
`grepem`. Praca była w całości komentarzowa: **minifikat wychodzi bajt w bajt
identyczny** (`sha256 d5a93791…`), czyli w artefakcie kosztuje zero.

## Pomiar (stan po przebiegu 14; kolumna „przeb. 11" = co mierzył rejestr pierwotny)

| # | luka (skrót) | zbudowane? | znacznik `NIENARYSOWANE (Gn)` | przeb. 11 |
|---|---|---|---|---|
| G1 | nawigacja krok↔krok: tap-only, bez swipe | tak, **przez nieobecność** | 🟢 `:530` + wskazanie asercji negatywnej | 🟢 **błędnie** |
| G2 | odhaczony = checkbox + `✓`, bez przekreślenia | tak | 🟢 `:251` | 🔴 |
| G3 | ostatnie 10 s: puls 2×/s | tak (`:198`) | 🟢 `:193` | 🔴 |
| G4 | `0:00` rozróżnione wyłącznie brakiem pulsu | tak (`:199`) | 🟢 `:193` | 🔴 |
| G5 | zwinięcie: ten sam cel dotyku, glif `⌄`↔`⌃` | tak | 🟢 `:1162`, `:1208`, `:1213` | 🔴 |
| G6 | „najpierw pokaż składniki" — cel `7196:10982` | tak | 🟢 `:1407` | 🟢 **błędnie** |
| G7 | etykieta pełnej listy zmieniona, nie cel | tak | 🟢 `:279`, `:1156` | 🔴 |
| G8 | tooltip odbity nad wiersz | tak | 🟢 `:807` (forma znormalizowana) | 🟢 |
| G9 | hit-area 44×44 dla `zamknij` | tak | 🟢 `:269` | 🔴 |
| G10 | etykieta „uruchom ponownie" | tak | 🟢 `:620` | 🟢 |
| G11 | scrim landscape · loader D13 · `pushState` | tak (wszystkie trzy) | 🟢 `:453`, `:1521`, `:1524` — **wszystkie trzy miejsca** | 🟡 |
| G12 | przejścia wejścia/wyjścia overlaya | **nie — i tak trzeba** | 🟢 `:102` + wskazanie asercji negatywnej | — |

**Pokrycie: 12/12** (zmierzone `grepem` po edycji, nie z pamięci).

## Dwa przeszacowania rejestru pierwotnego — złapane przy odczycie linii, nie listy

Rejestr z przebiegu 11 dał 🟢 dwóm lukom, którym się nie należało. **Oba trafienia
to znacznik stojący w pobliżu, ale mówiący o czym innym** — dokładnie ta rodzina
błędu, co „przyrząd odpowiada pewnie i odpowiada nie na to pytanie":

- **G1** dostał 🟢 za `:527`, czyli za znacznik przy `scrim.textContent = 'obróć
  telefon'`. To jest brak BRZMIENIA scrima orientacji (populacja b, i w dodatku
  miejsce należące do G11), a nie decyzja o nawigacji tapem. Miejsce G1 to `:530`
  i miało tam wyłącznie cytat `(G1)` bez znacznika.
- **G6** dostał 🟢 za `:1402`, czyli za zdanie w komentarzu blokowym, które
  *opisuje*, że znaczniki stoją „przy trzech z sześciu" celów CTA. Komentarz o
  znacznikach nie jest znacznikiem. Miejsce G6 to `:1407`.

**Prawdziwe pokrycie wyjściowe wynosiło więc 2/12, nie 4/12.** Wniosek dla
metody: rejestr zbudowany `grepem` po numerze luki liczy SĄSIEDZTWO, a sąsiedztwo
nie jest przynależnością — dopiero odczyt samej linii mówi, czego znacznik dotyczy.

## Trzy rzeczy, które ten pomiar pokazał, a których nie widać z wiersza

**1. Pod jednym znacznikiem żyją dwie różne populacje.** Znaczników
`// NIENARYSOWANE:` jest **26**; przy 23 z nich nie ma w otoczeniu żadnego numeru `G`.
To nie jest zaniedbanie — one oznaczają co innego:

- **(a) luki zachowań** — lista zamknięta, G1–G12, wyprowadzona z INTERAKCJE;
- **(b) braki szczegółu** — brzmienia od pipeline'u treści, wymiary, których plik
  Figmy nie podaje, pozycje z listy decyzji. Populacja otwarta.

**Populacji (b) nie da się zmierzyć na kompletność w żadnym wariancie wiersza**, bo
wymagałoby to wyliczenia rzeczy, których plik NIE mówi. Populacja (a) jest mierzalna
natychmiast, bo ma rejestr. To jest właściwa treść zastrzeżenia z przebiegu 9 —
tautologia groziła wyłącznie populacji (b).

**2. Dwie luki są „zbudowane przez nieobecność" i psują każdy licznik miejsc.**
G1 (bez swipe) i G12 (bez przejść) polegają na tym, żeby czegoś NIE napisać.
Zmierzone: `transition:` **0 ×**, `ease`/`cubic-bezier` **0 ×**, `touchstart`
/`pointerdown`/`swipe` **0 ×**. G12 jest więc **wykonane wzorowo i jednocześnie
niemożliwe do oznaczenia znacznikiem** — nie ma linii, przy której znacznik miałby
stanąć. G1 miało szczęście: `:527` opisuje decyzję przy CTA „dalej".

Wniosek dla brzmienia wiersza: **licznik „miejsc ze znacznikiem" jest złym oracle'em
dla luk rozstrzygniętych zaniechaniem.** Dla nich właściwym dowodem jest asercja
negatywna (zero wystąpień), którą matryca już umie robić w sekcji H.

**3. G11 to jedyny czysty brak.** Zbudowany w trzech miejscach (scrim orientacji,
loader, `pushState`), znacznik stoi przy scrimie (`:453`), ale numeru luki nie cytuje.
Koszt uzupełnienia: jedno słowo w komentarzu. Odnotowane, nie poprawione — to zmiana
w runtimie, a runtime po zmianie wymaga przemiaru matrycy i przegenerowania `*.min.js`.

## Co z tego wynika dla wiersza I6

Rekomendacja z przebiegu 9 (rejestr staje się oracle'em) **działa, ale tylko dla
populacji (a)** i tylko wtedy, gdy wiersz dopuszcza dowód negatywny dla luk
rozstrzygniętych zaniechaniem. Proponowane brzmienie — do decyzji operatora, NIE
wprowadzone do matrycy:

> I6 — każda luka G1–G12 jest w kodzie **rozstrzygnięta i udokumentowana**
> znacznikiem `// NIENARYSOWANE (Gn):` przy miejscu wykonania. Dla luk
> rozstrzygniętych ZANIECHANIEM znacznik stoi tam, gdzie stanąłby kod, i wskazuje
> asercję negatywną jako właściwy dowód.

**Przebieg 14 wykonał całą pracę, którą to brzmienie zakłada.** Zmiana względem
przebiegu 11: rekomendacja mówiła „albo znacznik, albo asercja negatywna" —
rozdzielenie okazało się niepotrzebne. G1 i G12 mają dziś jedno i drugie: znacznik
w miejscu, gdzie decyzja o zaniechaniu została podjęta (`:530` — nasłuchy kroku;
`:102` — przełączenie `data-otwarty`), a w treści znacznika wskazanie, że dowodem
jest asercja sekcji H, a nie on sam. **Luka „zbudowana przez nieobecność" ma więc
gdzie postawić znacznik — nie przy kodzie, którego nie ma, tylko przy kodzie,
który stoi zamiast niego.** To obala punkt 2 rozdziału wyżej: licznik miejsc jest
złym oracle'em dopóty, dopóki szuka miejsca po nieistniejącym kodzie.

**Do zieleni został wyłącznie podpis operatora pod brzmieniem.** Żadna praca za
nim nie stoi: pokrycie jest 12/12, mierzalne jednym `grepem`
(`grep -c 'NIENARYSOWANE (G'` → 16 wystąpień na 12 luk; G5 i G11 mają po trzy
miejsca, G7 dwa). Gdy brzmienie zostanie przyjęte, I6 zmienia się na 🟢 jedną
edycją matrycy — bez dotykania runtime'u i bez przemiaru.
