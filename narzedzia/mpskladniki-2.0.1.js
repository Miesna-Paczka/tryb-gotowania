/*2.0.1 liczy MP.przepis; kopiowanie nalezy do mpKopiujListe*/(function(){var Q=function(s){return document.querySelector(s)};
var L=Q('[data-mp-skladniki-lista]');if(!L)return;
var W=L.querySelector('[data-mp-skladnik-wzor]');if(!W)return;W.style.display='none';
var H=Q('[data-mp-skladniki-html]'),E=Q('[data-mp-porcje-etykieta]'),P=null,M=null,R=null;
function poz(){return R.naPorcje(M,P).skladniki}
function ar(s,w){var e=Q(s);if(e)e.setAttribute('aria-disabled',w?'true':'false')}
function rys(){[].slice.call(L.querySelectorAll('[data-mp-wiersz]')).forEach(function(e){L.removeChild(e)});
poz().forEach(function(o){var w=W.cloneNode(true);w.removeAttribute('data-mp-skladnik-wzor');w.setAttribute('data-mp-wiersz','');w.style.display='';
var t=w.querySelector('[data-mp-skladnik-tekst]');if(t)t.textContent=o.etykieta;
var b=w.querySelector('[data-mp-skladnik-badge]');
if(b)if(o.produktSlug){b.style.display='';b.setAttribute('href','https://miesnapaczka.pl/produkty/'+o.produktSlug)}else b.style.display='none';
L.appendChild(w)});
if(E)E.textContent=P+' '+R.formaDlaLiczby('porcja|porcje|porcji|porcji',P);
ar('[data-mp-porcje-minus] > *',P<=1);ar('[data-mp-porcje-plus] > *',P>=7)}
function kl(q,d){var e=Q(q);if(e)e.addEventListener('click',function(v){v.preventDefault();var n=Math.max(1,Math.min(7,P+d));if(n!==P){P=n;rys()}})}
function start(){R=window.MP&&window.MP.przepis;if(!R||!R.zaladuj)return false;
try{M=R.zaladuj()}catch(e){return false}
if(!M||!M.skladniki||!M.skladniki.length)return false;
P=M.porcjeBazowe||2;L.setAttribute('aria-live','polite');if(H)H.hidden=true;
kl('[data-mp-porcje-minus]',-1);kl('[data-mp-porcje-plus]',1);
rys();window.mpSkladniki='2.0.1';return true}
if(!start()){var t=0,id=setInterval(function(){t+=200;if(start()||t>=20000)clearInterval(id)},200)}})();
