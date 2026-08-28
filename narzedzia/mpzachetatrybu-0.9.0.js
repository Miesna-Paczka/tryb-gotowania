/* mpZachetaTrybu 0.9.0 — polysk na DWOCH powierzchniach + pomiar.
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
                       wersja: '0.9.0', stan: 'czeka na DOM' };

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
    /* BARWA I TEMPO (0.9.0). Pasmo jest w pomaranczu CTA `--primary-cta`
       (#e55529), tak jak obramowanie szyny przelacznika — wczesniej oba byly
       w zieleni `--secondary-text`.

       Czestotliwosc +29%: cykl 4 s -> 3,1 s. Procenty klatek sa przeliczone,
       bo DLUGOSC PRZEJAZDU ma zostac bez zmian — inaczej krotszy cykl skrocilby
       tez sam przejazd i cofnalby decyzje „spowolnij efekt o 10-20%".
         przejazd  0 -> 26% z 4000 ms = 1040 ms
                   0 -> 34% z 3100 ms = 1054 ms   (+1,3%, w granicach pomiaru)
         gaszenie  27% -> 35%

       Krycie zostaje na 29%. Pomaranc na bezu `#F1ECDF` ma o 8% mniejsza
       roznice LUMINANCJI niz zielen przy tej samej alfie (123,7 vs 133,9 na
       jednostke krycia), ale duzo wieksza roznice barwy — wiec spodziewam sie,
       ze bedzie czytac sie MOCNIEJ, nie slabiej. Jedna zmienna naraz: barwa.
       Jesli okaze sie za mocne, alfa jest jedna liczba do zejscia. */
    var szer = Math.round(pig.getBoundingClientRect().width) || 200;
    var start = -46, koniec = szer + 37;

    /* `position` USTAWIAMY TYLKO WTEDY, GDY ELEMENT JEST STATYCZNY.
       Pasmo jest pozycjonowane absolutnie, wiec potrzebuje przodka z blokiem
       zawierajacym — ale kazda niestatyczna wartosc juz go daje.
       Wpisane na sztywno `position:relative` NADPISALO `position:fixed`
       pigulki na /produkty i wyrzucilo plywajacy przelacznik w przeplyw
       dokumentu. Zmierzone przy 390 px, z wczytanym arkuszem: pigulka
       0,952 358x48 zamiast 131,714 243x48 — czyli 108 px PONIZEJ dolnej
       krawedzi ekranu i rozciagnieta na cala szerokosc.
       Na /przepisy tego nie bylo widac, bo tam pigulka jest STATYCZNYM
       dzieckiem plywajacego rodzica — ta sama regula, dwie rozne role. */
    var poz = getComputedStyle(pig).position;
    var pozycjonowanie = poz === 'static' ? 'position:relative;' : '';

    var s = D.createElement('style');
    s.id = 'mpz';
    s.textContent =
      '[data-z] ' + P.pigulka + '{' + pozycjonowanie + 'overflow:hidden}' +
      '[data-z] ' + P.pigulka + ':after{content:"";position:absolute;top:-40%;left:0;width:30px;' +
        'height:180%;rotate:-20deg;translate:' + start + 'px;opacity:0;' +
        'background:linear-gradient(90deg,#0000,#e555294a,#0000);' +
        'animation:mpP 3.1s linear 1.4s infinite}' +
      '@keyframes mpP{0%{translate:' + start + 'px;opacity:0}1%,34%{opacity:1}' +
        '34%,100%{translate:' + koniec + 'px}35%,100%{opacity:0}}' +
      '@media(prefers-reduced-motion){[data-z] ' + P.pigulka + ':after{animation:none}}';
    D.head.appendChild(s);
    H.setAttribute('data-z', '');
    window.mpZacheta.przejazd = [start, koniec];
    window.mpZacheta.pozycja = poz;
  }

  function start() {
    if (!ustalPowierzchnie()) return;
    zacheta(); pilnujPokazania(); pilnujKlikniecia();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})();
