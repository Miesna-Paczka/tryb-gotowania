/* mpZachetaTrybu 0.6.0 — zachety do trybu gotowania na STAGINGU.
   ?zacheta=polysk | b | c | kropka | powiadomienie | brak | reset
   (pamietane w localStorage). Gasnie na zawsze po pierwszym kliknieciu.

   KOD WARIANTU siedzi w jednym atrybucie `data-z`, a regule wybieraja litery
   podciagiem. Litery ustawiaja WYLACZNIE zmienne CSS; cala geometria stoi
   w trzech regulach bazowych, ktore czytaja te zmienne. Dzieki temu dolozenie
   wariantu kosztuje jedna krotka regule, a nie kopie regul bazowych — limit
   Webflow na skrypt inline (2000 znakow) ugryzl juz trzy razy.

     g  gradient dzisiejszy (od 52%)      p  polysk, krycie z --za
     b  gradient B: pelny, 20% zieleni    k  kropka jest
     c  gradient C: pelny, --beige-light  s  kropka szybka (1s steps)
                                          v  kropka wolna (2.6s ease-in-out)

   Krycie polysku jest KOMPENSOWANE pod ciemniejsze tlo, zeby porownanie B z C
   mialo jedna zmienna (gradient), a nie dwie. Policzone na luminancji wzgledem
   #FFFDFB: B traci 20% -> 26%*1.25 = 32% (#..52), C traci 11% -> 29% (#..4a).

   `pointer-events` na pasmie nie ma: ::after nalezy do samej kotwicy, wiec nie
   przejmuje niczyjego kliku. Probka klika przez prawdziwy hit-test i to pilnuje.

   Obrot pasma siedzi w `rotate:`, nie w klatkach — inaczej `rotate(-20deg)`
   powtarza sie w kazdej klatce i zjada 28 znakow za nic.

   NIE mieszka w bloku `head` swiadomie: ten blok pisza dwa lancuchy. */
(function(){var W='mp-tryb-otwarty',Z='mp-zacheta',D=document,H=D.documentElement,w=null,
K={polysk:'gp',b:'bp',c:'cp',kropka:'ks',powiadomienie:'gkv'};
try{w=new URLSearchParams(location.search).get('zacheta')}catch(e){}
try{if(w==='reset'){localStorage.removeItem(W);localStorage.removeItem(Z);w=null}
else if(w){localStorage.setItem(Z,w)}else{w=localStorage.getItem(Z)}}catch(e){}
var u=0;try{u=localStorage.getItem(W)}catch(e){}
window.mpZacheta={wariant:w||null,uzyty:u,wersja:'0.6.0'};
if(!w||!K[w]||u)return;
var s=D.createElement('style');s.id='mpz';
s.textContent=
'[data-z] .recipe-toggle{position:relative;overflow:hidden;background:var(--zg,none)}'+
'[data-z] .recipe-toggle:before{content:var(--zk,none);flex:0 0 8px;height:8px;border-radius:50%;background:#487622;animation:var(--zd,none)}'+
'[data-z] .recipe-toggle:after{content:var(--zc,none);position:absolute;top:-40%;left:0;width:30px;height:180%;rotate:-20deg;background:linear-gradient(90deg,#0000,var(--za,#48762242),#0000);animation:var(--zp,none) 4s linear 1.4s infinite}'+
'[data-z*=g]{--zg:linear-gradient(105deg,#FFFDFB 52%,#E7EEDD)}'+
'[data-z*=b]{--zg:linear-gradient(105deg,#FFFDFB,#DAE2D0);--za:#48762252}'+
'[data-z*=c]{--zg:linear-gradient(105deg,#FFFDFB,#F1ECDF);--za:#4876224a}'+
'[data-z*=p]{--zc:"";--zp:mpP}'+
'[data-z*=k]{--zk:""}'+
'[data-z*=s]{--zd:mpK 1s steps(60) infinite}'+
'[data-z*=v]{--zd:mpK 2.6s ease-in-out infinite}'+
'@keyframes mpP{0%{translate:-46px;opacity:0}1%,26%{opacity:1}26%,100%{translate:236px}27%,100%{opacity:0}}'+
'@keyframes mpK{0%,100%{opacity:1}50%{opacity:.4;scale:.72}}'+
'@media(prefers-reduced-motion){[data-z]{--zp:none;--zd:none}}';
D.head.appendChild(s);H.setAttribute('data-z',K[w]);
function P(){var c=D.querySelector('[data-mp-gotowanie-cta]');
if(c)c.addEventListener('click',function(){try{localStorage.setItem(W,'1')}catch(e){}
H.removeAttribute('data-z')},{once:true})}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',P);else P();})();
