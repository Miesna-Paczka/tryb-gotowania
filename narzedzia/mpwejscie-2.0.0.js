/* mpWejscie 2.0.0 — przełącznik trzyma EKRAN, nie otwiera overlaya.
 *
 * Miejsce zastosowania: blok custom code w STOPCE szablonu `detail_przepisy`
 * (page id 6a574b13929618407b161667), razem z arkuszem `.mp-wejscie*`, który
 * zostaje bez zmian. Nie jest to skrypt rejestrowany — limit 2000 znaków na
 * `register_inline_script` go nie dotyczy.
 *
 * CO SIĘ ZMIENIŁO WOBEC 1.3.3 (kopia w `archiwum/mpWejscie-1.3.3.js`):
 * zniknęły OBA wejścia do trybu pełnoekranowego — syntetyczny klik na
 * `[data-mp-gotowanie-cta]` i pastylki `.mp-minutnik` przy krokach. Został
 * sam baner, z tą samą geometrią, tymi samymi klasami i tym samym podtytułem,
 * bo podtytuł od początku opisywał blokadę wygaszania, a nie overlay.
 *
 * CZTERY RZECZY, KTÓRYCH TEN KOD ŚWIADOMIE NIE ROBI:
 *
 * (1) NIE RYSUJE PRZEŁĄCZNIKA BEZ API. `navigator.wakeLock` nie istnieje
 *     w Safari poniżej 16.4 ani w kontekście nie-bezpiecznym. Kontrolka,
 *     która obiecuje i milczy, jest gorsza niż jej brak — dokładnie ta sama
 *     nauka co z pauzy minutnika, gdzie 13 z 15 kombinacji stanu było martwych,
 *     a przycisk dalej stał na ekranie.
 *
 * (2) NIE ZOSTAWIA PRZEŁĄCZNIKA WŁĄCZONEGO PO ODMOWIE. Android przy niskiej
 *     baterii odrzuca `request('screen')`. Włączony przełącznik bez blokady
 *     to obietnica, której nie ma kto dotrzymać, więc odmowa go gasi.
 *
 * (3) NIE ZAKŁADA, ŻE BLOKADA PRZEŻYJE SCHOWANIE KARTY. Przeglądarka zwalnia
 *     ją SAMA przy `visibilitychange` i jest to udokumentowane zachowanie,
 *     nie usterka — dlatego przy powrocie prosimy o nią ponownie. Bez tego
 *     przełącznik zostaje włączony, a ekran zaczyna gasnąć.
 *
 * (4) NIE PAMIĘTA STANU DŁUŻEJ NIŻ KARTA. `sessionStorage`, nie `localStorage`:
 *     stan przeżywa przejście na inny przepis w tej samej karcie i ginie razem
 *     z nią. Pamięć trwała trzymałaby blokadę ekranu na stronach, na których
 *     nikt nie gotuje.
 *
 * PRÓG 479 px JEST W DWÓCH MIEJSCACH — tutaj (`MQ`) i w `@media` arkusza obok.
 * Muszą się zgadzać. Rozjechane dadzą przełącznik obecny w DOM-ie, niewidoczny
 * i trzymający blokadę, albo widoczny i nieobsłużony.
 *
 * Stan wystawiony do pomiaru: `window.mpEkran`.
 */
(function () {
  'use strict';
  var WERSJA = '2.0.0';
  var PAMIEC = 'mp-ekran';                 /* sessionStorage: '1' = włączony */
  var OPIS_ID = 'mp-wejscie-opis';         /* wiąże podtytuł z przyciskiem (aria-describedby) */
  var MQ = '(max-width: 479px)';           /* MUSI zgadzać się z @media dla .mp-wejscie */

  var api = navigator.wakeLock;
  var jestApi = !!(api && typeof api.request === 'function');

  var slad = window.mpEkran = {
    wersja: WERSJA, api: jestApi, baner: false,
    chcemy: false, trzyma: false, prob: 0, odmow: 0, powod: null
  };

  var blokada = null, chcemy = false, przel = null;

  /* posthog stoi za Cookiebotem (`type="text/plain"`), więc może nie istnieć.
     Brak zgody ma znaczyć „brak pomiaru", nie „błąd na stronie". */
  function zmierz(nazwa, dane) {
    try {
      if (window.posthog && typeof window.posthog.capture === 'function') {
        window.posthog.capture(nazwa, dane || {});
      }
    } catch (e) {}
  }

  function rysuj() {
    slad.chcemy = chcemy;
    slad.trzyma = !!(blokada && !blokada.released);
    if (przel) przel.setAttribute('aria-checked', chcemy ? 'true' : 'false');
  }

  function wez() {
    if (!chcemy || !jestApi) return;
    if (blokada && !blokada.released) return;
    if (document.visibilityState !== 'visible') return;   /* niewidoczna karta = pewna odmowa */
    slad.prob++;
    api.request('screen').then(function (b) {
      if (!chcemy) { try { b.release(); } catch (e) {} return; }  /* zgasili, nim wróciła obietnica */
      blokada = b;
      slad.powod = null;
      b.addEventListener('release', function () {
        if (blokada === b) blokada = null;
        rysuj();
      });
      rysuj();
    }, function (e) {
      slad.odmow++;
      slad.powod = (e && e.name) || 'odmowa';
      blokada = null;
      chcemy = false;
      try { sessionStorage.removeItem(PAMIEC); } catch (x) {}
      rysuj();
      zmierz('wake_lock_denied', { powod: slad.powod, wersja: WERSJA });
    });
  }

  function pusc() {
    var b = blokada;
    blokada = null;
    if (b) { try { b.release(); } catch (e) {} }
    rysuj();
  }

  function przelacz() {
    chcemy = !chcemy;
    try {
      if (chcemy) sessionStorage.setItem(PAMIEC, '1');
      else sessionStorage.removeItem(PAMIEC);
    } catch (e) {}
    rysuj();
    if (chcemy) wez(); else pusc();
    zmierz(chcemy ? 'wake_lock_on' : 'wake_lock_off', { wersja: WERSJA });
  }

  function zbuduj() {
    var stos = document.querySelector('.recipe-steps__stack');
    var tyt = stos && stos.querySelector('.recipe-steps__title');
    if (!stos || !tyt) return false;

    var byl = stos.querySelector('.mp-wejscie');
    if (byl) { przel = byl; slad.baner = true; rysuj(); return true; }

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'mp-wejscie';
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', 'false');
    /* `aria-describedby`, a nie sama treść przycisku: przy `role="switch"`
       czytnik ogłasza NAZWĘ kontrolki i jej stan („tryb gotowania, przełącznik,
       niezaznaczony"). Nazwa mówi, czym to jest; co robi, mówi dopiero podtytuł,
       więc bez tego wiązania cała obietnica nie dociera do osoby, która nie
       widzi ekranu. Dług zastany po 1.3.3, nie nowy — ale zamyka się jedną
       linią, a druga okazja się nie trafi. */
    b.setAttribute('aria-describedby', OPIS_ID);
    b.setAttribute('data-mp-wejscie', '');

    var t = document.createElement('span'); t.className = 'mp-wejscie__tresc';
    var h = document.createElement('span'); h.className = 'mp-wejscie__tytul body-large';
    h.textContent = 'tryb gotowania';
    var p = document.createElement('span'); p.className = 'mp-wejscie__podtytul caption';
    p.id = OPIS_ID;
    p.textContent = 'ekran nie gaśnie, gdy masz zajęte ręce';
    t.appendChild(h); t.appendChild(p);

    var tor = document.createElement('span'); tor.className = 'mp-wejscie__tor';
    tor.setAttribute('aria-hidden', 'true');
    var oko = document.createElement('span'); oko.className = 'mp-wejscie__oko';
    tor.appendChild(oko);

    b.appendChild(t); b.appendChild(tor);
    b.addEventListener('click', przelacz);
    stos.insertBefore(b, tyt);

    przel = b;
    slad.baner = true;
    rysuj();
    return true;
  }

  function start() {
    if (!jestApi) { slad.powod = 'brak navigator.wakeLock'; return; }
    if (!window.matchMedia(MQ).matches) { slad.powod = 'powyżej progu'; return; }

    try { chcemy = sessionStorage.getItem(PAMIEC) === '1'; } catch (e) {}

    /* Sekcja kroków bywa jeszcze nierozrysowana — ten sam limit i ten sam krok
       co w 1.3.3, żeby zachowanie przy wolnym CMS-ie się nie zmieniło. */
    if (!zbuduj()) {
      var t = 0, id = setInterval(function () {
        t += 300;
        if (zbuduj() || t >= 20000) clearInterval(id);
      }, 300);
    }
    if (chcemy) wez();

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') wez(); else rysuj();
    });
    window.addEventListener('pagehide', pusc);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
