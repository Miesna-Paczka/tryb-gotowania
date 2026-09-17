/* mpWejscie 1.3.3 — KOPIA SKRYPTU ZDJĘTEGO ZE STRONY, dla zapisu.
 *
 * Nie był nigdy prowadzony w repozytorium: mieszkał WYŁĄCZNIE w bloku custom
 * code stopki szablonu `detail_przepisy` (page id 6a574b13929618407b161667),
 * więc bez tego pliku zniknąłby bez śladu razem z podmianą bloku. Ta sama
 * klasa co `mpJsonLd-1.2.0.html` obok.
 *
 * CO ROBIŁ. Dwie rzeczy, obie będące wejściem do trybu pełnoekranowego:
 *   1. budował baner `.mp-wejscie` („włącz tryb gotowania / ekran nie gaśnie,
 *      gdy masz zajęte ręce”) nad tytułem sekcji kroków i wysyłał z niego
 *      syntetyczny klik na `[data-mp-gotowanie-cta]`, czyli tą samą ścieżką
 *      co stare pływające CTA;
 *   2. dopinał pastylki `.mp-minutnik` do kroków z minutnikiem i otwierał
 *      z nich overlay od konkretnego kroku (`MP.tryb.otworz(..., {krok: n})`).
 *
 * DLACZEGO ZDJĘTY. Tryb pełnoekranowy schodzi z serwisu. Przez 90 dni do
 * 2026-09-17: 2429 osób obejrzało przepis, 39 otworzyło tryb, 3 doszły w nim
 * do końca, 4 uruchomiły minutnik. Baner zostaje — w wersji 2.0.0 obok —
 * ale trzyma odtąd blokadę wygaszania ekranu, a nie otwiera overlaya.
 * Pastylki minutników znikają razem z tym, do czego prowadziły.
 *
 * Wyciągnięty maszynowo z opublikowanej strony (regexp po `WERSJA = '1.3.3'`),
 * nie przepisany ręcznie — 8907 znaków, sha256 pierwszych 16: 352d926dd0d129bd.
 */
(function () {
  'use strict';
  var WERSJA = '1.3.3';
  var IKONA = 'M419-80q-28 0-52.5-12T325-126L107-403l19-20q20-21 48-25t52 11l74 45v-328q0-17 11.5-28.5T340-760q17 0 29 11.5t12 28.5v472l-97-60 104 133q6 7 14 11t17 4h221q33 0 56.5-23.5T720-240v-160q0-17-11.5-28.5T680-440H461v-80h219q50 0 85 35t35 85v160q0 66-47 113T640-80H419ZM167-620q-13-22-20-47.5t-7-52.5q0-83 58.5-141.5T340-920q83 0 141.5 58.5T540-720q0 27-7 52.5T513-620l-69-40q8-14 12-28.5t4-31.5q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 17 4 31.5t12 28.5l-69 40Zm335 280Z';
  var slad = window.mpWejscie;
  if (slad) { slad.razy = (slad.razy || 1) + 1; }
  else {
    slad = window.mpWejscie = {
      wersja: WERSJA, razy: 1, baner: false, znacznikow: 0, krokow: 0,
      model: false, czekano: 0, rozjazdTytulow: null, powod: null,
      etap: 'zaladowany', pilnujeStanu: false,
      wierszyRenderu: null, celZnacznikow: null
    };
  }
  function svgDotyku() {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'mp-minutnik__ikona');
    s.setAttribute('viewBox', '0 -960 960 960');
    s.setAttribute('width', '16'); s.setAttribute('height', '16');
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('fill', 'currentColor'); p.setAttribute('d', IKONA);
    s.appendChild(p); return s;
  }
  var obserwatorTrybu = null;
  function zsynchronizujBaner(korzen) {
    var b = document.querySelector('.mp-wejscie');
    if (!b) return;
    b.setAttribute('aria-checked', korzen.hasAttribute('data-otwarty') ? 'true' : 'false');
  }
  function pilnujStanuTrybu() {
    if (obserwatorTrybu) return true;
    var MP = window.MP;
    var korzen = (MP && MP.tryb && typeof MP.tryb.korzen === 'function') ? MP.tryb.korzen() : null;
    if (!korzen) return false;
    obserwatorTrybu = new MutationObserver(function () { zsynchronizujBaner(korzen); });
    obserwatorTrybu.observe(korzen, { attributes: true, attributeFilter: ['data-otwarty'] });
    zsynchronizujBaner(korzen);
    slad.pilnujeStanu = true;
    return true;
  }
  function dociskajPilnowanie() {
    if (pilnujStanuTrybu()) return;
    var n = 0;
    var id = setInterval(function () {
      if (pilnujStanuTrybu() || ++n > 60) clearInterval(id);
    }, 200);
  }
  function otworzPrzezCta() {
    var c = document.querySelector('[data-mp-gotowanie-cta]');
    if (!c) { slad.powod = 'brak [data-mp-gotowanie-cta]'; return false; }
    c.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }
  function zbudujBaner() {
    var stack = document.querySelector('.recipe-steps__stack');
    var h = stack && stack.querySelector('.recipe-steps__title');
    if (!stack || !h) { slad.powod = 'brak .recipe-steps__stack / __title'; return null; }
    if (stack.querySelector('.mp-wejscie')) { slad.baner = true; return null; }
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'mp-wejscie';
    b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', 'false');
    b.setAttribute('data-mp-wejscie', '');
    var t = document.createElement('span'); t.className = 'mp-wejscie__tresc';
    var tyt = document.createElement('span'); tyt.className = 'mp-wejscie__tytul body-large';
    tyt.textContent = 'włącz tryb gotowania';
    var pod = document.createElement('span'); pod.className = 'mp-wejscie__podtytul caption';
    pod.textContent = 'ekran nie gaśnie, gdy masz zajęte ręce';
    t.appendChild(tyt); t.appendChild(pod);
    var tor = document.createElement('span'); tor.className = 'mp-wejscie__tor';
    tor.setAttribute('aria-hidden', 'true');
    var oko = document.createElement('span'); oko.className = 'mp-wejscie__oko';
    tor.appendChild(oko);
    b.appendChild(t); b.appendChild(tor);
    stack.insertBefore(b, h);
    b.addEventListener('click', function () {
      b.setAttribute('aria-checked', 'true');
      otworzPrzezCta();
      dociskajPilnowanie();
    });
    slad.baner = true; return b;
  }
  function otworzOdKroku(n) {
    var MP = window.MP;
    if (!(MP && MP.model && MP.tryb && MP.przepis)) return false;
    var por = (window.mpGotowanie && window.mpGotowanie.porcje) || MP.model.porcjeBazowe || 2;
    try {
      MP.tryb.otworz(MP.przepis.naPorcje(MP.model, por), { model: MP.model, porcje: por, krok: n });
      dociskajPilnowanie();
      return true;
    } catch (e) { slad.powod = 'otworz: ' + String(e).slice(0, 80); return false; }
  }
  function zbudujZnacznik(nr, etykieta) {
    var zn = document.createElement('button');
    zn.type = 'button'; zn.className = 'mp-minutnik';
    zn.setAttribute('data-mp-minutnik-krok', String(nr));
    zn.setAttribute('aria-label', 'włącz tryb gotowania od kroku ' + nr + ', minutnik ' + etykieta);
    var min = document.createElement('span'); min.className = 'mp-minutnik__min';
    min.textContent = etykieta;
    zn.appendChild(min); zn.appendChild(svgDotyku());
    return zn;
  }
  function podepnijDotyk(kontener) {
    if (!kontener || kontener.hasAttribute('data-mp-minutnik-bound')) return;
    kontener.setAttribute('data-mp-minutnik-bound', '');
    kontener.addEventListener('click', function (ev) {
      if (!window.matchMedia('(max-width: 479px)').matches) return;
      var t = ev.target;
      if (t && t.closest && t.closest('a')) return;
      var w = t && t.closest ? t.closest('[data-mp-minutnik]') : null;
      if (!w) return;
      ev.preventDefault();
      otworzOdKroku(parseInt(w.getAttribute('data-mp-minutnik'), 10));
    });
  }
  function dopnijZnaczniki() {
    var MP = window.MP;
    if (!(MP && MP.model)) { slad.powod = 'brak MP.model'; return; }
    if (!MP.model.kroki) { slad.powod = 'MP.model bez pola kroki'; return; }
    if (!MP.przepis) { slad.powod = 'brak MP.przepis'; return; }
    var kroki = MP.model.kroki;
    var zrodlo = [].slice.call(document.querySelectorAll('li[id^="krok-"]'));
    var render = [].slice.call(document.querySelectorAll('.mp-krok__row'));
    slad.krokow = zrodlo.length;
    slad.wierszyRenderu = render.length;
    if (!zrodlo.length) { slad.powod = 'zero <li id=krok-*>'; return; }
    var rozjazd = 0, i, j;
    for (i = 0; i < Math.min(kroki.length, zrodlo.length); i++) {
      var st = zrodlo[i].querySelector('strong');
      var wDom = st ? st.textContent.trim() : '';
      if (wDom && kroki[i].tytul && wDom !== String(kroki[i].tytul).trim()) rozjazd++;
    }
    slad.rozjazdTytulow = rozjazd;
    if (rozjazd) { slad.powod = 'rozjazd tytulow model-zrodlo: ' + rozjazd; return; }
    var doRenderu = render.length === zrodlo.length;
    slad.celZnacznikow = doRenderu ? '.mp-krok__row' : 'li[id^=krok-] (droga zapasowa)';
    for (j = 0; j < Math.min(kroki.length, zrodlo.length); j++) {
      var k = kroki[j];
      if (!k.minutnik || !k.minutnik.sekundy) continue;
      var nr = j + 1;
      var etykieta = MP.przepis.formatCzas(k.minutnik.sekundy);
      if (doRenderu) {
        var wiersz = render[j];
        if (!wiersz.querySelector('.mp-minutnik')) {
          var tekst = wiersz.querySelector('.mp-krok__text') || wiersz;
          var znR = zbudujZnacznik(nr, etykieta);
          znR.className += ' mp-minutnik--wiodacy';
          tekst.insertBefore(znR, tekst.firstChild);
          wiersz.setAttribute('data-mp-minutnik', String(nr));
          slad.znacznikow++;
        }
      }
      var li = zrodlo[j];
      if (!li.querySelector('.mp-minutnik')) {
        var znZ = zbudujZnacznik(nr, etykieta);
        var strong = li.querySelector('strong');
        if (strong && strong.parentNode === li) li.insertBefore(znZ, strong.nextSibling);
        else li.insertBefore(znZ, li.firstChild);
        li.setAttribute('data-mp-minutnik', String(nr));
        if (!doRenderu) slad.znacznikow++;
      }
    }
    slad.model = true;
    podepnijDotyk(doRenderu ? (render[0] && render[0].parentNode) : zrodlo[0].parentNode);
  }
  function tik() {
    pilnujStanuTrybu();
    if (!slad.baner) zbudujBaner();
    if (!slad.model && window.MP && window.MP.model) dopnijZnaczniki();
    var gotowe = slad.baner && slad.model;
    if (gotowe) slad.powod = null;
    return gotowe;
  }
  function start() {
    if (slad.etap !== 'gotowe') slad.etap = 'start';
    if (tik()) { slad.etap = 'gotowe'; return; }
    var KROK = 300, LIMIT = 20000, t = 0;
    slad.etap = 'czekam';
    var id = setInterval(function () {
      t += KROK; slad.czekano = t;
      if (tik()) { clearInterval(id); slad.etap = 'gotowe'; return; }
      if (t >= LIMIT) { clearInterval(id); slad.etap = 'poddalem sie'; slad.powod = slad.powod || 'nie zebralem kompletu w ' + LIMIT + ' ms'; }
    }, KROK);
  }
  slad.readyStatePrzyStarcie = document.readyState;
  start();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
})();
