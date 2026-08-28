/* audyt-przeswitu-celow.mjs — ile miejsca zostaje miedzy celem checkboxa
 * a celem markera przy PRAWDZIWYCH nazwach skladnikow, na calej zawartosci `dane/`.
 *
 * Po co: `D-39.81` poszerza cel checkboxa o 12 px w prawo, wiec pytanie „czy cele
 * moga na siebie wejsc" przestaje byc teoretyczne. Syntetyczny worst case
 * (nazwa jednoznakowa) NIE odpowiada niczemu w tresci i produkowal liczbe,
 * ktora niczego nie pilnowala. Ten audyt daje liczbe z produkcji.
 *
 * Wynik 2026-08-25 na 21 ladunkach: 84 wiersze z markerem, najciasniejszy
 * przeswit **62 px** („4 limonki", nazwa 64 px) — po `D-39.81` zostaje 50 px.
 * Prog zachodzenia (14 px szerokosci nazwy) pilnuje asercja w
 * `suchy-bieg-afordancji.mjs`; ten plik pilnuje, czy tresc sie do niego zbliza.
 *
 * Uruchomienie: node narzedzia/audyt-przeswitu-celow.mjs
 */
/* Ile miejsca zostaje miedzy checkboxem a markerem przy PRAWDZIWYCH nazwach.
   Skanujemy wszystkie ladunki w dane/, dla kazdego kroku bierzemy wiersze
   z markerem i mierzymy realna geometrie w przegladarce. */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const TRYB = fs.readFileSync('tryb-gotowania.min.js','utf8');
const PARSER = fs.readFileSync('przepis-parser.min.js','utf8');
const pliki = fs.readdirSync('dane').filter(f=>f.endsWith('.json') && f!=='indeks.json');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const wyniki=[];
for (const szer of [320, 360, 402]) {
  const ctx=await b.newContext({viewport:{width:szer,height:874}});
  const A='https://p.test/x';
  await ctx.route(A,r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',
    body:`<!doctype html><meta charset="utf-8"><body style="margin:0"><script>${PARSER}<\/script><script>${TRYB}<\/script></body>`}));
  const p=await ctx.newPage(); await p.goto(A);
  for (const f of pliki) {
    const d=JSON.parse(fs.readFileSync('dane/'+f,'utf8'));
    if(!d.skladniki||!d.kroki) continue;
    const r=await p.evaluate(([skl,krk,zmien])=>{
      try{
        const m=MP.przepis.zaladuj({skladniki:skl,kroki:krk,pola:{'co-mozesz-zmienic':zmien||''}});
        const w=MP.przepis.naPorcje(m,4);
        MP.tryb.otworz(w,{model:m,porcje:4});
        const out=[];
        for(let n=1;n<=w.kroki.length;n++){
          MP.tryb.pokazKrok(n); MP.tryb.lista(true);
          document.querySelectorAll('.mp-tryb__wiersz[data-mp-zamiennik]').forEach(li=>{
            if(li.closest('.mp-tryb__arkusz')) return;
            const pt=li.querySelector('.mp-tryb__ptaszek'); const mk=li.querySelector('.mp-tryb__marker');
            if(!pt||!mk) return;
            const cel=pt.querySelector('.mp-tryb__cel'), mcel=mk.querySelector('.mp-tryb__cel');
            if(!cel||!mcel) return;
            const a=cel.getBoundingClientRect(), c=mcel.getBoundingClientRect();
            const nz=li.querySelector('.mp-tryb__nazwa-skl').getBoundingClientRect();
            out.push({etykieta:li.querySelector('.mp-tryb__nazwa-skl').textContent,
              nazwaSzer:Math.round(nz.width), przeswit:Math.round(c.x-(a.x+a.width))});
          });
        }
        MP.tryb.zamknij();
        return out;
      }catch(e){ return [{blad:String(e).slice(0,80)}]; }
    },[d.skladniki,d.kroki,d['co-mozesz-zmienic']||'']);
    r.forEach(x=>{ if(!x.blad) wyniki.push({szer, ...x}); });
  }
  await ctx.close();
}
await b.close();
const uniq=new Map();
wyniki.forEach(w=>{const k=w.szer+'|'+w.etykieta; if(!uniq.has(k)) uniq.set(k,w);});
const lista=[...uniq.values()].sort((a,b)=>a.przeswit-b.przeswit);
console.log('wierszy z markerem (unikalnych etykieta×szerokość):', lista.length);
console.log('\nDZIESIĘĆ NAJCIAŚNIEJSZYCH:');
lista.slice(0,10).forEach(w=>console.log(`  prześwit ${String(w.przeswit).padStart(4)} px · okno ${w.szer} · nazwa ${String(w.nazwaSzer).padStart(3)} px · „${w.etykieta}"`));
const min=lista[0]?lista[0].przeswit:null;
console.log('\nNAJMNIEJSZY PRZEŚWIT NA PRAWDZIWEJ TREŚCI:', min, 'px');
