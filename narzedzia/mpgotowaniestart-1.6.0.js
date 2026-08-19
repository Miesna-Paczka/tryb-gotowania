/* 1.6.0 — model bierzemy z MP.model (mpLadunek), a nie wolamy zaladuj() sami.
   Gdy na stronie NIE MA loadera, zostaje stare zachowanie: czytanie DOM-u.
   Rozroznienie jest wazne, bo po usunieciu embedow #mp-* zaladuj() bez opcji
   zwrocilby model pusty — czyli tryb gotowania otwarty na niczym, po cichu.
   1.5.0: nie podajemy `ekran`; runtime sam wybiera wznowienie albo start (D-39.18). */
(function(){var C='[data-mp-gotowanie-cta]',KROK=400,LIMIT=20000;
function gotowy(){return !!(window.MP&&window.MP.przepis&&typeof window.MP.przepis.zaladuj==='function'&&window.MP.tryb&&typeof window.MP.tryb.otworz==='function')}
function model(){var M=window.MP;if(M.model)return M.model;return M.ladunek?null:M.przepis.zaladuj()}
function porcje(){var e=document.querySelector('[data-mp-porcje-etykieta]'),m=e&&e.textContent.match(/\d+/);if(m)return parseInt(m[0],10);var b=document.querySelector('[data-mp-porcje-bazowe]'),n=b&&parseInt(b.textContent,10);return n||2}
var c=document.querySelector(C);
window.mpGotowanie={cta:!!c,runtime:false,widoczny:!!c,zrodloWidocznosci:'css',porcje:porcje(),czekano:0};
if(!c)return;
c.addEventListener('click',function(ev){var a=ev.target&&ev.target.closest?ev.target.closest('a,button'):null;if(!a&&ev.target!==c)return;ev.preventDefault();ev.stopPropagation();
 var m=gotowy()?model():null;
 if(!m){window.mpGotowanie.klikBezRuntime=(window.mpGotowanie.klikBezRuntime||0)+1;return}
 try{var n=porcje();window.MP.tryb.otworz(window.MP.przepis.naPorcje(m,n),{model:m,porcje:n});window.mpGotowanie.otwarty=n}
 catch(e){window.mpGotowanie.blad=String(e).slice(0,120);if(window.console)console.warn('[mp-gotowanie]',e)}});
var t=0,id=setInterval(function(){t+=KROK;window.mpGotowanie.czekano=t;
 if(gotowy()){clearInterval(id);window.mpGotowanie.runtime=true;return}
 if(t>=LIMIT){clearInterval(id);window.mpGotowanie.poddano=true}},KROK);
if(gotowy()){clearInterval(id);window.mpGotowanie.runtime=true}
})();
