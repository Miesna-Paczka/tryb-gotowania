/*2.0.0 karty z MP.model (mpLadunek), nie z [data-mp-zrodlo]*/
(function(){var W=window;
function rys(){var M=W.MP&&W.MP.model;if(!M||!M.pola)return false;
 var byly=false;
 Array.prototype.forEach.call(document.querySelectorAll('[data-mp-karty]'),function(g){
  var nazwa=g.getAttribute('data-mp-karty'),wzor=g.querySelector('[data-mp-karta-wzor]');
  if(!wzor)return;byly=true;
  var wpisy=M.pola[nazwa]||[];
  if(!wpisy.length){g.setAttribute('hidden','');return}
  var rodzic=wzor.parentNode,za=wzor.nextSibling;
  wpisy.forEach(function(w){var k=wzor.cloneNode(true);
   k.removeAttribute('data-mp-karta-wzor');k.setAttribute('data-mp-karta','');
   if(w.klucz)k.setAttribute('data-mp-klucz',w.klucz);
   if(w.krotko)k.setAttribute('data-mp-krotko',w.krotko);
   var p=k.querySelector('[data-mp-karta-pytanie]'),o=k.querySelector('[data-mp-karta-odpowiedz]');
   if(p)p.textContent=w.pytanie||'';
   if(o){var t=w.odpowiedz||'';
    if(w.link)t+=' ↗ '+(w.link.etykieta||w.link.adres||w.link.placeholder||'');
    o.textContent=t}
   rodzic.insertBefore(k,za)});
  rodzic.removeChild(wzor)});
 if(byly)W.mpKartyPrzepisu='2.0.0';
 return byly}
if(!rys()){var t=0,id=setInterval(function(){t+=200;if(rys()||t>=20000)clearInterval(id)},200);
 document.addEventListener('mp:model',function(){if(rys())clearInterval(id)})}})();
