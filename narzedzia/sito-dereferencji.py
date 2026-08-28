#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SITO DEREFERENCJI — gdzie blok pomiarowy potrafi WYBUCHNĄĆ zamiast SPAŚĆ.
Założone w przebiegu 36, po dwóch trafieniach tej klasy w jednym przebiegu.

KLASA DEFEKTU. Asercja dereferencjonuje węzeł, którego przy ZEPSUTYM produkcie
nie ma. W zdrowej ramce przechodzi każdą regresję — węzeł zawsze istnieje. Przy
mutacji rzuca wyjątkiem, a wyjątek zabija CAŁY blok pomiarowy razem ze wszystkimi
asercjami, które są po nim. Zmierzone: `M22-limit-trzy` zabrał w ten sposób
131 asercji z 432 i mimo to wyszedł werdyktem ZABITA, bo cel padł przed zgonem.

DLACZEGO TO NIE JEST TO SAMO, CO SITO SKŁADNIOWE Z PRZEB. 34. Tamto pyta, czy
warunek ma operator porównania — czyli czy wiersz może dać FAŁSZ. To pyta, czy
wiersz zdąży dać cokolwiek. Wiersz, który wybucha, jest gorszy od tautologii:
tautologia kłamie o sobie, wybuch kłamie o wszystkich wierszach po sobie.

CO TO SITO ROBI, A CZEGO NIE. Znajduje WZORZEC, nie dowodzi defektu — jak każde
sito składniowe. Wynik jest listą MIEJSC DO SPRAWDZENIA, nie listą usterek.
Trafienie jest defektem tylko wtedy, gdy istnieje stan produktu, w którym węzeł
znika; ustala się to mutacją, nie lekturą.

JAK NAPRAWIAĆ TRAFIENIE — reguła z przeb. 36, nie do skrócenia:
zastępnikiem jest ODCZEPIONY `document.createElement('div')`, bo zwraca zerowe
prostokąty i `null` z `querySelector`. Przed użyciem trzeba WYMIENIĆ, dlaczego
każda dotknięta asercja przy zastępniku wychodzi FAŁSZ. **Zastępnik, który mógłby
przypadkiem dać PRAWDĘ, jest gorszy od wyjątku** — wyjątek przynajmniej krzyczy.

Użycie:  python3 narzedzia/sito-dereferencji.py [ścieżka/do/fixture.html]
"""
import io, os, re, sys

# Ścieżka liczona WZGLĘDEM tego pliku, nie zapisana absolutnie: absolutna pochodziła
# z katalogu jednej sesji i w każdej następnej dawała `PermissionError` (przeb. 37).
DOM = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'harness', 'fixture.html'))
sciezka = sys.argv[1] if len(sys.argv) > 1 else DOM
s = io.open(sciezka, encoding='utf-8').read()

start = s.index("/* HARNESS-ONLY — samosprawdzenie jednostki 1. */")
linie = s[:start].count('\n')          # przesunięcie do numeracji CAŁEGO pliku
blok = s[start:].split('\n')

# --- KUBEŁEK B: dereferencja WPROST na wyniku querySelector ------------------
# Wzorzec jednowyrażeniowy, więc nie wymaga śledzenia zasięgów — i dlatego
# jest wiarygodny. `X.querySelector(...).y` wybucha, gdy selektor nie trafi.
B = []
for i, l in enumerate(blok):
    for m in re.finditer(r'\.querySelector\((?:[^()]|\([^()]*\))*\)\s*\.\s*(\w+)', l):
        if re.search(r'\|\|\s*(pusty|document\.createElement)', l):
            continue                    # jawny zastępnik — już zaopiekowane
        B.append((linie + i + 1, m.group(1), l.strip()[:100]))

# --- KUBEŁEK C: pr()/getComputedStyle() na wyniku querySelector --------------
# `pr(null)` i `getComputedStyle(null)` rzucają tak samo jak dereferencja.
C = []
for i, l in enumerate(blok):
    for m in re.finditer(r'\b(pr|getComputedStyle|pxN)\(\s*[\w$.]*\.querySelector\(', l):
        if re.search(r'\|\|\s*(pusty|document\.createElement)', l):
            continue
        C.append((linie + i + 1, m.group(1), l.strip()[:100]))

print('SITO DEREFERENCJI —', sciezka.split('/')[-1])
print('blok pomiarowy: linie %d–%d' % (linie + 1, linie + len(blok)))
print()
print('B. dereferencja WPROST na wyniku querySelector: %d' % len(B))
for nr, wl, t in B:
    print('   %5d · .%-22s %s' % (nr, wl, t))
print()
print('C. pr()/getComputedStyle()/pxN() na wyniku querySelector: %d' % len(C))
for nr, wl, t in C:
    print('   %5d · %-22s %s' % (nr, wl, t))
print()
print('RAZEM miejsc do sprawdzenia: %d' % (len(B) + len(C)))
print()
print('UWAGA o kubełku, którego tu NIE MA. Pierwsza wersja sita miała trzeci')
print('kubełek: „zmienna przypisana z querySelector, dereferencjonowana bez')
print('guardu". Zwrócił 53 pozycje i był BEZUŻYTECZNY — nie śledzi zasięgów,')
print('więc `var s = ...querySelector(...)` zlewa się z każdym innym `s`')
print('w pliku i melduje użycia z zupełnie innych funkcji. Wyrzucony świadomie:')
print('sito, które trzeba filtrować oczami, kosztuje więcej niż grep.')
