#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ZGODNOŚĆ TRZECH EGZEMPLARZY KATALOGU MUTACJI — sprawdzana PRZED uzbrojeniem
przeglądarki, nie oczami po pomiarze. Założone w przebiegu 36.

Katalog mutacji żyje w trzech miejscach i to jest świadome (fixture zna mutacje,
`mutacja.html` zna ich CELE), ale kopia, która zestarzeje się po cichu, kosztuje
cały przemiar. Jedno uzbrojenie Chrome to kilkanaście minut i blokada wspólnego
zasobu; ten skrypt kosztuje sekundę.

CO SPRAWDZA — cztery rzeczy, z których trzecia jest jedyną nieoczywistą:
1. te same NAZWY mutacji w `fixture.html`, `fixture-min.html` i `mutacja.html`;
2. te same wartości `celAsercja` w każdym z trzech egzemplarzy;
3. **czy każdy `celAsercja` jest PODCIĄGIEM którejś REALNEJ etykiety `sprawdz()`** —
   komparator szuka podciągu, więc rozjazd JEDNEGO ZNAKU daje werdykt TAUTOLOGIA
   na wierszu całkowicie zdrowym. Zmierzone w przeb. 36 na `M20`: cel miał
   `„w toku”` z domykającym cudzysłowem typograficznym, a etykieta asercji
   `„w toku"` z prostym. Bez tego sprawdzenia przemiar oskarżyłby `C09`;
4. czy `celAsercja` nie trafia w WIELE etykiet naraz — to nie jest błąd, ale
   znaczy, że werdykt może pochodzić z innego wiersza, niż się autorowi wydaje
   (`M22` trafia w `F7` i `H7` jednocześnie i to jest w porządku, byle wiedzieć).

Użycie:  python3 narzedzia/sprawdz-katalog-mutacji.py
Kod wyjścia 1 = rozjazd. Nie uzbrajaj przeglądarki, dopóki nie jest 0.
"""
import io, re, subprocess, sys, json, os

H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'harness')
H = os.path.normpath(H)


def katalog_fixture(sciezka):
    s = io.open(sciezka, encoding='utf-8').read()
    m = re.search(r'var KATALOG = \{[\s\S]*?\n  \};\n', s)
    if not m:
        raise SystemExit('nie znalazłem KATALOGu w ' + sciezka)
    kod = m.group(0) + '\nconsole.log(JSON.stringify(Object.keys(KATALOG).map(function(k){' \
                       'return {nazwa:k, cel:KATALOG[k].cel, celAsercja:KATALOG[k].celAsercja};})));'
    return json.loads(uruchom(kod))


def katalog_strony(sciezka):
    s = io.open(sciezka, encoding='utf-8').read()
    m = re.search(r'var MUTACJE = \[[\s\S]*?\n\];', s)
    return json.loads(uruchom(m.group(0) + '\nconsole.log(JSON.stringify(MUTACJE));'))


def uruchom(kod):
    """Katalog jest KODEM, nie danymi — czytamy go silnikiem, nie wyrażeniem
    regularnym. Parsowanie JS regexpem to trzecia kopia tej samej wiedzy.

    Kod idzie do `node` STRUMIENIEM, nie plikiem tymczasowym, i to nie jest
    estetyka: pierwsza wersja pisała `_katalog_tmp.js` do `harness/` i nie umiała
    go potem skasować, bo `rm` w tym katalogu jest zablokowane. Narzędzie
    higieniczne, które zostawia śmieć w repozytorium, jest gorsze od jego braku."""
    r = subprocess.run(
        ['node', '-'], input='var styl=function(){return true;},'
                             'wstrzykniecie=function(){return true;};\n' + kod,
        capture_output=True, text=True)
    if r.returncode:
        raise SystemExit('node nie wykonał katalogu:\n' + r.stderr)
    return r.stdout


def etykiety(sciezka):
    s = io.open(sciezka, encoding='utf-8').read()
    return re.findall(r"sprawdz\(\s*'((?:[^'\\]|\\.)*)'", s)


bledy = []
P = katalog_fixture(os.path.join(H, 'fixture.html'))
Mn = katalog_fixture(os.path.join(H, 'fixture-min.html'))
St = katalog_strony(os.path.join(H, 'mutacja.html'))
E = etykiety(os.path.join(H, 'fixture.html'))

print('mutacji: fixture %d · fixture-min %d · mutacja.html %d' % (len(P), len(Mn), len(St)))

nP = [x['nazwa'] for x in P]
nM = [x['nazwa'] for x in Mn]
nS = [x['nazwa'] for x in St]
if nP != nM:
    bledy.append('nazwy fixture ≠ fixture-min: %s' % set(nP).symmetric_difference(nM))
if sorted(nP) != sorted(nS):
    bledy.append('nazwy fixture ≠ mutacja.html: %s' % set(nP).symmetric_difference(nS))

wg = {x['nazwa']: x for x in P}
for x in St:
    y = wg.get(x['nazwa'])
    if y and y['celAsercja'] != x['celAsercja']:
        bledy.append('celAsercja rozjazd na %s: fixture %r vs strona %r'
                     % (x['nazwa'], y['celAsercja'], x['celAsercja']))

for x in P:
    traf = [e for e in E if x['celAsercja'] in e]
    if not traf:
        bledy.append('PUDŁO: cel %r (%s) nie jest podciągiem ŻADNEJ etykiety sprawdz()'
                     % (x['celAsercja'], x['nazwa']))
    elif len(traf) > 1:
        print('   uwaga: %s trafia w %d etykiet (%s) — dopuszczalne, ale wiedz o tym'
              % (x['nazwa'], len(traf), ', '.join(t.split(':')[0] for t in traf)))

if bledy:
    print('\nROZJAZD — %d pozycji:' % len(bledy))
    for b in bledy:
        print('  ·', b)
    sys.exit(1)
print('\nZGODNE — trzy egzemplarze katalogu mówią to samo, każdy cel trafia w realną etykietę.')
