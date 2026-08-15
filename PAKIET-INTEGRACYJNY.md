# PAKIET INTEGRACYJNY — embed trybu gotowania (jednostka 10)

Założony w przebiegu 9 (2026-08-15), MATRYCA 108/118. Cel jednostki 10 z inwentarza
STAN.md: **żeby faza integracyjna była wykonaniem, a nie projektowaniem.** Wszystko,
co da się rozstrzygnąć lokalnie, ma być tu rozstrzygnięte; wszystko, czego nie da —
ma być tu nazwane jako decyzja, a nie zostawione do odkrycia na stagingu.

Ten plik **nie jest instrukcją publikacji**. Publikacja, staging i produkcja są poza
łańcuchem (STAN.md, piny). To jest wsad.

---

## 1. Stan gotowości — jedno zdanie na sekcję

| co | stan |
|---|---|
| runtime (`tryb-gotowania.js`) | gotowy; **zminifikowany mieści się** (**40 713 zn.**, zapas **4 287** do progu **45 000** z WYM v1.7), źródło nie — wkleja się artefakt, **dwa embedy**, parser przed runtime'em — §2 |
| warstwa danych (`przepis-parser.js`) | gotowa; **urosła w przeb. 28 o bibliotekę QR** (D-13.1/B): **39 592 zn.** zminifikowana, zapas **5 408** — §2, §3d |
| font ikon | **WPIĘTY I ZMIERZONY** (przeb. 31 wpiął, przeb. 32 zmierzył bez wyścigu): trzy `@font-face` z CDN Webflow, ligatury 20,0 px przy stopniu 20 z kontrolą ujemną 365,6 px, na 14 ramkach. Subsetu **nie generować i nie wgrywać drugiego** — stoi w Webflow — §3b |
| matryca pomiarowa | **200/200 🟢, zero czerwieni** (przeb. 32). Poza liczeniem **5 ⏸** czekających na jedno zdanie operatora: W18, W46, W47, W77, W79 |
| zależność QR | **ZAMKNIĘTA w przeb. 28**: `qrcode-generator` 2.0.4 (MIT) wbudowany w artefakt parsera, `window` puste, wiersz I3 zielony — §3d |
| tokeny → zmienne Webflow | **opis migracji jest DANĄ (`TOKENY[i][2]`) od przeb. 28**, odczytaną z witryny: 7 z 10 wiąże się 1:1, **trzy braki nazwane jawnie**. Komentarzy przy tokenach nie ma i nie wolno ich odtwarzać — §3 |
| kontrakt meta (`wartosci-porcja`) | **ratyfikowany i wykonany**; pole w CMS jest, wypełnione dla **1 z 18** przepisów — §3c |
| kod wyłącznie pomiarowy | zinwentaryzowany; runtime ma **trzy** seamy, nie dwa — §4 |
| kontrakt DOM wobec szablonu | **urósł o `#mp-wartosci-porcja`** (nagłówek parsera tego nie wymienia) — §5 |
| pozycje wykonalne tylko na stagingu | 9 pozycji z receptą wykonania — §6 |
| lista kontrolna przed wklejeniem | §7 |

---

## 2. Rozmiar — jedyna rzecz, która blokuje wklejenie

**PRZEMIERZONE OD NOWA W PRZEBIEGU 28** — wszystkie liczby niżej pochodzą z plików
w tym katalogu w stanie na 2026-08-15 15:00, policzone `len(bytes.decode('utf-8'))`,
czyli w ZNAKACH (limit Webflow liczy znaki, nie bajty; różnica to polskie litery).

**Parser urósł w tym przebiegu o 68 282 znaki źródła i 22 028 znaków artefaktu**, bo
wykonano D-13.1 (wariant B): biblioteka `qrcode-generator` 2.0.4 jedzie teraz w pliku.
To nie jest przyrost do odchudzenia — to jest cena decyzji „brak cudzego hosta".

| plik | znaków | bajtów |
|---|---|---|
| `tryb-gotowania.js` | **114 237** | 117 000 |
| `przepis-parser.js` | **109 896** | 110 912 |
| **razem (źródła)** | **224 133** | 227 912 |

Limit embedu Webflow: **50 000 znaków na element**. WYM §4 (v1.7) chce **< 45 000** — próg podniesiony z 40 000 decyzją operatora 2026-08-15, D-28.1.
Źródła nie wchodzą w grę i nigdy nie wchodziły: runtime sam przekracza limit twardy
**2,3 ×**. Wklejane są wyłącznie artefakty zminifikowane — tabela niżej.

**Pin ze STAN.md „22 KB mieści się" jest nieaktualny** — opisuje parser sprzed
rozbudowy, sprzed warstwy widoku. Nie poprawiam go, bo piny zmienia operator.

### PRZEMIAR PRZEBIEGU 31 — liczby po wykonaniu D-23.1

Wszystkie cztery pliki urosły o jedno wejście kontraktu. Liczby są z **builda**, nie
z szacunku (`terser <plik> -c -m`), i z tego samego uruchomienia, z którego pochodzi
zmierzona powierzchnia — inaczej pakiet podawałby rozmiar innego artefaktu niż zmierzony.

| plik | znaków (bajtów) | delta wobec przeb. 30 |
|---|---|---|
| `tryb-gotowania.min.js` | **39 648** (39 737 B) | +112 B |
| `przepis-parser.min.js` | **39 957** B | +223 B |
| **razem (artefakty)** | **≈ 79 694 B** | **> 50 000 → nadal DWA embedy** |

Zapas do progu WYM §4 (45 000): runtime **5 352**, parser **5 043**. Wniosek dla planu:
jednostka fontu ikon (B16/I4, deklaracje `@font-face` to setki znaków) mieści się z zapasem
w obu artefaktach — ale liczbę do tej tabeli bierze się po buildzie, nie przed.

### PRZEMIAR PRZEBIEGU 32 — obowiązujący. Tabela wyżej opisuje artefakt SPRZED fontu ikon

**Tabela z przebiegu 31 jest o jedną jednostkę spóźniona.** Powstała po jednostce D-23.1,
a ten sam przebieg zbudował potem `min.js` jeszcze raz, wpinając trzy `@font-face`.
Liczby wyżej opisują więc plik, którego już nie ma w katalogu. Zostawiam je jako zapis,
bo pokazują koszt jednostki fontu ikon (**+1 065 znaków runtime'u**), ale **do wklejenia
i do listy kontrolnej obowiązuje tabela niżej.**

Przyrząd, nazwany raz i na stałe: **`len(open(plik,'rb').read().decode('utf-8'))`**
dla znaków, `len(bajtów)` dla bajtów. Limit Webflow liczy ZNAKI, więc znaki są liczbą
wiążącą, a bajty raportowane obok wyłącznie dlatego, że różnica ujawnia polskie litery.

| plik | znaków | bajtów | zapas do 45 000 |
|---|---|---|---|
| `tryb-gotowania.min.js` | **40 713** | 40 803 | **4 287** |
| `przepis-parser.min.js` | **39 592** | 39 957 | **5 408** |
| **razem (artefakty)** | **80 305** | 80 760 | **> 50 000 → nadal DWA embedy** |
| `tryb-gotowania.js` (źródło) | 121 928 | 124 976 | — |
| `przepis-parser.js` (źródło) | 111 611 | 112 670 | — |

**Przebieg 31 podał BAJTY i nazwał je znakami.** Jego „runtime zminifikowany 40 803 zn.,
zapas 4 197" to `wc -c`, nie `wc -m`: znaków jest 40 713, a zapas 4 287. Kierunek pomyłki
był łagodny — znaków jest zawsze mniej niż bajtów w UTF-8, więc bajtowy odczyt jest
ostrożniejszy i żaden próg nie został przekroczony po cichu. **Nie jest to jednak
nieszkodliwe, bo jedno z dwóch pytań, na które ta sekcja odpowiada, brzmi „ile jeszcze
wolno dopisać".** Zapas podany z dokładnością do metody nie jest zapasem, tylko widełkami,
o których czytelnik nie wie, że je czyta. Stąd nazwanie przyrządu wyżej: liczba w tym
pliku ma pochodzić z jednego, wskazanego z nazwy sposobu liczenia, a nie z tego,
co akurat było pod ręką w danym przebiegu.

**Zapas runtime'u zszedł poniżej 10 % progu** (4 287 z 45 000). To nie jest jeszcze
problem, ale przestało być liczbą, o której można nie myśleć: kolejna jednostka wielkości
fontu ikon zjadłaby jej czwartą część. Do rozważenia przez operatora, gdy zapas spadnie
poniżej 3 000 — dziś tylko odnotowane, bez wniosku.

### ZASTRZEŻENIE ZDJĘTE (przebieg 26) — liczby są znowu [V]

Trzy zdania z poprzedniego wydania tej sekcji są **nieaktualne** i zostawiam je niżej
wyłącznie jako zapis tego, co je unieważniło:

1. **„Minifikat jest starszy od źródła"** — nie jest. Oba minifikaty zostały
   przebudowane w tym przebiegu z bieżących źródeł; `przepis-parser.min.js` wyszedł
   **co do bajtu identyczny** z plikiem leżącym w katalogu (17 663 B), czyli był
   aktualny, a `tryb-gotowania.min.js` został nadpisany po edycjach W64/W66–W75.
2. **„Łańcuch nie zrobi tego sam — `npm install` w piaskownicy nie przechodzi"** —
   obalone w przebiegu 17. Działa `npx --yes terser <plik> -c -m -o /tmp/<nazwa>.js`
   i tym poleceniem powstały obie bieżące wersje. Przebudowa minifikatów **nie jest
   już pozycją operatorską**.
3. **„51 017 znaków razem, brakuje 1 017"** — liczba opisywała artefakt sprzed
   siedemnastu przebiegów pracy. Bieżąca suma to **56 379**; wniosek (dwa embedy)
   się nie zmienił, ale zapas zmienił się o rząd wielkości i to jest różnica, która
   ma znaczenie dla planowania, nie dla decyzji.

<details><summary>Poprzednie zastrzeżenie (przebieg 16) — zapis historyczny</summary>

### ZASTRZEŻENIE do wszystkich liczb w tej sekcji (przebieg 16)

`tryb-gotowania.min.js` jest **starszy od swojego źródła o 126 minut** — zmierzone
nagłówkami `Last-Modified` sondą `MP_MATRYCA.swiezosc()` w `matrix-min.html` [V]
(źródło 15 sie 00:56, minifikat 14 sie 22:50). `przepis-parser.min.js` jest młodszy
od swojego źródła i jest w porządku.

Znaczy to, że **34 439 znaków / 34 516 bajtów** (ten sam plik — różnica to polskie
znaki w UTF-8) i wyprowadzone z tego „≤ 34 782 w wariancie (2)" opisują
artefakt sprzed edycji runtime'u z przebiegu 14 i do czasu przebudowy są **[I], nie
[V]**. Kierunek jest znany (źródło urosło o komentarze `// NIENARYSOWANE:`, a te
i tak wypadają przy minifikacji) i inwentarz literałów napisowych zgadza się co do
sztuki — 307/307 obecnych w minifikatach [V] — więc rozjazd jest najpewniej zerowy.
**Najpewniej nie jest tym samym co zmierzony**, a cała ta sekcja służy decyzji, która
zależy od jednej liczby.

**Pozycja operatorska:** przebudować oba minifikaty tym samym poleceniem, którym
powstały, i przemierzyć `matrix-min.html`. Łańcuch nie zrobi tego sam — `npm install`
w piaskownicy nie przechodzi (trzy warianty, przebieg 15), a `node` jest, ale bez
tersera. Po przebudowie sonda świeżości musi wyjść zielona zanim liczby wrócą do [V].

</details>

### Ile daje minifikacja — ZMIERZONE W PRZEBIEGU 28, nie oszacowane

`npx --yes terser <plik> -c -m -o /tmp/<nazwa>.js`, oba pliki przebudowane w tym
przebiegu i przemierzone na `matrix-min.html` (7 ramek, ZERO padnięć, konsola czysta):


> **NIEAKTUALNE OD PRZEBIEGU 32 — liczby w tej tabeli opisują artefakt sprzed DWÓCH
> jednostek** (przed D-23.1 i przed fontem ikon). Zostają jako zapis tempa przyrostu,
> który był tu ich właściwym zadaniem. **Stan obowiązujący jest w §2, w tabeli
> „PRZEMIAR PRZEBIEGU 32": runtime 40 713 zn. / zapas 4 287, parser 39 592 zn. /
> zapas 5 408.** Reguła na przyszłość, żeby ten rozjazd nie wracał: **liczba rozmiaru
> żyje w JEDNYM miejscu (§2), a pozostałe sekcje mają się do niego odsyłać, nie
> przepisywać go.** Trzy kopie tej samej liczby w jednym pliku rozjechały się dokładnie
> tak, jak rozjechał się bilans matrycy utrzymywany obok wierszy — z tego samego powodu.

| plik | źródło | zminifikowany | mniej o | zapas do **45 000** (WYM v1.7) |
|---|---|---|---|---|
| `tryb-gotowania.js` | 116 838 | **39 536** | 66 % | **5 464** |
| `przepis-parser.js` | 109 896 | **39 369** | 64 % | 5 631 |
| **razem** | 226 734 | **78 905** | 65 % | — |

**Wniosek się nie zmienia, margines owszem: 78 905 > 50 000.** Zminifikowana całość
w JEDNYM embedzie nie mieści się o **28 905 znaków** (było 6 379). Osobno mieści się
każdy z nich w limicie TWARDYM 50 000 — runtime z zapasem 10 464, parser 10 631 —
**i od WYM v1.7 oba mieszczą się także w progu miękkim, z zapasem ok. 5 500 każdy**.

**D-28.1 ROZSTRZYGNIĘTE — próg miękki 40 000 → 45 000, WYM v1.7 (operator 2026-08-15).**
Historia tej pozycji jest warta zapamiętania, bo pokazuje, jak wymaganie traci sens
bez jednej zmiany w sobie. Do przebiegu 27 próg 40 000 dotyczył wyłącznie runtime'u;
parser miał 22 659 znaków zapasu i w rozmowie nie uczestniczył. Po wykonaniu D-13.1
(biblioteka QR, 22 kB do parsera) **oba pliki stanęły kilkaset znaków pod progiem** —
runtime 654, parser 631 — czyli próg przestał ostrzegać przed limitem platformy,
a zaczął blokować pracę wykończeniową. Wymaganie nie zmieniło ani słowa; zmienił się
świat, który opisywało.

Nowa liczba zostawia **5 000 znaków (10 %) zapasu do twardych 50 000 po każdej
stronie**. Dobrana tak, żeby próg dalej był sygnałem: przy 48 000 sygnał przychodziłby
za późno na reakcję, przy 42 000 zapalałby się przy każdej jednostce wykończeniowej
i przestałby cokolwiek znaczyć.

**Liczba dalej jest do pilnowania — podniesiony próg kupuje czas, nie odporność.** Ostatnie cztery przebiegi
dołożyły do zminifikowanego runtime'u po 300–1 300 znaków każdy (przeb. 25:
37 512 → 37 834; przeb. 26: 37 834 → 39 038; przeb. 28: 39 038 → **39 346**,
za co odpowiada wariant (3) tokenów — **308 znaków odczytane z builda**, nie
oszacowane; przeb. 30: 39 346 → **39 536** za cztery rozstrzygnięcia operatora).
W tempie 300–1 300 znaków na przebieg zapas 5 464 wystarcza na **kilkanaście jednostek
wykończeniowych**, a nie na jedną — i to jest cała różnica, jaką kupiła ta decyzja.
Jednostka fontu ikon (B16/I4) wchodzi z deklaracjami `@font-face` liczonymi w setkach
znaków i przy starym progu realnie gasiła I5. Gdy zapas zejdzie poniżej ~1 500,
pozostaje drugi wariant, ten sam co wcześniej: **wydzielić arkusz do trzeciego embedu**.

**Rekomendacja: (1) + (2) razem — minifikacja ORAZ dwa embedy.** Nie „albo": sama
minifikacja nie wystarcza (51 017), sam podział nie wystarcza (runtime 81 309).
Wariant „jeden embed" odpada z pomiaru, a nie z ostrożności.

Kolejność wklejania jest wiążąca: **parser przed runtime'em** — runtime czyta
`MP.przepis` przy `otworz()`.

**Zminifikowane artefakty PRZESZŁY matrycę: 310/311 asercji w siedmiu ramkach**,
konsola czysta, sonda F4 zielona (`harness/matrix-min.html` → `fixture-min.html`,
podstawione `*.min.js`). Liczba 51 017 nie jest więc rozmiarem czegoś, co być może
działa — jest rozmiarem czegoś zmierzonego.

**Przemierzone w przebiegu 15 na harnessie z pieczęcią: 2 176/2 177** (7 × 311, jedno
padnięcie na ramkę), konsola czysta, **I5 przechodzi na artefakcie**. Para `*-min`
harnessu nie miała pieczęci przemiaru — została z tyłu przy naprawie z przebiegu 14 —
więc pierwszy przemiar po decyzji o buildzie mierzyłby artefakt z cache'a. Dorobione
i sprawdzone; wynik potwierdza pomiar z przebiegu 9, tym razem z metody, nie
przypadkiem.

### Jedna asercja, która na zminifikowanym artefakcie NIE przechodzi — i musi

**I7 (a) pada, i to jest prawidłowy wynik, nie usterka builda.** Wiersz wymaga
znacznika `/* staging: zmienna Webflow */` przy każdym tokenie; `terser` zdejmuje
komentarze, więc w artefakcie znacznika nie ma i być nie może. Wiersz I7 jest
**strukturalnie niezgodny z minifikowanym artefaktem** — nie da się mieć obu.

To sprzęga dwie decyzje, które wyglądały na niezależne: **wybór kroku budowania
przesądza o brzmieniu I7.** Trzy wyjścia:
1. I7 mierzy **źródło**, nie artefakt — czyli wiersz pyta o higienę repozytorium.
   Najbliższe dzisiejszemu brzmieniu; wymaga dopisania w wierszu, że oracle to
   źródło (dziś jest to niedopowiedziane i dlatego się rozjechało).
2. `terser` z `--format comments=/staging:/` — zachowuje wyłącznie te komentarze.
   Kosztuje **336 znaków** w artefakcie (**ZMIERZONE, przebieg 15** — patrz niżej;
   szacunek „~600" był prawie dwukrotnie zawyżony). Wiersz zostaje bez zmian i mierzy
   artefakt.
3. Znaczniki przenoszą się z komentarzy do **danych** (np. trzeci element krotki
   w `TOKENY`), więc przeżywają minifikację. Najtrwalsze, wymaga zmiany w runtimie.

**Rekomendacja: (2)** — najtańsza i utrzymuje własność, na której wierszowi zależy:
że znacznik jedzie razem z tym, co się wkleja.

Uwaga niezależna od wariantu: komentarze objaśniające są w tym kodzie **połową
wartości** — zapisano w nich, dlaczego cień idzie do góry, dlaczego sesja to jeden
klucz, dlaczego S5 pamięta, co biegło. Minifikacja ma je zdejmować **w buildzie**,
nigdy w źródle. Kasowanie komentarzy „żeby się zmieściło" zamienia problem rozmiaru
na problem wiedzy, i to bezpowrotnie.

### Koszt wariantu (2) — zmierzony, nie oszacowany (przebieg 15)

Ostatnia liczba w tym rozdziale, która była szacunkiem, przestała nim być. Terser
z `comments=/staging:/` przepisuje zachowane komentarze **dosłownie**, więc koszt
w artefakcie jest po prostu sumą ich długości:

| plik | komentarzy `staging:` | znaków | z separatorem `\n` |
|---|---|---|---|
| `tryb-gotowania.js` | **10** | **478** | ≤ 488 |
| `przepis-parser.js` | 0 | 0 | 0 |

**NIEAKTUALNE OD PRZEBIEGU 28 — wariant (2) nie istnieje, bo operator wybrał (3)
i został on WYKONANY.** Cały poniższy rachunek dotyczył kosztu komentarzy `staging:`
w artefakcie i przestał mieć przedmiot: komentarzy przy tokenach nie ma, a opis
migracji jest trzecim elementem krotki `TOKENY[i][2]`.

**Zmierzony koszt wariantu (3): 308 znaków artefaktu** (39 038 → **39 346**), odczytany
z builda, nie oszacowany. Szacunek z przebiegu 19 mówił 140–200 B i był o połowę
za niski — dokładnie ta klasa liczby, o której ten plik zapisał „liczba wchodzi
do pakietu dopiero po odczycie z builda".

**Kontrola kompletności przetrwała zmianę nośnika i to jest jej wartość.** Wcześniej
pilnowała pary „dziesięć komentarzy ↔ dziesięć tokenów"; dziś asercja I7 (a) pilnowa
pary „dziesięć opisów ↔ dziesięć tokenów", plus trzy rzeczy, których wersja komentarzowa
sprawdzić nie mogła: że opis nie jest placeholderem, że **stoi w pobranym artefakcie**,
i że nikt nie odtworzył komentarza obok danych. Zamiana nośnika kupiła mocniejszy oracle,
nie tylko trwalszy build.

<details><summary>Rachunek wariantu (2) — zapis historyczny, przebieg 26</summary>

Dziesięć komentarzy, 478 znaków w źródle. Zminifikowany runtime w wariancie (2) to
≤ 39 526 znaków wobec 39 038 wtedy — 474 zapasu do limitu miękkiego 40 000.

</details>

Zastrzeżenie uczciwe: 336 to długość komentarzy w źródle, więc **górna granica** dla
kosztu, nie wynik uruchomienia tersera na tej fladze — build w tym przebiegu nie był
możliwy (`npm install` w piaskownicy pada na uprawnieniach). Kierunek jest jednak
pewny, bo komentarz zachowany dosłownie nie może urosnąć, a liczba jest o połowę
niższa od szacunku, który miała zastąpić.

Do czasu decyzji o buildzie **§7 nie ma czego wykonać** — reszta tego pliku jest
jednak niezależna od wyniku.

---

## 3. Tokeny lokalne → zmienne Webflow

> **PRZEMIERZONE 2026-08-15, przebieg 27.** Sekcja stała na stanie z przebiegu 9
> i myliła się w trzech miejscach naraz: **liczba tokenów** (7 → 10), **liczba braków**
> (2 → 3) oraz **trzy nazwy zmiennych w komentarzach runtime'u**, których w Webflow
> nie ma. Sekcja W dołożyła trzy tokeny w przebiegach 21–26, a `--mp-cta` przyszedł
> z komentarzem `primary-cta`, który pomiar obala. Wszystkie wartości niżej z jednego
> odpytania `data_variable_tool` (33 zmienne kolorystyczne, cały zbiór) [V].

Runtime deklaruje **10** zamienników w tablicy `TOKENY` (`tryb-gotowania.js`, początek
pliku), każdy z komentarzem `/* staging: zmienna Webflow */` — wiersz **I7**, dziś 🔴
(decyzja wariantu 3: opis migracji ma zjechać z komentarza do danych). Podmiana polega
na zastąpieniu wartości szesnastkowej odwołaniem `var(--nazwa)`.

| token runtime'u | wartość | zmienna Webflow | `cssName` | zgodność |
|---|---|---|---|---|
| `--mp-beige-1` | `#F1ECDF` | `beige-light-bg` | `--beige-light-bg` | **1:1** (hsla 43,33 / 39,13 % / 90,98 % = `#F1ECDF`) |
| `--mp-beige-2` | `#C5B18A` | `beige-dark-bg` | `--beige-dark-bg` | **1:1** (hsla 39,66 / 33,71 % / 65,69 %) |
| `--mp-beige-3` | `#816D44` | `beige-dark` | `--beige-dark` | **1:1** |
| `--mp-bialy` | `#FFFDFB` | `off-white-bg-100%` | `--off-white-bg-100` | **1:1** — komentarz w kodzie mówi `white-off-bg`, **takiej zmiennej nie ma** |
| `--mp-bialy-pelny` | `#FFFFFF` | `white-bg` | `--white-bg` (wartość `white`) | **1:1** — komentarz mówi `white-full-bg`, **takiej zmiennej nie ma** |
| `--mp-atrament` | `#3E2B22` | `primary-text` | `--primary-text` | **1:1** |
| `--mp-zielen` | `#487622` | `secondary-text` | `--secondary-text` | **1:1** — komentarz mówi `secondary-text (h1)`; nazwa zmiennej jest bez dopisku |
| `--mp-akcent` | `#C8461D` | — | — | **BRAK** |
| `--mp-alarm` | `#CF411A` | — | — | **BRAK** |
| `--mp-cta` | `#CF411A` | — | — | **BRAK** — komentarz mówi `primary-cta`, a `primary-cta` to **`#e55529`** |

### `--mp-cta`: komentarz twierdzi coś, czego pomiar nie potwierdza

Token dołożyła sekcja W (wiersz W67: `cta — cta` w Figmie to `primary-cta` **#CF411A**,
promień 100, SemiBold). Nazwa zmiennej trafiła do komentarza z **Figmy**, a nie z Webflow —
i w Webflow oznacza inny kolor: `primary-cta` = `#e55529`, `primary-cta-hover` = `#cf441a`.
**Żadna z 33 zmiennych kolorystycznych witryny nie ma wartości `#CF411A`** [V]. Czyli albo
Figma i strona rozjeżdżają się na kolorze głównego CTA, albo plik Figmy niesie starszą
wartość — to jest pozycja decyzyjna (**D-27.1**), nie podmiana do wykonania przy integracji.

Osobno: `--mp-alarm` i `--mp-cta` to **ten sam `#CF411A` pod dwiema nazwami** (I-19 dla
kropki minutnika, W67 dla CTA). Jedna zmienna mogłaby obsłużyć oba — ale zlanie ich jest
rozstrzygnięciem, nie porządkiem, więc też idzie do operatora.

### Trzy braki i dlaczego NIE wolno ich podpiąć „najbliższą" zmienną

To jest właściwy powód, dla którego ta tabela powstała lokalnie, a nie w trakcie
integracji: obie brakujące pozycje mają na stronie sąsiada o mylącej bliskości.

- **`--mp-akcent` `#C8461D`** (kolor loadera, spec §17). Najbliższe: `primary-cta`
  `#e55529` i `primary-cta-hover` `#cf441a`. Żadne nie jest tym kolorem — różnica
  wobec `primary-cta` jest gołym okiem widoczna.
- **`--mp-alarm` `#CF411A`** (kropka i obrys pigułki, I-19). `primary-cta-hover` to
  `#cf441a` — **różnica na jednym kanale, 0x41 vs 0x44**. Dokładnie taki near-miss
  wsiąka bez śladu: nikt nie zauważy podmiany, a plik Figmy i strona przestają się
  zgadzać na zawsze.

**Decyzja dla operatora**: albo założyć dwie zmienne (`cooking-accent` `#C8461D`,
`cooking-alarm` `#CF411A`), albo świadomie zlać je z `primary-cta` / `primary-cta-hover`
i **zapisać to jako zmianę wartości wobec Figmy**. Trzecie wyjście — zostawić je
jako literały w runtimie — jest dopuszczalne i najtańsze, ale wtedy wiersz I7
przestaje być prawdą po integracji, bo dwa kolory nie będą zmiennymi.
**Od przebiegu 27 braki są trzy**, a trzeci (`--mp-cta`) ma tę samą wartość co drugi —
rozstrzygnięcie „założyć zmienne" obejmuje więc dwie nowe zmienne, nie trzy.

Osobno, do świadomości: `--mp-akcent` i `--mp-alarm` **nie są tym samym kolorem** i to
jest rozstrzygnięcie z przebiegu 5, nie niedopatrzenie — spec §17 podaje `#C8461D`
dla loadera, I-19 podaje `#CF411A` dla minutnika. Zlanie ich byłoby cichym
rozstrzygnięciem różnicy, której nikt nie zgłosił.

### Czego z tej listy NIE ma i nie powinno być

- **Scrim dialogu.** Runtime składa go z `color-mix(in srgb, var(--mp-atrament) 45%,
  transparent)`, a nie z osobnego koloru. Zmienna `bg-dim` (`rgba(26,26,26,0.5)`)
  wygląda na kandydata i **nie jest nim**: inna baza (`#1A1A1A`, nie atrament)
  i inne krycie (50 %, nie 45 % z I-07). Nie podpinać.
- **Cień `drop_shadow_ui`.** Też składany z `--mp-atrament`, przy α 5 % i 10 %.
  Zmienna `shadow-brown` to ten sam atrament, ale z **zabetonowanym** α 30 % —
  nie da się z niej zbudować dwóch warstw B17. Nie podpinać.

W obu wypadkach architektura jest celowa: **krycie składa runtime, kolor podaje
zmienna.** Zmienna z wbudowanym α odbiera tę możliwość.

---

## 3b. Font ikon — subset zmierzony Z PLIKU (przeb. 11, PRZEMIERZONY NA v4 w przeb. 26)

> **STAN NA PRZEBIEG 32 — font nie jest już pozycją do zrobienia, tylko własnością
> zmierzoną.** Runtime deklaruje **trzy `@font-face`** rodziny `Material Symbols Outlined`
> (wagi 300/400/500, `font-display: block`), a pliki bierze **z CDN Webflow**, nie
> z GitHuba i nie z pliku lokalnego. Adresy żyją w kodzie jako DANE (tablica `FONT_IKON`)
> i wychodzą na zewnątrz przez `MP.tryb.fontIkon()`, więc lista kontrolna nie musi ich
> przepisywać z arkusza.
>
> Trzy rzeczy zmierzone i nieoczywiste, każda z kontrolą:
> 1. **CORS przechodzi z obcego originu** — sprawdzone z `http://localhost:8123`, czyli
>    z adresu dla Webflow obcego pod każdym względem (przeb. 31). Pomiar z localhosta jest
>    tu MOCNIEJSZY od pomiaru ze stagingu: gdyby CDN wpuszczał tylko własne domeny, padłby.
> 2. **Ligatury renderują się jako jeden glif** — 20,0 px przy stopniu 20, na czternastu
>    ramkach obu powierzchni, z kontrolą ujemną: nazwa spoza subsetu daje **365,6 px**,
>    czyli słowo (przeb. 32).
> 3. **`font-display: block`, nie `swap`** — przy `swap` przeglądarka rysuje NAZWĘ ligatury
>    krojem zastępczym, czyli w pasku meta pojawia się słowo zamiast ikony. Niewidoczna
>    ikona przez chwilę jest tańsza niż widoczne słowo. Konsekwencja dla integratora:
>    **jeśli font nie dojedzie, ikony będą puste, a nie zastępcze** — i tak ma być,
>    bo `|| '·'` zostało zdjęte świadomie (B16).
>
> **Subsetu nie generować i nie wgrywać drugiego.** Trzy pliki stoją w bibliotece fontów
> witryny `6983617613052dc9fe624303`, wgrane poza tym łańcuchem; D-24.2 jest wykonane
> w Webflow, nie tylko rozstrzygnięte. Tabela niżej opisuje **plik źródłowy subsetu**
> i pozostaje prawdziwa — służy pytaniu „czy dany glif w ogóle istnieje", nie pytaniu
> „skąd runtime bierze font".
>
> **Jedna rzecz nadal wymaga uwagi przy integracji:** runtime wstawia `@font-face`
> **poza zakresem `#mp-tryb`**, bo at-rule nie zagnieżdża się w selektorze. To jedyne
> miejsce arkusza wychodzące poza korzeń overlaya. Jeśli strona gospodarza deklaruje
> własną rodzinę o tej samej nazwie, obie deklaracje się zsumują, a wygra ta o pasującej
> wadze — do sprawdzenia w fazie stagingowej (pozycja dla §6).

Zmierzone `fontTools`em bezpośrednio na **`local/tech/fonts/subset-2026-08-15-v4/`**,
bez przeglądarki i bez serwera. **Uwaga: to INNY subset niż w poprzednim wydaniu tej
sekcji** (v3 z 2026-08-12) — v4 powstał po przeb. 11, jest tym, który harness ma wpięty
od przeb. 21, i **usuwa oba braki, na których stała lista decyzji**.

| fakt | v3 (przeb. 11) | **v4 (przeb. 26)** | [V]/[I] |
|---|---|---|---|
| pliki | 3 × `.woff2`, wagi 300/400/500, statyczne | **bez zmian** | [V] |
| `fvar` | brak — to nie jest font zmienny | **brak** | [V] |
| glify / wpisy cmap | 92 / 111 | **96 / 115**, identycznie w każdej wadze | [V] |
| ligatury | 83 | **87**, zestaw identyczny w trzech wagach | [V] |
| feature GSUB | wyłącznie `rlig`, `liga` nie ma; lookup typu 7 | **bez zmian — dalej sam `rlig`** | [V] |
| manifest vs plik | 80/80 | **87/87 w obie strony** — zero nadmiaru, zero braku | [V] |

**`liga` w foncie NIE MA i nigdy nie było — to zmienia jedno zdanie w harnessie.**
`fixture.html` deklaruje `.mp-ikona { font-feature-settings: 'liga' }`. Ta deklaracja
jest **bezskuteczna**, a ligatury działają mimo niej, bo `rlig` (required ligatures)
jest włączone domyślnie i nie da się go „włączyć mocniej". Nie jest to błąd — jest to
linijka, która sugeruje mechanizm inny niż faktyczny. Przy wpinaniu fontu do Webflow
**nie przenoś jej jako warunku działania**; jeśli ligatury nie zadziałają, przyczyną
będzie ścieżka pliku albo `font-family`, nigdy brak `liga`.

**Konsekwencja dla integracji: trzy `@font-face` z `font-weight: 300/400/500`,
nie jedno `font-variation-settings: 'wght'`.** Brak `fvar` przesądza; wpięcie
wariantu osi wagi zadziała cicho i źle (przeglądarka udanie zsyntetyzuje pogrubienie).

**Lookup jest typu 7 i dlatego pierwszy odczyt w tym przebiegu pokazał zero ligatur.**
Extension Substitution opakowuje właściwą tablicę; kto jej nie rozwinie, zmierzy pusty
zbiór i wyciągnie wniosek odwrotny do prawdziwego. Odnotowane, bo ten sam błąd czeka
każdego, kto zajrzy do tego pliku skryptem.

### Mapa migracji: substytuty Unicode → ligatury (8 pozycji, 2 braki)

Runtime nie używa dziś ani jednej ligatury — wszystkie glify to znaki Unicode
renderowane fontem systemowym. Przy wpinaniu subsetu podmienia się je tak:

| dziś | ligatura | w subsecie |
|---|---|---|
| `×` (zamknij, ×2) | `close` | 🟢 (także `cancel`, `clear`, `highlight_off`) |
| `←` (wstecz) | `arrow_back` | 🟢 |
| `✓` (ptaszek) | `check` | 🟢 |
| `−` / `+` (porcje) | `remove` / `add` | 🟢 |
| `⌄` (rozwiń) | `keyboard_arrow_down` | 🟢 |
| `⌃` (zwiń, ×2) | `keyboard_arrow_up` | 🟢 **w v4** (`expand_less` dalej nie ma i nie jest potrzebny) |
| `↻` (uruchom ponownie) | `refresh` | 🟢 **w v4** (także `restart_alt`) |
| marker `i` | `info` | 🟢 (glif jest w subsecie, choć runtime rysuje kółko sam) |
| `→` (dalej) | `arrow_forward` | 🟢 |

**OBA BRAKI ZNIKNĘŁY — zmierzone w przeb. 26 na v4, wcześniej niezależnie w przeglądarce
w przeb. 21** (sonda szerokości glifu: siedem ligatur po 20 px, nieistniejąca nazwa
365,6 px). Mapa migracji jest kompletna: **8 z 8 pozycji ma glif**, zero pozycji na listę
decyzji z tego tytułu. Poprzednie wydanie tej sekcji stało na v3 i zgłaszało dwa braki —
zostały usunięte przez wygenerowanie v4, a dokument o tym nie wiedział przez pięć przebiegów.

**Sprzężenie z C08 też się rozwiązało, i to w stronę wygodniejszą:** skoro
`keyboard_arrow_up` jest w foncie, obrót szewrona nie musi być robiony
`transform: rotate(180deg)` na glifie „w dół". Runtime rysuje dziś substytut Unicode `⌃`
(I-16: `up` = zwiń), więc po wpięciu fontu podmiana jest jeden do jednego i C08 nie
wymaga wyboru między dwoma mechanizmami.

### Dlaczego to NIE odblokowuje B16 ani I4

Lista decyzji z przebiegu 9 opisuje te dwa wiersze jako „dwa wiersze za jedną zmianę
polecenia serwera". **Zmierzone: nieprawda.** Serwer z subsetem odblokowuje POWIERZCHNIĘ
POMIARU, nie wiersze:

- **runtime nie ma ani jednego `@font-face`** i ani jednej deklaracji rodziny ikon
  (`grep`: jedyne `font-family` to `"DM Sans"` w linii 100);
- `stan.widok.meta` **nie jest wypełniane przez żaden kod** — ani parser, ani widok;
  jedyne odwołanie to odczyt w `ekranStart`. Zbiór ligatur używanych przez runtime jest
  **pusty**, więc zieleń I4 byłaby zielenią pustą — ten sam gatunek fałszu co tautologia
  odrzucona przy I6;
- `m.glif || '·'` w linii 1258 jest **dosłownie własnym fallbackiem**, czyli drugie
  zdanie wiersza B16 („brak glifu = błąd zgłoszony, nie własny fallback") jest dziś
  naruszone konstrukcyjnie, a nie z powodu niedostępności pliku.

Do zieleni tych dwóch wierszy trzeba trzech rzeczy, nie jednej: (1) subset podany
z originu, (2) model wypełniający nazwy glifów meta, (3) runtime deklarujący
`@font-face` i ścieżkę błędu zamiast substytutu. To jest praca, nie zmiana polecenia.

---

## 3c. Kontrakt meta — RATYFIKOWANY I WYKONANY (stan z przebiegu 27)

> **CZYTAJ TĘ RAMKĘ PRZED RESZTĄ SEKCJI.** Poniższy tekst powstał w przebiegu 15 jako
> **propozycja czekająca na decyzję** i w takiej formie stał do przebiegu 26. **Decyzja
> zapadła, CR jest napisany, pole w CMS istnieje, a runtime pasek meta renderuje.** Sekcja
> zostaje w oryginalnym brzmieniu, bo tłumaczy, dlaczego wariant B wygrał — ale zdania
> „nie wykonuję", „przed ratyfikacją" i „idzie na listę decyzji jako D-15.1" **są już
> nieprawdziwe**. Przemierzone 2026-08-15 [V]:
>
> | co mówiła sekcja | co jest |
> |---|---|
> | „trzy warianty, rekomendacja B" | operator wybrał **B rozszerzone**; zapis: `CR--wartosci-porcja--2026-08-15.md` |
> | „change request — NIE wykonuję" | CR **napisany i wyłożony** w katalogu łańcucha jako osobny plik |
> | „pole CMS do założenia" | pole **`wartosci-porcja` (PlainText) ISTNIEJE** w kolekcji `przepisy`, id `714f7d0e77e0cf39b3ae248c28f93e0a`, z help-textem wskazującym kalkulator [V] |
> | „punktu 1 i 2 nie piszę przed ratyfikacją" | parser buduje `model.meta` z `#mp-wartosci-porcja` (`zbudujMeta`), runtime renderuje `.mp-tryb__meta` — wiersze A14, A14b, I4a, W32–W36 zielone |
> | „D-15.1 na liście decyzji" | **zamknięte**; otwarte zostaje wyłącznie B16/I4 (krój ikon w runtimie), co jest inną sprawą |
> | dwa brakujące glify z §3b (`⌃`, `↻`) | **nie brakuje ich** — subset v4 ma `keyboard_arrow_up` i `refresh`; §3b poprawione w przeb. 26, ta sekcja nie |
>
> **Czego NIE ma i co blokuje pasek na produkcji: danych.** Pole jest wypełnione dla
> **1 z 18** przepisów (`kurczak-teriyaki-przepis`), tak samo jak `wartosci-odzywcze` [V].
> Przy pustym polu pasek chowa się w całości — zachowanie poprawne i zmierzone — więc po
> integracji **17 z 18 przepisów pokaże ekran startowy bez paska meta**. To nie jest defekt
> runtime'u, tylko stan migracji z CR §„Migracja istniejących przepisów", i należy o nim
> wiedzieć **przed** oglądaniem pierwszej strony na stagingu, a nie po.
>
> **Wartość kanoniczna dla teriyaki** (z CMS, wklejona z raportu kalkulatora) [V]:
> `energia: 1756 kJ / 417 kcal; tłuszcz: 16 g; kwasy tłuszczowe nasycone: 1,8 g;`
> `węglowodany: 26 g; cukry: 17 g; błonnik: 1,4 g; białko: 39 g; sól: 7,1 g`

To jest ta „praca", którą §3b nazwał, a której nikt jeszcze nie wykonał: **czym
w ogóle jest `stan.widok.meta`**. Bez tego runtime nie ma czego pokazać w pasku
3 × 88 na ekranie startowym, zbiór używanych ligatur zostaje pusty i wiersze
**B16** oraz **I4** nie mają jak zzielenieć inaczej niż tautologią.

### Co pasek meta ma zawierać — z Figmy, nie z założenia

Klatka `7195:10894` (GEOMETRIA §3.1), ramka „meta — czas · kcal · makro" 328×81,
trzy kolumny 88×57 przy x = 16 / 120 / 224. Każda kolumna: glif 32×32 + wartość 88×17.

| kolumna | ligatura | wartość w Figmie | źródło danych | dostępne runtime'owi dziś |
|---|---|---|---|---|
| 1 | `hourglass` | „60 min" | `czas-przygotowania` | **tak** — `data-czas` (instrukcja §6) |
| 2 | `local_dining` | „417 kcal" | `wartosci-odzywcze` + `waga-porcji` | **nie** |
| 3 | `leaderboard` | „B24 W38 T10" | jw. | **nie** |

**Wszystkie trzy ligatury SĄ w subsecie** — przemierzone `fontTools`em na **v4**
w przebiegu 27, z tablicy GSUB (87 ligatur, komplet w trzech wagach): `hourglass` ✓,
`local_dining` ✓, `leaderboard` ✓. [V] Font nie jest tu przeszkodą, a dwa braki z §3b
(`⌃`, `↻`) **przestały istnieć wraz z v4** — patrz §3b, przemiar z przebiegu 26.

> **Jedna rzecz, której nie widać po nazwie ligatury: `local_dining` rysuje glif
> `restaurant_menu`.** Ligatura działa, ale jej celem w GSUB jest **inny glif niż jej
> własna nazwa** — tak samo w v3 i v4, więc to aliasowanie z upstreamu Material Symbols,
> nie usterka subsettera [I]. Praktycznie: sprawdzanie obecności po nazwie glifu (`glyphOrder`)
> **da fałszywy alarm**, bo glifu `local_dining` w pliku nie ma; mierzyć trzeba ligatury
> z GSUB, tak jak robi to `_icons-included.txt`.
>
> **Skutek dla wykończenia: ŻADEN — sprawdzone, nie założone (D-27.2 zamknięte).** Klatka
> `7195:10894` rysuje w drugiej kolumnie skrzyżowany sztuciec z łyżką; glif `restaurant_menu`
> wyrenderowany bezpośrednio z pliku subsetu v4 (`fontTools` + kontury) daje **ten sam
> rysunek**. Alias prowadzi do właściwej ikony, więc pasek meta narysuje to, co narysował
> projektant. Zostaje wyłącznie ta uwaga metodyczna: **nie sprawdzaj obecności ikony po
> nazwie glifu**, bo `local_dining` jako glif nie istnieje i sprawdzenie da fałszywy alarm.

Liczby z Figmy są atrapami projektanta i nie są oracle'em treści: dla teriyaki
z `waga-porcji: 225` i 18 g białka / 100 g wychodzi B ≈ 40, nie 24. Wiersz matrycy
i tak dotyczy obecności i zachowania, nie brzmienia — ale nie wolno tych liczb
wziąć za wzorzec danych.

### Pułapka arytmetyczna, przez którą kontrakt nie jest oczywisty

`wartosci-odzywcze` jest stringiem **na 100 g** („energia: 782 kJ / 186 kcal; …"),
a pasek meta pokazuje **na porcję**. Przeliczenie w runtimie wygląda na trywialne
i nie jest: 186 kcal × 2,25 = **418,5**, podczas gdy kalkulator liczy porcję z sum
NIEZAOKRĄGLONYCH (`naPorcje[k] = sumy[k] / porcje`, linia 107) i daje **417 kcal**.

> **KOREKTA 2026-08-15 (pytanie operatora, pomiar zamiast lektury).** Zdanie „tabela
> na tej samej stronie pokazuje 417" było **fałszywe** i trzeba je odwrócić. Tabela
> odżywcza na stronie **nie dostaje wartości na porcję z CMS-u — sama je liczy**:
> skrypt `mpKrokiTabela` 1.0.0 „parsuje `wartosci-odzywcze`, drukuje dwie kolumny
> (na porcję i na 100 g) […] z `waga-porcji`" (CHANGELOG budowy sekcji kart §14.3),
> czyli mnoży **zaokrąglony** string na 100 g przez `waga-porcji/100` — dokładnie tak,
> jak robiłby to wariant A. Odczyt na żywo z przebiegu budowy tabeli: `w 1 porcji
> (225 g)`, **`1760 kJ / 419 kcal`** (STAN przepisy-hub). Kalkulator uruchomiony
> na `dane-zywieniowe/kurczak-teriyaki.json` daje **`1756 kJ / 417 kcal`** [V].
>
> **Rozjazd ±2 kcal już jest na produkcji**, między tabelą (419) a kanonicznym
> wyliczeniem (417) — nie powstaje dopiero przy pasku meta. Skutki dla wariantów:
> **A** dałby pasek zgodny z tabelą (419) i niezgodny z kalkulatorem; **B** w wersji
> „nowe pole tylko dla paska" dałby pasek 417 obok tabeli 419, czyli **wyprodukowałby
> ten rozjazd na jednym ekranie**, przed czym ta sekcja miała chronić. B ma sens
> wyłącznie wtedy, gdy nowe pole zasila **także** `mpKrokiTabela`, a skrypt przestaje
> mnożyć. To rozszerza zakres change requestu o jeden skrypt szablonu.

### Trzy warianty i rekomendacja

**A — przelicz w runtimie z `wartosci-odzywcze` + `waga-porcji`.** Wymaga wystawienia
obu pól embedowi. Koszt: rozjazd ±2 kcal z tabelą obok (zmierzony wyżej), parser
stringu odżywczego i arytmetyka w runtimie, czyli przyrost w pliku, który już nie
mieści się w I5.

**B — nowe pole CMS `wartosci-porcja` (rekomendowane).** Ten sam skrypt już liczy
te wartości (`w.naPorcje`) i drukuje je w tabeli; chodzi o to, żeby wypluł też
jednolinijkowy string na porcję do osobnego pola, wystawiony embedowi jako
`<script type="text/plain">`. Zero arytmetyki w runtimie, zero rozjazdu z tabelą,
najmniejszy przyrost rozmiaru — a rozmiar to dziś najtwardszy czerwony (I5).

**C — czytaj wyrenderowaną tabelę ze strony.** Odrzucone: wiąże runtime z markupem
szablonu, nie działa w harnessie ani przy pustym `wartosci-odzywcze`, i łamie §5
(kontrakt DOM ma być minimalny i jawny).

### Propozycja zmiany instrukcji §6 (change request — pin B1, NIE wykonuję)

Wariant B, dwie linie do bloku embedu:

```html
<script type="text/plain" id="mp-wartosci-porcja">{{wartosci-porcja}}</script>
<div id="mp-tryb-gotowania" … data-waga-porcji="{{waga-porcji}}"></div>
```

`waga-porcji` idzie atrybutem, bo jest liczbą (ta sama zasada, co `porcje-bazowe`);
string odżywczy idzie `text/plain`, bo zawiera średniki, ukośniki i przecinki
dziesiętne — dokładnie ten sam powód, dla którego `skladniki` nie jest atrybutem.
Puste pole = pasek meta ukryty w całości (`meta.hidden`, zachowanie już w runtimie),
nie trzy kolumny z kreskami.

**Zmiana należy do łańcucha `przepis-webflow-sukcesor` i do operatora, nie do mnie**
(pin B1: interfejs embedu = instrukcja §6, żaden łańcuch nie poprawia go
jednostronnie). Idzie na listę decyzji jako **D-15.1**.

### Zachowanie: pasek meta NIE skaluje się selektorem porcji

Wartości są **na porcję**, więc zmiana liczby porcji ich nie zmienia — tak samo jak
nie zmienia kroków ani minutników (test negatywny, inwentarz 7). To jest asercja
negatywna do dopisania razem z wierszem, nie osobne zachowanie do zaprojektowania.
INTERAKCJE nie mówią o pasku meta ani słowem — sprawdzone `grep`em, zero trafień
na „meta", „kcal", „makro" [V] — więc źródłem pozostaje geometria Figmy plus ten
kontrakt.

### Co zostaje do zrobienia po ratyfikacji (i czego NIE robię teraz)

1. parser wystawia `model.meta` = trzy pozycje `{ligatura, wartosc}`;
2. runtime: trzy `@font-face` (300/400/500, bez osi wagi — §3b), rodzina ikon
   zadeklarowana, `m.glif || '·'` zastąpione ścieżką błędu (B16);
3. subset podany z tego samego originu — patrz **D-15.2** niżej.

Punktu 1 i 2 **nie piszę przed ratyfikacją**: kod pod nieprzyjęty kontrakt to kod
do wyrzucenia, a przyrost źródła pogarsza I5 bez zysku. Różnica wobec I6 (przebieg 14,
gdzie pracę za decyzją wykonano) jest istotna: tam decyzja dotyczyła BRZMIENIA już
istniejącego kodu, tu — kształtu danych, których nie ma.

### D-15.2 — WYKONANE 2026-08-15 (przebieg 21); zapis niżej jest historyczny

> Korzeń serwera podniesiony, harness stoi pod
> `http://localhost:8123/git/tech/tryb-gotowania/harness/matrix.html`, fonty wpięte
> do obu fixture'ów, **subset v4** (nie v3, jak podaje akapit niżej). Nie wykonywać
> ponownie; ścieżka `subset-2026-08-12-v3` w przykładzie jest nieaktualna.

Harness i font leżą w dwóch różnych korzeniach (`git\` i `local\`, rozdział jest
fizyczny — media nie wchodzą do repo). Serwer nad katalogiem łańcucha nie widzi
fontu. Wystarczy **podnieść korzeń o dwa poziomy**:

```
python -m http.server 8123 --directory C:\Users\andrz\Claude
```

wtedy harness to `http://localhost:8123/git/tech/tryb-gotowania/harness/matrix.html`,
a subset — `http://localhost:8123/local/tech/fonts/subset-2026-08-12-v3/…`, jeden
origin, `@font-face` działa. Uwaga: zmiana korzenia **zmienia adres harnessu**, więc
STAN.md („Powierzchnia pomiaru") i ścieżki w `matrix.html` wymagają jednoczesnej
poprawki — dlatego to pozycja operatorska, a nie cicha zmiana w locie.

---

## 3d. QR — D-13.1 WYKONANE (przebieg 28, ZMIERZONE). Sekcja opisuje stan po, nie przed

Wiersz I3 jest **zielony**. Biblioteka `qrcode-generator` **2.0.4** (MIT, Kazuhiko
Arase) jedzie wbudowana w artefakt parsera, w lokalnej zmiennej — nie w `window`.
Zmierzone na `harness/qr.html` (ramki 991 / 992 / 1024) [V]:

| pytanie wiersza | odpowiedź | dowód |
|---|---|---|
| zadeklarowana? | **tak** | `MP.przepis.zaleznosci.qr` = nazwa + wersja + licencja + `globalna:false` |
| obecna w artefakcie? | **tak** | 992 i 1024: `<svg>` 192×192, viewBox 164, 1 ścieżka, `fill #2b2118` |
| `window` zanieczyszczone? | **nie** | `QrCreator` i `qrcode` = `undefined` na trzech ramkach |
| zakładana z globala? | **nie** | dubler wstrzyknięty, `wywolan === 0` na trzech ramkach |
| bramka szerokości działa? | **tak, dokładnie na 992** | 991 kontener pusty PRZY OBECNEJ bibliotece |
| ostrzeżenia na desktopie? | **zero** | strażnik i `console.warn` usunięte razem z gałęzią |
| adres poprawny? | **tak** | `https://miesnapaczka.pl…?tryb=gotowanie` |

**Wybór biblioteki był pomiarem, nie preferencją — i to jest jedyna rzecz z tej
sekcji, którą trzeba pamiętać przy integracji.** Pierwszą próbą był `qr-creator`
1.0.0: mniejszy (12 kB wobec 22 kB), MIT, z API pasującym do istniejącego wywołania
co do znaku. Wpięty i zmierzony — **rysuje `<canvas>`**, a spec §8 wymaga SVG.
Nie dowiedziałby się tego nikt czytający kod: stary test-double wstawiał do kontenera
`<svg>`, więc asercja „wynik jest SVG" była zielona niezależnie od tego, co robi
prawdziwa biblioteka. Jeśli kiedykolwiek ktoś będzie biblioteki podmieniał, **oracle'em
jest przemiar `qr.html`, nie zgodność sygnatur.**

### Rozmiar — po wykonaniu, nie przed


> **NIEAKTUALNE OD PRZEBIEGU 32 — liczby w tej tabeli opisują artefakt sprzed DWÓCH
> jednostek** (przed D-23.1 i przed fontem ikon). Zostają jako zapis tempa przyrostu,
> który był tu ich właściwym zadaniem. **Stan obowiązujący jest w §2, w tabeli
> „PRZEMIAR PRZEBIEGU 32": runtime 40 713 zn. / zapas 4 287, parser 39 592 zn. /
> zapas 5 408.** Reguła na przyszłość, żeby ten rozjazd nie wracał: **liczba rozmiaru
> żyje w JEDNYM miejscu (§2), a pozostałe sekcje mają się do niego odsyłać, nie
> przepisywać go.** Trzy kopie tej samej liczby w jednym pliku rozjechały się dokładnie
> tak, jak rozjechał się bilans matrycy utrzymywany obok wierszy — z tego samego powodu.

| embed | zminifikowany | zapas do 50 000 | zapas do **45 000** (WYM §4, v1.7) |
|---|---|---|---|
| runtime `tryb-gotowania.min.js` | **39 388 B / 39 536 zn.** | 10 464 | **5 464** |
| parser `przepis-parser.min.js` | **39 734 B / 39 369 zn.** | 10 631 | **5 631** |

Biblioteka kosztowała parser **22 028 znaków artefaktu** — dwa razy więcej niż
szacunek „ok. 10 kB" ze spec §8, bo `qrcode-generator` jest większy od odrzuconego
`qr-creatora`. Mieści się z zapasem w limicie twardym, ale **zjadł cały komfort
wobec progu miękkiego**: parser miał 22 659 znaków zapasu do 40 000, ma 631.
Ta liczba jest odczytana z builda, nie oszacowana. **Aktualizacja przeb. 30: to
właśnie ten rachunek doprowadził do D-28.1** — operator podniósł próg do 45 000
(WYM v1.7), więc zapas parsera wynosi dziś **5 631**, a runtime'u 5 464. Zdanie
powyżej zostaje, bo opisuje, dlaczego decyzja zapadła; liczba „631" jest historią,
nie stanem.

### Licencja — pozycja, której lista kontrolna nie miała

MIT wymaga dosłownej noty w kopiach. Nota stoi w źródle jako baner `/*! … */` i
**przeżywa `terser -c -m`**, bo terser zachowuje takie komentarze domyślnie —
zmierzone na artefakcie (`Permission is hereby granted` obecne), nie przyjęte
na słowo. Metadane (nazwa, wersja, licencja, prawa) idą osobno **w danych**, żeby
dało się je zmierzyć asercją. **Jeśli ktoś kiedyś doda do builda `--comments false`,
artefakt przestanie być zgodny z licencją, wyglądając dokładnie tak samo.**
Stąd nowa pozycja w §7.

### Co zostało po stronie operatora

**Nic z D-13.1** — pozycja zamknięta. Zostaje wyłącznie konsekwencja z §2: oba
artefakty stoją kilkaset znaków pod progiem WYM §4 i to wymaga rozstrzygnięcia
(podnieść próg, czy wydzielić trzeci embed) — ale to jest pytanie o próg, nie o QR.

---

## 4. Kod wyłącznie pomiarowy — do usunięcia przed wklejeniem

Wszystkie miejsca oznaczone w źródłach `HARNESS-ONLY`. Lista jest zamknięta;
sprawdzenie jest mechaniczne (`grep`), nie z pamięci.

| co | gdzie | dlaczego nie może wejść |
|---|---|---|
| `MP.zegar` / `MP_TEST.przewin` / `.reset` | `harness/fixture.html` | hak przewijania odliczania; w produkcji `teraz()` sam spada do `Date.now()` |
| `window.MP_BEZ_HISTORII` | `harness/fixture.html` | wyłącznik F4 dla matrycy iframe'ów; w produkcji historia MA działać |
| blok samosprawdzenia (`sprawdz`, `postMessage`) | `harness/fixture.html` | 300+ asercji |
| `MP_MATRYCA.f4()` / `.g10()` / `.c1012()` | `harness/matrix.html` | sondy rodzica matrycy |
| `.mp-tryb__pasek-harness` i pasek diagnostyczny | `harness/fixture.html` | element pomiarowy |
| `MP_PIECZEC` + wstawianie `<script>` przez `document.write` | `harness/fixture.html`, `harness/matrix.html`, `harness/qr-ramka.html` | pieczęć przemiaru (przeb. 14) — omija cache HTTP; w produkcji runtime wchodzi jednym tagiem embedu i nie ma czego ostemplowywać |
| `MP_QR_RAMKA` + `wstawDubler()` / `zdejmijDubler()` | `harness/qr-ramka.html` | test-double biblioteki QR (przeb. 16); nadpisuje `window.QrCreator` — w produkcji nadpisałby prawdziwą bibliotekę |
| `MP_QR.zmierz()` | `harness/qr.html` | sonda bramki 992 px (przeb. 16) |
| `MP_MATRYCA.swiezosc()` | `harness/matrix-min.html` | sonda świeżości artefaktów (przeb. 16); czyta `Last-Modified` z serwera pomiarowego |

**Nic z tego nie mieszka w `tryb-gotowania.js` ani w `przepis-parser.js`** —
sprawdzone `grepem` (przeb. 14 po dołożeniu pieczęci, przeb. 16 po powierzchniach QR,
**ponownie przeb. 26 po dwunastu wierszach sekcji W**): `HARNESS-ONLY` występuje
**16 razy** w `fixture.html` i tyleż w `fixture-min.html`, **raz** w każdej matrycy,
**4 razy** w `qr-ramka.html` — i **zero razy w czterech plikach runtime'u**, licząc
minifikaty. `MP_PIECZEC` i `document.write` również **zero razy** w runtimie. Jedyne
trafienie na `MP_TEST` w runtimie to **komentarz** (dziś wiersz 955 `tryb-gotowania.js`,
w poprzednim wydaniu 568 — numer się przesuwa, własność nie), objaśniający, po co
`tyk()` jest wystawiony na zewnątrz — nie odwołanie w kodzie. **Sprawdzenie jest
mechaniczne i kosztuje jedno wywołanie; powtarzaj je po każdej jednostce dotykającej
runtime'u, bo to jedyna rzecz w tym pliku, którą łatwo popsuć niechcący.** To jest własność warta
utrzymania. Runtime zawiera dokładnie dwa ustępstwa na rzecz pomiaru
i oba są *seamami*, nie kodem testowym:

1. `teraz()` czyta `MP.zegar.teraz()`, gdy istnieje, inaczej `Date.now()`;
2. `naWidocznosc(ukrytaWymuszona)` przyjmuje opcjonalny argument, a nasłuch
   produkcyjny woła ją **bez** niego.

Oba są bezkosztowe przy braku harnessu i oba są udokumentowane w kodzie. Usuwanie
ich przed wklejeniem jest **niepotrzebne i niewskazane** — bez `MP.zegar` znika
możliwość zmierzenia czegokolwiek na stagingu.

**KOREKTA 2026-08-15, przebieg 27: ustępstwa są TRZY, nie dwa.** Trzecim jest
`global.MP_BEZ_HISTORII`, czytany w `historiaWlaczona()` (`tryb-gotowania.js` 1466–1469).
Ustawia go wyłącznie harness; runtime tylko pyta, a przy braku wartości historia działa
normalnie. Ma dokładnie tę samą własność co dwa pozostałe — **bezkosztowy przy braku
harnessu** — i tak samo nie wolno go usuwać. Nie został wymieniony, bo lista kontrolna
§7 poz. 4 kazała go z artefaktu wycinać; obie pozycje poprawione w tym samym przebiegu.

**Weryfikacja mechaniczna, przemierzona 2026-08-15** [V]: `HARNESS-ONLY` — 16 ×
`fixture.html`, 16 × `fixture-min.html`, 1 × `matrix.html`, 1 × `matrix-min.html`,
4 × `qr-ramka.html`, **0 × w czterech plikach runtime'u**; `MP_PIECZEC` i `document.write`
— **0 × w runtimie**; `MP_TEST` w runtimie — **1 ×, komentarz, wiersz 955** (numer bez
zmian od przebiegu 26).

**PRZEMIERZONE PONOWNIE W PRZEBIEGU 32** [V], po jednostce fontu ikon z przeb. 31,
która ruszała runtime. Wynik: **wszystkie liczby bez zmian** — `HARNESS-ONLY` 16 / 16 / 1 / 1 / 4
i **0 × w czterech plikach runtime'u**; `MP_PIECZEC` i `document.write` **0 × w runtimie**;
`MP_TEST` **1 ×, komentarz**. Zmieniło się jedno: **komentarz `MP_TEST` stoi teraz w wierszu
1054, nie 955** — plik urósł o 99 wierszy. Numer wiersza podawany w tym pliku jest
z definicji nietrwały i jest tu tylko po to, żeby sprawdzenie dało się powtórzić,
a nie żeby czemukolwiek służyć; **własnością jest „jedno trafienie i jest to komentarz",
nie adres**. Przy okazji uzupełnienie inwentarza: `MP_BEZ_HISTORII` występuje w runtimie
**2 ×** (komentarz `NIENARYSOWANE:` w 1558 i odczyt w 1567) oraz **1 ×** w minifikacie —
to jest trzeci seam z korekty wyżej, policzony, żeby lista nie musiała powoływać się
na pamięć. Trzy nowe funkcje publiczne z przeb. 31 — `zbiorLigatur()`, `fontIkon()`,
`ostrzezenia()` — **nie są kodem pomiarowym i nie wchodzą na tę listę**: pomiar z nich
korzysta, ale to zwykłe API runtime'u, tak samo jak `czesci()` czy `korzen()`.
Kryterium tej sekcji brzmi „czy w produkcji szkodzi", nie „czy harness tego używa".

---

## 5. Czego runtime wymaga od szablonu (kontrakt DOM — UZUPEŁNIONY w przebiegu 27)

> **Kontrakt urósł o jedną linię i nikt tego nie zapisał.** Nagłówek `przepis-parser.js`
> nazywany tu kanonem **nie wymienia `#mp-wartosci-porcja`**, choć `zaladuj()` czyta to
> pole od czasu wdrożenia paska meta (`tekstZeSkryptu('mp-wartosci-porcja')`, linia 719).
> Rozjazd był w SAMYM ŹRÓDLE, nie tylko w tym dokumencie. **Zamknięte w tym samym
> przebiegu (D-27.3): nagłówek parsera uzupełniony, a minifikat przebudowany `terser`em
> wyszedł IDENTYCZNY CO DO BAJTU** (sha256 `12eefdba…d71e`, 17 663 B, bez zmian). Zgodność
> hasha jest tu mocniejszym dowodem niż przemiar: skoro artefakt się nie zmienił, cała
> zmierzona powierzchnia zostaje ważna **z konstrukcji**, a nie z ponownego uruchomienia.
>
> Bez tej linii integracja wygląda na kompletną i daje **ekran startowy bez paska meta**
> na każdym przepisie — usterkę, która wygląda jak decyzja projektowa.

> **KONTRAKT URÓSŁ DRUGI RAZ — przebieg 31, wejście `data-mp-foto-glowne`.**
> D-23.1 (operator, 2026-08-15) kieruje zdjęcie przepisu do pola **`zdjecie-glowne`**
> (Image, id `93ac881e…`), to samo na ekranie startowym i na zakończeniu. Parser czyta je
> osobnym wejściem, a nie przez galerię `data-mp-foto-kroku`: tamta jest MultiImage
> i wiąże się z polem KROKU, więc zdjęcie przepisu nie ma tam czego szukać.
>
> **Bez tej linii integracja daje ekran startowy bez zdjęcia i tytuł o 166 px za wysoko** —
> dokładnie stan, który matryca opisywała jako B21 🔴 przez osiem przebiegów. To druga
> usterka tej samej klasy co brak `#mp-wartosci-porcja`: kod pyta o pole, którego szablon
> nie podaje, a wynik wygląda na decyzję projektową, nie na brak.
>
> **Parser czyta ATRYBUT `src`, nie własność `img.src`.** Dla pustego pola Image Webflow
> renderuje `<img src="">`, a przeglądarka rozwija pusty `src` do adresu dokumentu —
> naiwny odczyt zwróciłby URL strony przepisu i wyglądał na poprawne zdjęcie.
> Puste pole daje więc `null` i **brak elementu**, nie ramkę ze złamanym obrazem (R3).
> Zmierzone kontrolą ujemną w obu powierzchniach harnessu, przebieg 31.
>
> **Zmiana wymaga wiersza w `instrukcja-pisania-przepisow.md` §6** (pin B1 — żaden łańcuch
> nie dopisuje do interfejsu embedu jednostronnie). Change request:
> `CR--zdjecie-glowne--2026-08-15.md` w katalogu łańcucha.

Poniższy blok jest kanonem po uzupełnieniu:

```html
<script type="text/plain" id="mp-skladniki">{{skladniki}}</script>
<script type="text/plain" id="mp-kroki">{{kroki}}</script>
<script type="text/plain" id="mp-wartosci-porcja">{{wartosci-porcja}}</script>
<div id="mp-tryb-gotowania"
     data-tytul="{{name}}"
     data-porcje-bazowe="{{porcje-bazowe}}"
     data-czas="{{czas-przygotowania}}" hidden></div>

<!-- ukryta Collection List po `produkty-w-przepisie` -->
<div data-mp-produkt data-slug="{{slug}}" data-nazwa="{{name}}"
     data-url="/produkty/{{slug}}" data-gramatura="{{gramatura-opakowania}}"></div>

<!-- galeria `zdjecia-krokow`, MultiImage -->
<img data-mp-foto-kroku src="…-krok-07.webp">

<!-- zdjęcie główne przepisu, pole `zdjecie-glowne` (Image) — D-23.1 -->
<img data-mp-foto-glowne src="{{zdjecie-glowne}}">

<!-- blok QR: renderowany wyłącznie ≥992 px -->
<div data-mp-qr></div>
```

Strona docelowa: **`przepisy Template`**, `pageId 6a574b13929618407b161667`,
kolekcja `6a574b13929618407b161661` — **potwierdzone ponownie 2026-08-15, przebieg 27**
[V]: `title` „przepisy Template", `slug` `detail_przepisy`, `publishedPath` `/przepisy`,
`collectionId` zgodny z nagłówkiem parsera. Strona i kolekcja były ruszane **tego samego
dnia** (`lastUpdated` 09:49 i 09:22) przez drugi łańcuch — to nie jest ostrzeżenie, tylko
powód, żeby przed integracją odczytać je jeszcze raz, a nie zawierzyć temu zdaniu.

**Pola CMS, których wymaga kontrakt — stan wypełnienia [V] 2026-08-15:** wszystkie
istnieją w kolekcji, ale `wartosci-porcja` i `wartosci-odzywcze` są wypełnione dla
**1 z 18** przepisów. Kontrakt DOM jest spełniony przez szablon; treść dostarcza migracja
z CR-u i to ona, nie kod, decyduje o tym, czy pasek meta pojawi się na stronie.

Poza kontraktem, **opt-in i nadal niezatwierdzone** (pin, WYM §3): `data-mp-pole`
dla pól kartowych. `zaladuj()` domyślnie ich nie czyta.

**Loader D13** należy do szablonu, nie do runtime'u: markup `#mp-loader`, przełącznik
w `<head>` i bezpiecznik 3 s. Runtime tylko **ZDEJMUJE** klasę
`mp-wchodzi-w-gotowanie`, i robi to po zamontowaniu overlaya, nie na
`DOMContentLoaded` (wiersz F14, zielony od przebiegu 8). Duplikowanie bezpiecznika
w runtimie dałoby dwie prawdy o tym, kto zdjął klasę.

---

## 6. Pozycje wykonalne wyłącznie poza pętlą lokalną

Sekcja Z matrycy, z receptą wykonania. Nie liczą się do zieleni pętli lokalnej.

| poz. | co zmierzyć | gdzie | jak, konkretnie |
|---|---|---|---|
| Z1 | wake lock — ekran nie gaśnie przy odliczaniu | fizyczny telefon | uruchomić minutnik > 3 min, odłożyć telefon, nie dotykać; `http://localhost` dał tylko test podstawowy |
| Z2 | offline: załadowany DOM działa po odcięciu sieci | realna strona | tryb samolotowy przy otwartym trybie; kroki i minutniki mają iść dalej, ma wejść baner S3 |
| Z3 | QR koduje origin **produkcyjny** + `?tryb=gotowanie` | staging | **kod z `*.webflow.io` = błąd blokujący**, nie kosmetyka |
| Z4 | payload z publishera Webflow, nie z harnessu | staging | pierwszy pomiar na realnych `{{skladniki}}`/`{{kroki}}` |
| Z5 | `?debug=1` widoczny także w podglądzie Webflow (CR6) | staging | — |
| Z6 | canonical przy `?tryb=gotowanie` wskazuje czysty adres | staging | wiąże się z decyzją „pushState bez zmiany adresu" (STAN, przebieg 9) |
| Z7 | join produktów po `@slug` przez ukrytą Collection List | staging (CMS) | — |
| Z8 | `ceil(gramy/opakowanie)` → „2 × 325 g" | staging (CMS) | wymaga `gramatura-opakowania` w kolekcji produktów |
| Z9 | zdjęcia kroków: match po fragmencie nazwy | staging (assety) | konwencja nazw plików `…-krok-NN.webp` |

~~Dodatkowo poza stagingiem: B16 / I4 — subset poza korzeniem serwera pomiarowego.~~
**NIEAKTUALNE od przebiegu 21 (D-15.2 wykonane).** Korzeń serwera podniesiony do
`C:\Users\andrz\Claude`, subset **v4** (`local/tech/fonts/subset-2026-08-15-v4/`) wpięty
do obu fixture'ów i zmierzony w żywym renderze. **B16 / I4 nie blokuje już nic po stronie
harnessu** — zostaje wyłącznie decyzja, czy runtime deklaruje własne `@font-face`
(dziś: 0 deklaracji, glify rysowane substytutami Unicode). Szczegóły: §3b i lista decyzji.

---

## 7. Lista kontrolna przed wklejeniem embedu

Do wykonania **po** decyzji o rozmiarze (§2). Kolejność jest wiążąca.

1. [ ] decyzja o kroku budowania podjęta; **OBA** artefakty zbudowane i zmierzone —
       **< 50 000 znaków, cel < 45 000** (wiersz I5, WYM **v1.7**). Dziś (przeb. 32):
       runtime **40 713 zn.** (zapas **4 287**), parser **39 592 zn.** (zapas **5 408**).
       Od przebiegu 28 próg WYM §4 dotyczy obu plików, nie samego runtime'u; od przebiegu 30
       wynosi 45 000 (D-28.1). **Licz ZNAKI, nie bajty** — `len(bajty.decode('utf-8'))`,
       nie `wc -c`: limit Webflow jest znakowy, a w tych plikach różnica sięga 365 sztuk
       i przebieg 31 podał ją jako znaki (§2)
2. [ ] **dziesięć** tokenów podmienionych wg §3; **trzy** braki rozstrzygnięte jawnie
       (`--mp-akcent`, `--mp-alarm`, `--mp-cta`). **Nazwy bierz z `TOKENY[i][2]`
       w artefakcie, NIE z komentarzy** — od przebiegu 28 opis migracji jest daną
       (wariant (3)), odczytaną ze zbioru zmiennych witryny, a komentarzy przy
       tokenach już nie ma. Cztery stare komentarze były nieprawdziwe: `white-off-bg`
       i `white-full-bg` nie istnieją (jest `off-white-bg-100%` i `white-bg`),
       `--mp-atrament` MA odpowiednik (`primary-text`), a `--mp-cta` go nie ma
       (`primary-cta` = #E55529, nie #CF411A — pozycja **D-27.1**)
3. [ ] `grep -c HARNESS-ONLY` na artefakcie → **0** (sprawdzone ponownie przeb. 32,
       po jednostce fontu ikon: 0 w czterech plikach runtime'u, 16 + 16 + 1 + 1 + 4
       w harnessie — bez zmian wobec przeb. 27)
4. [ ] `grep "MP_BEZ_HISTORII\s*=\s*true"` na artefakcie → **brak przypisania**.
       ~~`grep MP_BEZ_HISTORII` → brak~~ — **pozycja była błędna i wykonana zepsułaby
       działanie.** Runtime **czyta** `global.MP_BEZ_HISTORII` w `historiaWlaczona()`
       i musi to robić: to *seam*, dokładnie tej samej klasy co `MP.zegar` z poz. 5,
       a ustawia go wyłącznie harness (`fixture.html`). Sprawdzać trzeba brak
       **przypisania**, nie brak nazwy. Zmierzone przeb. 27: 2 wystąpienia w źródle
       runtime'u, 1 w minifikacie, oba odczyty [V]
5. [ ] `MP.zegar` **zostaje** (§4) — to nie jest pozostałość po pomiarze
6. [ ] szablon ma komplet z §5, łącznie z **`#mp-wartosci-porcja`**, `#mp-loader`
       i bezpiecznikiem 3 s
7. [ ] **pole `wartosci-porcja` wypełnione** dla przepisów, które mają iść na stronę —
       inaczej pasek meta chowa się poprawnie i cicho. Dziś: **1 z 18** [V]
8. [x] biblioteka QR wpięta i zadeklarowana (wiersz **I3**) — **zrobione w przeb. 28**:
       `qrcode-generator` 2.0.4 wbudowany w artefakt parsera, `window` puste,
       `MP.przepis.zaleznosci.qr` niesie nazwę, wersję i licencję
9. [ ] **`grep "Permission is hereby granted"` na artefakcie parsera → OBECNE.**
       Pozycja nowa (przeb. 28) i nieoczywista: MIT wymaga dosłownej noty w kopiach,
       a nota żyje w banerze `/*! … */`, który terser zachowuje **domyślnie**.
       Zmiana polecenia builda na `--comments false` usunie ją bezgłośnie i artefakt
       przestanie być zgodny z licencją, wyglądając i działając identycznie.
       To ta sama klasa kruchości, przez którą operator wybrał wariant (3) dla tokenów
       — z tą różnicą, że tu skutkiem jest naruszenie prawa, nie czerwony wiersz
10. [ ] pierwszy pomiar na stagingu: Z4 przed Z3 — bez realnego payloadu reszta
       niczego nie dowodzi

> **Poprawka poz. 4 to jedyne miejsce w tym pliku, w którym lista kontrolna kazała zrobić
> coś szkodliwego.** Warto zapamiętać jej kształt: pozycja powstała jako *grep na nazwę*,
> kiedy nazwa występowała tylko po stronie harnessu, i przestała być prawdziwa w chwili,
> gdy runtime zaczął tę samą nazwę czytać. §4 opisuje dwa *seamy* runtime'u — **są trzy**,
> a trzeciego nie wymienia właśnie dlatego, że lista kontrolna kazała go usuwać.

---

## Czego w tym pliku celowo nie ma

**Gotowego snippetu do wklejenia.** Zależy w całości od decyzji z §2: przy wariancie
dwóch embedów to dwa bloki, przy minifikacji jeden, przy jsDelivr — trzy linijki
z tagiem. Napisanie go teraz znaczyłoby napisanie trzech i wyrzucenie dwóch, a przy
okazji zamrożenie decyzji, która nie należy do łańcucha.

**Instrukcji publikacji.** Poza łańcuchem, bez wyjątków (STAN.md, piny).
