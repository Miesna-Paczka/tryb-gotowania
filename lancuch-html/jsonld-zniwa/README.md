# Żniwa `mpJsonLd 1.2.0` — wsad do pola CMS `json-ld`

Szesnaście plików w tym katalogu to **dosłowne wyjście żywego skryptu**
`mpJsonLd 1.2.0` z produkcji, przechwycone 2026-08-21 przez
`../zbierz-jsonld.mjs`, a nie reimplementacja jego logiki.

To rozróżnienie jest celem samym w sobie. Skrypt ma ~200 linii heurystyk —
wybór zdjęcia po klasie `recipe-hero__img`, skrobanie daty z podpisu po
polskich nazwach miesięcy, przeliczenie soli na sód przez 2,5, bramka
`wolnoZDom()` decydująca między ładunkiem a DOM-em. Odtworzenie tego w Node
dałoby rozjazd, którego nikt by nie zauważył. Uruchomienie oryginału i
przechwycenie `textContent` daje 1:1 **z konstrukcji**.

## Co zmierzono przy zbiorze

- **16/16 zbudowanych ze ścieżki `ladunek`**, nie z DOM-u. Komentarz w samym
  skrypcie mówi „Zmierzone 2026-08-20: 16 z 16 stron zbudowanych z DOM-u" —
  jest więc dziś nieaktualny. Różnica nie jest kosmetyczna: ścieżka DOM-owa
  nie zna `totalTime` ani `recipeYield`, bo te żyją wyłącznie w ładunku.
  Przejście na statyczny JSON tę niedeterminację **usuwa**.
- **Wyjście stabilne między viewportami.** Dwa przebiegi, 1440×900 @1 i
  390×844 @3, dały 16/16 plików bajt w bajt identycznych. To była realna
  obawa: `zdjecie()` czyta `currentSrc`, który bywa zależny od viewportu.
- **Zero braków pól.** Każdy z 16 ma komplet: `name`, `image`,
  `recipeIngredient`, `recipeInstructions`, `description`, `url`, `author`,
  `totalTime`, `recipeYield`, `datePublished`, `dateModified`, `nutrition`.
- **Rozmiary:** 3 716 – 8 249 B, razem 83 095 B. Limit pola PlainText w
  Webflow nie jest zagrożony.

## Defekt odziedziczony, ŚWIADOMIE zachowany

**70 wystąpień surowego `**` w 16 z 16 plików.** Markery pogrubienia z
mikroskładni `kroki` przeciekają do `recipeInstructions[].text`. Ścieżka
HTML-owa je zjada (`kroki-html` ma `<strong>`), ścieżka JSON-LD nie.

Zachowane, bo operator poprosił o 1:1 z obecną treścią. Przejście na statyczny
JSON ten defekt **zamraża** — dlatego jest tu opisany, a nie tylko widoczny.
Naprawa to zdjęcie `**` przy składaniu `tekst`, po stronie generatora.

## Czego te pliki NIE zawierają

`recipeCategory` i `recipeCuisine` — pola `typ dania` i `kuchnia` są w CMS-ie
wypełnione, ale `mpJsonLd 1.2.0` ich nie czyta (dodaje je dopiero 1.3.0, nigdy
niewklejona). Tak samo `datePublished` jest tu obecne, choć zapadła decyzja o
jego usunięciu. Obie różnice to świadoma konsekwencja „1:1", nie przeoczenie.
