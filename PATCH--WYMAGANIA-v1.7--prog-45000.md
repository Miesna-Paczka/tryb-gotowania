# PATCH do `WYMAGANIA.md` → v1.7 — próg miękki 40 000 → 45 000

Podstawa: **D-28.1 rozstrzygnięte przez operatora 2026-08-15** („Zgadzam się na
45 000"). Propozycja pochodziła z przebiegu 28, potwierdzona w rozmowie po przebiegu 30.

`WYMAGANIA.md` jest plikiem wiążącym — **tego patcha nie wprowadził łańcuch**.
Wprowadza go operator albo łańcuch na wyraźne polecenie, po czym **musi się zmienić
hash w sekcji „Pliki wiążące" w `STAN.md`**, inaczej następne ogniwo zatrzyma się
na niezgodności hasha i będzie miało rację.

---

## Zmiana 1 — §4, zdanie o limicie

**Było:**

> Jeden plik runtime'u; limit twardy 50 000 znaków (droga integracyjna przez embed),
> cel < 40 000.

**Ma być:**

> Jeden plik runtime'u; limit twardy 50 000 znaków (droga integracyjna przez embed),
> cel **< 45 000**. Próg dotyczy **OBU artefaktów wysyłanych do embedu** — runtime'u
> i parsera — bo od wpięcia biblioteki QR (D-13.1, przeb. 28) oba są plikami tej samej
> klasy i oba jadą tą samą drogą.

**Dlaczego 45 000, a nie 48 000 ani 42 000.** Zapas do twardego limitu platformy
zostaje **5 000 znaków (10 %)** po każdej stronie. Próg miękki istnieje po to, żeby
przekroczenie było sygnałem, a nie awarią wdrożenia; przy 48 000 sygnał przychodziłby
za późno na reakcję, przy 42 000 zapala się przy każdej jednostce wykończeniowej
i przestaje cokolwiek znaczyć.

## Zmiana 2 — nagłówek pliku (przy okazji, literówka wersji)

**Było:** `# WYMAGANIA — runtime trybu gotowania v1.5 (2026-08-15)`

**Ma być:** `# WYMAGANIA — runtime trybu gotowania v1.7 (2026-08-15)`

Nagłówek stoi dziś na **v1.5**, choć lista zmian otwiera się wpisem **v1.6**. Rozjazd
wszedł razem z v1.6 i nie ma znaczenia semantycznego, ale plik wiążący, który sam
o sobie podaje złą wersję, jest dokładnie tą klasą usterki, którą ten łańcuch łapie
w cudzych dokumentach.

## Zmiana 3 — wpis na liście zmian (nad wpisem v1.6)

```
Zmiana v1.7 (2026-08-15): **próg miękki rozmiaru 40 000 → 45 000 znaków** i objęcie
nim OBU artefaktów (runtime + parser). Decyzja operatora, pozycja D-28.1. Powód:
po wpięciu biblioteki QR do parsera (D-13.1) oba pliki stanęły kilkaset znaków pod
starym progiem — runtime 39 536, parser 39 369 — czyli próg zaczął blokować pracę
wykończeniową zamiast ostrzegać przed limitem platformy. Limit twardy 50 000
bez zmian. Wprowadzone przez operatora.
```

---

## Co się dzieje PO wprowadzeniu (kolejność jest wiążąca)

1. **Nowy sha256 `WYMAGANIA.md` → sekcja „Pliki wiążące" w `STAN.md`**, ze starym
   hashem zachowanym w nawiasie, jak przy v1.5 i v1.4.
2. **Asercja I5 w obu harnessach** (`fixture.html`, `fixture-min.html`) i **wiersz I5
   w `MATRYCA.md`**: 40 000 → 45 000. **Dopiero po zmianie pliku wiążącego, nigdy
   przed** — oracle'em I5 jest WYM §4, więc asercja podniesiona wcześniej mierzyłaby
   liczbę, której wymaganie nie zna.
3. **Wiersz I5 wraca do przemiaru** (7 + 7 ramek). Zieleń z lektury kodu nie jest
   zielenią także wtedy, gdy zmiana jest „tylko liczbą w warunku".
4. **Pakiet integracyjny §2** — wszystkie liczby progu i zdanie o decyzji rozmiarowej.

## Stan faktyczny na dziś (przebieg 30, [V] odczytane z buildów)

| artefakt | znaków | zapas do 45 000 | zapas do 50 000 |
|---|---|---|---|
| `tryb-gotowania.min.js` | **39 536** | 5 464 | 10 464 |
| `przepis-parser.min.js` | **39 369** | 5 631 | 10 631 |

Przy starym progu 40 000 zapas wynosił odpowiednio **464** i **631** znaków —
mniej niż koszt jednej deklaracji `@font-face`, a jednostka fontu ikon (B16/I4)
jest następna w kolejce.
