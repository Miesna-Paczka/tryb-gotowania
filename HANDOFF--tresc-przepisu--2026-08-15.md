# HAND-OFF do sesji treściowej (przepisy) — 2026-08-15, po przebiegu 36

**Od:** łańcuch `tryb-gotowania-embed` (domena techniczna).
**Do:** sesji odpowiedzialnej za przepisy / CMS.
**Rzecz:** embed trybu gotowania **działa na stagingu**, ale nie ma czego pokazać.
Blokuje go wyłącznie brak treści w rekordzie CMS — nie kod.

---

## 1. Stan, zmierzony na żywo, nie odtworzony z zapisków

Strona: `https://miesna-paczka-ea5c01.webflow.io/przepisy/wolowina-teriyaki-z-brokulami-przepis`

Co **działa** [V]:

- parser i runtime wczytują się z jsDelivr, **parser przed runtime'em**, tag `v1.0.0-rc.1`;
- `MP`, `MP.przepis`, `MP.tryb` istnieją;
- klik w pływające CTA **otwiera overlay** — `#mp-tryb` z `data-otwarty`, ekran `start`;
- kontrakt DOM jest w szablonie w komplecie, **wiązania CMS działają** (`data-tytul`
  zaciąga „Wołowina teriyaki z brokułami");
- `MP.tryb.ostrzezenia()` puste.

Co **puste** [V] — i to jest cała robota:

| pole CMS | węzeł w DOM | stan |
|---|---|---|
| `skladniki` | `#mp-skladniki` | **0 znaków** |
| `kroki` | `#mp-kroki` | **0 znaków** |
| `wartosci-porcja` | `#mp-wartosci-porcja` | **0 znaków** |
| `porcje-bazowe` | `data-porcje-bazowe` | **pusty atrybut** |
| `czas-przygotowania` | `data-czas` | **pusty atrybut** |

Model po `MP.przepis.zaladuj()`: **0 składników, 0 kroków, 1 błąd**, tytuł poprawny.

---

## 2. Czego dokładnie potrzeba

**Wypełnić pięć pól powyżej w rekordzie „Wołowina teriyaki z brokułami"** w kolekcji
przepisów. Składnia obowiązująca dla `skladniki`, `kroki`, `porcje-bazowe`
i wartości odżywczych stoi w **`git/content/przepisy-hub/instrukcja-pisania-przepisow.md`**,
sekcje 2–6. **Nie przepisuję jej tutaj i proszę, żeby nikt tego nie robił** — to plik
przypięty (pin B1), a druga kopia składni to drugie źródło prawdy, które zestarzeje
się po cichu.

Jedyny przypis techniczny, którego instrukcja może nie zawierać: `wartosci-porcja`
weszło do kontraktu później niż reszta (przeb. 27) i było wypełnione dla **1 z 18**
przepisów. Jeśli robicie teriyaki, warto przy okazji sprawdzić stan pozostałych.

---

## 3. Jak sprawdzić, że zadziałało — bez pytania nas

Po zapisaniu rekordu i publikacji: wejdź na stronę przepisu, otwórz konsolę i wpisz

```js
MP.przepis.zaladuj()
```

Ma wrócić obiekt, w którym `skladniki.length` i `kroki.length` są **większe od zera**,
a `bledy` jest **pustą tablicą**. Niepusta `bledy` to nie awaria embedu — to lista
miejsc, w których treść nie trzyma się składni, i każdy wpis mówi, o który klucz chodzi.

Potem kliknij pływające CTA: overlay ma pokazać ekran startowy z listą składników,
a nie pustą kartę.

---

## 4. Dwie pułapki, które kosztowały nas dziś czas

**Klamry w Webflow trzeba WSTAWIĆ, nie WPISAĆ.** Pierwsza publikacja miała w polach
dosłowny tekst `{{skladniki}}` (13 znaków), `{{kroki}}` (9), `{{wartosci-porcja}}` (19).
W edytorze Embeda pole wstawia się przyciskiem **„+ Add Field"**; wpisane z klawiatury
wygląda identycznie w kodzie, a jest zwykłym napisem. **Rozpoznanie: długość treści
równa długości nazwy placeholdera.** Puste pole daje 0 znaków — i to jest inny stan.

**`w-dyn-bind-empty` znaczy „szablon wiąże, rekord pusty".** Jeśli zobaczycie tę klasę
na elemencie, to nie jest błąd szablonu ani kodu, tylko sygnał, że pole w CMS-ie
czeka na treść.

---

## 5. Czego od was NIE potrzebujemy

- **Nie ruszajcie skryptów ani szablonu** — kontrakt DOM jest kompletny i zmierzony.
- **Nie zgłaszajcie „embed nie działa"** na podstawie pustego overlaya przy pustym
  rekordzie; to jest zachowanie oczekiwane i zmierzone.
- **Nie dopisujcie nic do `instrukcja-pisania-przepisow.md` §6** bez uzgodnienia —
  to interfejs embedu, przypięty (B1), zmieniany tylko change requestem. Dwa takie
  leżą w katalogu łańcucha: `CR--wartosci-porcja--2026-08-15.md`
  i `CR--zdjecie-glowne--2026-08-15.md`.

---

## 6. Co jest po naszej stronie i czeka

Sekcja `S` matrycy (bramka stagingowa): `S1` i `S2` zielone po dzisiejszym pomiarze,
`S3` (konsola gospodarza), `S6` (próg 500 px) i `S7` (rozjazd wobec harnessu)
niezmierzone. Do tego dług regresyjny po zmianie runtime'u. To robota ogniwa 37,
nie wasza — piszę o tym tylko po to, żeby było jasne, że **`v1.0.0` nie czeka
wyłącznie na treść**.
