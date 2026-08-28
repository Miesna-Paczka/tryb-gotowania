/*1.4.1 — zdjeta oslona daty i zaleznosc od mpDataPl (decyzja operatora 2026-08-28).
  DWIE ZMIANY, I DRUGA JEST WARUNKIEM PIERWSZEJ:
  1. Znikla regula `.mp-js [data-mp-zaktualizowano]{visibility:hidden}` wraz
     z odslanianiem w zaworze. Chronila przed mrugnieciem angielska data, ktora
     przepisywal mpDataPl. Pole renderuje sie juz jako `19.08.2026`, wiec nie ma
     czego chronic ani czego przepisywac; mpDataPl zdjety z tej strony.
  2. Warunek zaworu STRACIL `window.mpDataPl`. Gdyby go zostawic po usunieciu
     tamtego skryptu, warunek bylby ZAWSZE prawdziwy i zawor odpalalby na KAZDYM
     wejsciu po 8 s — zdejmujac `mp-js` i odslaniajac zrodlowa liste krokow obok
     wyrenderowanej. To ta sama awaria, ktora raz juz przeszla za stan normalny.
  Reszta bez zmian: te same wezly zrodlowe, ten sam preconnect, ten sam czas.*/
(function(){var h=document.documentElement;h.classList.add('mp-js');var d=document.head||h;
var s=document.createElement('style');
s.textContent='.mp-js [data-mp-kroki-html],.mp-js [data-mp-skladniki-html],.mp-js [data-mp-karta-grupa],.mp-js [data-mp-odz-zrodlo-100],.mp-js [data-mp-odz-zrodlo-porcja],.mp-js [data-mp-odz-zrodlo-waga]{display:none}';
d.appendChild(s);
var l=document.createElement('link');l.rel='preconnect';l.href='https://miesna-paczka.github.io';l.crossOrigin='';d.appendChild(l);
setTimeout(function(){var kroki=window.mpKrokiTabela||window.mpKrokiEmbed;
 if(!kroki||!window.mpSkladniki){h.classList.remove('mp-js')}},8000)})();
