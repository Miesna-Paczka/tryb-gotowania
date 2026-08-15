# Patch do `WYMAGANIA.md` — C1 zamknięty regułą składania

**Decyzja operatora 2026-08-15:** BOTTOM opisuje **reguła składania**, nie lista wartości.
**Status: NIEZAAPLIKOWANY.** `WYMAGANIA.md` jest plikiem wiążącym — edytuje go operator,
nie łańcuch. Poniżej gotowy tekst do wklejenia i procedura, bez której następne ogniwo stanie.

## Zmiana w §4 „Reguły budowy"

**Było** (zdanie o BOTTOM, wiersze 128–131):

> belka 72; BOTTOM wg reguły składania INTERAKCJE §4.1 (pin 80/132/218/266 = cztery
> najczęstsze ekrany kroku, pełny rozkład tamże; rozszerzenie pinu = C1, otwarte
> u operatora); odstępy wierszy 12 (ekran kroku) / 8 (pełna lista);

**Ma być:**

> belka 72; BOTTOM **wyłącznie wg reguły składania** INTERAKCJE §4.1 —
> `BOTTOM = 80 (nawigacja) + stos`, gdzie `stos = Σ wysokości pigułek + 8×(n−1) + 12`
> dla n ≥ 1, `BOTTOM = 80` dla n = 0 oraz `BOTTOM = 132` na ekranach bez `←`
> (start, S1, zakończenie: dwa CTA 328×48). **Lista dozwolonych wysokości nie
> obowiązuje**: poprzedni pin 80/132/218/266 opisywał cztery najczęstsze ekrany kroku
> i pomijał 180, 213, 328 oraz 347; 108 nigdy nie było wysokością runtime'u, tylko
> artefaktem adnotacji projektanta. **C1 zamknięte decyzją operatora 2026-08-15.**
> Uzasadnienie: wysokość formy rozwiniętej zależy od długości microcopy podpowiedzi,
> więc każda lista starzeje się przy pierwszym dłuższym tekście; odczyt 29 klatek dał
> dziewięć wysokości tam, gdzie pin przewidywał cztery.

Nagłówek pliku: nota zmian **v1.5** (poprzednia v1.4).

## Procedura — czego NIE wolno pominąć

`WYMAGANIA.md` jest jednym z trzech plików, których SHA-256 każde ogniwo liczy przed
pracą; niezgodność = STOP i raport. **Po edycji trzeba przeliczyć hash i podmienić go
w `STAN.md`, rozdział „Pliki wiążące".** Bez tego kolejne uzbrojone ogniwo zatrzyma się
na starcie i zrobi to poprawnie — na pliku, który sam zmieniłeś.

```
sha256sum git/tech/tryb-gotowania/WYMAGANIA.md
```

Obecny hash w STAN.md (v1.4): `5d0ac1987f5d7ed4dde2e768de5502592db21f22f8eacd9dc0db8a38a41dcfca`

## Co ta zmiana robi z matrycą

Nic natychmiast. Pętla **już dziś mierzy wg reguły składania**, nie wg pinu — patrz
INTERAKCJE §4.1 i GEOMETRIA §2.2, gdzie reguła jest wyprowadzona i sprawdzona na
czterech układach. Zmiana usuwa sprzeczność między dokumentem wiążącym a tym, co pętla
robi od przebiegu 1, i zamyka pozycję, która stała otwarta czternaście przebiegów.
