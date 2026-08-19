/*1.0.0 model z ladunku na Pages; dlaczego: lancuch-html/README.md*/
(function(){var W=window;W.MP=W.MP||{};
var e=document.querySelector('[data-mp-ladunek]');
var u=e&&(e.getAttribute('href')||e.getAttribute('data-mp-ladunek'));
function stan(s,d){W.MP.ladunek=Object.assign({stan:s,url:u||null},d||{})}
if(!u){stan('brak-adresu');return}
stan('pobieram');
function zParserem(p){
 function jest(){return !!(W.MP.przepis&&W.MP.przepis.zaladuj)}
 function buduj(){try{
   W.MP.model=W.MP.przepis.zaladuj({skladniki:p.skladniki,kroki:p.kroki,
    pola:{wskazowka:p.wskazowka,'co-mozesz-zmienic':p['co-mozesz-zmienic'],przechowywanie:p.przechowywanie},
    wartosciPorcja:p['wartosci-porcja']});
   stan('gotowy');document.dispatchEvent(new CustomEvent('mp:model'))}
  catch(x){stan('blad-modelu',{blad:String(x).slice(0,160)})}}
 if(jest())return buduj();
 var t=0,id=setInterval(function(){t+=200;
  if(jest()){clearInterval(id);buduj()}
  else if(t>=20000){clearInterval(id);stan('brak-parsera')}},200)}
fetch(u,{credentials:'omit'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
.then(zParserem)
.catch(function(x){stan('blad-pobrania',{blad:String(x).slice(0,160)});
 if(W.console)W.console.warn('[mp-ladunek] nie pobralem ladunku',u,x)});})();
