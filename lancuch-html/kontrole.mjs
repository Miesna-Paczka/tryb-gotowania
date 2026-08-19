/* kontrole.mjs — kontrole ŹRÓDŁA, których parser nie robi, bo parser czyta
 * mikroskładnię, a te pytają o KSZTAŁT PLIKU.
 *
 * Wszystkie pochodzą z jednej klasy uszkodzeń, zastanej 2026-08-19 `[V]`:
 * edytor Webflow kasuje puste linie w polach PlainText, a pusta linia jest
 * separatorem bloków. Objawy tego dnia:
 *   — `kroki` w dwóch przepisach: 8 i 9 markerów `== tytuł` wylądowało W ŚRODKU
 *     linii, regeneracja dała jeden gigantyczny `<li>` z widocznym „== odcedź
 *     fasolę" w treści dla czytelnika;
 *   — `co-mozesz-zmienic` w pięciu: dwa kafelki zlane w jeden, klucz `#kolendra`
 *     wyciekł na stronę jako widoczny tekst;
 *   — `wskazowka` w czterech: pytanie kolejnego kafelka doklejone na koniec
 *     akapitu poprzedniego.
 * Żadnego z nich nikt nie zgłosił. Wyszły przypadkiem, przy regeneracji — czyli
 * to jest dokładnie ta klasa, którą musi łapać maszyna, bo człowiek jej nie widzi.
 *
 * PROGI SĄ ZMIERZONE, NIE WYMYŚLONE. Na 16 przepisach (93 kafelki, 88 kroków):
 *   — pierwszy wiersz kafelka kończy się znakiem zapytania: 93/93;
 *   — odpowiedź kafelka NIE zawiera znaku zapytania: 93/93;
 *   — każde `==` w `kroki` stoi na początku wiersza: 100%;
 *   — każdy `#klucz` i `krótko:` stoi na początku wiersza: 100%.
 * Reguła bez zmierzonej podstawy byłaby tu gorsza niż jej brak: zatrzymywałaby
 * redakcję na czymś, czego naprawa niczego nie zmienia w produkcie.
 */

const POLA_KARTOWE = ['wskazowka', 'co-mozesz-zmienic', 'przechowywanie'];

/* Zwraca { bledy: [], ostrzezenia: [] }. Błąd = bramka mechaniczna, zero
   tolerancji, nie da się z tym zbudować. Ostrzeżenie = „to prawdopodobnie
   niedopatrzenie", ale to redakcja rozstrzyga. Ten podział jest ten sam,
   co w `przepis-parser.js`, i celowo. */
export function kontrolujZrodlo(zrodlo) {
  const bledy = [];
  const ostrzezenia = [];
  const B = (s) => bledy.push(s);
  const O = (s) => ostrzezenia.push(s);

  // ---------------------------------------------------------------- skladniki
  const skladniki = zrodlo.pola.skladniki.split('\n');
  skladniki.forEach((l, i) => {
    if (!l.trim()) return;
    if (l.trim().charAt(0) !== '#') {
      B(`skladniki, wiersz ${i + 1}: nie zaczyna się od #klucza — „${skrot(l)}"`);
    }
    const wewnetrzne = l.slice(1).match(/(?:^|\s)#\S+/g);
    if (wewnetrzne) {
      B(`skladniki, wiersz ${i + 1}: drugi #klucz w tym samym wierszu (${wewnetrzne.join(' ')}) — ` +
        'tak wygląda skasowany koniec linii; każdy składnik ma być w osobnym wierszu');
    }
    if (/@\S+\s+\S/.test(l)) {
      O(`skladniki, wiersz ${i + 1}: @slug nie jest na końcu wiersza — parser podepnie produkt ` +
        'tylko wtedy, gdy marker stoi ostatni');
    }
  });
  if (zrodlo.pola.skladniki.includes('**')) {
    O('skladniki: `**pogrubienie**` — strona pokaże <strong>, tryb gotowania pokaże gołe gwiazdki; ' +
      'ten rozjazd jest zamknięty tylko dla pola `kroki` (D-39.62)');
  }

  // ---------------------------------------------------------------- kroki
  const kroki = zrodlo.pola.kroki;
  const markerowWszystkich = (kroki.match(/==/g) || []).length;
  const markerowNaPoczatku = (kroki.match(/^==/gm) || []).length;
  if (markerowWszystkich !== markerowNaPoczatku) {
    B(`kroki: ${markerowWszystkich - markerowNaPoczatku} markerów „==" stoi W ŚRODKU wiersza ` +
      `(na początku: ${markerowNaPoczatku}). To podpis skasowanych pustych linii — regeneracja ` +
      'da jeden wielki <li> z widocznym „== …" w treści dla czytelnika');
  }
  if (!markerowNaPoczatku) B('kroki: ani jednego markera „== tytuł"');

  for (const k of ['czas', 'minutnik', 'kryterium', 'skladniki', 'foto', 'inaczej']) {
    /* `[^\S\n]` = biały znak POZA nową linią. Zwykłe `\s` łapałoby tu koniec
       poprzedniego wiersza i każdy poprawny znacznik zgłaszałby się jako błąd —
       tak wyglądała pierwsza wersja tej kontroli, 63 fałszywe alarmy na 16 plikach. */
    const naPoczatku = (kroki.match(new RegExp(`^${k}\\s*:`, 'gmi')) || []).length;
    const gdziekolwiek = (kroki.match(new RegExp(`(?:^|[^\\S\\n])${k}\\s*:`, 'gmi')) || []).length;
    const trafienia = gdziekolwiek - naPoczatku;
    if (trafienia > 0) {
      B(`kroki: znacznik „${k}:" ${trafienia}× nie na początku wiersza — parser go nie zobaczy ` +
        'i wiersz wjedzie do treści kroku razem ze słowem kluczowym');
    }
  }

  // ---------------------------------------------------------------- pola kartowe
  for (const pole of POLA_KARTOWE) {
    const txt = zrodlo.pola[pole];
    const bloki = txt.split(/\n[ \t]*\n+/).filter((b) => b.trim());

    const kluczy = (txt.match(/^#\S+$/gm) || []).length;
    const kluczyGdziekolwiek = (txt.match(/(?:^|\s)#\S+/gm) || []).length;
    const krotkoNaPoczatku = (txt.match(/^kr[óo]tko\s*:/gim) || []).length;
    const krotkoGdziekolwiek = (txt.match(/kr[óo]tko\s*:/gi) || []).length;

    if (kluczyGdziekolwiek > kluczy) {
      B(`${pole}: #klucz poza początkiem wiersza (${kluczyGdziekolwiek - kluczy}×) — ` +
        'dokładnie tak wyciekł „#kolendra" na stronę 2026-08-19');
    }
    if (krotkoGdziekolwiek > krotkoNaPoczatku) {
      B(`${pole}: „krótko:" poza początkiem wiersza (${krotkoGdziekolwiek - krotkoNaPoczatku}×) — ` +
        'skrót zamiennika wjedzie do treści widocznej dla czytelnika');
    }
    if (kluczy > bloki.length) {
      B(`${pole}: ${kluczy} #kluczy na ${bloki.length} bloków — co najmniej dwa kafelki się skleiły`);
    }
    if (krotkoNaPoczatku > bloki.length) {
      B(`${pole}: ${krotkoNaPoczatku} wierszy „krótko:" na ${bloki.length} bloków — kafelki się skleiły`);
    }

    bloki.forEach((blok, i) => {
      const linie = blok.split('\n').map((l) => l.trim()).filter(Boolean)
        .filter((l) => !/^#\S+$/.test(l) && !/^kr[óo]tko\s*:/i.test(l));
      if (!linie.length) { B(`${pole}, blok ${i + 1}: same metadane, bez pytania i odpowiedzi`); return; }
      const pytanie = linie[0];
      const odpowiedz = linie.slice(1).join(' ');
      if (!/\?$/.test(pytanie)) {
        B(`${pole}, blok ${i + 1}: pierwszy wiersz nie kończy się znakiem zapytania — „${skrot(pytanie)}". ` +
          'Parser bierze pierwszy wiersz jako pytanie kafelka, więc trafi tam zdanie, ' +
          'które pytaniem nie jest (93/93 kafelków w kolekcji kończy się „?")');
      }
      if (!odpowiedz) B(`${pole}, blok ${i + 1}: pytanie „${skrot(pytanie)}" bez odpowiedzi`);
      if (odpowiedz.includes('?')) {
        /* BŁĄD, nie ostrzeżenie — i to jest świadomy koszt. Znak zapytania
           w odpowiedzi jest JEDYNYM sygnałem sklejenia kafelków w polach bez
           metadanych (`wskazowka`, `przechowywanie`): tam nie ma ani #klucza,
           ani „krótko:", które można by policzyć. Sklejenie jest ciche — cztery
           przepisy jechały z nim do dziś i nikt nie zgłosił. Cena: pytanie
           retoryczne w środku odpowiedzi trzeba przepisać na zdanie albo
           przenieść do wiersza pytania. Zmierzone: 0 na 93 kafelki w kolekcji
           takiego pytania używa, więc cena jest dziś zerowa, a sygnał realny. */
        B(`${pole}, blok ${i + 1}: znak zapytania W ODPOWIEDZI („${skrot(odpowiedz)}"). ` +
          'W 93 kafelkach kolekcji nie ma ani jednego — to podpis sklejonych kafelków ' +
          '(pytanie następnego doklejone do akapitu poprzedniego). Jeśli naprawdę chcesz ' +
          'pytania w odpowiedzi, przepisz je na zdanie: kontrola nie odróżni go od sklejenia');
      }
    });

    if (txt.includes('**')) {
      O(`${pole}: \`**pogrubienie**\` — strona pokaże <strong>, tryb gotowania gołe gwiazdki`);
    }
  }

  // ---------------------------------------------------------------- wartości
  for (const pole of ['wartosci-odzywcze', 'wartosci-porcja']) {
    const txt = zrodlo.pola[pole];
    if (txt.includes('\n')) B(`${pole}: ma złamanie wiersza — to pole jest jednym wierszem „klucz: wartość; …"`);
    const pary = txt.split(';').map((p) => p.trim()).filter(Boolean);
    if (!pary.length) { B(`${pole}: puste`); continue; }
    pary.forEach((p) => { if (!p.includes(':')) B(`${pole}: człon bez dwukropka — „${skrot(p)}"`); });
    if (!/energia\s*:/i.test(txt)) O(`${pole}: brak członu „energia:" — bez niego nie policzę kcal-porcja`);
    else if (!/kJ.*kcal/i.test(txt)) O(`${pole}: „energia:" bez pary kJ/kcal — etykieta wymaga obu`);
  }

  return { bledy, ostrzezenia };
}

/* Kontrole, które da się postawić dopiero na WYNIKU generatora — pytają
   „czy render nie zgubił bloku po drodze". Tautologiczne, dopóki generator jest
   poprawny; ich zadaniem jest złapać przyszłą zmianę W GENERATORZE, nie w treści.
   Handoff §7.3 wymienia je wprost, bo to one były jedynym sygnałem uszkodzenia. */
export function kontrolujWynik(zrodlo, wynik) {
  const bledy = [];
  const li = (wynik.pola['kroki-html'].match(/<li>/g) || []).length;
  const blokiKrokow = (zrodlo.pola.kroki.match(/^==/gm) || []).length;
  if (li !== blokiKrokow) {
    bledy.push(`kroki: ${blokiKrokow} bloków w źródle, ${li} <li> w kroki-html`);
  }
  const liSkl = (wynik.pola['skladniki-html'].match(/<li>/g) || []).length;
  const wierszySkl = zrodlo.pola.skladniki.split('\n').filter((l) => l.trim()).length;
  if (liSkl !== wierszySkl) {
    bledy.push(`skladniki: ${wierszySkl} wierszy w źródle, ${liSkl} <li> w skladniki-html`);
  }
  for (const [pole, poleHtml] of [['wskazowka', 'wskazowki-html'],
    ['co-mozesz-zmienic', 'zamienniki-html'], ['przechowywanie', 'przechowywanie-html']]) {
    const h3 = (wynik.pola[poleHtml].match(/<h3>/g) || []).length;
    const bloki = zrodlo.pola[pole].split(/\n[ \t]*\n+/).filter((b) => b.trim()).length;
    if (h3 !== bloki) bledy.push(`${pole}: ${bloki} bloków w źródle, ${h3} <h3> w ${poleHtml}`);
  }
  /* Klucze i skróty są metadanymi trybu gotowania i NIE MAJĄ prawa pojawić się
     w HTML-u widzianym przez czytelnika. To jest ta kontrola, której brak
     kosztował „#kolendra" na stronie. */
  for (const [pole, html] of Object.entries(wynik.pola)) {
    if (/(?:^|>|\s)#[a-ząćęłńóśźż0-9-]+/i.test(html)) bledy.push(`${pole}: wyciek #klucza do HTML-u`);
    if (/kr[óo]tko\s*:/i.test(html)) bledy.push(`${pole}: wyciek „krótko:" do HTML-u`);
    if (/(?:^|>|<br>)==/.test(html)) bledy.push(`${pole}: wyciek markera „==" do HTML-u`);
    if (/(?:^|>|<br>)(czas|minutnik|kryterium|skladniki|foto|inaczej)\s*:/i.test(html)) {
      bledy.push(`${pole}: wyciek znacznika kroku do HTML-u`);
    }
  }
  return { bledy, ostrzezenia: [] };
}

const skrot = (s) => String(s).length > 60 ? String(s).slice(0, 57) + '…' : String(s);
