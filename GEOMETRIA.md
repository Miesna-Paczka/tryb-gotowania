# GEOMETRIA — odczyt Figmy, zestaw `7195:10893` (jednostka 0)

Plik Figma `T0QnV1TrpngJhq2m1E9ZlI` (MP-WWW-UI-FIN-2), strona `Claude` (`7048:83653`).
Sesja read-only (seat: View). Źródło: `get_metadata` — **pozycje i wymiary z pliku**,
nie z renderu. Provenance domyślnie `[V]` (odczytane w tej sesji); wnioski oznaczone `[I]`.

**Zakres:** wyłącznie geometria i weryfikacja wizualna. O zachowania pytaj INTERAKCJE
(zestaw nieokablowany, INTERAKCJE §0) — nigdy Figmy.

**Kanwa:** wszystkie klatki 360 × 780. Siatka pozioma: margines 16 px, kolumna treści 328 px.

---

## 1. Szkielet wspólny — trzy warstwy

Każda klatka kroku składa się z trzech ramek rodzeństwa (kolejność w drzewie: TOP, belka, BOTTOM):

| warstwa | x | y | w | h | uwaga |
|---|---|---|---|---|---|
| `TOP` | 0 | 0 | 360 | **780** | pełna wysokość klatki — treść przewijana pod belką i pod BOTTOM `[I]` |
| `belka` | 0 | 0 | 360 | **72** | przypięta u góry, nakłada się na TOP |
| `BOTTOM` | 0 | 780 − h | 360 | **zmienna** | przypięta u dołu, nakłada się na TOP |

`TOP` ma pełne 780 px w KAŻDEJ zmierzonej klatce — belka i BOTTOM są nakładkami, nie
pasami odejmującymi wysokość. To jest odpowiedź na pytanie „czy treść jest skracana":
nie jest; runtime musi dać `padding-top` 72 i `padding-bottom` = wysokość BOTTOM. `[I]`

### 1.1 Belka (72 px) — stała we wszystkich zmierzonych klatkach

```
belka 360×72
└ pasek            16,16  328×40
  ├ instance buttons  304,16  40×40   ← przycisk zamknięcia, prawy górny
  ├ vector Vector      16,16  50.8766×40  ← logo/znak
  └ Frame 27165        86,24  188×26
    ├ text  (etykieta kroku)   0,0   188×16
    └ progress_bar             0,20  188×6
      └ progress_bar (wypełnienie)  0,0  N×6
```

Uwaga: `pasek` deklaruje 328×40 przy origin (16,16), ale dzieci mają współrzędne
liczone od klatki `belka`, nie od `pasek` (`buttons` na x=304, y=16). Odczyt jak wyżej. `[V]`

**Wypełnienie paska postępu — zmierzone wartości** (tor 188 px):

| klatka | etykieta | wypełnienie |
|---|---|---|
| `7195:10894` (00 start) | „tryb gotowania" | **8** px |
| `7195:10922` (01) | „krok 1 z 9" | **21** px |
| `7195:11065` (06) | „krok 6 z 9" | **125** px |
| `7196:11144` (W krok 8) | „krok 8 z 9" | **167** px |

Wniosek `[I]`: to nie jest liniowe `n/9 × 188` (dla n=1 dałoby 20.9 — zgadza się;
n=6 → 125.3 — zgadza się; n=8 → 167.1 — zgadza się). **Reguła: `wypełnienie = round(n/9 × 188)`**,
a ekran startowy dostaje wartość minimalną 8 px (kikut, nie zero). `[I]`

---

## 2. BOTTOM — reguła składania (INTERAKCJE §4.1)

Zmierzone warianty:

| klatka | wysokość BOTTOM | y | skład |
|---|---|---|---|
| `7195:10922` 01 · krok | **80** | 700 | sam pasek nawigacji |
| `7195:10894` 00 · start | **132** | 648 | 1 ramka 360×132: `cta — cta` 16,16 328×48 + `cta — ghost` 16,76 328×48 |
| `7195:11178` 10 · zakończenie | **132** | 648 | identycznie jak start |
| `7196:11087` W · dwa zwinięte | **180** | 600 | `stos` 100 + nawigacja 80 |
| `7195:11065` 06 · minutnik 1× rozwinięty | **218** | 562 | `stos` 138 + nawigacja 80 |
| `7196:11144` W · stos dwóch | **266** | 514 | `stos` 186 + nawigacja 80 |
| `7196:10932` S3 · brak połączenia | **213** | 567 | `stos` 133 (baner) + nawigacja 80 |
| `7196:11116` W · czas minął | **328** | 452 | `stos` 248 + nawigacja 80 |
| `7211:10893` W · pigułka ragù | **328** | 452 | `stos` 248 + nawigacja 80 |
| `7196:10912` S2, `7196:10955` S4 | **brak** | — | dialog + scrim zamiast dolnego pasa |

### 2.1 Pasek nawigacji — 80 px, niezmienny

```
Frame 360×80
├ Frame (cel dotyku „wstecz")  16,18  44×44
│ └ text „←"                   16,10  12×24
└ instance cta — cta           72,16  272×48
```

Hit-area „wstecz" = **44×44** `[V]` — spełnia wymóg 44 px bez dopychania.
Odstęp między nim a CTA: 72 − (16+44) = **12** px.

### 2.2 `stos` — pigułki minutników nad nawigacją

| element | wysokość |
|---|---|
| pigułka **zwinięta** (`pigułka — w toku` / `— ostatnia minuta`, instancje 328×40) | **40** |
| pigułka **rozwinięta**, wiersz + primary | **126** |
| pigułka **rozwinięta**, wiersz + podpowiedź + primary + rząd ghostów | **236** |
| odstęp między pigułkami | **8** |
| dopełnienie dolne `stos` (nad nawigacją) | **12** |

Wysokość pigułki rozwiniętej **nie jest stanem, tylko sumą bloków** — ten sam rytm
(padding 16, odstęp 12) co §2.3:

```
126 = 16 + 34 (wiersz) + 12 + 48 (primary) + 16
236 = 16 + 34 (wiersz) + 12 + 38 (podpowiedź) + 12 + 48 (primary) + 12 + 48 (ghosty) + 16
```
Zmierzone: `7195:11065` → 126 · `7211:10893` (minutnik BIEGNIE, 32:14) → 236 ·
`7196:11116` (0:00) → 236. **Czyli 236 nie należy do stanu „czas minął"** — to po prostu
pigułka z podpowiedzią i drugim rzędem przycisków; `7211:10893` ma ją przy biegnącym
minutniku. Wcześniejszy wniosek „236 = 0:00" był błędny i został tu poprawiony. `[V]`

Sprawdzenie na czterech układach:

| układ | Σ | `stos` | BOTTOM |
|---|---|---|---|
| 2 × zwinięta | 40 + 8 + 40 + 12 | **100** ✓ | 180 ✓ |
| 1 × rozwinięta (biegnie) | 126 + 12 | **138** ✓ | 218 ✓ |
| zwinięta + rozwinięta (biegnie) | 40 + 8 + 126 + 12 | **186** ✓ | 266 ✓ |
| 1 × rozwinięta (0:00) | 236 + 12 | **248** ✓ | 328 ✓ |

**Reguła składania `[I]`:**
```
BOTTOM = 80 (nawigacja)  +  [ Σ wysokości pigułek + 8×(n−1) + 12 ]   gdy n ≥ 1
BOTTOM = 80                                                          gdy n = 0
BOTTOM = 132                                                         start i zakończenie
                                                                     (bez nawigacji, dwa CTA)
gdzie wysokość pigułki ∈ { 40 zwinięta · 126 rozwinięta krótka · 236 rozwinięta pełna }
```

**To rozstrzyga C1 empirycznie: zmierzonych wysokości BOTTOM jest już SZEŚĆ**
(80 · 132 · 180 · 218 · 266 · 328), a pin wymienia cztery. Lista wartości nie da się
utrzymać — przy maks. 2 minutnikach × 3 stany pigułki kombinacji jest kilkanaście.
Rekomendacja do C1: **zapisać jako regułę składania, nie jako listę**. Decyzja operatora.

### 2.3 Pigułka rozwinięta — wnętrze (328×126)

```
Frame 328×126
├ row  16,16  296×34
│ ├ kropka                8×8, y=13 (środek pionowy wiersza)
│ ├ text nazwa           x=20, y=9,  w=168–169, h=16
│ ├ text czas            x=200/201, y=0, h=34   (`35:00` w=96, `7:58` w=67 — szerokość do treści)
│ └ text keyboard_arrow_down  x=280, y=6, 16×22   ← TYLKO w stosie dwóch
└ instance cta — primary  16,62  296×48
```

Rozjazd do sprawdzenia `[I]`: w `7195:11065` (pojedynczy minutnik) **nie ma** szewronu
`keyboard_arrow_down` w wierszu; w `7196:11144` (stos dwóch) jest. Kandydat na pozycję
matrycy: szewron zwijania pojawia się dopiero, gdy minutników jest więcej niż jeden. `[I]`

---

## 3. TOP — układ per typ klatki

### 3.1 `7195:10894` — 00 · start (nowe gotowanie)

```
TOP 360×780
├ Frame (zdjęcie)                 16,88   328×150
├ text tytuł przepisu             16,254  328×48
├ Frame „meta — czas · kcal · makro"  16,318  328×81
│ └ 3 × kolumna 88×57 przy x=16 / 120 / 224 (wewnątrz meta), y=12
│    ├ text ikona (glif Material) 28,0  32×32
│    └ Frame 26834  0,40  88×17 → text wartość 88×17
├ text „ile porcji?"              16,415  328×16
└ Frame „wiersz — selektor"       16,447  328×48
  └ Frame  68,0  192×48
    ├ Frame buttons „−"  4,4  40×40  (text 0,10 40×20)
    ├ text „porcje"     60,13  72×22
    └ Frame buttons „+" 148,4  40×40  (text 0,10 40×20)
```

Glify meta: `hourglass`, `local_dining`, `leaderboard` — 32×32, wyśrodkowane w kolumnie 88.
Wartości: „60 min", „417 kcal", „B24 W38 T10". `[V]`

**Selektor porcji:** blok 192 px wyśrodkowany w 328 (x=68 → 68+192+68 = 328 ✓).
Przyciski `−`/`+` mają **40×40**, nie 44 — cel dotyku poniżej progu 44 px. To jest
konflikt C8 w czystej postaci (ramka `buttons` 40 px), więc **nie wchodzi do matrycy**
— pozycja operatorska. `[V]`

### 3.2 `7195:10922` — 01 · krok ze składnikami

```
TOP 360×780
├ row  16,88  328×26
│ ├ text nazwa kroku       0,1   240×24
│ └ Frame (pigułka czasu)  240,0  88×26  → text „ok. 10 min"  12,3.5  64×19
├ text opis kroku          16,130  328×48
├ Frame (zdjęcie)          16,194  328×150
└ Frame · składniki        16,360  328×243
  ├ text „składniki"       0,0    328×16
  └ Frame                  0,24   328×219
    ├ text „w tym kroku"   16,16  296×16
    ├ 4 × instance „składnik — teraz”  16, y=44/75/106/137  296×19   (krok 31 px)
    ├ Frame (linia)        16,168  296×1
    └ row                  16,181  296×22
      ├ text „zobacz pozostałe”      0,1.5  280×19
      └ text keyboard_arrow_down   280,0   16×22
```

Pigułka czasu w nagłówku: wysokość **26**, padding poziomy **12**, szerokość do treści
(88 przy „ok. 10 min", 69 przy „35 min", 61 przy „9 min”). Nazwa kroku zajmuje resztę
wiersza (240 / 259 / 267 px) — czyli **czas jest przypięty do prawej, nazwa się kurczy**. `[V]`

Wiersz składnika: **19 px wysokości, 31 px skok** → odstęp 12 px. `[V]`
Etykieta „zobacz pozostałe" to placeholder — G7, microcopy z pipeline'u treści.

### 3.3 `7195:11065` — 06 · krok bez składników (sam minutnik)

TOP zawiera wyłącznie `row` (16,88), opis (16,130) i zdjęcie (16,194 328×150).
Brak bloku składników → cała mechanika listy jest **opcjonalna per krok**. `[V]`

---

### 3.4 `7195:11178` — 10 · zakończenie (wariant v1.0, bez mechaniki −70 zł)

```
TOP 360×780
├ text „gotowe, smacznego"      16,88   328×24
├ text tytuł przepisu           16,128  328×19
├ Frame (zdjęcie)               16,163  328×150
└ Frame (karta „pochwal się")   16,329  328×211
  ├ text nagłówek karty         16,16   296×24
  └ Frame 27193                 16,56   296×139
    ├ row 1  0,0    296×38   → numer 20×20 (text 0,2 20×14) + text 28,0 268×38
    ├ row 2  0,50   296×57   → numer 20×20 + text 28,0 268×57
    └ row 3  0,119  296×20   → numer 20×20 + text 28,0 268×19
```

Belka: etykieta „ugotowane", pasek postępu **188/188** (pełny). `[V]`
BOTTOM **132** — identyczny skład co ekran startowy: `cta — cta` 16,16 328×48
+ `cta — ghost` 16,76 328×48. Czyli **132 = ekran bez nawigacji, dwa CTA pełnej szerokości**. `[I]`

Odstęp między wierszami listy numerowanej: 12 px (38→50, 57→119 przy y=50). Numer
w kwadracie 20×20, tekst od x=28 (odstęp 8). `[V]`

### 3.5 `7196:11087` — W · ostatnia minuta (dwa minutniki zwinięte)

BOTTOM **180** = `stos` 100 + nawigacja 80. `stos` = pigułka zwinięta 40 + 8 + pigułka
zwinięta 40 + 12 = 100 ✓ — reguła §2.2 potwierdzona na drugim układzie. `[V]`
Instancje: `pigułka — w toku` (`7254:10913`) i `pigułka — ostatnia minuta` (`7254:10918`),
obie 328×40 → **stan pigułki nie zmienia jej wysokości w postaci zwiniętej**. `[V]`

W TOP tej klatki leży adnotacja projektanta (`7196:11110`, ramka 328×71):
„powyżej 60 s: brązowa kropka, statyczna. Ostatnie 60 s: kropka rośnie, robi się
pomarańczowa i pulsuje raz na sekundę — ramka minutnika też". To **tekst adnotacji,
nie element interfejsu** — nie renderować. `[V]`

### 3.6 `7196:11116` — W · czas minął (pigułka rozwinięta, stan 0:00)

BOTTOM **328** = `stos` 248 + nawigacja 80. Pigułka rozwinięta w tym stanie ma **236** px
(nie 126!) — bo dochodzi tekst podpowiedzi i drugi rząd przycisków:

```
Frame 328×236
├ row               16,16   296×34
│ ├ kropka          0,11    12×12          ← WIĘKSZA niż w stanie „w toku" (8×8)
│ ├ text nazwa      24,9    152×16
│ ├ text „0:00"     188,0   80×34
│ └ keyboard_arrow_down  280,6  16×22
├ text podpowiedzi  16,62   296×38
├ instance przycisk — primary  16,112  296×48
└ row               16,172  296×48
  ├ instance cta — ghost   0,0    140×48
  └ instance cta — ghost   156,0  140×48
```

Rytm wnętrza pigułki: **padding 16, odstęp między blokami 12** (16+34+12=62 ✓,
62+38+12=112 ✓, 112+48+12=172 ✓, 172+48+16=236 ✓). `[V]`
Dwa ghosty w rzędzie: 140 + 16 + 140 = 296 ✓. `[V]`

Kropka przesuwa się z x=0 rozmiar 8 (w toku) na x=0 rozmiar 12, a nazwa z x=20 na x=24
— **oś kropki zostaje w tym samym miejscu, rośnie promień**. `[I]`

### 3.7 `7221:10893` — LEGENDA · kropka minutnika (adnotacja, nie interfejs)

Klatka 360×**419** (jedyna niestandardowej wysokości). Nagłówek mówi „trzy stany",
a plik rysuje **CZTERY** ramki `stan`:

| # | warunek | kropka | opis w pliku |
|---|---|---|---|
| 1 | w toku · powyżej 60 s | **8×8** | statyczna, brązowa — tylko znacznik „coś chodzi" |
| 2 | ostatnia minuta · ≤ 60 s | **12×12** | większa, pomarańczowa, pulsuje **1×/s** — ramka minutnika też |
| 3 | ostatnie 10 s | **12×12** | ten sam kolor, puls przyspiesza do **2×/s** — eskalacja tempem, nie barwą |
| 4 | czas minął · 0:00 | **12×12** | pomarańczowa, statyczna — puls gaśnie, bo nic już nie leci |

**Rozjazd nazwy vs zawartości** (nagłówek „trzy stany" ÷ cztery narysowane stany) —
zawartość jest bogatsza od etykiety, więc pozycja informacyjna, nie blokująca. `[V]`
Adnotacja w `7196:11087` opisuje tylko stany 1–2; nie przeczy legendzie, jest jej
skrótem. Przy konflikcie wygrywa LEGENDA (pełniejsza). `[I]`

Wysokości ramek `stan`: 64 (stan 1, opis jednoliniowy) i 80 (stany 2–4, opis dwuliniowy);
skok y: 51 → 131 → 227 → 323 (odstęp 16 przy stanie 64, 16 przy 80). `[V]`

### 3.8 `7196:10982` — W · krok 3, pełna lista (klatka kanoniczna listy)

```
TOP 360×780
├ row  16,88  328×26   („zarumień mięso" 246×24 + pigułka „ok. 8 min" 82×26)
└ Frame (lista)  16,130  328×465
  ├ text „w tym kroku"          16,16   296×16
  ├ instance składnik — teraz   16,40   296×19
  ├ Frame (linia)               16,67   296×1
  ├ text „dalej"                16,76   296×16
  ├ 7 × instance składnik — dalej   16, y=100…262, skok 27
  ├ Frame (linia)               16,289  296×1
  ├ text „zużyte"               16,298  296×16
  └ 5 × instance składnik — zużyty  16, y=322…430, skok 27
```

**Trzy nazwy instancji, dwa stany wizualne.** Plik ma `składnik — teraz`,
`składnik — dalej` i `składnik — zużyty`, ale decyzja operatorska (INTERAKCJE v1.4)
mówi: `dalej` **nie dostaje delty wizualnej** — rozdziela nagłówek, linia i kolejność.
Runtime buduje **dwa** stany wiersza. Naiwny odczyt Figmy zbudowałby trzy — to jest
dokładnie ten rodzaj pułapki, przed którym ostrzega hierarchia prawdy. `[U]`

**Rozjazd skoku wiersza `[V]`:** lista pełna ma skok **27** px (19 + 8), lista skrócona
w `7195:10922` — **31** px (19 + 12). Ta sama instancja `składnik — teraz`, inny odstęp.
Kandydat na pozycję matrycy: który odstęp jest kanoniczny. Rekomendacja `[I]`: **27**,
bo pełna lista jest klatką kanoniczną (decyzja operatora 2026-08-14).

**BOTTOM 108 tej klatki jest ARTEFAKTEM, nie wymiarem.** W slocie `stos` leży tekst
adnotacji „↕ treść przewija się w całości" (`7196:11031`, 328×16, ramka `stos` 28 px).
To notatka projektanta, nie element interfejsu — **nie renderować i nie wliczać
do reguły §2.2**. Realny BOTTOM tej klatki to 80 (sama nawigacja). `[I]`

### 3.9 `7211:10893` — W · krok 7, pigułka rozwinięta przy biegnącym minutniku

```
BOTTOM 328 = stos 248 (pigułka 236 + 12) + nawigacja 80
minutnik ragù — rozwinięty  328×236
├ row  16,16  296×34
│ ├ kropka 0,13  8×8        ← MAŁA: minutnik biegnie (32:14 > 60 s)
│ ├ text „duś ragù"  20,9  156×16
│ ├ text „32:14"     188,0  80×34
│ └ keyboard_arrow_down  280,6  16×22
├ text podpowiedzi   16,62   296×38
├ instance przycisk — primary  16,112  296×48
└ instance cta — ghost         16,172  296×48   ← JEDEN ghost pełnej szerokości
```

Różnica wobec `7196:11116` (0:00): tam w tym samym miejscu są **dwa** ghosty po 140 px.
Czyli: liczba przycisków zależy od stanu minutnika, wysokość pigułki — nie. `[V]`

**Pigułka czasu „bez minutnika"** w nagłówku: 104×26, tekst 80×**16** przy y=**5**
(inne metryki niż „ok. 8 min": 58×**19** przy y=**3.5**). Etykieta bez minutnika używa
mniejszego stopnia pisma. Kandydat na pozycję matrycy. `[V]`

**Szewron „zobacz pozostałe" niespójny między klatkami `[V]`:** tutaj to tekst `⌄`
8×19, w `7195:10922` glif Material `keyboard_arrow_down` 16×22. Rekomendacja `[I]`:
kanonem glif Material (spójny z szewronem pigułki minutnika, ta sama metryka 16×22).

**Pasek przewijania — jedyne miejsce, gdzie plik go rysuje:** `scroll rail`
`7243:10902` przy x=**353**, y=8, **3×437**, wewnątrz `thumb` 3×408. Czyli tor 3 px
szerokości, 4 px od prawej krawędzi (353+3 = 356). Wysokość toru jest lokalna dla tej
klatki i nie wynika z żadnej reguły — **NIENARYSOWANE** w sensie G-luki: runtime
używa natywnego przewijania, a ten prostokąt to ilustracja. `[I]`

### 3.10 `7196:11059` — W · krok 4, minutnik rozwinięty w trakcie (1:24)

BOTTOM **328** = `stos` 248 + nawigacja 80. Pigułka rozwinięta **236**, podpowiedź 38,
JEDEN ghost pełnej szerokości — układ identyczny z `7211:10893`. Kropka **8×8** przy
y=13 (1:24 > 60 s) ✓ zgodnie z legendą. Pasek postępu: krok 4 → **84** =
round(4/9 × 188) = 83.6 ✓. `[V]`

**OBALONE `[V]`:** wniosek z §2.3, że szewron `keyboard_arrow_down` w wierszu pigułki
pojawia się dopiero przy więcej niż jednym minutniku. Ta klatka ma **jeden** minutnik
w `stos` i szewron JEST (`7304:11150`, 280,6 16×22). Korelacja jest inna: szewron
towarzyszy pigułce **rozwiniętej pełnej** (236/255 — z podpowiedzią), a nie ma go
w pigułce rozwiniętej krótkiej (126, `7195:11065`). Liczba minutników nie ma z tym
związku. Do matrycy wchodzi wersja poprawiona.

**Czas jest prawo-przypięty do x=268 `[V]`**, nie wyśrodkowany i nie o stałej szerokości:
„1:24" x=208 w=60 → 268 · „0:00" x=188 w=80 → 268 · „32:14" x=188 w=80 → 268.
268 = 296 − 28, czyli koniec czasu 12 px przed szewronem (280). Reguła, nie lista. `[I]`

### 3.11 `7240:10900` — S5 · minutnik skończył się przy wygaszonym ekranie

**ÓSMA wysokość BOTTOM: 347** (y=433) = `stos` 267 + nawigacja 80.
Pigułka rozwinięta ma tu **255**, nie 236 — bo podpowiedź jest trzywierszowa (57), nie
dwuwierszowa (38).

```
Frame 328×255                       (rytm: padding 16, odstęp 12)
├ row  16,16  296×34
│ ├ kropka 0,11  12×12            ← duża, stan 0:00
│ ├ text „duś ragù"  24,9  152×16
│ ├ text „0:00"      188,0  80×34
│ └ text keyboard_arrow_UP  280,6  16×22     ← ROZJAZD, patrz niżej
├ text podpowiedzi  16,62   296×57
├ instance przycisk — primary  16,131  296×48
└ row  16,191  296×48  → 2 × cta — ghost (0,0 i 156,0 po 140)
```
16+34=50 →62 ✓ · 62+57=119 →131 ✓ · 131+48=179 →191 ✓ · 191+48=239 +16 = **255** ✓

**To domyka C1 ostatecznie: 236 NIE jest wartością pigułki, tylko wynikiem.**
Wzór pigułki rozwiniętej pełnej: `198 + wysokość podpowiedzi` (38 → 236 ✓, 57 → 255 ✓).
Wysokość podpowiedzi zależy od długości microcopy, więc **żadna lista wysokości BOTTOM
nie jest domykalna z definicji** — nie chodzi już o kilkanaście kombinacji, tylko
o tekst, który dopiero powstanie w pipelinie treści. Rekomendacja do C1 z przebiegu 1
zostaje wzmocniona: **reguła składania, lista jest niewykonalna**. `[V]`

Reguła §2.2 sprawdzona po raz piąty: 255 + 12 = 267 = `stos` ✓ · 267 + 80 = 347 ✓.

**Rozjazd szewronu `[V]`:** tu `keyboard_arrow_up`, w `7196:11116` (ten sam stan 0:00,
pigułka też rozwinięta) — `keyboard_arrow_down`. Ta sama metryka 16×22, przeciwny kierunek.
Kandydat na pozycję matrycy; rekomendacja `[I]`: **`up` przy rozwiniętej, `down` przy
zwiniętej** — szewron pokazuje kierunek akcji, a klatki z `down` przy rozwiniętej
(`7196:11059`, `7196:11116`, `7211:10893`, `7196:11144`) to wtedy dryf w trzech miejscach.
Odwrotna lektura (kanonem `down`, bo 4:1) też jest broniona. **Do rozstrzygnięcia przez
operatora — nie zgadywać w kodzie.**

Nawigacja: instancja nazwana `buttons_2` (`7240:10934`) zamiast `cta — cta`, wymiary
identyczne 272×48 przy 72,16. Rozjazd nazewnictwa w bibliotece, nie geometrii —
pozycja informacyjna. `[V]`
Pasek postępu: krok 8 → 167 = round(8/9 × 188) ✓.

### 3.12 `7240:10936` — W · krok bez zdjęcia (przepis od influencera)

Klatka projektowana pod pozyskiwanie przepisów od twórców. **Nie ma ramki zdjęcia
w ogóle** — blok składników wchodzi na jej miejsce (y=194):

```
TOP 360×780
├ row  16,88   328×26      („wlej passatę" 246×24 + pigułka „ok. 3 min" 82×26)
├ text opis    16,130  328×48
├ Frame · składniki  16,194  328×209        ← tam, gdzie w innych klatkach zdjęcie
└ text adnotacji projektanta  16,419  328×48   ← NIE renderować
```

**To dowodzi, że TOP jest przepływem pionowym, nie siatką o stałych y `[V]`:**
row kończy się na 114 → opis 130 (odstęp 16) · opis kończy 178 → następny blok 194
(odstęp 16). Zdjęcie nie jest „pustym slotem" przy braku — znika, a reszta wjeżdża
w górę. Runtime: `flow` z `gap: 16`, nie pozycje bezwzględne.

Lista skrócona: 3 × `składnik — teraz` przy y=44/75/106 — **skok 31** (19 + 12), linia
16,137, wiersz „zobacz pozostałe" 16,150. Rytm 12 px zachowany po obu stronach linii. `[V]`
BOTTOM **80**. Pasek postępu: krok 5 → 104 = round(5/9 × 188) = 104.4 ✓.

**Materiał do dwóch otwartych pozycji z przebiegu 1:**
1. *Skok wiersza 27 czy 31.* Rozkład przestał być 1:1. Skok **31** mają OBIE listy
   skrócone (`7195:10922`, `7240:10936`), skok **27** — jedyna lista pełna
   (`7196:10982`). To nie jest dryf jednej klatki, tylko **systematyczna różnica między
   listą skróconą a pełną**. Rekomendacja zmieniona `[I]`: nie „27 wszędzie", tylko
   **31 w skróconej / 27 w pełnej** albo świadome ujednolicenie — decyzja operatora,
   bo obie odczytane wartości są teraz poparte, nie przypadkowe.
2. *Szewron „zobacz pozostałe".* Tu tekst `⌄` 8×19 (jak `7211:10893`), więc rozkład
   wynosi **2:1 na korzyść tekstowego `⌄`**, przeciw glifowi Material w `7195:10922`.
   Rekomendacja z przebiegu 1 (glif Material, dla spójności z szewronem pigułki)
   zostaje, ale jest teraz rekomendacją **wbrew większości w pliku** — operator musi
   to wiedzieć, zanim ją zatwierdzi. Etykieta ma tu 288 px szerokości wobec 280
   w `7195:10922`, co jest konsekwencją węższego szewronu (8 vs 16). `[V]`

### 3.13 `7229:10893` — SPEC · marker na słowie (nie pigułka)

Klatka specyfikacyjna, nie ekran. W TOP leży prostokąt `marker — cel koloru`
(`7231:10894`) przy **15,155**, **66×23**, nałożony na frazę „Wołowinę Mieloną"
w opisie kroku. Obok adnotacja projektanta (`7233:10895`), cytat:

> „Wdrożenie: `<mark>` z tłem i `box-decoration-break: clone`. Zakreślenie jedzie ze
> słowem i łamie się razem z wierszem. **Prostokąt w Figmie jest atrapą** — stoi na
> policzonej pozycji i zjedzie przy zmianie copy."

**Konsekwencja dla jednostki 4 `[V]`: z tego prostokąta NIE wolno czytać geometrii.**
To jedyna klatka w zestawie, o której plik sam mówi, że kłamie. Wymiar 66×23 opisuje
akurat tę frazę przy akurat tym copy. Do runtime idzie zachowanie (`<mark>`,
`box-decoration-break: clone`), nie liczby.

Co jednak z niej wynika `[I]`: marker zaczyna się na **x=15**, czyli 1 px na lewo od
kolumny treści (16) — zakreślenie ma poziomy wyciek ~1 px poza literę. Wysokość 23 przy
interlinii opisu 24 (48 px na dwa wiersze) ⇒ tło zajmuje praktycznie pełną interlinię,
nie tylko wysokość liter.

Marker pada na **nazwę składnika zapisaną wielką literą** („Wołowinę Mieloną") — spina
się z jednostką 3 (`#klucz` w `co-mozesz-zmienic`): zakreślany jest byt, który ma
odpowiednik w liście składników.

Reszta klatki bez niespodzianek: lista skrócona (1 składnik, linia 16,75, wiersz
16,88 z glifem Material 16×22), BOTTOM **80**, pasek postępu krok 3 → **63** =
round(3/9 × 188) = 62.7 ✓. `[V]`

### 3.14 `7457:12530` + `7468:103095` — TEST C i TEST E · zamiennik i tooltip

Para klatek: **ten sam ekran przed tapnięciem (C) i po tapnięciu (E)**. Różnią się
wyłącznie obecnością tooltipa — cała reszta drzewa jest identyczna co do piksela.
Obie: opis **96** px (4 wiersze), **brak zdjęcia**, `Frame · składniki` przy y=242
(130 + 96 = 226, +16 ✓), BOTTOM **80**, krok 5 → 104 ✓.

**Wiersz z zamiennikiem** (`7472:12561` / `7473:12561`), 296×**20** przy y=106:

```
wiersz z zamiennikiem  296×20
├ instance składnik — teraz   0,0.5   174×19    ← szerokość DO TREŚCI, nie 296
└ Frame „info"              182,0     20×20
  └ text „i"                  8,1.5    4×17
```
Odstęp tekst → kółko: 182 − 174 = **8**. Wiersz ma 20 px (nie 19), bo kółko `i` jest
o 1 px wyższe od tekstu; składnik jest w nim wyśrodkowany pionowo (y=0.5). `[V]`
Skok listy skróconej znów **31** (44 / 75 / 106), linia 16,138, wiersz „zobacz
pozostałe" 16,151 — rytm 12 po obu stronach linii ✓.

**Kółko `i` ma 20×20 — poniżej progu 44 px.** Jednostka 4 wymaga celu dotyku 44;
plik go nie rysuje. To luka typu G (NIENARYSOWANE): runtime dopycha obszar dotyku
do 44×44 wokół 20-pikselowego znacznika, nie powiększając samego kółka. `[I]`

**Tooltip** (`7468:103138`) — potwierdza pin 296 px z inwentarza:

```
tooltip — zamiennik   x=32  y=400   296×89     (padding 14 poz. / 12 pion., odstęp 8)
├ Frame „pytanie + zamknij"  14,12  268×19
│ ├ text pytanie             0,0    244×19
│ └ text zamknij           252,0     16×19      ← GLIF 16 px, nie cel 44
└ text wyjaśnienie          14,39   268×38
```
12+19=31 → 39 ✓ · 39+38=77 +12 = **89** ✓ · 268 = 296 − 2×14 ✓ · 252+16 = 268 ✓ `[V]`

Trzy rzeczy, których pin nie mówił, a plik pokazuje `[V]`:

1. **x=32, nie 16.** Tooltip jest wsunięty o dodatkowe 16 px względem kolumny treści
   (32 + 296 + 32 = 360 ✓, symetrycznie). Nie jest pełną szerokością karty.
2. **Kotwiczy się 8 px pod wierszem, który go wywołał.** Wiersz z zamiennikiem leży
   bezwzględnie na 242 + 24 + 106 = 372 i kończy się na 392; tooltip zaczyna na 400.
3. **Nie ma scrima.** W przeciwieństwie do dialogów S2/S4 (§3b.1) klatka nie zawiera
   ramki `przyciemnienie` — to popover, nie modal. Zgadza się z wymogiem „tooltip nie
   minimalizuje minutników": nic pod nim nie jest wygaszane ani zwijane.

**`×` ma 16×19 — druga luka celu dotyku w tej samej klatce.** Uwaga wdrożeniowa `[I]`:
cel 44×44 nie mieści się w 89-pikselowym tooltipie z dopełnieniem 12, więc obszar
dotyku musi być powiększony niewidocznie (np. `::before` z ujemnym `inset`), a nie
przez rozepchnięcie pudełka. Inaczej geometria tooltipa przestanie się zgadzać.

**Marker ma zatem DWIE powierzchnie, nie dwa warianty tego samego `[V]`:**
zakreślenie `<mark>` na słowie w opisie kroku (SPEC, §3.13) **oraz** kółko `i` przy
wierszu na liście składników (TEST C/E). Inwentarz poz. 4 („kropkowane podkreślenie
+ kółko `i`") opisuje obie naraz — nie są alternatywą do wyboru.

### 3.15 Kroki kontrolne — `7195:10953` (02)

Czytane, żeby potwierdzić brak wyjątków. Krok 02: opis **72** px (3 wiersze) →
zdjęcie 16,**218** (130 + 72 = 202, +16 ✓) → składniki 16,**384** (218 + 150 = 368,
+16 ✓). Lista skrócona 1-elementowa, glif Material. BOTTOM **80**.
Pasek postępu krok 2 → **42** = round(2/9 × 188) = 41.8 ✓. `[V]`

**Reguła przepływu TOP potwierdzona po raz czwarty i ostatecznie `[V]`.** Wysokość
opisu przyjmuje w zestawie 48 / 72 / 96 px (2 / 3 / 4 wiersze po 24) i za każdym razem
wszystko pod nim przesuwa się o różnicę, przy stałym odstępie **16**. W poprzednim
przebiegu pozycje TOP zapisano jako liczby bezwzględne (y=130, y=194, y=360) — to były
wartości akurat dla dwuwierszowego opisu. **Kanonem jest przepływ, nie te liczby:**

```
TOP:  padding-top 88  ·  gap 16  ·  kolumna 328 przy x=16
      row (26) → opis (48/72/96 = 24 × liczba wierszy) → [zdjęcie 150] → [składniki] → [adnotacje]
```
Zdjęcie i blok składników są **niezależnie opcjonalne**: `7195:11065` ma zdjęcie bez
składników, `7240:10936` i TEST C/E — składniki bez zdjęcia.

### 3.16 Kroki kontrolne 03–05, 07–09 — domknięcie odczytu

| klatka | opis | zdjęcie | BOTTOM | pasek | uwaga |
|---|---|---|---|---|---|
| 03 `7195:10978` | 48 | 16,194 | 80 | 63 | **atrapa markera także tutaj** |
| 04 `7195:11006` | 48 | 16,194 | **218** | 84 | pigułka rozwinięta krótka 126 |
| 05 `7195:11036` | 48 | 16,194 | 80 | 104 | lista skrócona 3 pozycje, skok 31 |
| 07 `7195:11088` | 72 | 16,218 | **132** | 146 | pigułka zwinięta + nawigacja |
| 08 `7195:11118` | 48 | 16,194 | **266** | 167 | zwinięta + rozwinięta krótka |
| 09 `7195:11153` | 48 | 16,194 | 80 | **188** | pasek pełny (9 z 9) |

**Reguła paska postępu domknięta na pełnym zestawie `[V]`.** Zmierzone wypełnienia dla
kroków 1–9: 21 · 42 · 63 · 84 · 104 · 125 · 146 · 167 · 188 — co do jednego zgodne
z `round(n/9 × 188)`. Ekran startowy 8 (kikut), ekran zakończenia 188 (pełny).
Reguła jest potwierdzona na wszystkich dziewięciu krokach i na drugim torze (296,
karta wznowienia §3b.0), więc przestaje być wnioskiem.

**132 ma DWA różne składy `[V]`** — i to jest najmocniejszy argument w C1:

| klatka | skład 132 |
|---|---|
| `7195:10894` start, `7195:11178` zakończenie, `7196:10893` S1 | 2 × CTA pełnej szerokości, **bez nawigacji** |
| `7195:11088` krok 07 | `stos` 52 (pigułka zwinięta 40 + 12) + **nawigacja 80** |

Ta sama liczba, inna struktura i inne zachowanie. Pin wymieniający wysokości nie odróżni
tych dwóch przypadków; reguła składania odróżnia je bez wysiłku. `[I]`

**Czas w pigułce jest prawo-przypięty, a szewron odbiera mu 28 px `[V]`:**

| klatka | szewron | czas | prawa krawędź |
|---|---|---|---|
| 04 `7195:11006` „2:00" | nie | x=221 w=75 | **296** |
| 08 `7195:11118` „9:00" | nie | x=219 w=77 | **296** |
| `7196:11059` „1:24" | tak | x=208 w=60 | **268** |
| `7196:11116` „0:00" | tak | x=188 w=80 | **268** |
| `7211:10893` „32:14" | tak | x=188 w=80 | **268** |

296 = pełna szerokość treści pigułki; 268 = 296 − 16 (szewron) − 12 (odstęp).
Nazwa minutnika rozciąga się na resztę wiersza (189 / 187 bez szewronu, 176 / 152 z nim).
To wyjaśnia rozjazd odnotowany w §2.3 w przebiegu 1 („x=200/201, w=96 albo 67") —
nie było rozjazdu, była dwuwariantowość szewronu. Poprawione. `[V]`

**Hipoteza o szewronie ostatecznie obalona `[V]`.** Klatka 08 ma **dwa** minutniki
w `stos`, a pigułka rozwinięta krótka NIE ma szewronu. Korelacja z liczbą minutników
nie istnieje w żadną stronę. Ostateczna reguła: **szewron ↔ pigułka rozwinięta pełna**
(ta z podpowiedzią i rzędem ghostów, 236/255). Pigułka krótka (126) go nie ma.

**Atrapa markera stoi też w klatce produkcyjnej `[V]`:** `7195:10978` (krok 03) zawiera
`marker — cel koloru` przy **16,155 67×23**, podczas gdy SPEC `7229:10893` — przy
**15,155 66×23**. Ten sam krok, to samo copy, prostokąt inny o 1 px. Adnotacja
z §3.13 („zjedzie przy zmianie copy") sprawdza się nawet bez zmiany copy. Potwierdza,
że atrapę trzeba pominąć w obu klatkach, nie tylko w SPEC.

**Etykieta „bez minutnika" — powtórzony pomiar `[V]`:** pigułka 104×26, tekst 80×**16**
przy y=**5**, identycznie jak w `7211:10893`. Wobec „ok. 8 min" (58×**19** przy y=**3.5**)
różnica jest więc **systematyczna, nie dryfem jednej klatki** — dwa niezależne wystąpienia
zgadzają się co do piksela. Pozycja dla operatora przestaje brzmieć „zamierzone czy
dryf?" i brzmi „zamierzone — zostawić czy ujednolicić?".

**Bilans szewronu „zobacz pozostałe" po tym przebiegu:** glif Material 16×22 —
`7195:10922`, `7229:10893`, `7195:10953`, `7195:10978`, `7195:11006`, `7195:11036`,
`7195:11088`, `7195:11118`, `7195:11153`, TEST C, TEST E (11); tekst `⌄` 8×19 —
`7211:10893`, `7240:10936` (2). Rekomendacja z przebiegu 1 (glif Material) ma
**większość 11:2** — pozycja praktycznie rozstrzygnięta, zostaje formalne potwierdzenie. `[V]`

Skok wiersza listy skróconej: **31** w każdej klatce, w której da się go zmierzyć
(`7195:10922`, `7195:11036`, `7240:10936`, TEST C, TEST E). Skok **27** — wyłącznie
w liście pełnej `7196:10982`. Rozkład 5:1 potwierdza diagnozę z §3.12: to różnica
**skrócona ÷ pełna**, nie dryf. `[V]`

---

## 3b. Klatki stanów S — dialogi i baner offline

### 3b.1 Dialog modalny (S2 `7196:10912`, S4 `7196:10955`)

Oba mają ten sam szkielet: `belka` + `TOP` (bez BOTTOM!) + `przyciemnienie` 360×780
(pełnoekranowy scrim) + `dialog` 328 px szerokości przy x=16.

```
dialog  328 × H     padding 24, odstęp między blokami 12
├ text tytuł        24,24   280×22
├ text treść        24,58   280×57
├ [bloki zależne od dialogu]
└ ostatni element kończy się 24 px nad dolną krawędzią
```

| klatka | H | y | skład po treści |
|---|---|---|---|
| S2 wyjście | **280** | 258 | `cta — cta` 280×48 + text-link „wyjdź mimo to" 280×19 |
| S4 trzeci minutnik | **311** | 235 | 2 × wiersz minutnika 280×44 + `cta — cta` 280×48 |

Sprawdzenie rytmu S4: 24+22=46 → 58 ✓ · 58+57=115 → 127 ✓ · 127+44=171 → 183 ✓ ·
183+44=227 → 239 ✓ · 239+48=287 +24 = **311** ✓. `[V]`

**Rozjazd pozycji pionowej `[V]`:** S4 jest wyśrodkowany ((780−311)/2 = 234.5 ≈ y=235),
S2 **nie** ((780−280)/2 = 250, a leży na y=258 — 8 px poniżej środka).
Rekomendacja `[I]`: wyśrodkować oba; 8 px to dryf, nie zamiar.

Wiersz minutnika w dialogu S4 (280×44): nazwa x=16 y=12.5 h=19 · czas x=171/178 y=15
h=**14** (mniejszy stopień) · „zakończ" x=**218** y=14 46×16 (przypięte, 218+46+16=280 ✓).

**BRAK BOTTOM w klatkach dialogowych** — dialog i scrim zastępują dolny pas.
Runtime: przy otwartym dialogu BOTTOM zostaje pod scrimem, nie znika z DOM. `[I]`

### 3b.0 `7196:10893` — S1 · powrót do przerwanego gotowania

Ekran „wznów" jest wariantem ekranu startowego: zdjęcie 16,88 328×150 · tytuł 16,254
328×48 · karta stanu 16,318 **328×157** · BOTTOM **132** (dwa CTA pełnej szerokości,
identycznie jak `7195:10894` i `7195:11178`). `[V]`

```
karta stanu 328×157        padding 16, odstęp 8 (!)
├ text „przerwane 12 minut temu · na 4 porcje"  16,16  296×16
├ text „krok 6 z 9 — duś ragù"                  16,40  296×22
├ progress_bar                                  16,70  296×6  (wypełnienie 197)
└ text o minutniku i składnikach                16,84  296×57
```
16+16=32 → 40 · 40+22=62 → 70 · 70+6=76 → 84 · 84+57=141 +16 = **157** ✓

**Rozjazd rytmu `[V]`:** ta karta ma odstęp **8**, a pigułka minutnika i baner offline
— **12**. Kandydat na pozycję matrycy; rekomendacja `[I]`: zostawić 8, bo to lista
metadanych, nie stos akcji.

**Potwierdzenie reguły paska postępu na drugim torze:** tor 296, wypełnienie 197,
krok 6 z 9 → round(6/9 × 296) = 197 ✓. Reguła `round(n/9 × szerokość)` działa
niezależnie od szerokości toru. `[V]`

### 3b.2 `7196:10932` — S3 · brak połączenia (baner w slocie `stos`)

BOTTOM **213** = `stos` 133 + nawigacja 80. `stos` = karta 121 + 12 (to samo dopełnienie
dolne co przy pigułkach) ✓.

```
karta 328×121      padding 16, odstęp 12
├ text komunikatu   16,16  296×57
└ row               16,85  296×20
  ├ Frame „refresh" 0,0   20×20     ← glif odświeżania
  └ text „sprawdź ponownie"  28,0.5  268×19
```
16+57+12+20+16 = 121 ✓ `[V]`

**To uogólnia regułę §2.2:** `stos` nie jest slotem minutników, tylko slotem **kafli**
— pigułka minutnika i baner offline dzielą ten sam kontener, ten sam odstęp 8 px
i to samo dopełnienie dolne 12 px. Siódma zmierzona wysokość BOTTOM (213) jest
wynikiem tej samej reguły, nie wyjątkiem. `[I]`

---

## 4. Stan odczytu

**Odczyt geometrii ZAMKNIĘTY: 27 z 27 klatek** (przebieg 1 — 14, przebieg 2 — 13).

`7195:10894` · `7195:10922` · `7195:10953` · `7195:10978` · `7195:11006` · `7195:11036` ·
`7195:11065` · `7195:11088` · `7195:11118` · `7195:11153` · `7195:11178` · `7196:10893` ·
`7196:10912` · `7196:10932` · `7196:10955` · `7196:10982` · `7196:11059` · `7196:11087` ·
`7196:11116` · `7196:11144` · `7211:10893` · `7221:10893` · `7229:10893` · `7240:10900` ·
`7240:10936` · `7457:12530` · `7468:103095`.
Klatki pominięte zgodnie z ustaleniem: `7266:10720` (duplikat), `7448:128443` (poza v1.0).

**Osiem zmierzonych wysokości BOTTOM:** 80 · 132 (dwa różne składy!) · 180 · 213 · 218 ·
266 · 328 · 347, plus wariant „bez BOTTOM" (dialogi S2/S4).
**Trzy wysokości pigułki rozwiniętej:** 126 (krótka) · 236 · 255 — dwie ostatnie to
`198 + wysokość podpowiedzi`, więc zbiór jest otwarty.

### 4.1 Reguły wyprowadzone z pełnego zestawu (wejście do MATRYCY)

| # | reguła | provenance |
|---|---|---|
| R1 | `TOP` = przepływ pionowy: padding-top 88, gap 16, kolumna 328 @ x=16 | `[V]` 4 klatki |
| R2 | opis kroku = 24 px × liczba wierszy (48 / 72 / 96 zmierzone) | `[V]` |
| R3 | zdjęcie 328×150 — **opcjonalne**; blok składników — **opcjonalny**; niezależnie | `[V]` |
| R4 | `belka` 72 px, niezmienna we wszystkich 27 klatkach | `[V]` |
| R5 | pasek postępu = `round(n/9 × szerokość toru)`; start 8, koniec pełny | `[V]` 9/9 kroków |
| R6 | `BOTTOM` = 80 + [Σ kafli + 8×(n−1) + 12] · albo 132 dla ekranów dwu-CTA | `[V]` 8 wartości |
| R7 | kafel `stos` ∈ { pigułka zwinięta 40 · rozwinięta krótka 126 · rozwinięta pełna 198+H · baner offline 121 } | `[V]` |
| R8 | wnętrze pigułki i banera: padding 16, odstęp między blokami 12 | `[V]` |
| R9 | czas w pigułce prawo-przypięty do 296; szewron odbiera 28 → 268 | `[V]` 5 klatek · **od D-40.1 obowiązuje też w formie `zwinieta`** — zmierzony skutek: prawa krawędź odliczania 358 → 330 px przy pigułce 358×40, wysokość bez zmian |
| R10 | ~~szewron w pigułce ↔ pigułka rozwinięta **pełna**~~ — **ZDJĘTE 2026-08-20 (D-40.1)**: szewron jest w **każdej** formie, kierunek robi obrót (I-36). Pomiar klatek stoi i nie jest podważony — opisywał projekt bez obrotu. Zależność od liczby minutników pozostaje **obalona** | `[V]` → `[U]` operator |
| R11 | kropka minutnika: 8×8 (> 60 s) → 12×12 (≤ 60 s i 0:00), oś bez zmian | `[V]` |
| R12 | tooltip 296×(zależne), x=32, padding 14/12, odstęp 8, kotwica 8 px pod wierszem | `[V]` |
| R13 | cel dotyku „wstecz" 44×44 spełniony; kółko `i` 20 i `×` tooltipa 16 — **nie** | `[V]` → G-luka |
| R14 | marker = `<mark>` + `box-decoration-break: clone`; prostokąty w Figmie to atrapy | `[U]` adnotacja |
| R15 | lista skrócona: skok 31 · lista pełna: skok 27 (rozkład 5:1) | `[V]` — do decyzji |

**Czego ten plik NIE zawiera:** kolorów, promieni, cieni, krojów i stopni pisma.
`get_metadata` ich nie zwraca. Do matrycy wizualnej trzeba `get_design_context`
albo `get_screenshot` — osobna jednostka, po domknięciu geometrii. `[V]`
Klatki pomijane: `7266:10720` (duplikat), `7448:128443` (poza v1.0).
