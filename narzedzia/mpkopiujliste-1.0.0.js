/* mpKopiujListe 1.0.0 — KOPIA SKRYPTU ZE STRONY, trzymana dla suchego biegu.
 * Obsługuje przycisk „kopiuj listę" delegacją na `[data-mp-kopiuj-slot]` i czyta
 * WYRENDEROWANE wiersze `.recipe-ing__row`, więc bierze to, co narysował silnik
 * listy — dlatego `mpSkladniki` nie ma prawa podpinać własnego słuchacza na ten
 * sam przycisk. Kopia z rejestru Webflow (site 6983617613052dc9fe624303).
 */
(function(){var D=document;
function build(){var o=[];
[].forEach.call(D.querySelectorAll('.recipe-ing__row'),function(r){
if(getComputedStyle(r).display==='none')return;
var t=r.querySelector('.recipe-ing__text');if(!t)return;
var s=t.textContent.replace(/\s+/g,' ').trim();if(s)o.push('- '+s);});
if(!o.length)return '';
var h=D.querySelector('h1'),c=D.querySelector('.recipe-ing__count'),d=[];
d.push('Lista zakupów'+(h?': '+h.textContent.trim():''));
if(c)d.push(c.textContent.replace(/\s+/g,' ').trim());d.push('');
return d.concat(o).join('\n')+'\n\n'+location.origin+location.pathname;}
function legacy(s){var a=D.createElement('textarea');a.value=s;a.setAttribute('readonly','');
a.style.cssText='position:fixed;top:-1000px;opacity:0';D.body.appendChild(a);a.select();
var ok=false;try{ok=D.execCommand('copy');}catch(e){}D.body.removeChild(a);
return ok?Promise.resolve():Promise.reject(new Error('copy'));}
function copy(s){if(navigator.clipboard&&navigator.clipboard.writeText)
return navigator.clipboard.writeText(s).catch(function(){return legacy(s);});
return legacy(s);}
D.addEventListener('click',function(e){var n=e.target;if(!n||!n.closest)return;
var slot=n.closest('[data-mp-kopiuj-slot]');if(!slot)return;
var btn=n.closest('a,button');if(!btn||!slot.contains(btn))return;
e.preventDefault();if(btn.getAttribute('data-mp-busy')==='1')return;
var lbl=btn.querySelector('.text-button')||btn;
var orig=btn.getAttribute('data-mp-label')||lbl.textContent;
btn.setAttribute('data-mp-label',orig);btn.setAttribute('data-mp-busy','1');
function back(){setTimeout(function(){lbl.textContent=orig;btn.setAttribute('data-mp-busy','0');},2000);}
var s=build();
if(!s){lbl.textContent='brak listy';back();return;}
copy(s).then(function(){lbl.textContent='skopiowano';},
function(){lbl.textContent='nie udało się';}).then(back);},false);})();
