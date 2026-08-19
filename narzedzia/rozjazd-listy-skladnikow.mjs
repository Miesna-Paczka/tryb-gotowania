/* rozjazd-listy-skladnikow.mjs — o ile lista składników NA STRONIE różni się od
 * tej, którą widać w trybie gotowania.
 *
 * POWÓD: 2026-08-19 operator zgłosił, że „lista składników nie odmienia się,
 * a w trybie gotowania odmiana działa bez zarzutu". Objaw jest prawdziwy, ale
 * przyczyna nie brzmi „brak odmiany w runtimie" — lista JEST budowana w runtimie,
 * tylko innym silnikiem. Robi to `mpSkladniki@1.2.0` (skrypt zarejestrowany
 * w Webflow), który ma WŁASNĄ tabelkę czternastu jednostek, napisaną przed
 * `D-39.50`. Parser od `D-39.50` mapuje KAŻDĄ formę na hasło; tamta tabelka
 * zna wyłącznie mianownik liczby pojedynczej, a redakcja pisze naturalnie.
 *
 * Ten plik liczy skalę rozjazdu: 16 przepisów × porcje 1–7, etykieta po etykiecie.
 * Silnik strony jest tu odtworzony 1:1 ze źródła z rejestru Webflow — jeśli ktoś
 * wyda `mpSkladniki` w nowej wersji, TĘ KOPIĘ TRZEBA ODŚWIEŻYĆ, inaczej pomiar
 * zacznie po cichu opisywać przeszłość.
 *
 * Pomiar z 2026-08-19: **781 z 1456 etykiet (53,6%)**. Nie chodzi tylko o odmianę
 * — strona pokazuje „1,3 ząbków czosnku" i „0,3 bataty" tam, gdzie parser daje
 * „2 ząbki czosnku" i „½ batata".
 *
 * Uruchomienie: node narzedzia/rozjazd-listy-skladnikow.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { parser } from '../odmiana-node.mjs';

const P = parser();

/* --- silnik strony, przepisany 1:1 z mpSkladniki@1.2.0 --- */
const TAB = {}; 'łyżka:łyżki:łyżek|łyżeczka:łyżeczki:łyżeczek|szklanka:szklanki:szklanek|ząbek:ząbki:ząbków|plaster:plastry:plastrów|garść:garście:garści|opakowanie:opakowania:opakowań|puszka:puszki:puszek|gałązka:gałązki:gałązek|listek:listki:listków|kostka:kostki:kostek|szczypta:szczypty:szczypt|sztuka:sztuki:sztuk|kromka:kromki:kromek'.split('|').forEach((x)=>{const p=x.split(':');TAB[p[0]]=p;});
const UL = {'ząbek':'ząbka','plaster':'plastra','listek':'listka','opakowanie':'opakowania'};
function wr(n){if(Math.abs(n-Math.round(n))>1e-9)return 1;n=Math.abs(Math.round(n));if(n===1)return 0;const d=n%10,s=n%100;return(d>=2&&d<=4&&!(s>=12&&s<=14))?1:2;}
function fm(v){return(v<10?String(Math.round(v*10)/10):String(Math.round(v))).replace('.',',');}
function rb(l){const m=l.match(/^#\S+\s+/);let r=m?l.slice(m[0].length):l;const p=r.match(/\s+@(\S+)\s*$/);if(p)r=r.slice(0,p.index);return r.trim();}
function sk(t,P_,B){const m=t.match(/^([\d.,]+)\s+(\S+)/);if(!m)return t;const v=parseFloat(m[1].replace(',','.'));if(isNaN(v))return t;const nv=v*P_/B,w=m[2];let ow=w;
  if(w.indexOf('|')>-1){const c=w.split('|');ow=c[wr(nv)]||c[1];}
  else if(TAB[w])ow=(Math.abs(nv-Math.round(nv))>1e-9&&UL[w])?UL[w]:TAB[w][wr(nv)];
  return fm(nv)+' '+ow+t.slice(m[0].length);}

/* --- źródła --- */
const KAT = path.resolve('przepisy');
function sekcja(tekst, nazwa){
  const linie = tekst.split('\n'); const s = linie.indexOf(`[${nazwa}]`);
  if (s < 0) return '';
  let k = s + 1; while (k < linie.length && !/^\[[a-z0-9-]+\]$/.test(linie[k])) k++;
  return linie.slice(s + 1, k).join('\n').trim();
}

let rozne = 0, wszystkie = 0;
const przyklady = [];

for (const plik of fs.readdirSync(KAT).filter((f) => f.endsWith('.txt'))) {
  const t = fs.readFileSync(path.join(KAT, plik), 'utf8');
  const slug = (t.match(/^slug: (.+)$/m) || [, '?'])[1];
  const B = parseInt((t.match(/^porcje-bazowe: (\d+)$/m) || [, '2'])[1], 10);
  const wiersze = sekcja(t, 'skladniki').split('\n').filter((l) => l.trim());
  const skl = P._wewnetrzne.parsujSkladniki(sekcja(t, 'skladniki'));

  for (let n = 1; n <= 7; n++) {
    const model = { skladniki: skl, kroki: [], porcjeBazowe: B };
    const zParsera = P.naPorcje(model, n).skladniki.map((s) => s.etykieta);
    const zeStrony = wiersze.map((l) => sk(rb(l), n, B));
    zeStrony.forEach((tekst, i) => {
      wszystkie++;
      if (tekst !== zParsera[i]) {
        rozne++;
        if (przyklady.length < 12 && !przyklady.some((p) => p.strona === tekst))
          przyklady.push({ slug, n, strona: tekst, parser: zParsera[i] });
      }
    });
  }
}

console.log(`etykiet porównanych: ${wszystkie}`);
console.log(`różnych:             ${rozne}  (${(100 * rozne / wszystkie).toFixed(1)}%)\n`);
console.log('porcje | strona (dziś)                        | parser (tryb gotowania)');
for (const p of przyklady)
  console.log(`  ${p.n}    | ${p.strona.padEnd(36)} | ${p.parser}`);
