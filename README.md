# tryb-gotowania

Runtime trybu gotowania dla przepisów na miesnapaczka.pl — vanilla JS ładowany do Webflow.
Parser pól `skladniki`/`kroki` z CMS, ekrany kroków, minutniki, selektor porcji, tooltipy
zamienników. Repozytorium jest kanoniczne; embed w Webflow niesie wyłącznie dane oraz mount.

**To repozytorium jest publiczne** i musi takie zostać: GitHub Pages serwuje z niego ładunki
`dane/*.json`, a rekordy CMS wskazują na `https://miesna-paczka.github.io/tryb-gotowania/dane/…`.
Nie dokładaj tu niczego, czego nie chcesz oglądać na otwartym hoście.

## Dokumentacja

Dokumentacja projektu — wymagania, geometria, interakcje, matryca kontroli, rejestr luk,
stan, procedura wdrożenia i łatki do wymagań — mieszka w niejawnym repozytorium organizacji:

> **https://github.com/Miesna-Paczka/tryb-gotowania-dokumentacja**

Dostęp nadaje właściciel organizacji. Odwołania w komentarzach kodu w rodzaju „patrz STAN.md"
albo „WYMAGANIA §4.2" celują właśnie tam — te pliki nie leżą już w tym drzewie.

Nie kopiuj tych dokumentów z powrotem tutaj.

## Co jest w tym repozytorium

| ścieżka | zawartość |
|---|---|
| `tryb-gotowania.js` | runtime; `tryb-gotowania.min.js` budowany `terser -c -m`, nie edytowany ręcznie |
| `przepis-parser.js` | parser składników i kroków; `.min.js` jak wyżej |
| `dane/` | ładunki JSON serwowane przez Pages — generowane, nie edytowane ręcznie |
| `przepisy/` | źródła przepisów, z których powstaje `dane/` |
| `lancuch-html/` | generator HTML i JSON-LD plus jego kontrole |
| `narzedzia/` | sondy pomiarowe i skrypty pomocnicze |
| `harness/` | strony pomiarowe matrycy |
| `.github/workflows/lancuch-html.yml` | bramka: walidacja źródeł i zgodność `dane/` z regeneracją |
