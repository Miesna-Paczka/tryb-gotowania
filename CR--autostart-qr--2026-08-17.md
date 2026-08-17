# Change request — parser sam uruchamia rysowanie kodu QR (kontrakt embedu §6)

**Data:** 2026-08-17 · **Źródło:** rozstrzygnięcie operatora **D-39.39**
**Adresat:** łańcuch `przepis-webflow-sukcesor` + operator (pin B1 — interfejsu embedu
nie poprawia jednostronnie żaden łańcuch)
**Autor:** sesja `tryb-gotowania-domkniecie`, 2026-08-17. **Ta sesja nie zmieniła
`instrukcja-pisania-przepisow.md` ani niczego w szablonie Webflow** — wykonała wyłącznie
własną stronę: parser, runtime, STAN.

## Problem, zmierzony a nie założony

Operator zgłosił, że kod QR nie pojawia się w bloku „gotuj z telefonem w ręku".
Pomiar na stagingu, okno 2560 `[V]`:

| co sprawdzone | wynik |
|---|---|
| slot `[data-mp-qr]` istnieje | **tak** — `div.recipe-qr__code` |
| slot ma zawartość | **nie** — 0 dzieci, `innerHTML` pusty |
| `MP.przepis.rysujQR` istnieje | **tak**, `function` |
| bramka `min-width: 992px` | **przechodzi** |
| `adresQR()` | **poprawny**, origin produkcyjny |
| ręczne `MP.przepis.rysujQR()` | **rysuje kod** — `<svg>`, 18 306 znaków |
| **skrypty strony wołające `rysujQR`** | **ZERO** |

**Generator, slot, bramka i adres były sprawne od początku. Brakowało wyłącznie
wywołania.** `rysujQR` ma domyślny selektor `[data-mp-qr]`, czyli było projektowane
pod automatyczne uruchomienie, ale automatu nigdy nie dopięto — ani po stronie
parsera, ani w skrypcie wiążącym szablonu.

**To czwarte wystąpienie tej klasy usterki w tym produkcie**, po `D-39.13` (ekran
zakończenia), `D-39.14` (minutniki) i `D-39.18` (wznowienie sesji): funkcja gotowa,
przetestowana i nieosiągalna. Matryca tego nie łapie z definicji — pyta „czy funkcja
robi to, co ma robić", a nie „czy ktokolwiek ją wywołuje".

## Co zostało zrobione po stronie technicznej

Wyzwalacz **wpisany do `przepis-parser.js`**, nie do szablonu. Uzasadnienie wyboru,
bo to jest właśnie ta część, która dotyka Waszego dokumentu:

- wywołanie w polu custom code Webflow jest **niewidoczne dla gita, dla matrycy
  i dla każdego pomiaru** — ginie przy pierwszej nieostrożnej edycji szablonu i nikt
  tego nie zauważa. Przy czterech zgubionych wyzwalaczach w historii tego produktu
  wkładanie piątego w miejsce najtrudniejsze do sprawdzenia byłoby proszeniem się o szósty;
- wersjonowanie: plik w repo przechodzi przez commit, diff i budżet transferu.

Kształt zmiany: na `DOMContentLoaded` (albo natychmiast, jeśli `defer` sprawił, że
dokument jest już sparsowany) parser sprawdza obecność slotu i rysuje. Dodatkowo
nasłuchuje zmiany bramki `(min-width: 992px)`, żeby poszerzenie okna dorysowało kod.

## O co prosimy

**Zapis w `instrukcja-pisania-przepisow.md` §6 wymaga uzupełnienia**: parser przestał
być całkowicie bierny przy wczytaniu strony. Proponowane brzmienie do Waszej redakcji:

> Parser po wczytaniu strony sam rysuje kod QR w elemencie `[data-mp-qr]`, jeśli taki
> element istnieje i okno ma co najmniej 992 px szerokości. Strona nie musi go o to
> prosić. Bez slotu albo na węższym oknie parser nie robi nic.

**Zakres efektu ubocznego jest wąski i celowo taki został ograniczony:** bez slotu
`[data-mp-qr]` albo przy oknie < 992 px nie dzieje się nic. Na stronie, która wczytuje
parser, ale nie ma kodu QR, zachowanie się nie zmienia.

## Sprawa pokrewna, poza tym CR-em — rozmiar slotu

Przy okazji zmierzono kolizję, którą operator rozstrzygnął po swojej stronie
(zmiana w Webflow, nie w instrukcji): slot ma **96×96** i `overflow: hidden`,
a parser pisze SVG **192×192** (spec §8). Bez zmiany rozmiaru slotu widoczna byłaby
lewa górna **ćwiartka** kodu, a przycięty kod QR **nie da się zeskanować**.
**Decyzja operatora: slot rośnie do 192×192.** Parser zostaje przy 192 zgodnie ze
spec §8 — przy 96 px moduł kodu ma ≈ 2,3 px i skanowanie robi się zawodne na ekranach
o niskim DPI; przy 192 px moduł ma ≈ 4,7 px.

Odnotowujemy to tu wyłącznie po to, żeby ktoś, kto trafi na pusty albo przycięty kod,
znalazł obie przyczyny w jednym miejscu.
