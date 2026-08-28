/* mpZachetaTrybu 0.5.1 — trzy warianty zachety do trybu gotowania, STAGING.
   ?zacheta=polysk | kropka | powiadomienie | brak | reset  (pamietane w localStorage).
   Gasnie na zawsze po pierwszym kliknieciu w przelacznik.

   JEDEN atrybut `data-z` niesie KOD wariantu, a regule wybieraja litery
   podciagiem (`[data-z*=g]`), zeby skladac efekty bez powielania CSS:
     gp  = gradient + polysk        (wariant `polysk`)
     ks  = kropka szybka            (wariant `kropka`)
     gkw = gradient + kropka wolna  (wariant `powiadomienie`)
   Litery: g gradient, p polysk, k kropka, s szybka, w wolna.
   Kropki roznia sie WYLACZNIE tempem i krzywa (1s steps(60) vs 2.6s
   ease-in-out) — ta sama klatka kluczowa, zeby porownanie mialo jedna zmienna.

   Limit Webflow na skrypt inline to 2000 znakow i tresc ponizej sie w nim miesci.
   NIE mieszka w bloku `head` swiadomie: ten blok pisza dwa lancuchy. */
(function(){var W='mp-tryb-otwarty',Z='mp-zacheta',D=document,H=D.documentElement,w=null,
K={polysk:'gp',kropka:'ks',powiadomienie:'gkw'};
try{w=new URLSearchParams(location.search).get('zacheta')}catch(e){}
try{if(w==='reset'){localStorage.removeItem(W);localStorage.removeItem(Z);w=null}
else if(w){localStorage.setItem(Z,w)}else{w=localStorage.getItem(Z)}}catch(e){}
var u=0;try{u=localStorage.getItem(W)}catch(e){}
window.mpZacheta={wariant:w||null,uzyty:u,wersja:'0.5.1'};
if(!w||!K[w]||u)return;
var s=D.createElement('style');s.id='mpz';
s.textContent=
'[data-z] .recipe-toggle{position:relative;overflow:hidden}'+
'[data-z*=g] .recipe-toggle{background-image:linear-gradient(105deg,#FFFDFB 52%,#E7EEDD)}'+
'[data-z*=p] .recipe-toggle:after{content:"";position:absolute;top:-40%;left:0;width:30px;height:180%;pointer-events:none;background:linear-gradient(90deg,#0000,#48762242,#0000);animation:mpP 4s linear 1.4s infinite}'+
'@keyframes mpP{0%{transform:translate(-46px) rotate(-20deg);opacity:0}1%,26%{opacity:1}26%,100%{transform:translate(236px) rotate(-20deg)}27%,100%{opacity:0}}'+
'[data-z*=k] .recipe-toggle:before{content:"";flex:0 0 8px;width:8px;height:8px;border-radius:50%;background:#487622}'+
'[data-z*=s] .recipe-toggle:before{animation:mpK 1s steps(60) infinite}'+
'[data-z*=w] .recipe-toggle:before{animation:mpK 2.6s ease-in-out infinite}'+
'@keyframes mpK{0%,100%{opacity:1}50%{opacity:.4;transform:scale(.72)}}'+
'@media(prefers-reduced-motion){[data-z] .recipe-toggle:after,[data-z] .recipe-toggle:before{animation:none}}';
D.head.appendChild(s);H.setAttribute('data-z',K[w]);
function P(){var c=D.querySelector('[data-mp-gotowanie-cta]');
if(c)c.addEventListener('click',function(){try{localStorage.setItem(W,'1')}catch(e){}
H.removeAttribute('data-z')},{once:true})}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',P);else P();})();
