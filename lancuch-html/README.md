# `lancuch-html/` — źródła przepisów w repo, trzy wyjścia z jednego uruchomienia

Stan: **architektura postawiona, nic nie zapisane do CMS-u i nic nie opublikowane.**
Migracja 16 przepisów z pól CMS do plików w repozytorium, wykonana 2026-08-19.

```
przepisy/<itemId>.txt          ← ŹRÓDŁO, jedyne miejsce do pisania
      │
      └── generuj-html.mjs ──┬─→ 7 × pole *-html            → CMS (Webflow renderuje statycznie)
                             ├─→ dane/<itemId>.<sha8>.json  → GitHub Pages (ładunek dla parsera)
                             └─→ parser-url                 → CMS, pole pochodne
```

## Dlaczego to w ogóle robimy

Mikroskładnia używa **pustej linii jako separatora bloków**, a pola źródłowe są typu
PlainText. **Edytor Webflow kasuje puste linie** `[V 2026-08-19]`. Zastane tego dnia:

| pole | ile przepisów | objaw |
|---|---|---|
| `kroki` | 2 (chili, gulasz) | 8 i 9 markerów `== tytuł` w środku linii; regeneracja dała jeden gigantyczny `<li>` z widocznym „== odcedź fasolę" w treści dla czytelnika |
| `co-mozesz-zmienic` | 5 | dwa kafelki zlane w jeden, klucz `#kolendra` wyciekł na stronę jako tekst |
| `wskazowka` | 4 | pytanie kolejnego kafelka doklejone na koniec akapitu poprzedniego |

**Żadnego z nich nikt nie zgłosił.** Wyszły przypadkiem, przy regeneracji. W repozytorium
każde jest jednolinijkowym diffem w PR-ze. To jest cały argument; SEO jest tu drugorzędne.

## Format źródła

Jeden plik na przepis, nazwany **`id` itemu Webflow** — 24-znakowym hexem, który jest
stabilny przy zmianie sluga i przy edycji pól, a ginie tylko przy skasowaniu i odtworzeniu
itemu. Na to jest kontrola „każdy plik ma item i każdy item ma plik" (`porownaj.mjs`).

```
[meta]
nazwa: Kurczak teriyaki
slug: kurczak-teriyaki-przepis
porcje-bazowe: 2
liczba-porcji: 2 porcje
waga-porcji: 225
czas-minuty: 30

[skladniki]
#kurczak   300 g piersi z kurczaka   @filet-z-piersi-kurczaka
…

[kroki]
== wymieszaj sos
czas: ok. 5 min
skladniki: sojowy, woda, miod
Zetrzyj imbir, przeciśnij czosnek…

== pokrój kurczaka
…
```

Sekcje: `[meta]`, `[skladniki]`, `[kroki]`, `[wskazowka]`, `[co-mozesz-zmienic]`,
`[przechowywanie]`, `[wartosci-odzywcze]`, `[wartosci-porcja]` — nazwa sekcji **jest**
slugiem pola w Webflow, więc nie ma tabeli mapowania, którą można rozjechać.
Puste linie na początku i końcu sekcji są zdejmowane, wewnętrzne — nietknięte.
Rozbiór formatu i uzasadnienie: `zrodlo.mjs`.

`nazwa` i `slug` w `[meta]` są **lustrem** pól natywnie webflowych: plik ich nie wypycha,
ma je po to, żeby dało się otworzyć `6a57649e…txt` i wiedzieć, co się otworzyło.
`porownaj.mjs` zgłasza rozjazd; źródłem prawdy jest wtedy CMS.

## Pętla robocza

```bash
# 1. edytujesz przepisy/<id>.txt
node lancuch-html/generuj-html.mjs --sucho     # walidacja bez zapisu
node lancuch-html/generuj-html.mjs             # ładunki do dane/ + dane/indeks.json
node lancuch-html/porownaj.mjs                 # regeneracja vs odcisk, pętla plik↔item
# 2. commit + push  →  Pages przebudowuje się samo, w praktyce poniżej minuty
# 3. dopiero teraz:
WEBFLOW_TOKEN=… node lancuch-html/wypchnij-do-cms.mjs            # suchy bieg
WEBFLOW_TOKEN=… node lancuch-html/wypchnij-do-cms.mjs --wykonaj
# 4. publikacja itemu — decyzja operatora, nie skryptu
```

**Kolejność `push → Pages → CMS → publikacja` jest warunkiem koniecznym, nie zaleceniem.**
Odwrotna otwiera okno, w którym `parser-url` w CMS wskazuje na plik, którego jeszcze nie ma
(ta sama pułapka: skill `mp-pomiar-i-pulapki` §3.5, raz kosztowała zepsute środowisko testowe).
`wypchnij-do-cms.mjs` **nie przypomina** o kolejności — wymusza ją: przed jakimkolwiek
zapisem pobiera każdy `parser-url` z Pages i wymaga 200 o treści identycznej co do bajtu.
Przypomnienie da się przeoczyć; 404 nie da się.

## Pliki

| plik | co robi |
|---|---|
| `zrodlo.mjs` | format `przepisy/<id>.txt` — czytanie, zapis, błędy z numerem wiersza |
| `kontrole.mjs` | kontrole kształtu pliku (te, których parser nie robi) |
| `generuj-html.mjs` | 7 pól `*-html`, 4 pola makro, ładunek JSON, `parser-url`, `dane/indeks.json` |
| `porownaj.mjs` | regeneracja vs CMS (albo vs odcisk), pętla plik↔item, kontrola ładunków |
| `wypchnij-do-cms.mjs` | zapis do CMS z bramką Pages i obowiązkowym odczytem zwrotnym |
| `importuj-z-cms.mjs` | CMS → pliki; migracja i awaryjne odtworzenie zgubionego pliku |
| `odcisk-2026-08-19.json` | zamrożony pomiar pól `*-html` z dnia migracji (hasze, nie treść) |
| `../narzedzia/suchy-bieg-generatora.mjs` | dowód, że bramka **umie** zaświecić na czerwono |

**Generator nie parsuje mikroskładni.** Całe rozbieranie `skladniki`, `kroki` i pól
kartowych robi `przepis-parser.js` przez most `odmiana-node.mjs` — ten sam plik, który
to samo robi w przeglądarce. Tu zostaje wyłącznie render. Druga implementacja gramatyki
byłaby czwartą kopią wiedzy dzielonej i rozjechałaby się tam, gdzie nikt nie patrzy.

## Stan pomiaru 2026-08-19

| kontrola | wynik |
|---|---|
| pliki źródłowe ↔ pola CMS, znak w znak (7 pól × 16) | **112 / 112** |
| regeneracja → pola `*-html`, znak w znak | **112 / 112** |
| pola pochodne (`kcal/bialko/weglowodany/tluszcz-porcja`) | **64 / 64** |
| pętla plik↔item, sieroty | **0** |
| błędy i uwagi walidatora na 16 plikach | **0 / 0** |
| suchy bieg bramki (uszkodzenia złapane) | **22 / 22** |

Odtworzenie: `node narzedzia/suchy-bieg-generatora.mjs && node lancuch-html/porownaj.mjs`.

## Czego świadomie NIE zrobiłem

- **Nie zapisałem niczego do CMS-u i nie opublikowałem.** Pole `parser-url` w kolekcji
  jeszcze nie istnieje. Zapis wymaga, żeby ładunki były najpierw na Pages, czyli żeby ta
  gałąź była zmergowana i zdeployowana — a publikacja itemu jest zawsze zmianą produkcyjną
  i zawsze decyzją operatora (`publish_collection_items` nie przyjmuje parametru domeny).
- **Nie tknąłem `przepis-parser.js` ani szablonu.** Ładunek na Pages jest gotowy i ma
  kształt 1:1 z kontraktem DOM, ale ścieżka „parser pobiera JSON zamiast czytać wyspy
  `text/plain`" to zmiana runtime'u w pliku produkcyjnym i osobna decyzja. Do tego czasu
  ładunek jest artefaktem bez konsumenta — celowo, żeby kolejność dało się przećwiczyć
  bez ryzyka.
- **Nie usunąłem żadnego pola CMS.** Lista martwych pól z handoffu §4 stoi nietknięta,
  bo `tresc` wciąż renderuje się na produkcji (starszy publish), a wiązań szablonu nie
  da się odczytać przez MCP.
- **Nie zmieniłem zachowania generatora względem stanu zastanego** — patrz niżej.

## Otwarte pozycje

1. **Czas kroku z `minutnik:` nie trafia do HTML-u** — 55 z 55 kroków `[V]`. Czytelnik nie
   widzi czasu akurat przy najdłuższych krokach, a przyszły `HowToStep` pójdzie bez
   `totalTime`. Przełącznik jest gotowy (`--czas-z-minutnika`) i **domyślnie wyłączony**:
   włączenie zmienia treść 16 stron, więc to decyzja operatora, nie generatora.
2. **`liczba-porcji` NIE jest polem pochodnym**, wbrew handoffowi §4. Zmierzone `[V]`: przy
   `porcje-bazowe: 3` CMS ma raz „3 porcje" (chili), raz „2–3 porcje" (udziec); przy `4` raz
   „4 porcje", raz „3–4 porcje". Widełki niosą informację redakcyjną, której w liczbie
   bazowej nie ma — 5 z 16 przepisów. Zostaje źródłem, w `[meta]`; generator sprawdza tylko,
   czy liczba bazowa mieści się w tym, co napisano.
3. **`**pogrubienie**` w polach kartowych renderuje się na stronie, a nie w trybie gotowania**
   (parser stosuje `wyroznienia()` tylko do kroków). Dziś to teoria — w 16 przepisach nie ma
   ani jednej gwiazdki poza `kroki` — i walidator ostrzega, gdy przestanie nią być.
   `D-39.62` zamknęło ten rozjazd dla `kroki`; dla pól kartowych jest otwarty.
4. **Znak zapytania w odpowiedzi kafelka jest BŁĘDEM**, nie ostrzeżeniem. To świadomy koszt:
   w polach bez metadanych (`wskazowka`, `przechowywanie`) jest jedynym sygnałem sklejenia
   kafelków, a sklejenie jest ciche. Zmierzone: 0 na 93 kafelki takiego pytania używa, więc
   cena jest dziś zerowa. Pytanie retoryczne w odpowiedzi trzeba przepisać na zdanie.
5. **Zadanie harmonogramowe porównujące Pages / regenerację / CMS** — handoff §7.4, operator
   zaznaczył „do omówienia osobno". Postawiona jest bramka repozytorium
   (`.github/workflows/lancuch-html.yml`): przy każdym pushu i PR-ze uruchamia suchy bieg,
   walidację i `porownaj.mjs` wobec odcisku. Porównania z żywym CMS-em nie ma — wymaga
   sekretu z tokenem i jest tą osobną rozmową.
6. **Kto pisze przepisy.** Jeśli redakcja nie pracuje z gitem, potrzebna jest ścieżka edycji
   (edytor webowy GitHuba z instrukcją albo osobne wejście). Format jest pod to napisany —
   nagłówki `[pole]`, tekst dosłowny, zero cytowania i zero ucieczek — ale sama ścieżka jest
   decyzją operatora i determinuje resztę.

## Zmiana hosta Pages — procedura, nie improwizacja

Adres ładunku siedzi w DWÓCH miejscach poza repo: w 16 polach `parser-url` w CMS
i w dwóch `<script src>` w custom code szablonu. Zmiana hosta dotyka obu, w tej
kolejności i nie w innej:

1. **nowy host serwuje** — repo z artefaktami na miejscu, Pages zbudowane, HTTPS
   wstało. Sprawdź pobraniem jednego ładunku, nie ustawieniem w panelu.
2. `BAZA_PAGES` w `lancuch-html/wspolne.mjs` → nowy adres (jedna linia).
3. `node lancuch-html/generuj-html.mjs` — nazwy plików się NIE zmienią (hash liczy
   się z treści, nie z adresu), zmieni się wyłącznie `parser-url` w `dane/indeks.json`.
4. commit + push, poczekaj na przebudowę Pages.
5. `wypchnij-do-cms.mjs` — bramka nie przepuści, dopóki ładunki nie leżą pod nowym
   adresem. Potem zapis 16 pól i odczyt zwrotny przez `porownaj.mjs`.
6. dwa `<script src>` w custom code szablonu, publikacja **najpierw na staging**.
7. **dopiero teraz** wygaszenie starego hosta.

Punkt 7 jest ostatni z pomiaru, nie z ostrożności: produkcja może serwować starszą
publikację szablonu i wskazywać na stary adres jeszcze długo po tym, jak staging
przejdzie na nowy. Wyłączenie starego hosta przed sprawdzeniem, na co wskazuje
opublikowana produkcja, jest gotową awarią na żywym serwisie.

Kontrola po drodze: `porownaj.mjs` na zrzucie CMS zgłosi rozjazd `parser-url` dla
każdego itemu, który został na starym adresie. Zero rozjazdów = przejście domknięte.

## Odcisk

`odcisk-2026-08-19.json` to **detektor zmiany, nie druga kopia treści**: sha256 każdego pola
`*-html` z dnia migracji. Gdy zaświeci, prawdę pokazuje CMS; odcisk zastępuje się wtedy
nowym, z nową datą i z powodem zapisanym w `STAN.md`. **Podciąganie odcisku pod nowy wynik,
żeby bramka przeszła, kasuje jedyny sygnał, jaki ta bramka daje.**
