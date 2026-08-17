# Delta dla sesji równoległej — co się zmieniło od pierwszego hand-offu

**Data:** 2026-08-17 · **Od:** sesja `tryb-gotowania-domkniecie`
**Zakres:** od pierwszej wersji `HANDOFF--kontrakt-tresci-parsera--2026-08-17.md`
do parsera **v39-51** włącznie.

Dziękuję za przegląd — **wszystkie siedem znalezisk z obu tur potwierdziłem
odczytem kodu i żadnego nie odrzuciłem.** Cztery z nich okazały się usterkami
dokumentu, trzy pociągnęły zmiany w kodzie, a jedno z nich odwróciło regułę,
którą hand-off ustanawiał. Poniżej wynik, żeby nie trzeba było czytać całości
od nowa.

---

## 1. Twoje znaleziska i co z nimi zrobiliśmy

| # | znalezisko | werdykt | co dalej |
|---|---|---|---|
| 1 | Panel walidacji tylko za `?debug=1` | **potwierdzone** | dokument poprawiony; bramka **zostaje** (decyzja operatora: „tylko za parametrem") |
| 2 | Błędy niczego nie blokują — runtime nie czyta `model.bledy` | **potwierdzone** | dokument poprawiony; mechanizmu **nie zmieniamy** |
| 3 | `**marker**` nic nie rysuje, a limit egzekwowany jako błąd | **potwierdzone** | **limit USUNIĘTY** (`D-39.47`) |
| 4 | Zamienniki idą z `co-mozesz-zmienic`, hand-off tego pola nie wymieniał | **potwierdzone** | dopisany **rozdz. 5a**; pole **włączone do czytania** (`D-39.47`, `D-39.51`) |
| 5 | Jednostkę trzeba pisać w mianowniku l. poj., cicha pułapka | **potwierdzone** | najpierw ostrzeżenie (`D-39.48`), **potem regułę zniesiono** (`D-39.50`) |
| 6 | `@produkt` kasuje odmianę, `n` to sztuki nie opakowania | **potwierdzone** | **nadpisywanie etykiety usunięte** (`D-39.49`) |
| 7 | Każdy składnik musi wystąpić w kroku, inaczej błąd | **potwierdzone** | opisane (rozdz. 3.3); **zostawiamy jak jest** |

---

## 2. Zmiany w KODZIE — sześć rzeczy, w kolejności ważności dla redakcji

### `D-39.50` · Jednostki: **reguła się ODWRÓCIŁA**

**To jest najważniejsza zmiana w tym dokumencie.** Hand-off, który dostałeś, kazał
pisać `3 łyżka skrobi` — w mianowniku liczby pojedynczej, bo tylko takie formy
trafiały w tabelę odmian.

**Teraz jest odwrotnie: pisze się normalną polszczyzną, `3 łyżki skrobi`.**
Parser dostał indeks odwrotny — mapę każdej formy z tabeli na hasło — więc
`łyżki`, `ząbki`, `jajka` trafiają tam, gdzie trzeba.

Zmierzone: `3 łyżki skrobi` przy bazie 2 porcji → **2 porcje „3 łyżki" · 4 porcje
„6 łyżek" · 8 porcji „12 łyżek"**.

Powód odwrócenia — operator, wprost: *„to nie jest angielski, a polski (…) nie
możemy pokazywać w szablonie tekstu «na odwal się», a dobre copy jedynie w trybie
gotowania"*. **Miał rację z powodu, którego żadne z nas nie nazwało:** surowe pole
stoi w źródle strony (`div[data-mp-skladniki]`, `display:none`) i **czytają je
crawlery AI**, o które chodzi w wymogu SEO/GEO z WYMAGANIA §3. „3 łyżka skrobi"
trafiało więc do indeksu.

### `D-39.48` · Ostrzeżenie o jednostce spoza tabeli

Zostaje jako siatka bezpieczeństwa dla słów, których w tabeli nie ma w żadnej
formie. **Ostrzeżenie, nie błąd.** Jednostki miary (`g`, `ml`, `kg`, `cm`, `szt`)
są nieodmienne z definicji i nie wywołują go — sprawdzone na jedenastu przypadkach,
zero fałszywych alarmów.

Furtka dla słów spoza tabeli, której pierwszy hand-off nie wymieniał:
`2 szalotka|szalotki|szalotek|szalotki`, w kolejności **[1 · 2–4 · 5+ · dopełniacz
l. poj.]**.

### `D-39.49` · `@produkt` nie zmienia już etykiety

Było: `n × gramatura g nazwa`, gdzie `n` to liczba **sztuk** — „4 × 335 g" przy
ośmiu porcjach, czyli dwa opakowania, czego napis nie mówił. **I to omijało
`odmien()`**, czyli kasowało całą pracę nad odmianą, na co słusznie zwróciłeś uwagę.

Teraz etykieta powstaje normalną ścieżką: `300 g piersi z kurczaka` → 600 g → 1200 g.
Wiązanie `@` zostaje, bo służy linkowaniu do sklepu.

Operator: *„design nie pokazuje sztuk, usunąłem to (…) lepiej liczyć w gramach"*.
Odmówiłem tej zmiany godzinę wcześniej, powołując się na „design pokazuje sztuki"
jako udokumentowane rozstrzygnięcie — a ono właśnie zostało z projektu wycofane.

### `D-39.47` · Limit `**markerów**` usunięty; pola kartowe czytane domyślnie

Limit podnosił **błąd** — najostrzejszy sygnał parsera — pilnując składni, która po
`D-39.15` nie ma żadnego skutku wizualnego. Usunięty.

Pola kartowe (`wskazowka`, `co-mozesz-zmienic`, `przechowywanie`) są odtąd czytane
do modelu **domyślnie**. Wcześniej wymagały jawnego `opcje.pola`, więc mapa
zamienników budowała się z pustego pola i **żaden marker nie pojawiał się nigdy** —
także przy bezbłędnie wypełnionym polu. Twoja diagnoza była trafna co do joty.

**Zakres celowo wąski:** włączone CZYTANIE. **Wstrzykiwanie kart na stronę
(`podzielKarty`) nietknięte** — WYMAGANIA §3 zabrania budować je bez rozstrzygnięcia
tabeli v2 sesji CMS.

### `D-39.51` · Parser czyta dwie konwencje atrybutów

Po włączeniu czytania okazało się, że **szablon nie używa `data-mp-pole`**.
Wystawia:

```html
<div data-mp-karty="co-mozesz-zmienic" class="recipe-cards__group">
  <div data-mp-zrodlo class="recipe-cards__source">…surowy tekst…</div>
</div>
```

Nazwy odpowiadają sobie jeden do jednego (`data-mp-pole` ↔ `data-mp-karty`,
`data-mp-surowe` ↔ `data-mp-zrodlo`), więc parser czyta odtąd **oba zestawy**.

**Cena, nazwana i przyjęta:** parser zależy teraz od konwencji, której nie ustala.
Dlatego doszedł **sygnał dryfu** — surowe źródło leżące poza nazwanym kontenerem
daje ostrzeżenie zamiast cichego zgaśnięcia zamienników. Przepis bez pól kartowych
milczy, bo brak kart nie jest usterką.

Zmierzone na żywym DOM-ie stagingu przed publikacją: stara logika znalazłaby
**0 pól**, nowa znalazła **`co-mozesz-zmienic` (370 zn.)** i **`wskazowka` (320 zn.)**;
klucze wpisów `#skrobia` i `#limonka` **trafiają** w klucze składników.

### Czego świadomie NIE zmieniliśmy

- **Bramka `?debug=1`** zostaje. Proponowałem automatyczny pokaz panelu na stagingu;
  operator odrzucił („tylko za parametrem").
- **Błędy dalej nie blokują renderowania.** Uważam to za słuszne: przepis z jedną
  literówką ma się pokazać w wersji ułomnej, a nie zniknąć czytelnikowi. Problemem
  jest niewidoczność, nie brak blokady.
- **Wymóg „każdy składnik w jakimś kroku"** zostaje błędem. Bez niego składnik
  wpadałby do sekcji „dalej" i nigdy z niej nie wychodził, bo przynależność liczy
  się po pierwszym użyciu.

---

## 3. Co to znaczy dla wtyczki copywritera — trzy zdania

1. **Piszcie normalną polszczyzną.** `3 łyżki skrobi`, `1 ząbek czosnku`, `2 jajka`.
   Poprzednia instrukcja („mianownik liczby pojedynczej") jest **nieaktualna**.
2. **Nie używajcie `**gwiazdek**` do zamienników.** Zamienniki idą przez pole
   `co-mozesz-zmienic` z `#kluczem` składnika, najwyżej dwa na krok.
3. **`czas:` i `minutnik:` bez zmian** — rozdz. 5 hand-offu jest nadal aktualny
   w całości, razem z pozycją decyzyjną o braku stanu „brak pigułki".

---

## 4. Co zostaje otwarte

- **Stan „brak pigułki" nie istnieje** — krok bez `czas:` i `minutnik:` pokazuje
  napis „bez minutnika". Przy kilku takich krokach z rzędu to szum. Pozycja
  decyzyjna operatora.
- **Etykieta a opakowania** — po `D-39.49` mówimy w gramach. Czy lista zakupów ma
  kiedyś mówić „ile paczek kupić", zostaje otwarte.
- **Ujednolicenie nazw atrybutów** — dziś parser zna obie konwencje. Sensowne
  dopiero, gdy pojawi się drugi szablon.
- **Rozmiar parsera** — 15 932 B gzip przy progu 20 kB. Rano było 15,2 kB.
  Jeszcze nie problem, ale przy tym tempie warto obserwować.

---

## 5. Uwaga metodyczna, bo kosztowała dziś najwięcej

Twoje cztery znaleziska z pierwszej tury wzięły się stąd, że **pisałem hand-off pod
jedno pytanie operatora (o czas) i przeczytałem kod wybiórczo wokół niego.**
Wszystko, co opisałem, było prawdą; wszystko, czego nie sprawdziłem, wpisałem
z domysłu — łącznie z twierdzeniem, że zamienniki robi się gwiazdkami.

Dwa dodatkowe wystąpienia tej samej klasy w tej sesji: mój własny przykład
`2 łyżki oliwy` był instancją pułapki, przed którą dokument ostrzegał, a trzy
miejsca w dokumencie zostały sprzeczne z późniejszymi zmianami, dopóki ich dziś
nie przeszedłem ponownie.

**Wniosek: dokumenty tego rodzaju warto puszczać przez drugą sesję zanim trafią do
wtyczki, a nie po.** Ten obieg zadziałał — proponuję go powtórzyć przy następnym.
