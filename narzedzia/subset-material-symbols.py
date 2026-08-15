import subprocess, os
from fontTools.ttLib import TTFont

SRCDIR='/sessions/confident-wonderful-hypatia/mnt/Claude Site Debugging OLD/webflow-marketing/fonts'
V3DIR='/sessions/confident-wonderful-hypatia/mnt/Claude/local/tech/fonts/subset-2026-08-12-v3'
OUT='/tmp/fontv4/out'
os.makedirs(OUT, exist_ok=True)
WAGI=['Light','Regular','Medium']

def ligmap(font):
    cmap=font.getBestCmap(); rev={gn:chr(cp) for cp,gn in cmap.items()}
    out={}
    for lu in font['GSUB'].table.LookupList.Lookup:
        subs=[]
        for st in lu.SubTable:
            if lu.LookupType==7 and hasattr(st,'ExtSubTable'): subs.append((st.ExtensionLookupType, st.ExtSubTable))
            else: subs.append((lu.LookupType, st))
        for lt,st in subs:
            if lt==4 and hasattr(st,'ligatures'):
                for first,ll in st.ligatures.items():
                    for lig in ll:
                        seq=[first]+list(lig.Component)
                        out[''.join(rev.get(g,'?') for g in seq)]=lig.LigGlyph
    return out

# 1. prawda o v3: nazwy ligatur odczytane z ARTEFAKTU, nie z pliku txt
stare = {w: set(ligmap(TTFont(f'{V3DIR}/MaterialSymbolsOutlined-{w}.woff2')).keys()) for w in WAGI}
baza = set.union(*stare.values())
assert all(stare[w]==baza for w in WAGI), {w: baza^stare[w] for w in WAGI}
print(f'v3: {len(baza)} nazw ligatur, identycznie w trzech wagach')

NOWE = ['keyboard_arrow_up','refresh','restart_alt','add_shopping_cart']
nazwy = sorted(baza | set(NOWE))
print(f'v4: {len(nazwy)} nazw ({len(NOWE)} nowe: {", ".join(NOWE)})')

for w in WAGI:
    src=f'{SRCDIR}/MaterialSymbolsOutlined-{w}.ttf'
    pelny=TTFont(src); L=ligmap(pelny)
    brak=[n for n in nazwy if n not in L]
    assert not brak, (w, brak)
    cele=sorted({L[n] for n in nazwy})
    dst=f'{OUT}/MaterialSymbolsOutlined-{w}.woff2'
    subprocess.run(['pyftsubset', src,
        f'--glyphs={",".join(cele)}',
        f'--text={" ".join(nazwy)}',
        '--layout-features=liga,dlig,ccmp,kern,rlig', '--no-layout-closure', '--glyph-names',
        '--flavor=woff2', f'--output-file={dst}'], check=True)
    print(f'{w:8} glifów-celów {len(cele):3} -> {os.path.getsize(dst):6} B')
