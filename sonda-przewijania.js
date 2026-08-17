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

    ekran().textContent =
      'TOP  st=' + liczba(st) + ' stMax=' + liczba(stMax) +
        ' sh=' + liczba(sh) + ' ch=' + liczba(ch) + ' zapas=' + liczba(sh - ch) + '\n' +
      'touch s=' + licz.start + ' m=' + licz.move + ' e=' + licz.end +
        ' dY=' + liczba(dyMax) + '  scrollEv=' + licz.scroll + '\n' +
      'lista ' + (reszta && reszta.hasAttribute('data-otwarta') ? 'ROZWINIĘTA' : 'zwinięta') +
        '  ostatni.b=' + (ost ? liczba(ost.getBoundingClientRect().bottom) : '—') +
        '  TOP.b=' + liczba(top.getBoundingClientRect().bottom) + '\n' +
      'osb=' + (cs.overscrollBehaviorY || '?') + ' ovfY=' + cs.overflowY +
        ' html=' + (document.documentElement.style.overflow || '—') +
        ' body=' + ((document.body && document.body.style.overflow) || '—') +
        ' pageY=' + liczba(window.scrollY);
  }

  /* Pętla na `requestAnimationFrame`, nie na `setInterval`: ma pokazywać stan
     w trakcie gestu, a nie próbki co ćwierć sekundy. Kosztu nie liczymy —
     sonda nie jedzie do nikogo poza operatorem. */
  (function petla() { try { odczyt(); } catch (e) { /* nie przerywaj pętli */ } requestAnimationFrame(petla); })();
})();
