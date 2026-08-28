/* mpZachetaTrybu 0.4.0 — dwa warianty zachety do trybu gotowania, DO TESTOW NA STAGINGU.
   Wybor: ?zacheta=polysk | kropka | brak | reset  (zapamietywany w localStorage).
   Gasnie na zawsze po pierwszym kliknieciu w przelacznik (mp-tryb-otwarty).
   NIE mieszka w bloku `head` swiadomie: ten blok pisza dwa lancuchy i regula
   progu juz raz z niego zniknela po cichu (patrz komentarz w bloku). */
(function(){var W='mp-tryb-otwarty',Z='mp-zacheta',D=document,H=D.documentElement,w=null;
try{w=new URLSearchParams(location.search).get('zacheta')}catch(e){}
try{if(w==='reset'){localStorage.removeItem(W);localStorage.removeItem(Z);w=null}
else if(w){localStorage.setItem(Z,w)}else{w=localStorage.getItem(Z)}}catch(e){}
var uzyty=0;try{uzyty=localStorage.getItem(W)}catch(e){}
window.mpZacheta={wariant:w||null,uzyty:uzyty,wersja:'0.4.0'};
if(!w||w==='brak'||uzyty)return;
var s=D.createElement('style');s.setAttribute('data-mp-zacheta','');
s.textContent=
'[data-mp-zacheta] .recipe-toggle{position:relative;overflow:hidden}'+
'[data-mp-zacheta="polysk"] .recipe-toggle{background-image:linear-gradient(105deg,#FFFDFB 52%,#E7EEDD)}'+
'[data-mp-zacheta="polysk"] .recipe-toggle::after{content:"";position:absolute;top:-40%;left:0;width:30px;height:180%;pointer-events:none;background:linear-gradient(90deg,rgba(72,118,34,0),rgba(72,118,34,.26) 50%,rgba(72,118,34,0));animation:mpPolysk 8s linear 1.4s infinite}'+
'@keyframes mpPolysk{0%{transform:translateX(-46px) rotate(-20deg);opacity:0}1%{opacity:1}12%{transform:translateX(236px) rotate(-20deg);opacity:1}13%{opacity:0}100%{transform:translateX(236px) rotate(-20deg);opacity:0}}'+
'[data-mp-zacheta="kropka"] .recipe-toggle::before{content:"";flex:0 0 8px;width:8px;height:8px;border-radius:100px;background:#487622;animation:mpKropka 1s steps(60) infinite}'+
'@keyframes mpKropka{0%,100%{opacity:1}50%{opacity:.3;transform:scale(.65)}}'+
'@media (prefers-reduced-motion:reduce){[data-mp-zacheta] .recipe-toggle::after{display:none}[data-mp-zacheta] .recipe-toggle::before{animation:none}}';
D.head.appendChild(s);H.setAttribute('data-mp-zacheta',w);
function P(){var c=D.querySelector('[data-mp-gotowanie-cta]');
if(c)c.addEventListener('click',function(){try{localStorage.setItem(W,'1')}catch(e){}
H.removeAttribute('data-mp-zacheta')},{once:true})}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',P);else P();})();
