/* Wsuwanie plywajacego przelacznika trybu gotowania.
   PROG (1.1.0): gorna krawedz sekcji SKLADNIKOW siega polowy wysokosci okna.
   W 1.0.0 progiem byla gorna krawedz sekcji KROKOW przy gornej krawedzi okna
   (rootMargin -99%) — pigulka pojawiala sie dopiero w samych krokach i znikala
   przed koncem przepisu. Tylko <=479 px; wyzej rodzic ma display:none.

   Stan liczymy z ZYWEJ GEOMETRII, nie z `isIntersecting`: sekcja skladnikow
   w koncu przejezdza cala ponad polowe okna i przestaje przecinac korzen, wiec
   `isIntersecting` spada tam, gdzie pigulka ma byc widoczna. Obserwator sluzy
   juz tylko za budzik na przecieciach, w obie strony. */
(function () {
  var PROG = 479, UDZIAL = 0.5;
  var t = document.querySelector('[data-mp-gotowanie-toggle]');
  var kotwica = document.querySelector('.section-recipe-ingredients');
  window.mpToggle = { el: !!t, kotwica: !!kotwica, widoczny: false,
                      przelaczen: 0, prog: PROG, udzial: UDZIAL, wersja: '1.1.0' };
  if (!t || !kotwica || !('IntersectionObserver' in window)) return;
  var mq = window.matchMedia('(max-width: ' + PROG + 'px)');
  function zastosuj() {
    var h = window.innerHeight || document.documentElement.clientHeight || 0;
    var w = mq.matches && kotwica.getBoundingClientRect().top <= h * UDZIAL;
    if (w === window.mpToggle.widoczny) return;
    window.mpToggle.widoczny = w;
    window.mpToggle.przelaczen++;
    t.classList.toggle('is-widoczny', w);
  }
  new IntersectionObserver(zastosuj, { rootMargin: '0px 0px -50% 0px', threshold: 0 })
    .observe(kotwica);
  /* Przewijanie nie zglasza zmiany wysokosci okna; obrot i chowanie paska
     adresu ida przez `resize`. */
  window.addEventListener('resize', zastosuj);
  if (mq.addEventListener) mq.addEventListener('change', zastosuj);
  else if (mq.addListener) mq.addListener(zastosuj);
  zastosuj();
})();
