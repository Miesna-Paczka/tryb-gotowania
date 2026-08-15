# Change request — pole `wartosci-porcja` i koniec mnożenia w przeglądarce

**Data:** 2026-08-15 · **Źródło:** rozstrzygnięcie operatora D-15.1, wariant **B rozszerzone**
**Adresat:** łańcuch `przepis-webflow-sukcesor` + operator (pin B1 — interfejsu embedu
nie poprawia jednostronnie żaden łańcuch)
**Autor:** łańcuch `tryb-gotowania-embed`. **Ten łańcuch niczego z poniższych nie wykonuje.**

## Problem, zmierzony a nie założony

Kolumna „w 1 porcji" tabeli odżywczej **nie pochodzi z żadnego pola CMS**. Skrypt
`mpKrokiTabela` 1.0.0 parsuje `wartosci-odzywcze` (string **na 100 g**) i mnoży go przez
`waga-porcji/100` — CHANGELOG budowy sekcji kart §14.3: „parsuje `wartosci-odzywcze`,
drukuje dwie kolumny (na porcję i na 100 g) […] ustawia nagłówek »w 1 porcji (N g)«
z `waga-porcji`".

Kalkulator `wartosci-odzywcze.mjs` liczy porcję inaczej — z sum **niezaokrąglonych**
(`naPorcje[k] = sumy[k] / porcje`, linia 107), a nie z zaokrąglonego stringu na 100 g.
Stąd dwie różne liczby dla tego samego dania:

| źródło | energia na porcję (teriyaki, 225 g) |
|---|---|
| tabela na stronie (`mpKrokiTabela`, mnożenie) | **1760 kJ / 419 kcal** |
| kalkulator BLS (`wartosci-odzywcze.mjs`) | **1756 kJ / 417 kcal** [V] |

Rozjazd **jest już na produkcji**. Pasek meta trybu gotowania tylko by go powielił,
niezależnie od tego, którą metodą policzyłby swoje liczby.

## Rozstrzygnięcie

**Jedno źródło prawdy: kalkulator.** Wartości na porcję liczy `wartosci-odzywcze.mjs`,
wędrują do CMS jako pole i są **odczytywane**, nigdy odtwarzane w przeglądarce.

## Zakres — trzy zmiany, kolejność wiążąca

### 1. `wartosci-odzywcze.mjs` (domena treści)

Nowe wyjście obok `jakoMikroskladnia(w)`, w tej samej mikroskładni, ale z `w.naPorcje`
zamiast `w.na100`. Raport drukuje je w osobnym bloku, tak jak dziś drukuje string na 100 g,
żeby redakcja miała co skopiować:

```js
export function jakoMikroskladniaPorcja(w) {
  const n = w.naPorcje;
  return [
    `energia: ${zaokr(n.energia_kj, 'energia_kj')} kJ / ${zaokr(n.energia_kcal, 'energia_kcal')} kcal`,
    `tłuszcz: ${zaokr(n.tluszcz)} g`,
    `kwasy tłuszczowe nasycone: ${zaokr(n.nasycone)} g`,
    `węglowodany: ${zaokr(n.weglowodany)} g`,
    `cukry: ${zaokr(n.cukry)} g`,
    `błonnik: ${zaokr(n.blonnik)} g`,
    `białko: ${zaokr(n.bialko)} g`,
    `sól: ${zaokr(n.sol, 'sol')} g`
  ].join('; ');
}
```

Zaokrąglenia **te same** (wytyczne KE do 1169/2011 zał. XV), więc pole jest czytelne
tą samą procedurą co dotychczasowe i nie wymaga nowego parsera po stronie klienta.

### 2. CMS + instrukcja §6 (domena treści, pin B1)

Nowe pole PlainText **`wartosci-porcja`** w kolekcji `przepisy`. Wiersz do tabeli §6:

| pole CMS | trafia do | renderuje | dlaczego tak |
|---|---|---|---|
| `wartosci-porcja` | `<script type="text/plain">` | kolumna „w 1 porcji" tabeli + pasek meta trybu | zawiera średniki i przecinki dziesiętne, jak `wartosci-odzywcze` |

Blok embedu — dwie linie:

```html
<script type="text/plain" id="mp-wartosci-porcja">{{wartosci-porcja}}</script>
<div id="mp-tryb-gotowania" … data-waga-porcji="{{waga-porcji}}"></div>
```

`waga-porcji` idzie atrybutem, bo jest liczbą (ta sama zasada co `porcje-bazowe`);
string odżywczy idzie `text/plain`, bo zawiera średniki, ukośniki i przecinki dziesiętne —
ten sam powód, dla którego `skladniki` nie jest atrybutem.

### 3. `mpKrokiTabela` (domena techniczna szablonu)

Skrypt **przestaje mnożyć**. Kolumna „w 1 porcji" czyta `wartosci-porcja`; kolumna
„w 100 g" czyta `wartosci-odzywcze` jak dotąd; nagłówek „w 1 porcji (N g)" bez zmian
z `waga-porcji`.

**Zachowanie przy pustym `wartosci-porcja`: kolumna na porcję znika razem z nagłówkiem.**
Nie wraca do mnożenia — powrót do mnożenia przywróciłby dokładnie tę usterkę, którą ta
zmiana usuwa, i zrobiłby to cicho, bo wynik wygląda poprawnie. Pasek meta przy pustym polu
ukrywa się w całości (`meta.hidden`, zachowanie już w runtimie), a nie pokazuje trzech
kolumn z kreskami.

## Migracja istniejących przepisów

Pole trzeba wypełnić dla każdego przepisu, który ma już `wartosci-odzywcze` — inaczej
kolumna na porcję zniknie ze stron, które ją dziś mają. Źródłem jest raport kalkulatora,
czyli ta sama czynność, którą redakcja wykonuje dziś przy `wartosci-odzywcze`, tylko
kopiowana jest druga linia. **Kolejność: najpierw pole i wypełnienie, potem zmiana skryptu.**

## Czego ten CR NIE rozstrzyga

- **Które liczby są prawdziwe.** Kalkulator liczy z sum niezaokrąglonych i to jest metoda
  poprawniejsza, ale wynik pozostaje obarczony założeniami z `dane-zywieniowe/<slug>.json`
  (udział wchłoniętego oleju, odparowanie) — one są [I] i tego żaden CR nie zmienia.
- **Zgodności historycznej.** Strony opublikowane przed migracją pokazywały 419; po migracji
  pokażą 417. To poprawka, nie regresja, ale warto wiedzieć, że liczba na stronie się zmieni.
- **Paska meta jako takiego.** Runtime trybu gotowania wypełnia `stan.widok.meta` dopiero
  po tej zmianie — to osobna praca w łańcuchu `tryb-gotowania-embed`, warunkowana tym CR-em.
