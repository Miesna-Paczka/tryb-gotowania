/* mpKartyPrzepisu 1.0.0 — KOPIA SKRYPTU, KTÓRY ROZDZIELA KARTY NA STRONIE.
 *
 * Nie nasz plik. Jest to skrypt zarejestrowany w Webflow (`mpkartyprzepisu`,
 * wersja 1.0.0, `createdOn` 2026-08-12), zastosowany W STOPCE szablonu
 * `detail_przepisy`. Leży tu wyłącznie po to, żeby `suchy-bieg-kart-przechowywania.mjs`
 * mierzył NA TYM, CO NAPRAWDĘ BIEGNIE na stronie, a nie na naszym wyobrażeniu o nim.
 *
 * Skąd wzięliśmy się przy nim 2026-08-19: nagłówek „przechowywanie i odgrzewanie"
 * sklejał się z treścią akapitu. Dane były czyste (pole ma pytanie i odpowiedź
 * w osobnych wierszach), a `podzielKarty` z `przepis-parser.js` NIE JEST wołane
 * przez `zaladuj()` — więc kart nie dzielił nikt z naszej strony. Dzieli je ten
 * skrypt, po atrybutach szablonu: grupa `[data-mp-karty]` musi zawierać
 * `[data-mp-zrodlo]` (surowy tekst) i `[data-mp-karta-wzor]` (wzór karty
 * z `[data-mp-karta-pytanie]` i `[data-mp-karta-odpowiedz]`). Grupa przechowywania
 * nie miała żadnego z tych atrybutów, więc surowe pole renderowało się jako
 * jeden akapit — a pytanie i odpowiedź lądowały w jednym ciągu tekstu.
 *
 * JEŚLI KTOŚ ZMIENI SKRYPT W WEBFLOW, ta kopia się zestarzeje po cichu.
 * Kopię odświeża się przez `data_scripts_tool > get_registered_script`
 * (`site_id` 6983617613052dc9fe624303, `script_id` mpkartyprzepisu).
 */
!function(){function t(){Array.prototype.forEach.call(document.querySelectorAll("[data-mp-karty]"),function(t){var e=t.querySelector("[data-mp-zrodlo]"),r=t.querySelector("[data-mp-karta-wzor]");if(e&&r){var a,n,o=(a=e.textContent,n=[],String(a||"").replace(/\r\n?/g,"\n").split(/\n\s*\n/).forEach(function(t){var e=t.split("\n").map(function(t){return t.trim()}).filter(Boolean);if(e.length){for(var r={k:null,s:null};e.length;){var a=e[0].match(/^#([A-Za-z0-9_-]+)\s*$/),o=e[0].match(/^kr[oó]tko\s*:\s*(.+)$/i);if(a)r.k=a[1],e.shift();else{if(!o)break;r.s=o[1].trim(),e.shift()}}e.length&&(r.q=e.shift(),r.a=e.join(" ").replace(/\{\{url:([^}]+)\}\}/g,function(t,e){return"↗ "+e.split("/").pop().replace(/-/g," ")}).replace(/\s{2,}/g," ").trim(),n.push(r))}}),n);if(o.length){var i=r.parentNode,l=r.nextSibling;o.forEach(function(t){var e=r.cloneNode(!0);e.removeAttribute("data-mp-karta-wzor"),e.setAttribute("data-mp-karta",""),t.k&&e.setAttribute("data-mp-klucz",t.k),t.s&&e.setAttribute("data-mp-krotko",t.s);var a=e.querySelector("[data-mp-karta-pytanie]"),n=e.querySelector("[data-mp-karta-odpowiedz]");a&&(a.textContent=t.q),n&&(n.textContent=t.a),i.insertBefore(e,l)}),i.removeChild(r)}else t.setAttribute("hidden","")}})}"loading"!==document.readyState?t():document.addEventListener("DOMContentLoaded",t)}();
