/*1.4.0 — wezly zrodlowe embedow po zmianie architektury.
  Zmierzone 2026-08-20: Webflow NIE renderuje pola RichText w embedzie, renderuje
  PlainText. Wiec: wartosci odzywcze (PlainText) siedza w embedzie, a kroki i karty
  (RichText) w elementach RichText Designera oznaczonych data-mp-kroki-html oraz
  data-mp-karta-grupa. Wszystkie te wezly niosa tresc dla crawlera i wszystkie
  chowamy przed uzytkownikiem z JS.*/
(function(){var h=document.documentElement;h.classList.add('mp-js');var d=document.head||h;
var s=document.createElement('style');
s.textContent='.mp-js [data-mp-kroki-html],.mp-js [data-mp-skladniki-html],.mp-js [data-mp-karta-grupa],.mp-js [data-mp-odz-zrodlo-100],.mp-js [data-mp-odz-zrodlo-porcja],.mp-js [data-mp-odz-zrodlo-waga]{display:none}.mp-js [data-mp-zaktualizowano]{visibility:hidden}';
d.appendChild(s);
var l=document.createElement('link');l.rel='preconnect';l.href='https://miesna-paczka.github.io';l.crossOrigin='';d.appendChild(l);
setTimeout(function(){var kroki=window.mpKrokiTabela||window.mpKrokiEmbed;
 if(!kroki||!window.mpSkladniki||!window.mpDataPl){h.classList.remove('mp-js');
  [].slice.call(document.querySelectorAll('[data-mp-zaktualizowano]')).forEach(function(e){e.style.visibility='visible'})}},8000)})();