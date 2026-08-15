# Change request — wejście `data-mp-foto-glowne` w kontrakcie embedu (§6)

**Data:** 2026-08-15 · **Źródło:** rozstrzygnięcie operatora **D-23.1**
**Adresat:** łańcuch `przepis-webflow-sukcesor` + operator (pin B1 — interfejsu embedu
nie poprawia jednostronnie żaden łańcuch)
**Autor:** łańcuch `tryb-gotowania-embed`, przebieg 31. **Ten łańcuch niczego z poniższych
nie wykonuje w szablonie ani w instrukcji** — wykonał wyłącznie własną stronę: parser,
runtime, harness, matrycę.

## Problem, zmierzony a nie założony

Runtime miał funkcję `zdjecieEkranu()`, klasę `.mp-tryb__foto` i poprawną wysokość 150 px
od pierwszej wersji. Czytał jednak `stan.widok.fotoUrl`, a `fotoUrl` było polem **KROKU** —
ustawianym przez `podepnijZdjecia()`, które dopasowuje `foto:` kroku do galerii
`[data-mp-foto-kroku]`. Widok przepisu takiego pola nie miał i nigdy nie miał, więc funkcja
zwracała `null` przy każdym wejściu.

**Skutek: zdjęcie przepisu nie renderowało się NIGDY** — ani na ekranie startowym
(`7195:10901`, kolumna × 150 @ y88), ani na ekranie zakończenia (`7195:11188`, @ y163).
Trzeci skutek, którego matryca początkowo nie widziała: **tytuł ekranu startowego stał
na y88 zamiast y254**, czyli o 166 px za wysoko — dokładnie o wysokość brakującego
zdjęcia plus odstęp.

To ta sama klasa usterki co brak `#mp-wartosci-porcja` z CR-u `wartosci-porcja`: **kod
pyta o pole, którego szablon nie podaje, a wynik wygląda na decyzję projektową, nie na brak.**

## Rozstrzygnięcie operatora (D-23.1)

Zdjęcie pochodzi z pola **`zdjecie-glowne`** kolekcji `przepisy` (typ Image,
id `93ac881e…`, pole potwierdzone w CMS [V]). **To samo zdjęcie na ekranie startowym
i na ekranie zakończenia** — jedno pole, jedno wejście, nie dwa źródła.

## O co prosimy w `instrukcja-pisania-przepisow.md` §6

Dopisać do kontraktu DOM jedną linię:

```html
<!-- zdjęcie główne przepisu, pole `zdjecie-glowne` (Image) — D-23.1 -->
<img data-mp-foto-glowne src="{{zdjecie-glowne}}">
```

Wiązanie należy do szablonu `przepisy Template` (`pageId 6a574b13929618407b161667`).

### Dlaczego OSOBNE wejście, a nie galeria `data-mp-foto-kroku`

Galeria jest polem MultiImage `zdjecia-krokow` i wiąże się z KROKIEM: parser dopasowuje
do niej wartość `foto:` z danego kroku po fragmencie nazwy pliku. Zdjęcie przepisu nie
jest zdjęciem żadnego kroku i nie da się go tam wsadzić bez zepsucia dopasowania —
pierwszy krok „przygotuj warzywa" nie jest daniem, a rysunek pokazuje danie.

### Element może być WIDOCZNY i tak ma być

W harnessie `<img data-mp-foto-glowne>` stoi w widocznej treści strony, nie w ukrytym
bloku. Jest to zgodne z matrycą **A8** (treść czytelna bez JS) i z tym, jak strona
przepisu i tak prezentuje zdjęcie. Runtime nie wymaga ukrycia i niczego z tym elementem
nie robi poza odczytaniem adresu.

## Zachowanie przy pustym polu — proszę NIE „poprawiać"

Parser czyta **ATRYBUT `src`**, a nie własność `img.src`. Powód jest mierzalny: dla
pustego pola Image Webflow renderuje `<img src="">`, a przeglądarka rozwija pusty `src`
**do adresu dokumentu** — naiwny odczyt zwróciłby URL strony przepisu i wyglądałby
na poprawne zdjęcie.

Puste pole daje więc `null`, a `null` daje **brak elementu**, a nie ramkę 328×150
ze złamanym obrazem. To reguła **R3** („brak zdjęcia nie zostawia dziury") i jest ona
zmierzona kontrolą ujemną w obu powierzchniach harnessu, przebieg 31.

Konsekwencja redakcyjna: **przepis bez wypełnionego `zdjecie-glowne` po prostu nie ma
zdjęcia w trybie gotowania**, a cała treść jedzie 166 px w górę. Nie jest to usterka
i nie należy jej łatać zdjęciem zastępczym po stronie szablonu.

## Co zostało wykonane po stronie tego łańcucha (stan na przebieg 31)

| warstwa | zmiana | dowód |
|---|---|---|
| `przepis-parser.js` | `zdjecieGlowne()` → `model.fotoUrl`; przepust przez `naPorcje()`; opcja `fotoGlowne` do testów | 3 asercje modelu z kontrolą ujemną |
| `tryb-gotowania.js` | klasa `mp-tryb__foto--glowne` (promień **12** z `get_design_context`), znacznik `data-mp-foto-ekranu` | wiersze **W78**, **W76** |
| harness | `<img>` w treści strony + 8 asercji na powierzchnię | **B21 🟢** na 7 ramkach |
| `PAKIET-INTEGRACYJNY.md` | §5 — kanon kontraktu urósł o tę linię; §2 — przemiar rozmiarów | — |

**Zmierzone:** `328×150 @ y88 x16` przy 360 i `kolumna × 150 @ y88` na wszystkich siedmiu
ramkach, `naturalWidth 656` (obraz się wczytał, a nie tylko zajął pudełko), tytuł z powrotem
na **y254** wszędzie. Powierzchnia zminifikowana: **2 751 asercji, zero padnięć**.

## Pozycja otwarta, która NIE blokuje tego CR-u

**D-31.1 — stała wysokość (150) kontra stały aspekt (D-26.2).** Inwariant odległości 0aa
zabrania miary zależnej od szerokości, D-26.2 każe stały aspekt. Przy 360 obie reguły dają
to samo; przy 320 i 480 rozjeżdżają się o kilkanaście pikseli wysokości. Wykonano 0aa.
Rozstrzygnięcie zmienia CSS runtime'u, nie kontrakt DOM — szablon jest ten sam w obu
wariantach.
