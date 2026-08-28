/* Wsuwanie plywajacego przelacznika trybu gotowania.
   Prog: gorna krawedz sekcji krokow mija gorna krawedz okna.
   Tylko <=479 px; powyzej rodzic .recipe-floating-cta ma display:none. */
(function () {
  var PROG = 479;
  var t = document.querySelector('[data-mp-gotowanie-toggle]');
  var kroki = document.querySelector('.section-recipe-steps');
  window.mpToggle = { el: !!t, kroki: !!kroki, widoczny: false, przelaczen: 0, prog: PROG };
  if (!t || !kroki || !('IntersectionObserver' in window)) return;
  var mq = window.matchMedia('(max-width: ' + PROG + 'px)');
  var wKrokach = false;
  function zastosuj() {
    var w = wKrokach && mq.matches;
    if (w === window.mpToggle.widoczny) return;
    window.mpToggle.widoczny = w;
    window.mpToggle.przelaczen++;
    t.classList.toggle('is-widoczny', w);
  }
  new IntersectionObserver(function (wpisy) {
    wKrokach = wpisy[0].isIntersecting;
    zastosuj();
  }, { rootMargin: '0px 0px -99% 0px', threshold: 0 }).observe(kroki);
  if (mq.addEventListener) mq.addEventListener('change', zastosuj);
  else if (mq.addListener) mq.addListener(zastosuj);
})();