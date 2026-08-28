/* mpZachetaTrybu 0.7.0 — sam POŁYSK. Gradient wyprowadzony do Webflow.
 *
 * CO SIĘ ZMIENIŁO WOBEC 0.6.0 I DLACZEGO TO WAŻNE:
 * gradient tła pigułki jest teraz WŁAŚCIWOŚCIĄ KLASY `.recipe-toggle`
 * (`background-image: linear-gradient(105deg,#FFFDFB,#F1ECDF)`, do klikania
 * w Designerze). Ten skrypt NIE DOTYKA tła — 0.6.0 ustawiało `background`,
 * czyli SKRÓT, który zeruje `background-color`; zostawiony tutaj skasowałby
 * gradient z klasy przy każdym wejściu. Jedno źródło prawdy dla tła: klasa.
 *
 * Zachęta jest teraz DOMYŚLNIE WŁĄCZONA dla osób, które nigdy nie otworzyły
 * trybu — to już nie eksperyment z wariantami, tylko zachowanie docelowe.
 *   ?zacheta=brak    wyłącza i zapamiętuje
 *   ?zacheta=polysk  włącza z powrotem
 *   ?zacheta=reset   czyści pamięć wariantu ORAZ „już otwierał"
 *
 * Krycie pasma to 29 % (`#4876224a`), nie 26 %: na `#F1ECDF` pasmo traci
 * 11 % różnicy wobec `#FFFDFB` i tyle właśnie wraca.
 *
 * `translate:-46px;opacity:0` w regule bazowej NIE jest ozdobą. Bez nich pasmo
 * stoi nieruchomo i nieprzezroczyście przy lewej krawędzi pigułki przez całe
 * 1,4 s opóźnienia startu — animacja bez `fill-mode` nie sięga wstecz. Ten sam
 * stan obowiązuje przy `prefers-reduced-motion`, gdzie animacji nie ma wcale.
 *
 * NIE mieszka w bloku `head` świadomie: ten blok piszą dwa łańcuchy. */
(function(){var W='mp-tryb-otwarty',Z='mp-zacheta',D=document,H=D.documentElement,w=null;
try{w=new URLSearchParams(location.search).get('zacheta')}catch(e){}
try{if(w==='reset'){localStorage.removeItem(W);localStorage.removeItem(Z);w=null}
else if(w){localStorage.setItem(Z,w)}else{w=localStorage.getItem(Z)}}catch(e){}
var u=0;try{u=localStorage.getItem(W)}catch(e){}
window.mpZacheta={wariant:w||'domyslny',uzyty:u,wersja:'0.7.0'};
if(w==='brak'||u)return;
var s=D.createElement('style');s.id='mpz';
s.textContent=
'[data-z] .recipe-toggle{position:relative;overflow:hidden}'+
'[data-z] .recipe-toggle:after{content:"";position:absolute;top:-40%;left:0;width:30px;height:180%;rotate:-20deg;translate:-46px;opacity:0;background:linear-gradient(90deg,#0000,#4876224a,#0000);animation:mpP 4s linear 1.4s infinite}'+
'@keyframes mpP{0%{translate:-46px;opacity:0}1%,26%{opacity:1}26%,100%{translate:236px}27%,100%{opacity:0}}'+
'@media(prefers-reduced-motion){[data-z] .recipe-toggle:after{animation:none}}';
D.head.appendChild(s);H.setAttribute('data-z','');
function P(){var c=D.querySelector('[data-mp-gotowanie-cta]');
if(c)c.addEventListener('click',function(){try{localStorage.setItem(W,'1')}catch(e){}
H.removeAttribute('data-z')},{once:true})}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',P);else P();})();
