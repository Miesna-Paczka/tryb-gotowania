/* mpKodQR 1.0.0 — wola MP.przepis.rysujQR() dla slotu [data-mp-qr].
   Renderer byl gotowy i zmierzony (D-39.40..43), ale NIKT GO NIE WOLAL:
   zmierzone na opublikowanej produkcji 2026-09-17, `grep rysujQR` na
   wyrenderowanym HTML = 0, a slot stal pusty pod naglowkiem obiecujacym kod.
   Bramka szerokosci (>=992) siedzi w `rysujQR`, nie tutaj — jedno miejsce.
   Nasluch na progu jest, bo bez niego kod nie pojawia sie po poszerzeniu okna. */
(function(){var KROK=200,LIMIT=20000,t=0,pilnuje=false;
window.mpKodQR={wersja:'1.0.0',rysowano:0,czekano:0,powod:null};
function rysuj(){var R=window.MP&&window.MP.przepis;
 if(!R||typeof R.rysujQR!=='function')return false;
 R.rysujQR();window.mpKodQR.rysowano++;window.mpKodQR.powod=null;return true}
function pilnujProgu(){if(pilnuje||!window.matchMedia)return;pilnuje=true;
 var mq=window.matchMedia('(min-width: 992px)');
 function na(){if(mq.matches)rysuj()}
 if(mq.addEventListener)mq.addEventListener('change',na);else if(mq.addListener)mq.addListener(na)}
if(!document.querySelector('[data-mp-qr]')){window.mpKodQR.powod='brak [data-mp-qr]';return}
if(rysuj()){pilnujProgu();return}
var id=setInterval(function(){t+=KROK;window.mpKodQR.czekano=t;
 if(rysuj()){clearInterval(id);pilnujProgu()}
 else if(t>=LIMIT){clearInterval(id);window.mpKodQR.powod='brak MP.przepis.rysujQR w '+LIMIT+' ms'}},KROK)})();
