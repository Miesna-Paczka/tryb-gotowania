# DEPLOY — komendy do wklejenia, w brzmieniu, które DZIAŁA

> ## Brzmienie obowiązujące od 2026-08-16: `git -C <ścieżka>`, bez `cd`
>
> ```powershell
> git -C 'C:\Users\andrz\Claude\git\tech\tryb-gotowania' push origin main
> ```
>
> **Wszystkie znane awarie tego deployu miały jedną przyczynę: dwie linijki zamiast
> jednej.** Warianty z `cd` padły 2026-08-16 dwa razy z rzędu, za każdym razem inaczej
> i za każdym razem myląco:
> `fatal: invalid refspec 'C:\Users\andrz\Claude\git\tech\tryb-gotowania'` (linijki
> skleiły się przy wklejaniu, więc ścieżka trafiła do gita jako DRUGI refspec) oraz
> `fatal: not a git repository` (`cd` nie doszło, powłoka została w innym katalogu).
> Żaden z tych komunikatów nie mówi „masz problem z wklejaniem", oba wyglądają na
> uszkodzone repozytorium — a repozytorium było za każdym razem całe, sprawdzone.
>
> **`git -C` znosi całą tę klasę awarii**, bo nie ma drugiej linijki, którą można zgubić
> albo skleić, i nie zależy od tego, gdzie stoi powłoka. Ta sama flaga działa na
> wszystko: `git -C '<ścieżka>' log --oneline -3`, `git -C '<ścieżka>' status`.
> Apostrofy wokół ścieżki są zawsze bezpieczne i konieczne, gdy ścieżka ma spację.
>
> Blok z `cd` niżej zostaje jako zapis tego, co zawiodło — nie jako zalecenie.

## Adres embedu: GitHub Pages, stały, bez podmiany przy commicie (od 2026-08-16)

```html
<script src="https://lukaszwerecik.github.io/tryb-gotowania/przepis-parser.min.js"></script>
<script src="https://lukaszwerecik.github.io/tryb-gotowania/tryb-gotowania.min.js"></script>
```

**Po pushu NIE robi się nic** — Pages przebudowuje się samo, w praktyce poniżej minuty,
a nagłówek to `cache-control: max-age=600` `[V]` (odczytany 2026-08-16, nie z dokumentacji).
Pętla wygląda więc tak: push → odczekaj do minuty → twarde przeładowanie strony.

**Czego NIE używać i dlaczego — zmierzone, nie przewidziane:**
`@main` na jsDelivr **nie odświeża się nawet po purge**. jsDelivr cache'uje ODWZOROWANIE
gałęzi na commit osobno od pliku; purge czyści plik pod ścieżką, a ścieżka `@main` dalej
wskazuje stary commit. Zmierzone przy `6b700fb`: `@6b700fb` → 43 978 B, `@main` przed
purge → 43 794, po purge ze `status: finished` → **43 794**, po kolejnych 25 s → 43 794,
z `?v=<sha>` → 43 794, przez `fastly.jsdelivr.net` → 43 794 `[V]`.
`@<SHA>` działa, ale wymaga edycji szablonu przy każdym commicie — czyli tego, co ta
zmiana likwiduje.

**Wersja przestała być widoczna w adresie i to jest realna cena.** Reguła „wynik pomiaru
ważny wyłącznie z zapisanym SHA" nie znika, tylko zmienia nośnik: SHA bierze się teraz
z `git rev-parse HEAD` przed serią i zapisuje w tabeli pomiarowej.

Notatka powstała 2026-08-15 po tym, jak trzy podane przeze mnie warianty tej samej komendy
padły z rzędu — za każdym razem z powodu środowiskowego, nie merytorycznego. Zapisuję ją,
żeby nikt nie odtwarzał tego z pamięci po raz czwarty.

## Pełny blok — wklej w PowerShell

```powershell
cd C:\Users\andrz\Claude\git\tech\tryb-gotowania
del .git\index.lock, .git\HEAD.lock
git add -A
git commit -m "<opis pomiaru, nie 'update'>"
git push origin main
```

## Trzy sposoby, na które to się psuje — wszystkie zdarzyły się naprawdę

1. **Brak `cd`.** Repo trybu gotowania jest OSOBNYM repozytorium, nie podkatalogiem większego.
   Z katalogu domowego git odpowiada `fatal: not a git repository`. Pierwsza linia jest konieczna
   w każdym nowym oknie PowerShella, bez wyjątku.
2. **Składnia `del` z `cmd`.** PowerShellowy `del` to alias `Remove-Item` i wymaga **przecinka**
   między ścieżkami. `del a b` daje `A positional parameter cannot be found`. Poprawnie: `del a, b`.
3. **Osierocony `index.lock`.** Zapisy przez most Cowork zostawiają zerobajtowe `.git\index.lock`
   i `.git\HEAD.lock`, których sesja nie umie usunąć — zgoda `allow_cowork_file_delete` obejmuje
   drzewo robocze, ale NIE wnętrze `.git`. Każde `git add` i `git commit` pada wtedy na
   `Unable to create index.lock`. **`git push` działa mimo blokady**, więc łatwo wypchnąć nic
   i uznać, że poszło.

Jeśli któregoś pliku blokady nie ma, `del` przerwie się na brakującym. Wtedy usuń pojedynczo:

```powershell
del .git\index.lock
```

## Druga połowa deployu — bez niej staging nie zobaczy zmiany

Push kładzie kod na GitHubie. **Embed ładuje konkretną referencję i nie zmieni jej sam.**
Po pushu, z konkretnym SHA:

**Webflow → Pages → „przepisy Template" → ustawienia strony → Custom code → Before `</body>`**
— podmień oba adresy jsDelivr na `@<SHA>`, potem **Publish**.

- `@<SHA>` — niezmienne, działa natychmiast. **To jest właściwy wybór do testów.**
- `@main` — jsDelivr cache'uje kilkanaście godzin; wygląda jak brak zmiany.
- `@v1.0.0-rc.1` — tag zamrożony na stałe. Tag zakładamy dopiero przy zamkniętej matrycy.

**Wynik pomiaru stagingowego jest ważny wyłącznie z zapisanym SHA**, na którym powstał.
Test bez zapisanego SHA nie jest wynikiem, tylko wrażeniem.

## Czego sesja nie zrobi sama

Piaskownica nie ma poświadczeń GitHuba — `git push` zwraca
`could not read Username for 'https://github.com'`. Commit lokalny: wolno i należy.
`push`, `tag`, `reset --hard`, `rebase`, `force`: wyłącznie operator, zawsze.
