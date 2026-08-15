# DEPLOY — komendy do wklejenia, w brzmieniu, które DZIAŁA

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
