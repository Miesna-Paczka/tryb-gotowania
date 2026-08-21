/* suchy-bieg-pomiaru.mjs — instrumentacja PostHog mierzona NA WYJŚCIU, nie na kodzie.
 *
 * Próba czyta `MP.tryb.pomiar.dziennik()`, czyli TE SAME obiekty, które runtime
 * podaje do `posthog.capture`. Gdyby dziennik był budowany osobno, ta próba
 * mierzyłaby dziennik zamiast produktu.
 *
 * Kontrole ujemne wpisane w przebieg, bo bez nich cała ta zieleń byłaby o niczym:
 *   · przerysowanie kroku NIE dokłada `cooking_step_advanced`
 *   · zmiana porcji NA EKRANIE ZAKOŃCZENIA nie odpala drugiego `cooking_mode_completed`
 *     (realna pułapka: `ustawPorcje` woła `pokazEkran(stan.ekran)`)
 *   · odmowa trzeciego minutnika NIE odpala `cooking_timer_started`
 *   · drugie `zamknij()` nie dokłada drugiego `cooking_mode_closed`
 *   · przy nieobecnym PostHogu zdarzenia IDĄ DO KOLEJKI i spuszczają się w kolejności,
 *     gdy silnik się pojawi — to jest cała racja bytu kolejki (zgoda Cookiebota
 *     bywa dana PO otwarciu trybu)
 *   · `--stary <plik>` puszcza tę samą próbę na artefakcie sprzed instrumentacji:
 *     ma paść, i to jest dowód, że próba mierzy produkt
 *
 * Uruchomienie: node narzedzia/suchy-bieg-pomiaru.mjs [--stary <plik.min.js>]
 */
import fs from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
  .catch(() => import('playwright'));
const PRZEGLADARKI = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'];
const ARG = process.argv.indexOf('--stary');
const PLIK = ARG > -1 ? process.argv[ARG + 1] : 'tryb-gotowania.min.js';
const TRYB = fs.readFileSync(PLIK, 'utf8');

const strona = (szukajka) => `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script>window.MP={zegar:{__t:1000000000000,teraz:function(){return this.__t}}};</script>
<script>${TRYB}</script></body>`;

const przegladarka = await (async () => {
  for (const s of PRZEGLADARKI) {
    try { return await chromium.launch({ executablePath: s, args: ['--no-sandbox', '--ignore-certificate-errors'] }); }
    catch (e) { /* następna */ }
  }
  throw new Error('nie znalazłem Chromium');
})();

let zdane = 0, oblane = 0;
const spr = (w, o, sz) => { if (w) { zdane++; console.log('  ✓ ' + o); }
  else { oblane++; console.log('  ✗ ' + o + (sz !== undefined ? '\n      → ' + sz : '')); } };

const krok = (i, minutnik) => ({
  tytul: 'krok ' + i, tekst: 't' + i, tekstHtml: 't' + i, czas: null,
  minutnik: minutnik ? { sekundy: 60 * i, nazwa: 'm' + i } : null,
  kryterium: null, kryteriumHtml: null,
  skladniki: [], skladnikiTeraz: [], skladnikiDalej: [], skladnikiZuzyte: []
});
const MODEL = {
  skladniki: [], porcjeBazowe: 2, tytul: 'Próba pomiaru', czas: '30', meta: [],
  zamienniki: {}, bledy: [], pola: {},
  kroki: [krok(1, false), krok(2, true), krok(3, true), krok(4, true)]
};

async function nowaKarta(search) {
  const kontekst = await przegladarka.newContext({ viewport: { width: 390, height: 844 } });
  const ADRES = 'https://proba.test/przepisy/proba-pomiaru' + (search || '');
  await kontekst.route(ADRES, (r) =>
    r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: strona() }));
  const k = await kontekst.newPage();
  await k.goto(ADRES);
  return k;
}
const dz = (k) => k.evaluate(() => {
  try { return window.MP.tryb.pomiar.dziennik(); } catch (e) { return null; }
});
const licz = (d, n) => (d || []).filter((z) => z.event === n).length;
const pierwsze = (d, n) => (d || []).filter((z) => z.event === n)[0];
const ostatnie = (d, n) => (d || []).filter((z) => z.event === n).slice(-1)[0];

console.log(`\n═══ instrumentacja pomiaru — ${PLIK} ═══`);

/* ── 1 · powierzchnia w ogóle istnieje ─────────────────────────────────────── */
{
  const k = await nowaKarta();
  const jest = await k.evaluate(() => !!(window.MP && window.MP.tryb && window.MP.tryb.pomiar));
  spr(jest, 'MP.tryb.pomiar wystawione', jest ? '' : 'brak — artefakt bez instrumentacji');
  if (!jest) {
    console.log('\n  (dalsze próby nie mają czego mierzyć — to jest oczekiwany wynik dla --stary)');
    console.log(`\n─────────────────────────────── zdane ${zdane} · oblane ${oblane}`);
    await przegladarka.close(); process.exit(oblane ? 1 : 0);
  }
  await k.context().close();
}

/* ── 2 · pełna ścieżka: otwarcie → kroki → minutnik → porcje → koniec → zamknięcie ─ */
{
  const k = await nowaKarta();
  await k.evaluate((m) => window.MP.tryb.otworz(m, { model: m, porcje: 2 }), MODEL);
  await k.waitForTimeout(80);

  let d = await dz(k);
  spr(licz(d, 'cooking_mode_opened') === 1, 'otwarcie odpala DOKŁADNIE jedno `cooking_mode_opened`', licz(d, 'cooking_mode_opened'));
  const o = pierwsze(d, 'cooking_mode_opened');
  spr(o && o.properties.steps_total === 4, 'steps_total = 4', o && o.properties.steps_total);
  spr(o && o.properties.servings === 2, 'servings = 2 (z MP.tryb, nie ze strony)', o && o.properties.servings);
  spr(o && o.properties.servings_base === 2, 'servings_base = 2', o && o.properties.servings_base);
  spr(o && o.properties.source === 'cta', 'source = „cta" przy zwykłym wejściu', o && o.properties.source);
  spr(o && o.properties.is_resumed === false, 'is_resumed = false', o && o.properties.is_resumed);
  spr(o && o.properties.viewport_width === 390, 'viewport_width = 390', o && o.properties.viewport_width);
  spr(o && typeof o.properties.cooking_session_id === 'string' && o.properties.cooking_session_id.length > 8,
      'cooking_session_id jest niepustym łańcuchem', o && o.properties.cooking_session_id);
  spr(o && o.properties.recipe_slug === 'proba-pomiaru', 'recipe_slug bez `/przepisy/`', o && o.properties.recipe_slug);
  spr(o && o.properties.recipe_title === 'Próba pomiaru', 'recipe_title z modelu', o && o.properties.recipe_title);
  const idSesji = o && o.properties.cooking_session_id;

  /* kroki w przód */
  await k.evaluate(() => { window.MP.tryb.pokazKrok(1); });
  await k.evaluate(() => { window.MP.tryb.pokazKrok(2); });
  await k.waitForTimeout(60);
  d = await dz(k);
  const kroki = (d || []).filter((z) => z.event === 'cooking_step_advanced');
  spr(kroki.length === 2, 'dwa przejścia = dwa `cooking_step_advanced`', kroki.length);
  spr(kroki[0] && kroki[0].properties.step_index === 0, 'step_index LICZONY OD ZERA (krok 1 → 0)', kroki[0] && kroki[0].properties.step_index);
  spr(kroki[0] && kroki[0].properties.direction === 'forward', 'direction = forward', kroki[0] && kroki[0].properties.direction);
  spr(kroki[0] && kroki[0].properties.step_has_timer === false, 'krok 1 bez minutnika → step_has_timer false', kroki[0] && kroki[0].properties.step_has_timer);
  spr(kroki[1] && kroki[1].properties.step_has_timer === true, 'krok 2 z minutnikiem → step_has_timer true', kroki[1] && kroki[1].properties.step_has_timer);
  spr(kroki.every((z) => z.properties.cooking_session_id === idSesji), 'wszystkie kroki niosą TEN SAM cooking_session_id');

  /* KONTROLA UJEMNA: przerysowanie tego samego kroku nie jest przejściem */
  await k.evaluate(() => { window.MP.tryb.pokazKrok(2); });
  await k.waitForTimeout(60);
  d = await dz(k);
  spr(licz(d, 'cooking_step_advanced') === 2, 'KONTROLA UJEMNA: ponowne `pokazKrok(2)` NIE dokłada zdarzenia', licz(d, 'cooking_step_advanced'));

  /* ruch wstecz */
  await k.evaluate(() => { window.MP.tryb.pokazKrok(1); });
  await k.waitForTimeout(60);
  d = await dz(k);
  spr(ostatnie(d, 'cooking_step_advanced').properties.direction === 'back', 'powrót do kroku 1 → direction = back',
      ostatnie(d, 'cooking_step_advanced').properties.direction);

  /* minutniki */
  await k.evaluate(() => { window.MP.tryb.pokazKrok(2); });
  await k.evaluate(() => window.MP.tryb.minutniki.uruchom({ nazwa: 'a', sekundy: 120 }));
  await k.waitForTimeout(60);
  d = await dz(k);
  let mt = pierwsze(d, 'cooking_timer_started');
  spr(licz(d, 'cooking_timer_started') === 1, 'pierwszy minutnik → jedno `cooking_timer_started`', licz(d, 'cooking_timer_started'));
  spr(mt && mt.properties.timer_seconds === 120, 'timer_seconds = 120', mt && mt.properties.timer_seconds);
  spr(mt && mt.properties.timers_active === 1, 'timers_active = 1 (liczy razem z właśnie odpalonym)', mt && mt.properties.timers_active);
  spr(mt && mt.properties.step_index === 1, 'step_index minutnika = 1 (jesteśmy na kroku 2)', mt && mt.properties.step_index);

  await k.evaluate(() => window.MP.tryb.minutniki.uruchom({ nazwa: 'b', sekundy: 60 }));
  await k.waitForTimeout(60);
  d = await dz(k);
  spr(ostatnie(d, 'cooking_timer_started').properties.timers_active === 2, 'drugi minutnik → timers_active = 2',
      ostatnie(d, 'cooking_timer_started').properties.timers_active);

  /* KONTROLA UJEMNA: trzeci minutnik jest ODMAWIANY (D11) — nie wystartował, więc nie ma zdarzenia */
  await k.evaluate(() => window.MP.tryb.minutniki.uruchom({ nazwa: 'c', sekundy: 30 }));
  await k.waitForTimeout(60);
  d = await dz(k);
  spr(licz(d, 'cooking_timer_started') === 2, 'KONTROLA UJEMNA: odmowa trzeciego minutnika NIE odpala zdarzenia', licz(d, 'cooking_timer_started'));

  /* porcje */
  await k.evaluate(() => window.MP.tryb.porcje(5));
  await k.waitForTimeout(60);
  d = await dz(k);
  const pz = pierwsze(d, 'cooking_servings_changed');
  spr(licz(d, 'cooking_servings_changed') === 1, 'zmiana porcji → jedno `cooking_servings_changed`', licz(d, 'cooking_servings_changed'));
  spr(pz && pz.properties.servings_from === 2 && pz.properties.servings_to === 5, 'servings_from/to = 2 → 5',
      pz && (pz.properties.servings_from + '→' + pz.properties.servings_to));

  /* KONTROLA UJEMNA: ustawienie tej samej liczby nie jest zmianą */
  await k.evaluate(() => window.MP.tryb.porcje(5));
  await k.waitForTimeout(60);
  d = await dz(k);
  spr(licz(d, 'cooking_servings_changed') === 1, 'KONTROLA UJEMNA: `porcje(5)` przy 5 NIE dokłada zdarzenia', licz(d, 'cooking_servings_changed'));

  /* zakończenie — zegar przesunięty, żeby duration_seconds nie było zerem */
  await k.evaluate(() => { window.MP.zegar.__t += 754000; window.MP.tryb.ekran('koniec'); });
  await k.waitForTimeout(80);
  d = await dz(k);
  const z = pierwsze(d, 'cooking_mode_completed');
  spr(licz(d, 'cooking_mode_completed') === 1, 'zakończenie → jedno `cooking_mode_completed`', licz(d, 'cooking_mode_completed'));
  spr(z && z.properties.duration_seconds === 754, 'duration_seconds = 754 (szew MP.zegar)', z && z.properties.duration_seconds);
  spr(z && z.properties.servings === 5, 'servings KOŃCOWE = 5, nie startowe 2', z && z.properties.servings);
  spr(z && z.properties.timers_used === 2, 'timers_used = 2 (odmówiony się nie liczy)', z && z.properties.timers_used);
  spr(z && z.properties.steps_total === 4, 'steps_total = 4', z && z.properties.steps_total);

  /* KONTROLA UJEMNA — TA JEST NAJWAŻNIEJSZA:
     `ustawPorcje` woła `pokazEkran(stan.ekran)`, a na ekranie zakończenia
     `stan.ekran === 'koniec'`. Bez bramki zmiana porcji tutaj odpaliłaby
     zakończenie DRUGI RAZ i lejek pokazywałby więcej zakończeń niż otwarć. */
  await k.evaluate(() => window.MP.tryb.porcje(3));
  await k.waitForTimeout(80);
  d = await dz(k);
  spr(licz(d, 'cooking_mode_completed') === 1,
      'KONTROLA UJEMNA: zmiana porcji NA EKRANIE ZAKOŃCZENIA nie powtarza `cooking_mode_completed`',
      licz(d, 'cooking_mode_completed'));

  /* zamknięcie */
  await k.evaluate(() => { window.MP.zegar.__t += 46000; window.MP.tryb.zamknij(); });
  await k.waitForTimeout(80);
  d = await dz(k);
  const c = pierwsze(d, 'cooking_mode_closed');
  spr(licz(d, 'cooking_mode_closed') === 1, 'zamknięcie → jedno `cooking_mode_closed`', licz(d, 'cooking_mode_closed'));
  spr(c && c.properties.reason === 'user', 'reason = user przy zamknięciu krzyżykiem', c && c.properties.reason);
  spr(c && c.properties.duration_seconds === 800, 'duration_seconds = 800', c && c.properties.duration_seconds);
  spr(c && c.properties.exit_step_index === 1, 'exit_step_index = 1 (ostatni krok, na którym byliśmy)', c && c.properties.exit_step_index);

  /* KONTROLA UJEMNA: `zamknijWewn` nie zeruje `stan.korzen`, więc drugie
     `zamknij()` przechodzi przez jego własnego strażnika */
  await k.evaluate(() => window.MP.tryb.zamknij());
  await k.waitForTimeout(60);
  d = await dz(k);
  spr(licz(d, 'cooking_mode_closed') === 1, 'KONTROLA UJEMNA: drugie `zamknij()` NIE dokłada zdarzenia', licz(d, 'cooking_mode_closed'));

  /* WARUNEK Z §8.3 PRZEKAZANIA, sprawdzony offline: otwarcia == 1 na sesję */
  const wgSesji = {};
  for (const e of d) {
    const s = e.properties.cooking_session_id;
    wgSesji[s] = wgSesji[s] || { otw: 0, kro: 0, zak: 0 };
    if (e.event === 'cooking_mode_opened') wgSesji[s].otw++;
    if (e.event === 'cooking_step_advanced') wgSesji[s].kro++;
    if (e.event === 'cooking_mode_completed') wgSesji[s].zak++;
  }
  const zle = Object.keys(wgSesji).filter((s) => wgSesji[s].otw !== 1);
  spr(zle.length === 0, '§8.3: `otwarcia` == 1 dla KAŻDEJ sesji w dzienniku', JSON.stringify(wgSesji));
  spr(Object.keys(wgSesji).length === 1, 'cała ścieżka mieści się w JEDNEJ sesji', Object.keys(wgSesji).length);
  await k.context().close();
}

/* ── 3 · `source` naprawdę rozróżnia drogi wejścia ─────────────────────────── */
{
  const k = await nowaKarta('?tryb=gotowanie');
  await k.evaluate((m) => window.MP.tryb.otworz(m, { model: m, porcje: 2 }), MODEL);
  await k.waitForTimeout(80);
  const o = pierwsze(await dz(k), 'cooking_mode_opened');
  spr(o && o.properties.source === 'qr', 'wejście z `?tryb=gotowanie` → source = „qr"', o && o.properties.source);
  await k.context().close();
}
{
  const k = await nowaKarta();
  await k.evaluate((m) => window.MP.tryb.otworz(m, { model: m, porcje: 2, krok: 3 }), MODEL);
  await k.waitForTimeout(80);
  const o = pierwsze(await dz(k), 'cooking_mode_opened');
  spr(o && o.properties.source === 'krok', 'wejście z `{krok:N}` → source = „krok"', o && o.properties.source);
  await k.context().close();
}

/* ── 4 · kolejka: zgoda dana PO otwarciu trybu ─────────────────────────────── */
{
  const k = await nowaKarta();
  const brak = await k.evaluate(() => typeof window.posthog);
  spr(brak === 'undefined', 'próba startuje BEZ PostHoga (jak przed zgodą Cookiebota)', brak);

  await k.evaluate((m) => window.MP.tryb.otworz(m, { model: m, porcje: 2 }), MODEL);
  await k.evaluate(() => { window.MP.tryb.pokazKrok(1); window.MP.tryb.pokazKrok(2); });
  await k.waitForTimeout(80);
  const wK = await k.evaluate(() => window.MP.tryb.pomiar.wKolejce());
  spr(wK === 3, 'trzy zdarzenia CZEKAJĄ w kolejce, zamiast przepaść', wK);
  spr((await dz(k)).length === 3, 'dziennik notuje je mimo braku silnika', (await dz(k)).length);

  /* zgoda przychodzi teraz */
  await k.evaluate(() => {
    window.__zlapane = [];
    window.__zarejestrowane = [];
    window.posthog = {
      capture: function (n, w) { window.__zlapane.push([n, w]); },
      register: function (w) { window.__zarejestrowane.push(w); }
    };
  });
  await k.waitForTimeout(1400);   // zegar pilnujący chodzi co 1 s
  const zlapane = await k.evaluate(() => window.__zlapane.map((x) => x[0]));
  spr(zlapane.length === 3, 'po pojawieniu się silnika kolejka SPUSZCZA wszystkie trzy', zlapane.length);
  spr(zlapane[0] === 'cooking_mode_opened' && zlapane[1] === 'cooking_step_advanced' && zlapane[2] === 'cooking_step_advanced',
      'spuszczone W KOLEJNOŚCI zdarzeń, nie odwrotnie', zlapane.join(' → '));
  spr(await k.evaluate(() => window.MP.tryb.pomiar.wKolejce()) === 0, 'kolejka po spuszczeniu jest pusta');

  /* kolejne zdarzenia idą już prosto */
  await k.evaluate(() => window.MP.tryb.pokazKrok(3));
  await k.waitForTimeout(80);
  spr(await k.evaluate(() => window.__zlapane.length) === 4, 'kolejne zdarzenie idzie prosto do `capture`',
      await k.evaluate(() => window.__zlapane.length));
  await k.context().close();
}

/* ── 5 · powiązanie z konwersją (super properties) ─────────────────────────── */
{
  const k = await nowaKarta();
  await k.evaluate(() => {
    window.__zarejestrowane = [];
    window.posthog = { capture: function () {}, register: function (w) { window.__zarejestrowane.push(w); } };
  });
  await k.evaluate((m) => window.MP.tryb.otworz(m, { model: m, porcje: 2 }), MODEL);
  await k.waitForTimeout(80);
  const r1 = await k.evaluate(() => window.__zarejestrowane);
  spr(r1.length === 1 && r1[0].in_cooking_mode === true, 'otwarcie rejestruje `in_cooking_mode: true`', JSON.stringify(r1));
  spr(r1.length === 1 && typeof r1[0].cooking_session_id === 'string',
      'otwarcie rejestruje `cooking_session_id` jako super property', JSON.stringify(r1[0]));
  const idR = r1[0].cooking_session_id;
  const idD = pierwsze(await dz(k), 'cooking_mode_opened').properties.cooking_session_id;
  spr(idR === idD, 'zarejestrowany klucz jest TYM SAMYM kluczem, co w zdarzeniu', idR + ' vs ' + idD);

  await k.evaluate(() => window.MP.tryb.zamknij());
  await k.waitForTimeout(80);
  const r2 = await k.evaluate(() => window.__zarejestrowane);
  spr(r2.length === 2 && r2[1].in_cooking_mode === false, 'zamknięcie zdejmuje `in_cooking_mode`', JSON.stringify(r2[1]));
  spr(!('cooking_session_id' in r2[1]),
      'ale `cooking_session_id` ZOSTAJE zarejestrowany — to on niesie konwersję po wyjściu z trybu',
      JSON.stringify(r2[1]));
  await k.context().close();
}

console.log(`\n─────────────────────────────── zdane ${zdane} · oblane ${oblane}`);
await przegladarka.close();
process.exit(oblane ? 1 : 0);
