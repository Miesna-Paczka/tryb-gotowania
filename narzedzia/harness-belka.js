/* HARNESS POMIAROWY BELKI TRYBU GOTOWANIA — TYLKO STAGING, DO SKASOWANIA.
   Powod istnienia: staging podaje `x-frame-options: SAMEORIGIN` i CSP
   `frame-ancestors 'self' https://*.webflow.com http://*.webflow.io`, w ktorym
   NIE MA `https://*.webflow.io`. Jedyny adres, ktory po https osadzi te strone
   w ramce, to ona sama — wiec harness musi stac na tym samym origin.

   Co ten przyrzad daje, czego nie da kontener agenta:
   1. PRAWDZIWA przegladarke — media queries, uklad i typografia bez podstawiania;
   2. PRAWDZIWY `devicePixelRatio` (Retina = 2), ktorego kontener nie mial;
   3. POMIAR PRZEBIEGU ANIMACJI W CZASIE RZECZYWISTYM — `requestAnimationFrame`
      dziala tu naprawde, wiec liczba klatek i odstepy miedzy nimi sa faktem,
      a nie przewinieta os czasu.
   Czego NIE da nawet tutaj: dotyku (trackpad to nie palec) oraz
   `env(safe-area-inset-bottom)`, ktore na biurku wynosi 0.

   PULAPKA RAMKI, ZMIERZONA I OMIJANA NIZEJ. `IntersectionObserver` z korzeniem
   domyslnym jest w Chrome przycinany OKNEM NAJWYZSZEGO POZIOMU, nie oknem ramki.
   Ramka stojaca na y=150 w oknie 900 px dawala efektywny korzen konczacy sie na
   900*0.5 - 150 = 300 w ukladzie ramki — i prog odsloniecia pigulki przeskakiwal
   przy gorze 290 zamiast przy 390. Pomiar wygladalby na „prog nie dziala",
   a nie dzialal PRZYRZAD. Dlatego ramka jest PRZYPIETA do (0,0) rodzica i ma
   DOKLADNIE wysokosc okna: wtedy efektywny korzen pokrywa sie z oknem ramki
   i obserwator zachowuje sie tak jak na najwyzszym poziomie. Zadnej ramki,
   zadnego marginesu, zadnego obramowania (border przesunalby tresc o 1 px). */
(function () {
  'use strict';
  /* Bezpiecznik: gdyby ten skrypt kiedykolwiek trafil na strone przepisu,
     ma sie nie uruchomic. Harness buduje wlasny interfejs w `document.body`. */
  if (document.querySelector('[data-mp-gotowanie-cta]')) return;

  /* Adres celu da sie podmienic, zeby ten sam plik dalo sie przebiec lokalnie
     na migawce strony — inaczej harness bylby sprawdzalny wylacznie po wdrozeniu. */
  var CEL = window.__HB_CEL || '/przepisy/wolowina-teriyaki-z-brokulami-przepis';
  var SZEROKOSCI = [479, 430, 393, 375, 360];
  /* Wysokosc ramki NIE jest liczba z palca — musi rownac sie wysokosci okna,
     inaczej efektywny korzen obserwatora rozjedzie sie z oknem ramki (patrz pulapka). */
  var stan = { szer: 360, poziomo: false };
  function wysRamki() { return window.innerHeight; }
  function szerRamki() { return stan.poziomo ? Math.min(window.innerWidth - 300, 926) : stan.szer; }

  var css = document.createElement('style');
  css.textContent =
    'html,body{height:100%;margin:0;overflow:hidden}' +
    'body{font:400 13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;' +
      'background:#1d1b19;color:#e8e2da}' +
    /* Ramka: (0,0), wysokosc okna co do piksela, ZERO obramowania — patrz pulapka. */
    '#hb-ramka{position:fixed;top:0;left:0;border:0;margin:0;padding:0;z-index:1;' +
      'background:#fff;outline:1px solid #4a443d;outline-offset:0}' +
    '#hb-panel{position:fixed;top:0;right:0;bottom:0;z-index:2;display:flex;' +
      'flex-direction:column;gap:8px;padding:10px;box-sizing:border-box;' +
      'background:#1d1b19;border-left:1px solid #3a3531;overflow:hidden}' +
    '#hb-panel h1{font:600 13px/1.3 ui-monospace,monospace;margin:0;color:#9fd07a}' +
    '#hb-panel .rzad{display:flex;gap:5px;flex-wrap:wrap;align-items:center}' +
    '#hb-panel button{font:600 11px/1 ui-monospace,monospace;padding:6px 8px;border-radius:5px;' +
      'border:1px solid #4a443d;background:#2a2724;color:#e8e2da;cursor:pointer}' +
    '#hb-panel button:hover{background:#37332f}' +
    '#hb-panel button[data-akt="1"]{background:#487622;border-color:#5f9c2e;color:#fff}' +
    '#hb-panel pre{flex:1 1 auto;overflow:auto;margin:0;background:#141312;' +
      'border:1px solid #3a3531;border-radius:6px;padding:9px;' +
      'white-space:pre-wrap;word-break:break-word;font-size:11.5px}' +
    '#hb-stan{font-size:11.5px}' +
    '.ok{color:#9fd07a}.zle{color:#ff7b5e}.uw{color:#c9a227}';
  document.head.appendChild(css);

  document.body.innerHTML =
    '<iframe id="hb-ramka" title="staging"></iframe>' +
    '<div id="hb-panel">' +
      '<h1>PROBA — harness belki (staging, do skasowania)</h1>' +
      '<div id="hb-stan"></div>' +
      '<div class="rzad" id="hb-szer"></div>' +
      '<div class="rzad" id="hb-akcje">' +
        '<button data-a="przeladuj">przeladuj</button>' +
        '<button data-a="prog">1 · prog</button>' +
        '<button data-a="wejscie">2 · wejscie na zywo</button>' +
        '<button data-a="wyjscie">3 · wyjscie na zywo</button>' +
        '<button data-a="geometria">4 · geometria</button>' +
        '<button data-a="wszystko">WSZYSTKO tu</button>' +
        '<button data-a="pelna">PELNA MATRYCA</button>' +
        '<button data-a="kopiuj">kopiuj</button>' +
        '<button data-a="wyczysc">wyczysc</button>' +
      '</div>' +
      '<pre id="hb-out"></pre>' +
    '</div>';

  var ramka = document.getElementById('hb-ramka');
  var out = document.getElementById('hb-out');
  var bledyRamki = [];

  function pisz(x) {
    out.textContent += (typeof x === 'string' ? x : JSON.stringify(x, null, 1)) + '\n';
    out.scrollTop = out.scrollHeight;
  }
  function kontrolaOtoczenia() {
    var r = ramka.getBoundingClientRect();
    return { oknoRodzica: [window.innerWidth, window.innerHeight],
             ramkaWRodzicu: [Math.round(r.left), Math.round(r.top),
                             Math.round(r.width), Math.round(r.height)],
             dpr: window.devicePixelRatio,
             reduceGospodarza: matchMedia('(prefers-reduced-motion: reduce)').matches,
             ekran: screen.width + 'x' + screen.height,
             /* Warunek, bez ktorego KAZDY prog IntersectionObserver jest przesuniety. */
             przypietaPoprawnie: Math.round(r.top) === 0 && Math.round(r.left) === 0 &&
                                 Math.round(r.height) === window.innerHeight };
  }
  function odswiezStan() {
    var k = kontrolaOtoczenia(), d = document.getElementById('hb-stan');
    var waskie = window.innerWidth - szerRamki() < 300;
    d.innerHTML =
      'ramka <b>' + szerRamki() + '\u00d7' + wysRamki() + '</b>' +
      '  \u00b7 okno ' + k.oknoRodzica.join('\u00d7') +
      '  \u00b7 dpr <b>' + k.dpr + '</b>' +
      '  \u00b7 reduce ' + k.reduceGospodarza + '<br>' +
      (k.przypietaPoprawnie
        ? '<span class="ok">ramka przypieta poprawnie \u2014 progi IO wiarygodne</span>'
        : '<span class="zle">RAMKA NIEPRZYPIETA \u2014 progi IO b\u0119d\u0105 przesuni\u0119te, nie ufaj im</span>') +
      (waskie ? '<br><span class="uw">okno za w\u0105skie na panel \u2014 poszerz</span>' : '') +
      '<br><span class="uw">wysoko\u015b\u0107 ramki = wysoko\u015b\u0107 okna; \u017ceby mierzy\u0107 780, ustaw okno na 780</span>';
  }
  function przyciskiSzerokosci() {
    var d = document.getElementById('hb-szer'); d.innerHTML = '';
    SZEROKOSCI.forEach(function (w) {
      var b = document.createElement('button');
      b.textContent = w; b.title = w + ' px';
      if (w === stan.szer && !stan.poziomo) b.dataset.akt = '1';
      b.onclick = function () { stan.szer = w; stan.poziomo = false; przyciskiSzerokosci(); zaladuj(); };
      d.appendChild(b);
    });
    var poziom = document.createElement('button');
    poziom.textContent = 'poziomo';
    if (stan.poziomo) poziom.dataset.akt = '1';
    poziom.onclick = function () { stan.poziomo = true; przyciskiSzerokosci(); zaladuj(); };
    d.appendChild(poziom);
    odswiezStan();
  }
  window.addEventListener('resize', function () {
    ramka.style.height = wysRamki() + 'px';
    document.getElementById('hb-panel').style.left = (szerRamki() + 1) + 'px';
    odswiezStan();
  });

  /* Nasluch bledow zakladamy JAK NAJWCZESNIEJ po nawigacji. Skrypty strony sa
     `defer`, wiec biegna po sparsowaniu dokumentu — lapiemy je. Bledy rzucone
     w pierwszych milisekundach parsowania moga umknac i tak to trzeba czytac. */
  function zaladuj() {
    bledyRamki = [];
    ramka.style.width = szerRamki() + 'px';
    ramka.style.height = wysRamki() + 'px';
    document.getElementById('hb-panel').style.left = (szerRamki() + 1) + 'px';
    odswiezStan();
    ramka.src = CEL + '?hb=' + Date.now();
    var i = setInterval(function () {
      try {
        var w = ramka.contentWindow;
        if (w && !w.__hbNaslucha) {
          w.__hbNaslucha = 1;
          w.addEventListener('error', function (e) { bledyRamki.push(String(e.message).slice(0, 160)); });
          clearInterval(i);
        }
      } catch (e) { /* chwilowy brak dostepu w trakcie nawigacji */ }
    }, 10);
    setTimeout(function () { clearInterval(i); }, 8000);
    return czekajNaRuntime();
  }
  function czekajNaRuntime() {
    return new Promise(function (ok, zle) {
      var t0 = Date.now();
      (function pytaj() {
        var w = ramka.contentWindow;
        try {
          if (w && w.MP && w.MP.tryb && w.mpGotowanie && w.mpGotowanie.runtime && w.mpToggle) return ok(w);
        } catch (e) {}
        if (Date.now() - t0 > 25000) return zle(new Error('runtime nie wstal w 25 s'));
        setTimeout(pytaj, 100);
      })();
    });
  }
  function spij(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function R(e) { var r = e.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }

  // ── 1 · prog odsloniecia ───────────────────────────────────────────────────
  async function mierzProg(w) {
    var d = w.document;
    var sk = d.querySelector('.section-recipe-ingredients');
    var t = d.querySelector('a[data-mp-gotowanie-toggle]');
    if (!sk || !t) return { blad: 'brak sekcji skladnikow albo pigulki' };
    var docTop = sk.getBoundingClientRect().top + w.scrollY;
    var prog = Math.round(docTop - w.innerHeight * 0.5);
    w.scrollTo(0, Math.max(0, prog - 60)); await spij(500);
    var przed = { y: Math.round(w.scrollY), gora: Math.round(sk.getBoundingClientRect().top),
                  polowaOkna: Math.round(w.innerHeight * 0.5),
                  widoczny: t.classList.contains('is-widoczny') };
    w.scrollTo(0, prog + 20); await spij(900);
    var za = { y: Math.round(w.scrollY), gora: Math.round(sk.getBoundingClientRect().top),
               polowaOkna: Math.round(w.innerHeight * 0.5),
               widoczny: t.classList.contains('is-widoczny'),
               opacity: w.getComputedStyle(t).opacity,
               transform: w.getComputedStyle(t).transform,
               pudelko: R(t) };
    /* Gdy ocena wypada NIEZGODNE, chcemy od razu wiedziec KTORY warunek padl,
       a nie zgadywac: dlatego oba czlony predykatu leza w wyniku obok siebie. */
    return { wersjaSkryptu: w.mpToggle.wersja || '(brak pola — stara wersja)',
             oknoRamki: [w.innerWidth, w.innerHeight],
             szerokoscUkladu: w.document.documentElement.clientWidth,
             mediaDo479: w.matchMedia('(max-width: 479px)').matches,
             mpToggle: JSON.parse(JSON.stringify(w.mpToggle)),
             przedProgiem: przed, zaProgiem: za,
             ocena: (!przed.widoczny && za.widoczny) ? 'ZGODNE' : 'NIEZGODNE' };
  }

  /* ── 2/3 · przelot W CZASIE RZECZYWISTYM ──────────────────────────────────
     To jest to, czego kontener agenta zrobic nie mogl. Probkujemy `rAF` RAMKI,
     wiec odstepy miedzy klatkami sa prawdziwym rytmem kompozytora, a nie
     przewinieta osia czasu. Zliczamy klatki dluzsze niz 20 i 33 ms. */
  function nagrajPrzelot(w, msMax) {
    return new Promise(function (ok) {
      var k = w.MP.tryb.korzen(), t0 = w.performance.now(), kl = [];
      if (!k) return ok({ blad: 'brak korzenia trybu — nie ma czego nagrywac' });
      (function tik() {
        var t = w.performance.now() - t0;
        var g = k.querySelector('.mp-tryb__duch');
        kl.push({ t: Math.round(t), top: g ? Math.round(g.getBoundingClientRect().top) : null,
                  szer: g ? Math.round(g.getBoundingClientRect().width) : null });
        if (t < msMax) w.requestAnimationFrame(tik); else ok(podsumuj(kl));
      })();
    });
  }
  function podsumuj(kl) {
    var od = [], i;
    for (i = 1; i < kl.length; i++) od.push(kl[i].t - kl[i - 1].t);
    od.sort(function (a, b) { return a - b; });
    var zDuchem = kl.filter(function (x) { return x.top !== null; });
    return {
      klatek: kl.length,
      klatekZDuchem: zDuchem.length,
      duchOd: zDuchem.length ? zDuchem[0].t : null,
      duchDo: zDuchem.length ? zDuchem[zDuchem.length - 1].t : null,
      odstepMediana: od.length ? od[Math.floor(od.length / 2)] : null,
      odstepP95: od.length ? od[Math.floor(od.length * 0.95)] : null,
      odstepMax: od.length ? od[od.length - 1] : null,
      klatekPonad20ms: od.filter(function (x) { return x > 20; }).length,
      klatekPonad33ms: od.filter(function (x) { return x > 33; }).length,
      trajektoriaTop: zDuchem.filter(function (_, j) { return j % 3 === 0; })
                             .map(function (x) { return x.t + ':' + x.top; }).join(' '),
      uwaga: 'odstepMediana ~8 ms = 120 Hz, ~16 ms = 60 Hz'
    };
  }
  async function mierzWejscie(w) {
    var t = w.document.querySelector('a[data-mp-gotowanie-toggle]');
    if (!t || !t.classList.contains('is-widoczny')) return { blad: 'pigulka niewidoczna — najpierw prog' };
    var zrodloPrzed = w.getComputedStyle(t).visibility;
    t.click();
    await spij(40);                       // klik idzie przez `mpGotowanieStart`
    if (!w.MP.tryb.korzen())
      return { blad: 'klik nie otworzyl trybu', mpGotowanie: w.mpGotowanie ?
                 JSON.parse(JSON.stringify(w.mpGotowanie, function (a, b) {
                   return typeof b === 'function' ? 'fn' : b; })) : null };
    var p = await nagrajPrzelot(w, 1600);
    await spij(200);
    return { zrodloPrzedKlikiem: zrodloPrzed,
             zrodloPoPrzelocie: w.getComputedStyle(t).visibility,
             belkaPoUstaleniu: R(w.MP.tryb.korzen().querySelector('.mp-tryb__belka')),
             przelot: p };
  }
  async function mierzWyjscie(w) {
    var k = w.MP.tryb.korzen();
    if (!k) return { blad: 'tryb nigdy nie zostal zbudowany' };
    if (!k.hasAttribute('data-otwarty')) return { blad: 'tryb nie jest otwarty' };
    w.MP.tryb.zamknij();
    var p = await nagrajPrzelot(w, 1600);
    await spij(200);
    return { przelot: p,
             otwartyPoWyjsciu: k.hasAttribute('data-otwarty'),
             duchowPoWyjsciu: k.querySelectorAll('.mp-tryb__duch').length,
             overflowHtml: w.document.documentElement.style.overflow || '(puste)',
             pigulkaWrocila: w.getComputedStyle(
               w.document.querySelector('a[data-mp-gotowanie-toggle]')).visibility };
  }

  // ── 4 · geometria belki ───────────────────────────────────────────────────
  function mierzGeometrie(w) {
    var k = w.MP.tryb.korzen();
    if (!k) return { blad: 'tryb nigdy nie zostal zbudowany' };
    if (!k.hasAttribute('data-otwarty')) return { blad: 'tryb nie jest otwarty' };
    var q = function (s) { return k.querySelector(s); };
    var et = q('.mp-tryb__etykieta'), se = et ? w.getComputedStyle(et) : null;
    var zas = q('.mp-tryb__belka .mp-tryb__zamknij');
    return {
      okno: [w.innerWidth, w.innerHeight], dpr: w.devicePixelRatio,
      belka: R(q('.mp-tryb__belka')),
      tor: R(q('.mp-tryb__tor')),
      wypelnienie: R(q('.mp-tryb__wypelnienie')),
      etykieta: { pudelko: R(et), tekst: et ? et.textContent : null,
                  font: se ? se.fontSize + '/' + se.lineHeight + ' ' + se.fontWeight : null,
                  rodzina: se ? se.fontFamily.split(',')[0] : null, kolor: se ? se.color : null },
      przelacznik: R(q('.mp-tryb__przelacznik')),
      przelacznikTor: R(q('.mp-tryb__przelacznik-tor')),
      galka: R(q('.mp-tryb__galka')),
      /* Kontrole NEGATYWNE: te trzy rzeczy maja z belki zniknac. */
      znakow: k.querySelectorAll('.mp-tryb__znak').length,
      zamkniecWBelce: zas ? 1 : 0,
      blokPostepu: k.querySelectorAll('.mp-tryb__postep-blok').length,
      /* Kontrola DODATNIA selektora: jesli 0 wyzej bierze sie z martwego zapytania,
         ta liczba tez bedzie 0 i wynik trzeba odrzucic. */
      kontrolaSelektora: k.querySelectorAll('.mp-tryb__belka').length
    };
  }

  function zywotnosc(w) {
    var tag = [].slice.call(w.document.querySelectorAll('script[src*="tryb-gotowania.min.js"]'))
                .map(function (s) { return s.src.replace(/^https?:\/\//, ''); });
    var zas = (w.performance.getEntriesByType('resource') || [])
      .filter(function (r) { return /tryb-gotowania\.min\.js|mptogglegotowania/.test(r.name); })
      .map(function (r) { return { plik: r.name.split('/').pop().split('?')[0],
                                   bajtow: r.encodedBodySize || r.transferSize || null }; });
    return { tagi: tag, zasoby: zas,
             reduce: w.matchMedia('(prefers-reduced-motion: reduce)').matches,
             wersjaProgu: w.mpToggle ? (w.mpToggle.wersja || '(brak pola)') : null };
  }

  async function wszystko(etykieta) {
    var w = await czekajNaRuntime();
    var o = { szerokosc: szerRamki(), wysokosc: wysRamki(), etykieta: etykieta || null,
              otoczenie: kontrolaOtoczenia() };
    /* Krok, ktory sie przewroci, ma ZOSTAWIC SLAD i oddac sterowanie dalej.
       Inaczej pierwszy wyjatek zabiera cala serie i wynik wyglada jak brak pomiaru,
       a nie jak pomiar, ktory sie nie udal. */
    async function krok(nazwa, f) { try { o[nazwa] = await f(); }
                                    catch (e) { o[nazwa] = { wyjatek: String(e && e.message || e) }; } }
    await krok('zywotnosc', function () { return zywotnosc(w); });
    await krok('prog', function () { return mierzProg(w); });
    await krok('wejscie', function () { return mierzWejscie(w); });
    await krok('geometria', function () { return mierzGeometrie(w); });
    await krok('wyjscie', function () { return mierzWyjscie(w); });
    o.bledyRamki = bledyRamki.slice();
    return o;
  }

  document.getElementById('hb-akcje').addEventListener('click', async function (e) {
    var a = e.target && e.target.dataset && e.target.dataset.a; if (!a) return;
    try {
      if (a === 'wyczysc') { out.textContent = ''; return; }
      if (a === 'kopiuj') { await navigator.clipboard.writeText(out.textContent);
                            pisz('— skopiowano do schowka —'); return; }
      if (a === 'przeladuj') { pisz('… przeladowanie ramki ' + szerRamki() + 'x' + wysRamki());
                               await zaladuj(); pisz('runtime gotowy'); return; }
      var w = await czekajNaRuntime();
      if (a === 'prog')      pisz({ prog: await mierzProg(w) });
      if (a === 'wejscie')   pisz({ wejscie: await mierzWejscie(w) });
      if (a === 'wyjscie')   pisz({ wyjscie: await mierzWyjscie(w) });
      if (a === 'geometria') pisz({ geometria: mierzGeometrie(w) });
      if (a === 'wszystko')  pisz(await wszystko());
      if (a === 'pelna') {
        var zbior = [];
        for (var i = 0; i < SZEROKOSCI.length; i++) {
          stan.szer = SZEROKOSCI[i]; stan.poziomo = false; przyciskiSzerokosci();
          pisz('… ' + stan.szer + ' px');
          await zaladuj();
          zbior.push(await wszystko());
        }
        stan.poziomo = true; przyciskiSzerokosci();
        pisz('… poziomo'); await zaladuj();
        zbior.push(await wszystko('poziomo'));
        pisz({ PELNA_MATRYCA: zbior, dprGospodarza: window.devicePixelRatio });
      }
    } catch (err) { pisz('BLAD: ' + (err && err.message ? err.message : String(err))); }
  });

  przyciskiSzerokosci();
  pisz('dpr=' + window.devicePixelRatio + '  reduce=' +
       matchMedia('(prefers-reduced-motion: reduce)').matches);
  pisz('… ladowanie ramki');
  zaladuj().then(function () { pisz('runtime gotowy — mozna mierzyc'); },
                 function (e) { pisz('BLAD ladowania: ' + e.message); });
})();
