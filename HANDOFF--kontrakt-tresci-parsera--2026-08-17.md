# Hand-off — co musi powstać w Webflow, żeby przepis zamienił się w tryb gotowania

**Data:** 2026-08-17 · **Autor:** sesja `tryb-gotowania-domkniecie`
**Dla kogo:** operator + wtyczka copywritera w trybie przepisów
**Podstawa:** odczyt `przepis-parser.js` i `tryb-gotowania.js` w wersji z 2026-08-17,
nie z pamięci. Numery linii mogą się przesunąć; reguły nie.

Dokument idzie od ogółu do szczegółu. Jeśli szukasz tylko odpowiedzi „kiedy podawać
minuty" — rozdział 5.

---

## 1. Cała droga, w czterech krokach

```
pola CMS (kolekcja `przepisy`)
      ↓  Webflow wstawia je do HTML Embed w template'cie
znaczniki w DOM (rozdz. 2)
      ↓  przepis-parser.js czyta i buduje MODEL
model: { tytul, czas, meta, skladniki[], kroki[] }
      ↓  naPorcje(model, n) przelicza gramatury i dokłada pola widoku
widok  →  tryb-gotowania.js rysuje ekrany
```

Dwie rzeczy warto zapamiętać od razu, bo tłumaczą większość zaskoczeń:

**Parser niczego nie zgaduje i niczego nie liczy „na oko".** Czego nie ma w polach,
tego nie ma w trybie. Brak pola nie daje pustego miejsca w układzie — daje brak
całego bloku (np. brak `wartosci-porcja` chowa cały pasek meta, a nie pokazuje
trzech kolumn z kreskami).

**Redakcja pisze TEKST, nie HTML.** Składnia jest liniowa: znaczniki `#klucz`,
nagłówki `==`, pary `klucz: wartość`. Parser jest surowy i zgłasza każdy wiersz,
którego nie umie rozebrać.

---

## 2. Kontrakt DOM — co template musi wstawić

To jest już zbudowane; opisuję, żeby było wiadomo, skąd co pochodzi.

| element w DOM | pole CMS | do czego |
|---|---|---|
| `<script type="text/plain" id="mp-skladniki">` | `skladniki` | lista składników |
| `<script type="text/plain" id="mp-kroki">` | `kroki` | kroki przepisu |
| `<script type="text/plain" id="mp-wartosci-porcja">` | `wartosci-porcja` | kcal i makro w pasku meta |
| `<div id="mp-tryb-gotowania" data-tytul data-porcje-bazowe data-czas>` | `name`, `porcje-bazowe`, `czas-przygotowania` | tytuł, baza do przeliczeń, czas całkowity |
| `<img data-mp-foto-glowne>` | `zdjecie-glowne` | zdjęcie na ekranie startowym, wznowienia i zakończenia |
| `<img data-mp-foto-kroku>` (galeria) | `zdjecia-krokow` | zdjęcia przypisywane krokom przez `foto:` |
| `<div data-mp-produkt …>` (ukryta lista) | `produkty-w-przepisie` | podmiana gramatur na opakowania MP |

---

## 3. Składniki — jedna linia, jeden składnik

```
#wolowina 500 g wołowiny mielonej @wolowina-mielona
#cebula 1 cebula
#oliwa 2 łyżka oliwy
#passata 700 g passaty pomidorowej
```

- **Linia musi zaczynać się od `#klucz`.** Klucz jest identyfikatorem — po nim kroki
  odwołują się do składnika. Bez spacji, bez polskich znaków (bezpieczniej), unikalny.
  Wiersz bez klucza to **błąd**, nie ostrzeżenie.
- **Duplikat klucza to błąd.** Drugi `#cebula` w tym samym przepisie zatrzymuje build.
- **`@slug-produktu` na końcu** wiąże składnik z produktem MP. Wtedy tryb pokazuje
  **wielokrotność opakowania**, nie surowe gramy: `2 × 320 g wołowina mielona`.
  Bez `@` zostaje to, co napisała redakcja.
- **Ilość i jednostka są rozbierane**, żeby dało się przeliczyć porcje. Zakresy
  działają: `2–3 łyżki` odmieniają się po górnym końcu.

### 3.1 `[!]` JEDNOSTKĘ PISZE SIĘ W MIANOWNIKU LICZBY POJEDYNCZEJ

**To najdroższa cicha pułapka całej składni.** Tabela odmian jest kluczowana
mianownikiem l. poj. — `ząbek`, `łyżka`, `szklanka`, `gałązka`.

| co wpiszesz | co zobaczy użytkownik |
|---|---|
| `#czosnek 3 ząbek czosnku` | **„3 ząbki czosnku"** — poprawnie, przy każdej liczbie porcji |
| `#czosnek 3 ząbki czosnku` | **„3 ząbki"** — i tak samo przy 1, 2, 5 i 8 porcjach |

Drugi wariant **wygląda dobrze przy porcjach bazowych** i psuje się dopiero wtedy,
gdy ktoś ruszy selektor porcji — `odmien()` przy słowie spoza tabeli zwraca je
nietknięte.

**Od 2026-08-17 parser TO OSTRZEGA** (`D-39.48`): przy jednostce spoza tabeli
dostaniesz wpis w panelu walidacji (`?debug=1`) z podpowiedzią, co wpisać.
**Ostrzeżenie, nie błąd** — nieodmieniona jednostka nie psuje builda, tylko wygląd
po zmianie porcji. Jednostki miary (`g`, `ml`, `kg`, `cm`, `szt`) są nieodmienne
z definicji i **nie wywołują ostrzeżenia**.

> Uwaga na przykład wyżej: **`2 łyżka oliwy`** wygląda w polu CMS niepoprawnie
> i tak ma być. Kluczem tabeli jest `łyżka`; „2 łyżki" zobaczy dopiero użytkownik.

Piszesz więc **`3 ząbek czosnku`**, choć to wygląda niepoprawnie w polu CMS.
Odmienia parser, nie redakcja.

**Furtka dla słów spoza tabeli:** podaj cztery formy rozdzielone pionową kreską,
w kolejności **[1 · 2–4 · 5+ · dopełniacz l. poj. dla ułamków]**:

```
#szalotka 2 szalotka|szalotki|szalotek|szalotki
```

### 3.2 `[!]` `@produkt` KASUJE CAŁĄ PRACĘ NAD ODMIANĄ

Gdy składnik ma `@slug-produktu`, etykieta **powstaje od zera** według wzoru
`n × gramatura g nazwa` — cokolwiek redakcja napisała o ilości i jednostce,
przestaje mieć znaczenie w trybie gotowania.

**`n` to liczba SZTUK, nie opakowań** — decyzja projektowa, bo `gramatura-produktu`
ma format „2 x 330 g", czyli opakowanie zawiera n sztuk po N g.

> **`[!]` Konsekwencja, której etykieta nie mówi:** przy 8 porcjach wyjdzie
> **„4 × 335 g"** — a to są **dwa opakowania**, nie cztery i nie jedno. Użytkownik
> patrzący na listę zakupów nie ma jak tego odczytać.
> **Pozycja decyzyjna operatora**, nie usterka: albo etykieta zaczyna mówić
> o opakowaniach, albo zostaje przy sztukach świadomie.

### 3.3 `[!]` KAŻDY SKŁADNIK MUSI WYSTĄPIĆ W `skladniki:` JAKIEGOŚ KROKU

Inaczej **BŁĄD**: `składnik #x nie jest użyty w żadnym kroku`.
Działa to też w drugą stronę — krok odsyłający do nieistniejącego klucza
to również błąd.

**Lista składników i suma ramek wszystkich kroków muszą się pokrywać co do klucza.**
Praktycznie: sól, pieprz, oliwa i parmezan **muszą gdzieś trafić**. Jeśli nie mają
naturalnego kroku, dopisz je tam, gdzie faktycznie się ich używa — a nie tam,
gdzie jest najmniej pracy, bo to one zbudują sekcję „w tym kroku".

---

## 4. Kroki — nagłówek `==` i pary `klucz: wartość`

```
== zarumień mięso
minutnik: 8:00 mięso
skladniki: #wolowina, #oliwa
kryterium: aż mięso straci różowy kolor i zacznie się rumienić
foto: 03
Rozgrzej patelnię, wrzuć mięso i nie mieszaj przez pierwszą minutę.
```

- **`== tytuł`** zaczyna nowy krok. Wszystko przed pierwszym `==` to **błąd**.
- **Linie bez rozpoznanego klucza to treść kroku.** Skleją się w jeden akapit.
- Rozpoznawane klucze: **`czas`, `minutnik`, `skladniki`, `kryterium`, `foto`**.
  Cokolwiek innego przed dwukropkiem zostanie potraktowane jako zwykły tekst —
  parser nie ostrzeże, więc literówka w nazwie klucza jest cicha. **Sprawdzaj nazwy.**
- **`skladniki:`** to lista kluczy po przecinku, z `#` lub bez. To one budują sekcję
  „w tym kroku"; reszta rozkłada się na „dalej" i „zużyte" **automatycznie**, po tym,
  w którym kroku składnik pojawia się pierwszy raz. Redakcja tego nie ustawia.
- **`foto: 03`** dopasowuje zdjęcie z galerii po numerze w nazwie pliku.
- **`**tekst**` w treści NIE RYSUJE JUŻ NICZEGO.** `bezZakreslen()` zdejmuje gwiazdki
  i zwraca sam tekst (decyzja operatora `D-39.15`, 2026-08-16). Limit „jeden na krok"
  jest nadal egzekwowany **jako błąd**, ale pilnuje składni bez skutku wizualnego —
  patrz rozdz. 5a, gdzie opisany jest mechanizm, który zamienniki niesie naprawdę.

---

## 5. CZAS — trzy stany i to jest sedno pytania

W prawym górnym rogu kroku stoi jedna „pigułka". Jej treść wylicza się tak
(`naPorcje`, pole `badge`):

```
badge = minutnik ?  sformatowany czas minutnika
                 :  (czas || 'bez minutnika')
```

Czyli **są dokładnie trzy stany**, w tej kolejności pierwszeństwa:

| co napiszesz | co widzi użytkownik | zachowanie |
|---|---|---|
| `minutnik: 8:00 mięso` | **`8 min`** — pigułka jest PRZYCISKIEM | tapnięcie uruchamia odliczanie, kafel ląduje w pasie dolnym |
| `czas: ok. 6 min` | **`ok. 6 min`** — zwykły napis | nic się nie dzieje, to etykieta |
| nic z powyższych | **`bez minutnika`** — napis wyszarzony, 12 px | nic się nie dzieje |

**Format minutnika jest sztywny: `MM:SS nazwa` albo `H:MM:SS nazwa`.**
`8:00 mięso` = 8 minut. `1:30:00 pieczeń` = półtorej godziny.
Brak dwukropka → **błąd**. Brak nazwy → **błąd**, bo pigułka w pasie dolnym nie ma
czego pokazać.

**Wyświetlanie skraca się samo:** pełne minuty jako `8 min`, niepełne jako `6:30`.

**`czas:` i `minutnik:` naraz to błąd.** Jeśli oba wystąpią, wygrywa `minutnik`,
ale build zgłosi to jako błąd do poprawienia.

### 5.1 Kiedy minutnik, kiedy etykieta, kiedy nic

To jest odpowiedź na „jak zapobiegać głupotom". Trzy pytania, po kolei:

**Czy użytkownik ma w tym czasie ODEJŚĆ od garnka?**
Jeśli tak — **minutnik**. Duszenie, pieczenie, gotowanie makaronu, odpoczynek mięsa.
Minutnik ma sens wtedy, gdy przegapienie końca coś psuje, a pilnowanie wzrokiem
jest niepotrzebne.

**Czy czas jest tylko oszacowaniem, a robota i tak wymaga patrzenia?**
Wtedy **`czas:`** jako etykieta — „ok. 6 min", „2–3 min". Użytkownik dostaje skalę
zadania, ale nikt nie udaje, że da się to odmierzyć.

**Czy czas w ogóle nie niesie informacji?**
Mieszanie sosu, doprawianie, przełożenie na talerz — **nie podawaj żadnego z dwóch**.
Wtedy pigułka pokaże `bez minutnika`.

> **`[!]` POZYCJA DECYZYJNA — dziś NIE MA stanu „brak pigułki".**
> Krok bez `czas:` i bez `minutnik:` dostaje napis **„bez minutnika"**, wyszarzony,
> ale obecny. Jeśli intencją jest „przy mieszaniu sosu nie ma nic", to obecny produkt
> tego nie potrafi — pokaże etykietę mówiącą o nieobecności minutnika, co przy
> trzech takich krokach z rzędu jest szumem.
> **To jest zmiana w runtimie na jedną decyzję operatora**, nie w treści.
> Do rozważenia: pusty stan pigułki, albo ukrycie jej całkowicie, gdy oba pola puste.

## 5a. ZAMIENNIKI — nie przez `**gwiazdki**`, tylko przez pole `co-mozesz-zmienic`

**Ten rozdział był w pierwszej wersji hand-offu POMINIĘTY, a rozdz. 4 mylnie
sugerował, że zamienniki robi się gwiazdkami.** Poprawione po przeglądzie
równoległej sesji, 2026-08-17.

Zamienniki (marker przy wierszu składnika, po tapnięciu tooltip) biorą się z pola
kartowego **`co-mozesz-zmienic`**, nie z treści kroku.

**Gramatyka wpisu kartowego:** pytanie, potem odpowiedź; wpisy rozdzielone pustą
linią; opcjonalny `#klucz` i opcjonalne `krótko:`. `#klucz` musi być **kluczem
składnika** — to on wiąże wpis z konkretnym wierszem listy.

**Jak parser to składa** (`zbudujZamienniki`):

- Wpis **bez `#klucza`** zostaje wyłącznie na stronie, do trybu gotowania nie wchodzi.
- **Dwa wpisy z tym samym kluczem to BŁĄD** — wiersz uniesie tylko jeden marker.
- Krok dostaje marker dla klucza, który jest **w ramce składników TEGO kroku**
  i ma wpis kluczowany. Redakcja nie przypisuje markerów do kroków ręcznie.
- **Limit dwóch markerów na krok** (`LIMIT_MARKEROW`). Nadmiar nie znika ze strony,
  ale wypada z trybu gotowania — parser daje **ostrzeżenie** z listą pominiętych.
- Wpis kluczowany, który **nie siada na żadnym wierszu** — ostrzeżenie.
- Krok **bez ramki składników**, a mówiący o kluczu — ostrzeżenie.

> **`[!]` DZIŚ ZAMIENNIKI NIE DZIAŁAJĄ W OGÓLE — i to nie jest usterka treści.**
> Pola kartowe (`wskazowka`, `co-mozesz-zmienic`, `przechowywanie`) są **domyślnie
> wyłączone**: `zaladuj()` czyta je tylko przy jawnym `opcje.pola`, bo `[data-mp-pole]`
> **nie jest w zatwierdzonym kontrakcie DOM** (pin, WYMAGANIA §3).
> Dopóki ktoś tego nie włączy w szablonie, mapa zamienników buduje się z pustego
> pola i żaden marker się nie pojawi — **niezależnie od tego, jak dobrze redakcja
> wypełni `co-mozesz-zmienic`.**
>
> **Rekomendacja: nie każ redakcji pisać zamienników „na zapas".** Albo pole wchodzi
> do kontraktu DOM (decyzja operatora + drugi łańcuch + szablon), albo zamienniki
> są poza zakresem v1.0 i wtedy warto to powiedzieć redakcji wprost.

### 5.2 Pułapka: `kryterium:` bez minutnika ZNIKA

Od poprawki z 2026-08-15 `kryterium:` **nie jest już osobnym akapitem w treści kroku**
— stało się podpowiedzią wyświetlaną w rozwiniętej pigułce minutnika.

**Konsekwencja dla redakcji: krok BEZ minutnika traci `kryterium:` całkowicie.**
Tekst zostanie sparsowany, trafi do modelu i nigdy się nie pokaże.

Więc jeśli chcesz napisać „mieszaj, aż sos zgęstnieje" przy kroku bez minutnika —
**wpisz to w treść kroku**, nie w `kryterium:`. `kryterium:` rezerwuj dla kroków,
które mają minutnik i potrzebują odpowiedzi na pytanie „skąd mam wiedzieć, że gotowe,
skoro czas minął, a wygląda inaczej".

### 5.3 Czas całkowity przepisu (pasek meta na ekranie startowym)

To **inne pole**: `czas-przygotowania` na poziomie przepisu, nie kroku. Trafia pod
klepsydrę w pasku meta.

**Wpisuj samą liczbę minut** — jednostkę dokłada parser (`D-39.38`, 2026-08-17).
`30` → `30 min`. Jeśli wpiszesz `30 min`, parser tego nie ruszy i będzie dobrze;
jeśli wpiszesz `pół godziny`, też nie ruszy i wyświetli dosłownie. Doklejanie działa
**tylko dla samej liczby**.

Pasek meta pojawia się **wyłącznie w komplecie**: czas + kcal + makro. Brak albo
niepoprawne `wartosci-porcja` chowa cały pasek, razem z czasem.

---

## 6. Jak sprawdzić, czy nie ma głupot — panel walidacji

> **`[!]` PASEK NIE POJAWIA SIĘ SAM.** Jest za bramką:
> `if (/[?&]debug=1/.test(location.search)) pokazPanelBledow(...)`.
> **Bez `?debug=1` w adresie nie zobaczysz go nigdy — także przy dziesięciu błędach.**
>
> **`[!]` BŁĘDY NICZEGO NIE BLOKUJĄ.** `tryb-gotowania.js` **nie czyta `model.bledy`
> ani razu**. „Zero tolerancji" jest polityką redakcyjną, nie mechanizmem: przepis
> z błędami zbuduje się i wyświetli, tylko część danych będzie brakująca albo dziwna.
> Cisza nie znaczy „dobrze" — znaczy „nikt nie pytał".

Parser rozróżnia dwie klasy problemów i pokazuje je **paskiem na górze strony**,
**pod warunkiem otwarcia strony z `?debug=1`**:

- **Błędy** (tło czerwone) — coś jest nie do sparsowania. Zero tolerancji: przepis
  nie ma prawa iść dalej. Przykłady: składnik bez klucza, duplikat klucza, minutnik
  bez `MM:SS`, minutnik bez nazwy, treść przed pierwszym `==`, `czas:` i `minutnik:`
  naraz, więcej niż jeden marker `**…**` w kroku.
- **Ostrzeżenia** (tło bursztynowe) — „to prawdopodobnie niedopatrzenie redakcji",
  ale zbuduje się. Traktuj jak listę do przejrzenia, nie jak szum.

**Przy `?debug=1` panel nie pojawia się, gdy obie listy są puste.** Brak paska
**na adresie z `?debug=1`** = przepis przeszedł kontrolę mechaniczną.
**Kontrola mechaniczna nie sprawdza sensu** — minutnik na mieszanie sosu przejdzie
ją bez słowa.

---

## 7. Lista kontrolna dla wtyczki copywritera

Do przejścia przed oddaniem przepisu:

1. Każdy składnik ma unikalny `#klucz`, bez duplikatów.
2. Składniki, które MP sprzedaje, mają `@slug-produktu` — i pamiętasz, że wtedy
    etykieta powstaje od zera jako `n × gramatura g nazwa` (rozdz. 3.2).
2a. **Jednostki w mianowniku liczby pojedynczej** (`ząbek`, nie `ząbki`) — rozdz. 3.1.
2b. **Każdy klucz składnika występuje w `skladniki:` jakiegoś kroku** — rozdz. 3.3.
3. Każdy krok zaczyna się od `== tytuł`; przed pierwszym `==` nie ma nic.
4. `skladniki:` w kroku wymienia **tylko te, których używa ten krok** — reszta
   rozłoży się sama.
5. **Minutnik tylko tam, gdzie można odejść od garnka.** Format `MM:SS nazwa`,
   nazwa obowiązkowa i krótka, bo trafia na kafel w pasie dolnym.
6. **`czas:` tylko jako oszacowanie** przy krokach wymagających patrzenia.
7. **Ani jednego, ani drugiego** przy krokach, w których czas nic nie znaczy.
8. `kryterium:` **wyłącznie przy krokach z minutnikiem** — inaczej przepadnie.
9. **Nie używaj `**gwiazdek**` do zamienników — nic nie rysują.** Zamienniki
    idą przez pole `co-mozesz-zmienic` z `#kluczem` składnika, najwyżej dwa
    na krok — i dziś nie działają wcale, patrz rozdz. 5a.
10. `czas-przygotowania` to sama liczba minut.
11. `wartosci-porcja` wypełnione — inaczej znika cały pasek meta.
12. Otwórz stronę **z `?debug=1` na końcu adresu** i sprawdź, czy nie ma paska
    walidacji u góry. Bez tego dopisku pasek nie pojawi się nawet przy błędach.

---

## 8. Czego ten dokument nie rozstrzyga

- **Brzmienia** etykiet interfejsu („bez minutnika", „zacznij gotować",
  „skopiuj składniki") — to pipeline treści w trybie `ui`, nie ten kontrakt.
  W kodzie takie miejsca są oznaczone `NIENARYSOWANE brzmienie`.
- **Czy pigułka może zniknąć całkowicie** — pozycja decyzyjna z rozdz. 5.1.
- **Nazwy przycisku kopiowania** — szablon mówi „skopiuj listę zakupów", tryb
  gotowania „skopiuj składniki". Rozjazd zgłoszony 2026-08-17, nierozstrzygnięty.

**Wszystko powyżej zostało odczytane z kodu 2026-08-17.** Jeśli coś w produkcie
zachowa się inaczej, niż tu napisano, to jest rozjazd do zgłoszenia — nie do
„poprawienia" po cichu w treści.
