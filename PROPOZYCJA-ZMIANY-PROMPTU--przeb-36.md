# Propozycja zmiany promptu harmonogramu — po przebiegu 36 (2026-08-15)

**Status: DO WKLEJENIA PRZEZ OPERATORA.** Łańcuch nie może tego zainstalować sam
i nie powinien móc. Aktualizacja zadania zastępuje pole `prompt` w całości, więc
każda samodzielna próba kasuje resztę instrukcji bezpowrotnie — a poza tym reguła,
którą ogniwo mogłoby sobie poluzować, nie jest bezpiecznikiem, tylko sugestią.

---

## Diagnoza — co dokładnie jest zepsute

Nie „łańcuch marnuje czas". Konkretnie: **wszystkie sześć warunków wyjścia mówi
o ZDOLNOŚCI ogniwa do pracy, żaden o WARTOŚCI tej pracy.**

| # | warunek | o czym mówi |
|---|---|---|
| 1 | plik `STOP` | operator przerwał |
| 2 | matryca 100 % + pakiet + bramka | ukończenie |
| 3 | licznik 40 | bezpiecznik czasu |
| 4 | blokada twarda | nie da się ruszyć |
| 5 | brak zasobu na WSZYSTKIE jednostki | nie da się ruszyć |
| 6 | koniec kontekstu | sesja się urwała |

Brakuje warunku, który mówi: *da się pracować, ale nie ma po co*.

**Warunek 5 wygląda, jakby tę lukę zamykał, i nie zamyka — bo kolejkę jednostek
piszę JA, na końcu każdego przebiegu.** Dopóki umiem wymyślić nowy przyrząd,
„wszystkie pozostałe jednostki wymagają zasobu, którego nie mam" nigdy nie będzie
prawdą. Łańcuch sam sobie wystawia uzasadnienie dalszej pracy. To nie jest
złośliwość ogniwa, tylko struktura zachęt: reguła „kończ z nazwanego powodu, nie
z uznania" jest słuszna, ale przy otwartej kolejce znaczy „nie kończ nigdy".

**Dowód z tego łańcucha, nie z rozważań.** Pliki produktu — `tryb-gotowania.js`,
`tryb-gotowania.min.js`, `przepis-parser.js`, `przepis-parser.min.js` — mają
znaczniki czasu z przebiegu ~31. Przebiegi **33, 34, 35 i 36 nie zmieniły w nich
ani jednego znaku.** Zmieniały: pokrycie matrycy (33), mutację matrycy (34–35),
mutację przyrządu mutującego i sito nad blokiem pomiarowym (36). Cztery przebiegi
mierzenia mierzenia. Każdy z osobna dał prawdziwe znalezisko — i to jest właśnie
powód, dla którego nikt tego nie zatrzymał: lokalnie zawsze wygląda to na pracę.

Jedyna czerwień produktowa (`B24`) czeka na decyzję operatora od przebiegu 32.

---

## Zmiana 1 — nowy warunek wyjścia nr 7: PRODUKT STOI

Do rozdziału „Pętla jednostek", do listy warunków, dopisać:

> 7. **produkt nie ruszył się od trzech przebiegów** — jeżeli SHA-256 wszystkich
>    czterech plików produktu (`tryb-gotowania.js`, `tryb-gotowania.min.js`,
>    `przepis-parser.js`, `przepis-parser.min.js`) jest identyczny z zapisanym
>    trzy przebiegi wcześniej, **kończy się CAŁY ŁAŃCUCH**, nie przebieg: raport
>    do operatora, wyłączenie zadania. Trzy przebiegi bez ruchu w produkcie
>    znaczą, że praca przestała dotyczyć rzeczy, dla której łańcuch powstał —
>    niezależnie od tego, jak wartościowe są znaleziska o przyrządzie.

**Dlaczego mechanicznie, a nie „oceń, czy to jeszcze ma sens".** Ocena jest
dokładnie tym, co zawiodło cztery razy z rzędu, bo każde pojedyncze znalezisko
broniło się samo. Hash się nie broni.

**Wymóg towarzyszący:** każdy przebieg zapisuje w STAN.md linię
`Znacznik produktu (przeb. N): <sha256 × 4>`. Bez tego warunek jest niemierzalny,
a niemierzalny warunek wyjścia to ozdoba.

---

## Zmiana 2 — nowy warunek wyjścia nr 8: WSZYSTKO CZEKA NA OPERATORA

> 8. **każda pozostała czerwień jest wstrzymana decyzją albo czynnością operatora** —
>    raport i koniec ŁAŃCUCHA. Stan „mogę pracować, ale nic, co zrobię, nie zdejmie
>    ani jednej czerwieni" jest ukończeniem tego, co do łańcucha należy, a nie
>    powodem do szukania sobie zajęcia.

Dziś ten stan zachodzi i jest **zakazany jako powód zakończenia**. Warunek 2 zna
tylko sukces całkowity, więc łańcuch zablokowany musi biec dalej.

---

## Zmiana 3 — kolejka przestaje być otwarta

Do rozdziału „Co wykonać", po akapicie o planowaniu serii:

> **Jednostka musi pochodzić z listy zamkniętej: wierszy MATRYCY, które są dziś
> czerwone, oraz pozycji inwentarza 0b.** Nowy PRZYRZĄD (nowa powierzchnia, nowe
> narzędzie, nowy rodzaj sita) wolno zbudować tylko wtedy, gdy **z góry, przed
> budową, potrafisz nazwać ISTNIEJĄCĄ czerwień, którą on zdejmie**. Przyrząd
> uzasadniony tym, że „może coś znajdzie", nie jest jednostką — jest pozycją na
> liście decyzji dla operatora.
>
> Wiersz założony przez łańcuch na podstawie własnego znaleziska (`I8`–`I11`) jest
> dopuszczalny, ale **liczy się do budżetu: najwyżej jeden taki wiersz na przebieg.**
> Bez limitu matryca rośnie w tempie, w jakim ogniwo potrafi wymyślać pytania,
> a „100 % zieleni" oddala się przy każdym przebiegu, który ją niby przybliża.

---

## Zmiana 4 — poprawka do zdania, które dziś brzmi zbyt mocno

W rozdziale „Pętla jednostek" zdanie „Domyślnie przebieg TRWA" zostaje, ale
z dopiskiem:

> Domyślność dotyczy jednostek Z LISTY ZAMKNIĘTEJ. Jeżeli lista jest pusta,
> przebieg nie trwa — kończy się warunkiem 8. **Wymyślenie nowej jednostki nie
> jest sposobem na to, żeby lista przestała być pusta.**

---

## Czego świadomie NIE proponuję

- **Podniesienia licznika.** Licznik nie jest problemem; problemem jest to, że
  przy otwartej kolejce jest jedynym realnym hamulcem, a hamulec czasowy zatrzymuje
  łańcuch najpóźniej, jak się da.
- **Zakazu budowania przyrządów.** Mutacja (przeb. 34–36) znalazła trzy defekty,
  których nie znalazłby żaden przegląd, w tym `I11` — artefakt mierzył inwariant
  odległości rzadziej niż źródło. To była praca potrzebna. Chodzi o budżet
  i o uzasadnienie z góry, nie o zakaz.
- **Zmiany w regule „kończ z nazwanego powodu".** Jest dobra. Brakowało jej
  powodów, nie dyscypliny.

---

## Co zrobić z dzisiejszym dorobkiem

Niezależnie od powyższego: jednorazowy commit przebiegów 30–36 ma wartość kopii
zapasowej i tyle. **Nie jest postępem w stronę `v1.0.0`** — produkt jest bez zmian
od przebiegu 31, a jedyna czerwień stoi na twojej decyzji. Otwieranie gita jako
stałej kadencji uzasadnię dopiero wtedy, gdy commit będzie wiązał ARTEFAKT
z pomiarem, który go potwierdza. Dziś wiązałby pomiar z pomiarem.
