/* mpZachetaTrybu 0.8.1 — polysk na DWOCH powierzchniach + pomiar.
 *
 * CO SIE ZMIENILO WOBEC 0.7.0
 * 1. Skrypt obsluguje teraz takze przelacznik na /produkty. Powierzchnie
 *    roznia sie selektorem pigulki, elementem niosacym stan i pamiecia —
 *    reszta (pasmo, klatki, bramka) jest wspolna.
 * 2. Doszedl POMIAR. Bez niego nie da sie ocenic, czy zacheta cokolwiek
 *    zmienia: zmierzone 2026-08-24 w PostHogu przez 30 dni —
 *      .recipe-toggle          2 klikniecia / 1 osoba
 *      .index-toggle-wrapper   0 klikniec  / 0 osob, przy 8 265 osobach
 *                              wchodzacych na /produkty z telefonu
 *    Zero na produktach jest PRAWDZIWE, nie jest slepota przyrzadu:
 *    autocapture lapie tam 9 571 klikniec w `div`, wiec ten `div` bylby
 *    zlapany, gdyby ktos w niego kliknal.
 *    Brakuje jednak mianownika — nikt nie liczyl, ILE RAZY przelacznik byl
 *    widoczny. Bez tego "2 klikniecia" nie znaczy ani "nikt nie chce",
 *    ani "nikt nie widzial". Stad `mp_toggle_shown`.
 *
 * ODLEGLOSC PRZEJAZDU jest liczona z szerokosci pigulki, nie wpisana na
 * sztywno: pigulki na obu powierzchniach maja rozna szerokosc, a wpisane
 * 236 px bylo dobre wylacznie dla przepisow.
 *
 * ZGODY: posthog stoi za Cookiebotem (`type="text/plain"`), wiec
 * `window.posthog` moze nie istniec. Kazde wywolanie jest oslonione —
 * brak zgody ma znaczyc "brak pomiaru", nie "blad na stronie".
 *
 *   ?zacheta=brak    wylacza i zapamietuje
 *   ?zacheta=polysk  wlacza z powrotem
 *   ?zacheta=reset   czysci pamiec wariantu ORAZ "juz uzyl"
 */
(function () {
  var Z = 'mp-zacheta', D = document, H = D.documentElement, w = null;

  /* Powierzchnie. `stan` to element, ktory dostaje klase stanu — na przepisach
     jest nim sama pigulka, na produktach jej przodek. */
  var POWIERZCHNIE = [
    { nazwa: 'przepisy', pigulka: '.recipe-toggle', stan: '.recipe-toggle',
      klasa: 'is-widoczny', klik: '[data-mp-gotowanie-cta]', pamiec: 'mp-tryb-otwarty' },
    { nazwa: 'produkty', pigulka: '.index-toggle-wrapper', stan: '.product-index__toolbar',
      klasa: 'product-index__toolbar--visible', klik: '.index-toggle-wrapper', pamiec: 'mp-index-uzyty' }
  ];

  try { w = new URLSearchParams(location.search).get('zacheta'); } catch (e) {}

  /* P, `uzyty` i sonda powstaja DOPIERO w `start()`. Wybor powierzchni pyta
     DOM o pigulke, a skrypt moze byc wpiety w `header` — wtedy przy parsowaniu
     nie ma jeszcze ani przelacznika, ani niczego innego z <body>, wiec
     `querySelector` zwrocilby null i skrypt cicho nie zrobilby NIC.
     Ten sam blad wylaczyl kiedys warunek stopu w 0.4.0. */
  var P = null, uzyty = 0;
  window.mpZacheta = { powierzchnia: null, wariant: w || 'domyslny', uzyty: 0,
                       wersja: '0.8.1', stan: 'czeka na DOM' };

  function ustalPowierzchnie() {
    for (var i = 0; i < POWIERZCHNIE.length && !P; i++) {
      if (D.querySelector(POWIERZCHNIE[i].pigulka)) P = POWIERZCHNIE[i];
    }
    if (!P) { window.mpZacheta.stan = 'brak przelacznika na tej stronie'; return false; }
    try {
      if (w === 'reset') { localStorage.removeItem(Z); localStorage.removeItem(P.pamiec); w = null; }
      else if (w) { localStorage.setItem(Z, w); }
      else { w = localStorage.getItem(Z); }
    } catch (e) {}
    try { uzyty = localStorage.getItem(P.pamiec); } catch (e) {}
    window.mpZacheta.powierzchnia = P.nazwa;
    window.mpZacheta.wariant = w || 'domyslny';
    window.mpZacheta.uzyty = uzyty;
    window.mpZacheta.stan = 'gotowy';
    return true;
  }

  function zmierz(zdarzenie, extra) {
    try {
      if (!window.posthog || typeof window.posthog.capture !== 'function') return false;
      var dane = { powierzchnia: P.nazwa, zacheta: (w === 'brak' || uzyty) ? 'brak' : 'polysk' };
      for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) dane[k] = extra[k];
      window.posthog.capture(zdarzenie, dane);
      return true;
    } catch (e) { return false; }
  }

  /* ── Pomiar: raz na odslonie, gdy przelacznik STAJE SIE widoczny ─────────
     Mianownik dla klikniec. Obserwujemy klase stanu, bo to ona rozstrzyga
     o widocznosci — IntersectionObserver widzialby element takze wtedy, gdy
     jest przezroczysty i odsuniety poza krawedz. */
  function pilnujPokazania() {
    var stan = D.querySelector(P.stan);
    if (!stan) return;
    var zgloszone = false;
    function sprawdz() {
      if (zgloszone || !stan.classList.contains(P.klasa)) return;
      zgloszone = true;
      obs.disconnect();
      zmierz('mp_toggle_shown', {});
    }
    var obs = new MutationObserver(sprawdz);
    obs.observe(stan, { attributes: true, attributeFilter: ['class'] });
    sprawdz();
  }

  function pilnujKlikniecia() {
    var cel = D.querySelector(P.klik);
    if (!cel) return;
    cel.addEventListener('click', function () {
      zmierz('mp_toggle_clicked', {});
      try { localStorage.setItem(P.pamiec, '1'); } catch (e) {}
      H.removeAttribute('data-z');
    }, { once: true });
  }

  /* ── Zacheta ───────────────────────────────────────────────────────────── */
  function zacheta() {
    if (w === 'brak' || uzyty) return;
    var pig = D.querySelector(P.pigulka);
    if (!pig) return;

    /* Przejazd liczony z szerokosci pigulki. Pigulka ma szerokosc takze
       wtedy, gdy jest odsunieta i przezroczysta — jest ulozona, nie ukryta. */
    var szer = Math.round(pig.getBoundingClientRect().width) || 200;
    var start = -46, koniec = szer + 37;

    var s = D.createElement('style');
    s.id = 'mpz';
    s.textContent =
      '[data-z] ' + P.pigulka + '{position:relative;overflow:hidden}' +
      '[data-z] ' + P.pigulka + ':after{content:"";position:absolute;top:-40%;left:0;width:30px;' +
        'height:180%;rotate:-20deg;translate:' + start + 'px;opacity:0;' +
        'background:linear-gradient(90deg,#0000,#4876224a,#0000);' +
        'animation:mpP 4s linear 1.4s infinite}' +
      '@keyframes mpP{0%{translate:' + start + 'px;opacity:0}1%,26%{opacity:1}' +
        '26%,100%{translate:' + koniec + 'px}27%,100%{opacity:0}}' +
      '@media(prefers-reduced-motion){[data-z] ' + P.pigulka + ':after{animation:none}}';
    D.head.appendChild(s);
    H.setAttribute('data-z', '');
    window.mpZacheta.przejazd = [start, koniec];
  }

  function start() {
    if (!ustalPowierzchnie()) return;
    zacheta(); pilnujPokazania(); pilnujKlikniecia();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})();
