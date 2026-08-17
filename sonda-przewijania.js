/* sonda-przewijania.js — PRZYRZĄD DIAGNOSTYCZNY, NIE CZĘŚĆ PRODUKTU.
 *
 * Powód powstania: 2026-08-17 operator zgłosił po raz trzeci, że rozwiniętej listy
 * składników nie da się przewinąć do końca — iPhone 17 Pro Max, Chrome na iOS,
 * dotyk, „ekran stoi całkowicie nieruchomo". Silnik to WebKit; ŻADEN pomiar tego
 * łańcucha nie powstał na WebKicie, wszystkie na Blinku. Sterownik przeglądarki
 * nie umie zadać gestu do zawartości iframe'a (zmierzone i potwierdzone kontrolą,
 * STAN.md 2026-08-17), więc jedynym przyrządem, który dosięga defektu, jest odczyt
 * NA URZĄDZENIU OPERATORA.
 *
 * Sonda rozstrzyga JEDNO pytanie, ostro i binarnie:
 *   `m` rośnie, a `st` stoi  → zdarzenia dochodzą, kontener ODMAWIA przewijania.
 *                              Przyczyna w CSS/layoucie (blokada `<body>`,
 *                              `overscroll-behavior`, wysokość TOP-u).
 *   `m` stoi                 → zdarzeń NIE MA. Przyczyna w trafianiu albo w tym,
 *                              że WebKit w ogóle nie zaczyna gestu na tym elemencie.
 *
 * DWIE WŁASNOŚCI, KTÓRE CZYNIĄ JĄ PRZYRZĄDEM, A NIE INGERENCJĄ — nie zdejmować:
 *   1. panel ma `pointer-events:none` — nie może przechwycić ani jednego dotknięcia,
 *      więc nie zmienia tego, co mierzy;
 *   2. nasłuchy są `{passive:true, capture:true}` — `passive` odbiera im prawo do
 *      `preventDefault()`, czyli do zmiany zachowania, a `capture` na `document`
 *      stawia je PRZED każdym `stopPropagation()` w produkcie, więc liczą zdarzenia
 *      nawet wtedy, gdy coś je dalej wycina.
 * Sonda nie odpala się bez `?mp-sonda=1` w adresie.
 *
 * PO POMIARZE USUNĄĆ. Ten plik nie ma prawa dożyć taga wersji.
 */
(function () {
  'use strict';

  if (!/[?&]mp-sonda=1/.test(location.search)) return;

  var panel = null;
  var top = null;
  var licz = { start: 0, move: 0, end: 0, scroll: 0 };
  var y0 = null, dyMax = 0, stMax = 0;

  function ekran() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'mp-sonda';
    /* z-index ponad overlayem (2147483000), żeby odczyt był widoczny na kroku. */
    panel.style.cssText =
      'position:fixed;left:0;right:0;top:0;z-index:2147483600;pointer-events:none;' +
      'background:rgba(0,0,0,.85);color:#5f5;padding:5px 7px;white-space:pre;' +
      'font:11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.2px';
    document.body.appendChild(panel);
    return panel;
  }

  /* Nasłuchy na `document`, faza przechwytywania — patrz nagłówek. Rejestrujemy je
     RAZ, niezależnie od tego, czy overlay już istnieje: gest, który nie doszedł,
     jest tak samo ważnym wynikiem jak gest, który doszedł. */
  function licznik(nazwa) {
    return function (e) {
      licz[nazwa]++;
      var t = e.touches && e.touches[0];
      if (nazwa === 'start' && t) { y0 = t.clientY; dyMax = 0; }
      if (nazwa === 'move' && t && y0 !== null) {
        var d = Math.abs(t.clientY - y0);
        if (d > dyMax) dyMax = d;
      }
    };
  }
  document.addEventListener('touchstart', licznik('start'), { passive: true, capture: true });
  document.addEventListener('touchmove', licznik('move'), { passive: true, capture: true });
  document.addEventListener('touchend', licznik('end'), { passive: true, capture: true });
  /* `scroll` nie bąbelkuje — bez `capture` na `document` nie zobaczylibyśmy
     przewijania kontenera wcale, a to jest połowa odpowiedzi. */
  document.addEventListener('scroll', function () { licz.scroll++; }, { passive: true, capture: true });

  function liczba(n) { return Math.round(n); }

  function odczyt() {
    var korzen = document.getElementById('mp-tryb');
    var otwarty = !!(korzen && korzen.hasAttribute('data-otwarty'));
    if (!otwarty) {
      ekran().textContent = 'SONDA · tryb zamknięty — otwórz „gotuj krok po kroku"\n' +
        'touch s=' + licz.start + ' m=' + licz.move + ' e=' + licz.end +
        '  scroll=' + licz.scroll + '  dY=' + liczba(dyMax);
      return;
    }
    top = korzen.querySelector('.mp-tryb__top');
    if (!top) { ekran().textContent = 'SONDA · brak .mp-tryb__top'; return; }

    var st = top.scrollTop, sh = top.scrollHeight, ch = top.clientHeight;
    if (st > stMax) stMax = st;
    var cs = getComputedStyle(top);
    var reszta = korzen.querySelector('.mp-tryb__reszta');
    var ost = korzen.querySelectorAll('.mp-tryb__reszta li');
    ost = ost.length ? ost[ost.length - 1] : null;

    /* v2 — POMIAR ROZSTRZYGAJĄCY. Sonda v1 pokazała `zapas=0` przy widocznie
       uciętej treści, czyli nadmiar jest przycinany PRZED TOP-em i nie wchodzi do
       jego obszaru przewijania. Te trzy wiersze mówią, KTÓRE pudełko kłamie o swojej
       wysokości: szukamy takiego, które ma `c` (clientHeight) mniejsze od `s`
       (scrollHeight) — ono przycina — oraz tego, czy `h[]` (wysokość INLINE, czyli
       zostawiona przez animację) w ogóle jest ustawiona. `h[]=—` znaczy, że
       `domknij()` oddał wysokość CSS-owi poprawnie; `h[]=NNNpx` znaczy, że pudełko
       zostało zamrożone na wartości docelowej przejścia i to jest przyczyna. */
    function box(sel, etyk) {
      var e = korzen.querySelector(sel);
      if (!e) return etyk + ' —\n';
      var c = getComputedStyle(e);
      return etyk +
        ' h[]=' + (e.style.height || '—') +
        ' h=' + c.height +
        ' mh=' + c.minHeight +
        ' ovf=' + c.overflowY +
        ' c/s=' + liczba(e.clientHeight) + '/' + liczba(e.scrollHeight) +
        ' b=' + liczba(e.getBoundingClientRect().bottom) + '\n';
    }

    ekran().textContent =
      'SONDA v3 · TOP st=' + liczba(st) + ' stMax=' + liczba(stMax) +
        ' sh=' + liczba(sh) + ' ch=' + liczba(ch) + ' zapas=' + liczba(sh - ch) + '\n' +
      'touch s=' + licz.start + ' m=' + licz.move + ' e=' + licz.end +
        ' dY=' + liczba(dyMax) + '  scrollEv=' + licz.scroll + '\n' +
      'lista ' + (reszta && reszta.hasAttribute('data-otwarta') ? 'ROZWINIĘTA' : 'zwinięta') +
        '  li=' + korzen.querySelectorAll('.mp-tryb__reszta li').length +
        '  ostatni.b=' + (ost ? liczba(ost.getBoundingClientRect().bottom) : '—') +
        '  TOP.b=' + liczba(top.getBoundingClientRect().bottom) + '\n' +
      box('.mp-tryb__reszta', 'reszta') +
      box('.mp-tryb__ramka-skladnikow', 'ramka ') +
      box('.mp-tryb__blok-skladnikow', 'blok  ') +
      pasDolny(korzen, top, cs) +
      'osb=' + (cs.overscrollBehaviorY || '?') + ' ovfY=' + cs.overflowY +
        ' html=' + (document.documentElement.style.overflow || '—') +
        ' body=' + ((document.body && document.body.style.overflow) || '—') +
        ' pageY=' + liczba(window.scrollY);
  }

  /* v3 — OSTATNIA NIEWIADOMA. Sonda v2 pokazała, że NIC nie przycina (wszędzie
     `c/s` równe) i że TOP ma `zapas=0`, a mimo to dół bloku składników jest
     niewidoczny. Jedyne wyjaśnienie, które zostaje: dół treści leży w PASIE
     DOLNYM, a TOP nie ma go czym wypchnąć, bo rezerwuje na niego za mało.
     Dwie osobne przyczyny dają ten sam objaw i te liczby je rozdzielają:
       `pb` (padding-bottom TOP-u) mniejszy niż `h` paska  → rezerwa jest za mała,
         najpewniej dlatego, że pasek dolicza sobie `env(safe-area-inset-bottom)`,
         a `--mp-bottom-h` o tym nie wie;
       `pb` równy `h`, a mimo to `zapas=0`               → WebKit nie wlicza
         dolnego dopełnienia kontenera przewijanego do obszaru przewijania,
         co jest znaną różnicą wobec Blinka i czego NIE naprawia się liczbą,
         tylko rozpórką jako elementem w środku.
     `safe` czytamy realnym pudełkiem, nie z deklaracji — `env()` nie da się
     odczytać przez `getComputedStyle` na niczym, co go nie używa. */
  var probka = null;
  function safeArea() {
    if (!probka) {
      probka = document.createElement('div');
      probka.style.cssText = 'position:fixed;left:-9999px;bottom:0;width:1px;' +
        'height:env(safe-area-inset-bottom,0px);pointer-events:none';
      document.body.appendChild(probka);
    }
    return probka.getBoundingClientRect().height;
  }

  function pasDolny(korzen, top, cs) {
    var b = korzen.querySelector('.mp-tryb__bottom');
    var blok = korzen.querySelector('.mp-tryb__blok-skladnikow');
    var rb = b ? b.getBoundingClientRect() : null;
    return 'pas   t=' + (rb ? liczba(rb.top) : '—') +
      ' h=' + (rb ? liczba(rb.height) : '—') +
      ' safe=' + liczba(safeArea()) +
      ' TOPpb=' + cs.paddingBottom +
      ' blok.b=' + (blok ? liczba(blok.getBoundingClientRect().bottom) : '—') +
      ' ukryte=' + (rb && blok ? liczba(blok.getBoundingClientRect().bottom - rb.top) : '—') + '\n';
  }

  /* Pętla na `requestAnimationFrame`, nie na `setInterval`: ma pokazywać stan
     w trakcie gestu, a nie próbki co ćwierć sekundy. Kosztu nie liczymy —
     sonda nie jedzie do nikogo poza operatorem. */
  (function petla() { try { odczyt(); } catch (e) { /* nie przerywaj pętli */ } requestAnimationFrame(petla); })();
})();
