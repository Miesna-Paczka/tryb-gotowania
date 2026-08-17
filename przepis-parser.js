/* przepis-parser.js — warstwa danych przepisu dla nowego layoutu i trybu gotowania.
 *
 * Mięsna Paczka · kolekcja `przepisy` (6a574b13929618407b161661)
 * Spec: przepisy-hub/spec-tryb-gotowania-v1.md
 * Vanilla JS, bez zależności. ES2019+. Nie renderuje UI — buduje model i go udostępnia.
 *
 * Kontrakt DOM (HTML Embed w template'cie `przepisy`):
 *
 *   <script type="text/plain" id="mp-skladniki">{{skladniki}}</script>
 *   <script type="text/plain" id="mp-kroki">{{kroki}}</script>
 *   <script type="text/plain" id="mp-wartosci-porcja">{{wartosci-porcja}}</script>
 *   <div id="mp-tryb-gotowania"
 *        data-tytul="{{name}}"
 *        data-porcje-bazowe="{{porcje-bazowe}}"
 *        data-czas="{{czas-przygotowania}}" hidden></div>
 *
 *   <!-- ukryta Collection List po `produkty-w-przepisie` -->
 *   <div data-mp-produkt
 *        data-slug="{{slug}}" data-nazwa="{{name}}"
 *        data-url="/produkty/{{slug}}" data-gramatura="{{gramatura-opakowania}}"></div>
 *
 *   <!-- galeria `zdjecia-krokow`, MultiImage -->
 *   <img data-mp-foto-kroku src="…-krok-07.webp">
 *
 *   <!-- zdjęcie główne przepisu, pole `zdjecie-glowne` (Image) — D-23.1.
 *        Jedno na stronę; runtime rysuje je na ekranie startowym, na ekranie
 *        wznowienia i na ekranie zakończenia. Brak atrybutu = brak zdjęcia,
 *        a nie dziura w układzie (R3). -->
 *   <img data-mp-foto-glowne src="{{zdjecie-glowne}}">
 *
 *   <!-- POLA KARTOWE — W KONTRAKCIE od 2026-08-17 (D-39.47, decyzja operatora).
 *        Jedna sekcja na pole; nazwy: `wskazowka`, `co-mozesz-zmienic`,
 *        `przechowywanie`. Bez nich ZAMIENNIKI NIE DZIAŁAJĄ — mapa buduje się
 *        z pustego pola i żaden marker się nie pojawi. -->
 *   <section data-mp-pole="co-mozesz-zmienic">…<div data-mp-surowe>{{co-mozesz-zmienic}}</div></section>
 *
 * Pola kartowe są związane server-side z WIDOCZNYM tekstem (SEO/GEO). `zaladuj()`
 * CZYTA je domyślnie do modelu; `opcje.pola === false` to wyłącza.
 *
 * ROZDZIELENIE, KTÓRE ŁATWO POMYLIĆ: czytanie pól do modelu (powyżej, w kontrakcie)
 * to co innego niż WSTRZYKIWANIE kart na stronę (`podzielKarty`, wołane jawnie).
 * Właściciela wstrzykiwania rozstrzyga tabela v2 sesji CMS — WYMAGANIA §3 zabrania
 * budować je bez tego rozstrzygnięcia i ten zakaz OBOWIĄZUJE BEZ ZMIAN.
 *
 * Użycie:
 *   const przepis = MP.przepis.zaladuj();          // model przy porcjach bazowych
 *   const widok   = MP.przepis.naPorcje(przepis, 4);
 *   widok.kroki[2].skladnikiTeraz                  // składniki tego kroku
 *   widok.kroki[2].skladnikiDalej                  // jeszcze nieużyte
 *   widok.kroki[2].skladnikiZuzyte                 // z kroków wcześniejszych
 *   widok.kroki[2].zamienniki                      // markery zamienników w tym kroku (maks 2)
 *   widok.kroki[2].zamiennikiWgKlucza['skrobia']   // marker dla KONKRETNEGO wiersza
 *   MP.przepis.adresQR()                           // adres do zakodowania w QR
 */
(function (global) {
  'use strict';

  var UŁAMKI = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };
  var KLUCZE_KROKU = ['czas', 'minutnik', 'skladniki', 'kryterium', 'foto'];
  var JEDNOSTKI_UŁAMKOWE = ['łyżka', 'łyżeczka', 'szklanka'];

  /* Odmiana przez liczebnik. Polski ma cztery formy istotne dla przepisu, więc
     bez tej tabeli skalowanie porcji produkuje "6 łyżki", "2 ząbek", "1½ łyżek".
     Kolejność: [1 · 2–4 · 5+ · dopełniacz l.poj. (dla ułamków)].
     Klucz = mianownik l. poj., czyli to, co pisze redakcja.
     Czego tu nie ma, zostaje nietknięte — plus escape hatch w składni:
     `#rzodkiewka  1 rzodkiewka|rzodkiewki|rzodkiewek|rzodkiewki`. */
  var ODMIANY = {
    'łyżka': ['łyżka', 'łyżki', 'łyżek', 'łyżki'], 'łyżeczka': ['łyżeczka', 'łyżeczki', 'łyżeczek', 'łyżeczki'],
    'szklanka': ['szklanka', 'szklanki', 'szklanek', 'szklanki'], 'ząbek': ['ząbek', 'ząbki', 'ząbków', 'ząbka'],
    'garść': ['garść', 'garście', 'garści', 'garści'], 'plaster': ['plaster', 'plastry', 'plastrów', 'plastra'],
    'gałązka': ['gałązka', 'gałązki', 'gałązek', 'gałązki'], 'laska': ['laska', 'laski', 'lasek', 'laski'],
    'puszka': ['puszka', 'puszki', 'puszek', 'puszki'], 'opakowanie': ['opakowanie', 'opakowania', 'opakowań', 'opakowania'],
    'listek': ['listek', 'listki', 'listków', 'listka'], 'liść': ['liść', 'liście', 'liści', 'liścia'],
    'kostka': ['kostka', 'kostki', 'kostek', 'kostki'], 'szczypta': ['szczypta', 'szczypty', 'szczypt', 'szczypty'],
    'limonka': ['limonka', 'limonki', 'limonek', 'limonki'], 'cytryna': ['cytryna', 'cytryny', 'cytryn', 'cytryny'],
    'cebula': ['cebula', 'cebule', 'cebul', 'cebuli'], 'marchewka': ['marchewka', 'marchewki', 'marchewek', 'marchewki'],
    'jajko': ['jajko', 'jajka', 'jajek', 'jajka'], 'filet': ['filet', 'filety', 'filetów', 'fileta'],
    'pierś': ['pierś', 'piersi', 'piersi', 'piersi'], 'stek': ['stek', 'steki', 'steków', 'steka'],
    'papryka': ['papryka', 'papryki', 'papryk', 'papryki'], 'pomidor': ['pomidor', 'pomidory', 'pomidorów', 'pomidora'],
    'ziemniak': ['ziemniak', 'ziemniaki', 'ziemniaków', 'ziemniaka'], 'bułka': ['bułka', 'bułki', 'bułek', 'bułki'],
    'por': ['por', 'pory', 'porów', 'pora'], 'łodyga': ['łodyga', 'łodygi', 'łodyg', 'łodygi'],
    'kolba': ['kolba', 'kolby', 'kolb', 'kolby'], 'batat': ['batat', 'bataty', 'batatów', 'batata']
  };

  /* Jednostki miary — wolno je dzielić ("1½ łyżeczki"). Wszystko inne w ODMIANY
     to policzalny przedmiot: "1,5 limonki" to nie jest przepis, tylko wynik
     mnożenia, więc zaokrąglamy w górę do całości. */
  var DZIELNE = { 'łyżka': 1, 'łyżeczka': 1, 'szklanka': 1, 'garść': 1, 'szczypta': 1 };

  function jednostkaDzielna(jednostka) {
    /* D-39.50 — przez indeks odwrotny, żeby „łyżki" było dzielne tak samo jak
       „łyżka". Wcześniej forma odmieniona trafiała do gałęzi „spoza tabeli"
       i przypadkiem też wychodziła dzielna — ale z niewłaściwego powodu. */
    var baza = bazaJednostki(jednostka);
    if (!baza) return true;     // g, ml, kg, cm, l — spoza tabeli, dzielne
    return !!DZIELNE[baza];
  }

  /* `D-39.48` · JEDNOSTKI MIARY, KTÓRE SŁUSZNIE SIĘ NIE ODMIENIAJĄ.
     Lista istnieje wyłącznie po to, żeby ostrzeżenie o nieodmienialnej jednostce
     (`ostrzezJednostke`) nie sypało szumem na każdym „500 g" i „200 ml".
     Skróty w polskim są nieodmienne z definicji — to nie jest niedopatrzenie
     redakcji, tylko poprawna pisownia. */
  var MIARY_NIEODMIENNE = {
    'g': 1, 'kg': 1, 'mg': 1, 'dag': 1, 'dkg': 1,
    'ml': 1, 'l': 1, 'cl': 1, 'dl': 1,
    'mm': 1, 'cm': 1, 'm': 1,
    'szt': 1, 'szt.': 1, 'op': 1, 'op.': 1, '%': 1
  };

  /* Ostrzeżenie, nie błąd, i to jest rozstrzygnięcie, nie kompromis: nieodmieniona
     jednostka **nie psuje builda** — psuje wygląd dopiero po ruszeniu selektora
     porcji. Błąd zatrzymywałby redakcję na czymś, co przy porcjach bazowych wygląda
     dobrze; ostrzeżenie mówi „sprawdź to", nie „to się nie zbuduje".

     Powód istnienia: `odmien()` przy słowie spoza tabeli zwraca je NIETKNIĘTE.
     Zapis „3 ząbki czosnku" renderuje się jako „3 ząbki" przy każdej liczbie porcji
     i **nie było na to żadnego sygnału** — pułapka zgłoszona przez sesję równoległą
     2026-08-17, wdrożona na polecenie operatora. */
  /* `D-39.50` · INDEKS ODWROTNY — REDAKCJA PISZE POPRAWNĄ POLSZCZYZNĄ.
     Zgłoszenie operatora 2026-08-17, i miał rację, a moja poprzednia odpowiedź
     („pisz `2 łyżka oliwy`, tak ma być") była wykrętem: **to nie jest angielski,
     tylko polski, i pole CMS nie może zawierać tekstu „na odwal się".**

     Zmierzone `[V]`: surowe pole stoi na stronie w `div[data-mp-skladniki]`
     z `display:none` — użytkownik go nie widzi, ale **jest w źródle HTML**,
     a właśnie o czytelność surowego zapisu dla crawlerów AI chodzi w wymogu
     SEO/GEO z WYMAGANIA §3. „3 łyżka skrobi" trafiało więc do indeksu.

     Rozwiązanie: mapa KAŻDEJ formy z `ODMIANY` na jej klucz bazowy. Dzięki temu
     `3 łyżki skrobi` parsuje się tak samo jak `3 łyżka skrobi` i odmienia się
     poprawnie przy każdej liczbie porcji. Redakcja pisze naturalnie, parser robi
     resztę — czyli odwrotnie niż dotąd.

     Kolizje form między hasłami rozstrzygamy **pierwszym wpisem**, zamiast po cichu
     nadpisywać: `liście` należy do `liść`, ale `cebule` tylko do `cebula`.

     `D-39.53` (R8) · Lista kolizji **była kodem martwym** — liczyłem ją do
     `mapa.__kolizje`, komentarz odsyłał do nieistniejącej nazwy `KOLIZJE_ODMIAN`,
     a nie czytał jej nikt: ani parser, ani runtime, ani panel. **Piąte wystąpienie
     wzorca „funkcja gotowa i nieosiągalna"** po `D-39.13/14/18/39` — i pierwsze,
     które popełniłem sam, godzinę po tym, jak wypunktowałem cztery poprzednie.
     Teraz kolizja **idzie do ostrzeżenia** i jest wystawiona w API, więc da się
     ją zobaczyć i zaasertować. Dziś kolizji jest zero. */
  var FORMA_DO_BAZY = (function () {
    var mapa = Object.create(null);
    var kolizje = [];
    Object.keys(ODMIANY).forEach(function (baza) {
      mapa[baza] = baza;
      ODMIANY[baza].forEach(function (forma) {
        var f = String(forma).toLowerCase();
        if (mapa[f] && mapa[f] !== baza) { kolizje.push(f + ': ' + mapa[f] + ' vs ' + baza); return; }
        if (!mapa[f]) mapa[f] = baza;
      });
    });
    mapa.__kolizje = kolizje;
    return mapa;
  })();

  /* Sprowadza jednostkę do klucza tabeli. Zwraca `null`, gdy słowa nie znamy —
     wtedy `odmien()` zostawia je nietknięte, a `ostrzezJednostke()` się odzywa. */
  function bazaJednostki(jednostka) {
    var s = String(jednostka || '').split('|')[0].toLowerCase();
    if (!s) return null;
    return FORMA_DO_BAZY[s] || null;
  }

  function ostrzezJednostke(key, jednostka) {
    var baza = String(jednostka || '').split('|')[0].toLowerCase();
    if (!baza) return;
    if (String(jednostka).indexOf('|') >= 0) return;   // formy podane jawnie
    if (MIARY_NIEODMIENNE[baza]) return;
    if (bazaJednostki(baza)) return;                  // D-39.50 — także formy odmienione
    ostrzez('składnik #' + key + ': jednostka „' + baza + '" nie jest w tabeli odmian, ' +
            'więc NIE BĘDZIE odmieniana przy zmianie porcji. Użyj mianownika liczby ' +
            'pojedynczej (np. „ząbek", nie „ząbki") albo podaj cztery formy przez ' +
            'kreskę: „ząbek|ząbki|ząbków|ząbka".');
  }

  /* 1 → [0]; 2–4 (poza 12–14) → [1]; 5+ → [2]; ułamek → [3] (dopełniacz l.poj.). */
  function odmien(slowo, n) {
    if (!slowo) return slowo;
    var jawne = slowo.split('|');
    /* D-39.50 — najpierw formy podane jawnie, potem tabela PRZEZ INDEKS ODWROTNY,
       żeby „łyżki" trafiało w hasło „łyżka". Bez indeksu odmieniały się wyłącznie
       zapisy w mianowniku l. poj., czego redakcja nie ma prawa pamiętać. */
    var baza = jawne.length >= 4 ? null : bazaJednostki(slowo);
    var formy = jawne.length >= 4 ? jawne : (baza ? ODMIANY[baza] : null);
    if (!formy) return jawne[0];
    if (n !== Math.floor(n)) return formy[3] || formy[2];
    var abs = Math.abs(n), dz = abs % 10, st = abs % 100;
    if (abs === 1) return formy[0];
    if (dz >= 2 && dz <= 4 && !(st >= 12 && st <= 14)) return formy[1];
    return formy[2];
  }

  var bledy = [];
  function blad(msg) { bledy.push(msg); }

  /* Ostrzeżenia to osobna lista, nie „miękkie błędy". `bledy` jest bramką
     mechaniczną (instrukcja §7) i musi zostać zero-tolerancyjne; ostrzeżenie
     mówi „to prawdopodobnie niedopatrzenie redakcji", nie „to się nie zbuduje". */
  var ostrzezenia = [];
  function ostrzez(msg) { ostrzezenia.push(msg); }

  // ---------------------------------------------------------------- pomocnicze

  function tekstZeSkryptu(id) {
    var el = document.getElementById(id);
    return el ? el.textContent : '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* D-39.15 — `**tekst**` → SAM TEKST. Zakreślenie usunięte z produktu decyzją
     operatora 2026-08-16 („usuńmy efekt highlightu zupełnie, jest nieutrzymywalny").
     Do tej zmiany funkcja zwracała `<mark>$1</mark>`, a runtime malował to na atrament
     z wybitą bielą (W53/W54).

     Znaczniki ZDEJMUJEMY, a nie zostawiamy: pola `*Html` idą przez `innerHTML`, więc
     `**…**` wyświetliłoby się dosłownie, z gwiazdkami. Dokładnie to widać było
     2026-08-16 w podpowiedzi minutnika („Różyczki są **jaskrawozielone**"), bo ta
     jedna powierzchnia brała pole SUROWE zamiast `*Html`.

     Escapowanie zostaje i zostaje PIERWSZE — to ono, a nie brak `<mark>`, sprawia,
     że treść z CMS nie wstrzyknie HTML-u. Wynik nie zawiera już żadnego znacznika,
     więc nazwa `zMarkerem` byłaby po tej zmianie nieprawdą o funkcji. */
  function bezZakreslen(s) {
    return escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, '$1');
  }

  function naLiczbe(s) {
    if (s == null || s === '') return null;
    s = String(s).trim().replace(',', '.');
    if (UŁAMKI[s] != null) return UŁAMKI[s];
    // "1½"
    var m = s.match(/^(\d+)([½¼¾⅓⅔⅛])$/);
    if (m) return parseInt(m[1], 10) + UŁAMKI[m[2]];
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function formatUlamek(v) {
    var calosc = Math.floor(v);
    var reszta = v - calosc;
    var znak = '';
    if (Math.abs(reszta - 0.5) < 0.02) znak = '½';
    else if (Math.abs(reszta - 0.25) < 0.02) znak = '¼';
    else if (Math.abs(reszta - 0.75) < 0.02) znak = '¾';
    else if (Math.abs(reszta - 1 / 3) < 0.02) znak = '⅓';
    else if (Math.abs(reszta - 2 / 3) < 0.02) znak = '⅔';
    if (!znak) return null;
    return (calosc ? calosc : '') + znak;
  }

  function formatIlosc(v, jednostka) {
    if (v == null) return '';
    /* `D-39.52` (R7) · TRZECIE MIEJSCE WYWOŁANIA `D-39.50`, przeoczone przy wdrożeniu.
       Indeks odwrotny dostały `odmien()` i `jednostkaDzielna()`; **ta funkcja nie**,
       więc dalej porównywała SUROWY string z `JEDNOSTKI_UŁAMKOWE`.

       Ironia była dokładna i trafiała wyłącznie w tę redakcję, dla której `D-39.50`
       powstało: `formatIlosc(0.5,'łyżka')` → „½", ale `formatIlosc(0.5,'łyżki')`
       → „0,5". Przy szklankach robiło się z tego **błąd liczbowy, nie kosmetyka**:
       `0.25` z jednostką `szklanki` wpadało w gałąź `v < 10` i wychodziło **„0,3"**.

       Zapada dopiero przy porcjach PONIŻEJ bazowych, więc typowy test na 4 porcjach
       tego nie pokazuje — stąd przeoczenie. Znalezione przez sesję równoległą
       suchym biegiem na wartościach skrajnych, nie przeglądem kodu. */
    var baza = bazaJednostki(jednostka) || String(jednostka || '').split('|')[0].toLowerCase();
    var ulamkowa = JEDNOSTKI_UŁAMKOWE.indexOf(baza) >= 0;
    if (ulamkowa) {
      var u = formatUlamek(v);
      if (u) return u;
    }
    if (v < 10) return String(Math.round(v * 10) / 10).replace('.', ',');
    if (v <= 100) return String(Math.round(v));
    return String(Math.round(v / 5) * 5);      // powyżej 100 g/ml zaokrąglamy do 5
  }

  // ---------------------------------------------------------------- składniki

  /* "300 g piersi z kurczaka" → {ilosc:300, jednostka:'g', nazwa:'piersi z kurczaka'}
     "2–3 łyżki skrobi"        → {ilosc:2, iloscDo:3, jednostka:'łyżki', …}
     "olej do smażenia"        → {ilosc:null, nazwa:'olej do smażenia'}  (nieskalowalny)
     "=1 łyżeczka soli"        → pin:true                                (przypięty)          */
  function rozbijTresc(tresc) {
    var pin = false;
    tresc = tresc.trim();
    if (tresc.charAt(0) === '=') { pin = true; tresc = tresc.slice(1).trim(); }

    var m = tresc.match(/^([\d.,½¼¾⅓⅔⅛]+)(?:\s*[–—-]\s*([\d.,½¼¾⅓⅔⅛]+))?\s+(\S+)?\s*([\s\S]*)$/);
    if (!m) return { ilosc: null, iloscDo: null, jednostka: '', nazwa: tresc, pin: true, tresc: tresc };

    var ilosc = naLiczbe(m[1]);
    if (ilosc == null) return { ilosc: null, iloscDo: null, jednostka: '', nazwa: tresc, pin: true, tresc: tresc };

    return {
      ilosc: ilosc,
      iloscDo: naLiczbe(m[2]),
      jednostka: m[3] || '',
      nazwa: (m[4] || '').trim(),
      pin: pin,
      tresc: tresc
    };
  }

  function parsujSkladniki(txt) {
    var out = [];
    var widziane = Object.create(null);

    txt.split('\n').forEach(function (linia) {
      var s = linia.trim();
      if (!s || s.charAt(0) !== '#') {
        if (s) blad('składnik bez klucza: "' + s + '"');
        return;
      }
      var m = s.match(/^#(\S+)\s+([\s\S]+)$/);
      if (!m) { blad('nie umiem rozebrać wiersza: "' + s + '"'); return; }

      var key = m[1];
      var reszta = m[2];
      var produktSlug = null;

      var mp = reszta.match(/\s@(\S+)\s*$/);
      if (mp) { produktSlug = mp[1]; reszta = reszta.slice(0, mp.index); }

      if (widziane[key]) { blad('duplikat klucza składnika: #' + key); return; }
      widziane[key] = true;

      var czesci = rozbijTresc(reszta);
      /* D-39.48 — sprawdzamy TYLKO wtedy, gdy w ogóle udało się rozebrać ilość.
         Wiersz bez liczby („sól do smaku") nie ma jednostki do odmieniania i nie
         ma o czym ostrzegać. */
      if (czesci.ilosc != null) ostrzezJednostke(key, czesci.jednostka);
      czesci.key = key;
      czesci.produktSlug = produktSlug;
      czesci.produkt = null;   // wypełni podepnijProdukty()
      out.push(czesci);
    });

    return out;
  }

  // ---------------------------------------------------------------- kroki

  function parsujMinutnik(v) {
    var m = String(v).trim().match(/^(?:(\d+):)?(\d+):(\d{2})\s*(.*)$/);
    if (!m) { blad('minutnik bez czasu MM:SS — "' + v + '"'); return null; }
    var sek = (parseInt(m[1] || 0, 10) * 3600) + (parseInt(m[2], 10) * 60) + parseInt(m[3], 10);
    var nazwa = (m[4] || '').trim();
    if (!nazwa) blad('minutnik bez nazwy (pigułka nie ma czego pokazać): "' + v + '"');
    return { sekundy: sek, nazwa: nazwa };
  }

  function parsujKroki(txt, kluczeSkladnikow) {
    var kroki = [];
    var biezacy = null;

    function domknij() {
      if (!biezacy) return;
      biezacy.tekst = biezacy._linie.join(' ').trim();
      biezacy.tekstHtml = bezZakreslen(biezacy.tekst);
      biezacy.kryteriumHtml = biezacy.kryterium ? bezZakreslen(biezacy.kryterium) : null;
      /* `D-39.47` · LIMIT „jeden `**marker**` na krok" USUNIĘTY. Decyzja operatora
         2026-08-17: „usunąć, skoro markera już nie ma, to i nie ma sensu go pilnować".
         Po `D-39.15` (2026-08-16) `bezZakreslen()` zdejmuje gwiazdki i zwraca sam
         tekst, więc `**…**` nie rysuje NICZEGO. Reguła podnosiła BŁĄD — czyli
         najostrzejszy sygnał, jaki ma parser — pilnując składni bez konsekwencji.
         **Reguła bez skutku, egzekwowana jako błąd, jest pułapką:** zatrzymuje
         redakcję na czymś, czego naprawa niczego nie zmienia w produkcie.
         Zamienniki niesie pole `co-mozesz-zmienic` (`zbudujZamienniki`), z własnym
         limitem dwóch na krok i własnymi ostrzeżeniami — i to jest jedyny limit,
         który cokolwiek chroni. */
      delete biezacy._linie;
      if (biezacy.minutnik && biezacy.czas) blad('krok "' + biezacy.tytul + '" ma czas: i minutnik: naraz — wygrywa minutnik');
      if (!biezacy.minutnik && !biezacy.czas) biezacy.czas = 'bez minutnika';
      kroki.push(biezacy);
      biezacy = null;
    }

    txt.split('\n').forEach(function (linia) {
      var s = linia.trim();
      if (!s) return;

      if (s.slice(0, 2) === '==') {
        domknij();
        biezacy = {
          tytul: s.slice(2).trim(), tekst: '', tekstHtml: '', czas: null, minutnik: null,
          kryterium: null, foto: null, fotoUrl: null, skladniki: [], _linie: []
        };
        return;
      }
      if (!biezacy) { blad('treść przed pierwszym krokiem: "' + s + '"'); return; }

      var m = s.match(/^([a-ząćęłńóśźż]+)\s*:\s*([\s\S]*)$/i);
      if (m && KLUCZE_KROKU.indexOf(m[1].toLowerCase()) >= 0) {
        var k = m[1].toLowerCase(), v = m[2].trim();
        if (k === 'czas') biezacy.czas = v;
        else if (k === 'minutnik') biezacy.minutnik = parsujMinutnik(v);
        else if (k === 'kryterium') biezacy.kryterium = v;
        else if (k === 'foto') biezacy.foto = v;
        else if (k === 'skladniki') {
          biezacy.skladniki = v.split(',').map(function (x) {
            return x.trim().replace(/^#/, '');
          }).filter(function (x) { return x && x !== '—' && x !== '-'; });
        }
        return;
      }
      biezacy._linie.push(s);
    });
    domknij();

    // walidacja odsyłaczy
    var znane = Object.create(null);
    kluczeSkladnikow.forEach(function (k) { znane[k] = false; });
    kroki.forEach(function (krok) {
      krok.skladniki.forEach(function (k) {
        if (!(k in znane)) blad('krok "' + krok.tytul + '" odsyła do nieznanego składnika: #' + k);
        else znane[k] = true;
      });
    });
    Object.keys(znane).forEach(function (k) {
      if (!znane[k]) blad('składnik #' + k + ' nie jest użyty w żadnym kroku');
    });

    return kroki;
  }

  // ---------------------------------------------------------------- pola kartowe (Q→A)

  /* Trzy pola — `wskazowka`, `co-mozesz-zmienic`, `przechowywanie` — dzielą jedną
     gramatykę (HANDBACK §4): wpis = pytanie + odpowiedź 1–3 zdania, wpisy rozdzielone
     PUSTĄ LINIĄ, opcjonalny `#klucz` wpisu i opcjonalne `krótko:`.

     Wzorzec `<script type="text/plain">` jest tu ZAKAZANY (WYMAGANIA §3): treść ma
     być widoczna w wyjściowym HTML-u bez JS, bo jej racją bytu jest liftability.
     Skrypt PRZEKSZTAŁCA istniejący DOM w miejscu (`podzielKarty`), nie buduje go
     od zera.

     Kształt wpisu — zmierzony na `przepisy-hub/kurczak-teriyaki-v3.md`, nie
     wymyślony:

         #skrobia
         krótko: skrobia kukurydziana, w tej samej ilości
         Czym zastąpić skrobię ziemniaczaną?
         Kukurydzianą, w tej samej ilości. Panierka wyjdzie odrobinę drobniejsza.

     UWAGA na rozjazd źródeł: HANDBACK §4 pisze „bold question", a WYMAGANIA §3
     dopuszczają literalne `**` w stanie sprzed wzbogacenia — ale realny payload
     v3 NIE ma gwiazdek: pytanie to po prostu pierwszy wiersz treści wpisu.
     Bierzemy więc regułę słabszą i zgodną z obiema: pytanie = pierwszy wiersz,
     który nie jest metadaną; `**…**` wokół niego jest opcjonalne i zdejmowane.
     Pogrubienie jest cechą KARTY, nie zapisu w polu. */

  var RE_KLUCZ_WPISU = /^#(\S+)$/;
  var RE_KROTKO      = /^kr[óo]tko\s*:\s*(.+)$/i;
  var RE_LINK        = /^(?:(.+?)\s+)?((?:https?:\/\/|\/)\S+)$/;
  var RE_PLACEHOLDER = /\{\{url:([^}]+)\}\}/;
  /* czas kanoniczny wg `przechowywanie-bank.md`: „do 2 dni", „2–3 mies.",
     „1–2 godzin". `\w` nie łapie polskich znaków, stąd jawna klasa liter. */
  var RE_CZAS_PRZECHOWYWANIA =
    /\b\d+(?:\s*[–—-]\s*\d+)?\s*(godz\.|godzin[a-ząćęłńóśźż]*|dni|dnia|dzień|tydzień|tygodn[a-ząćęłńóśźż]*|mies\.|miesi[a-ząćęłńóśźż]*)/i;

  function parsujWpisyKartowe(txt, pole) {
    var wpisy = [];
    if (txt == null || !String(txt).trim()) return wpisy;
    pole = pole || '(pole bez nazwy)';

    String(txt).replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/).forEach(function (blok) {
      var linie = blok.split('\n').map(function (l) { return l.trim(); })
                      .filter(function (l) { return l !== ''; });
      if (!linie.length) return;

      var wpis = {
        pole: pole, klucz: null, pytanie: null, krotko: null,
        odpowiedz: '', odpowiedzHtml: '', link: null, surowy: blok.trim()
      };
      var akapity = [];

      linie.forEach(function (l, idx) {
        var m;
        if (idx === 0 && wpis.klucz == null && (m = l.match(RE_KLUCZ_WPISU))) { wpis.klucz = m[1]; return; }
        if (wpis.krotko == null && (m = l.match(RE_KROTKO))) { wpis.krotko = m[1].trim(); return; }

        /* link tylko w OSTATNIM wierszu wpisu — inaczej zdanie kończące się
           adresem zjadłoby odpowiedź */
        if (idx === linie.length - 1 && wpis.pytanie != null) {
          if ((m = l.match(RE_PLACEHOLDER))) {
            wpis.link = { etykieta: l.replace(RE_PLACEHOLDER, '').trim() || null, adres: null, placeholder: m[1] };
            ostrzez('pole „' + pole + '", wpis „' + wpis.pytanie + '": adres jest placeholderem {{url:' +
                    m[1] + '}} — nie renderuję linku, dopóki adres nie jest rozstrzygnięty');
            return;
          }
          if ((m = l.match(RE_LINK))) {
            wpis.link = { etykieta: (m[1] || '').trim() || m[2], adres: m[2], placeholder: null };
            return;
          }
        }

        if (wpis.pytanie == null) { wpis.pytanie = l.replace(/^\*\*\s*|\s*\*\*$/g, '').trim(); return; }
        akapity.push(l);
      });

      wpis.odpowiedz = akapity.join(' ').trim();
      wpis.odpowiedzHtml = escapeHtml(wpis.odpowiedz);
      if (!wpis.pytanie) blad('pole „' + pole + '": wpis bez pytania — „' + wpis.surowy.slice(0, 40) + '…"');
      else if (!wpis.odpowiedz) blad('pole „' + pole + '": pytanie „' + wpis.pytanie + '" bez odpowiedzi');
      wpisy.push(wpis);
    });

    return wpisy;
  }

  /* Klasa walidacji z HANDBACK §4: `#klucz` wpisu bez odpowiednika w `skladniki`.
     Klucz ma sens wyłącznie w `co-mozesz-zmienic` (wpis kluczowany = zamiennik
     równoważny, siada na wierszu składnika); gdzie indziej to pomyłka redakcji. */
  function walidujWpisyKartowe(pola, kluczeSkladnikow) {
    var znane = Object.create(null);
    kluczeSkladnikow.forEach(function (k) { znane[k] = true; });

    Object.keys(pola).forEach(function (nazwa) {
      var maCzas = false;
      pola[nazwa].forEach(function (w) {
        if (w.klucz) {
          if (!znane[w.klucz]) blad('wpis „' + (w.pytanie || w.klucz) + '" w polu „' + nazwa +
                                    '" ma #' + w.klucz + ' bez odpowiednika w skladniki');
          else if (nazwa !== 'co-mozesz-zmienic')
            ostrzez('wpis „' + (w.pytanie || w.klucz) + '" w polu „' + nazwa + '" ma #' + w.klucz +
                    ' — klucz wpisu siada na wierszu składnika i ma sens tylko w co-mozesz-zmienic');
        }
        if (RE_CZAS_PRZECHOWYWANIA.test(w.odpowiedz)) maCzas = true;
      });
      /* A12 na poziomie POLA, nie wpisu — patrz lista decyzji: teriyaki v3 ma
         świadomie jeden wpis przechowywania bez liczby (tekstura, nie czas),
         więc kontrola per wpis fałszywowałaby na treści, która przeszła pipeline. */
      if (nazwa === 'przechowywanie' && pola[nazwa].length && !maCzas)
        ostrzez('pole „przechowywanie" nie podaje czasu w formacie kanonicznym ' +
                '(np. „do 2 dni", „2–3 mies.") w żadnym wpisie');
    });
  }

  // ---------------------------------------------------------------- zamienniki (markery)

  /* Wpis kluczowany z `co-mozesz-zmienic` siada na WIERSZU składnika w ramce kroku
     (aneks poz. 5, C2 rozstrzygnięte: kółko `i` zaraz za nazwą). Ta sekcja jest
     warstwą DANYCH tego mechanizmu: mówi, KTÓRY wiersz KTÓREGO kroku dostaje
     marker i co ten marker niesie. Rysowanie (podkreślenie kropkowane, kółko,
     tooltip 296 px) to warstwa widoku — wiersze E4–E13.

     Trzy reguły z aneksu poz. 5 i HANDBACK §4, wszystkie mierzalne tutaj:
       E1  marker tylko na wierszu pasującego składnika (klucz = klucz składnika);
       E2  wpis BEZ klucza nie wchodzi do trybu gotowania — zostaje na stronie;
       E3  reguła gęstości: maks 2 markery na krok, reszta „moves to the page".
     Plus E14 (WYMAGANIA §5): krok bez ramki składników + wpis kluczowany →
     zamiennik zostaje tylko na stronie, ostrzeżenie w `?debug=1`. */

  var LIMIT_MARKEROW = 2;

  /* Klucz localStorage runtime'u. JEDEN klucz, cała reszta stanu w jego wartości —
     test negatywny WYMAGANIA §6 („nie zapisuje nic poza swoim kluczem") jest
     sprawdzalny tylko wtedy, gdy „swój klucz" ma jedną, nazwaną wartość. */
  var KLUCZ_LS = 'mp-tryb-gotowania';

  function zloz(s) {
    return String(s).toLowerCase()
      .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
      .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[źż]/g, 'z');
  }

  /* NIENARYSOWANE: rozpoznanie „ten krok mówi o składniku, którego nie ma w ramce".
     Bez ramki nie ma wiersza, więc nie ma czego oznaczyć — a chcemy o tym wiedzieć,
     zamiast po cichu gubić zamiennik. Dopasowanie po RDZENIU KLUCZA (klucz pisze
     redakcja i jest lematem: `#skrobia` → `skrob`), nie po nazwie składnika, bo
     nazwa jest odmieniona („skrobi ziemniaczanej") i nie trafiłaby w treść kroku.
     Rdzeń krótszy niż 4 znaki odpuszczamy — złapałby pół przepisu. */
  function krokWspominaKlucz(tekst, klucz) {
    var rdzen = zloz(klucz).slice(0, 6);
    if (rdzen.length < 4) return false;
    return zloz(tekst).indexOf(rdzen) >= 0;
  }

  function zbudujZamienniki(model) {
    var wpisy = (model.pola && model.pola['co-mozesz-zmienic']) || [];
    var mapa = Object.create(null);
    var bezKlucza = 0;

    wpisy.forEach(function (w) {
      if (!w.klucz) { bezKlucza++; return; }        // E2: zostaje na stronie
      if (mapa[w.klucz]) {
        blad('pole „co-mozesz-zmienic": dwa wpisy z kluczem #' + w.klucz +
             ' — wiersz składnika uniesie tylko jeden marker');
        return;
      }
      mapa[w.klucz] = {
        klucz: w.klucz,
        pytanie: w.pytanie,
        /* M-C (przeb. 24): odbiorcą `krotko` jest KARTA STRONY (`data-mp-krotko`),
           nie wiersz w overlayu — wiersz `7224:10917` nie ma trzeciego napisu. */
        krotko: w.krotko,
        tekst: w.odpowiedz,
        tekstHtml: w.odpowiedzHtml,
        link: w.link
      };
    });

    model.zamienniki = mapa;
    model.zamiennikiBezKlucza = bezKlucza;

    var przypiete = Object.create(null);

    model.kroki.forEach(function (krok) {
      // E1: kandydat = klucz OBECNY W RAMCE tego kroku i mający wpis kluczowany
      var kandydaci = krok.skladniki.filter(function (k) { return !!mapa[k]; });
      /* Trafienie w ramkę liczy się nawet wtedy, gdy limit gęstości utnie marker —
         inaczej ten sam wpis dostawałby drugie, mylące ostrzeżenie „nie siada na
         żadnym wierszu", choć siada, tylko został przycięty. */
      kandydaci.forEach(function (k) { przypiete[k] = true; });

      krok.zamienniki = kandydaci.slice(0, LIMIT_MARKEROW).map(function (k) { return mapa[k]; });
      krok.zamiennikiPominiete = kandydaci.slice(LIMIT_MARKEROW).map(function (k) { return mapa[k]; });

      // E3: powyżej limitu gęstości reszta wraca na stronę, ale nie po cichu
      if (krok.zamiennikiPominiete.length) {
        ostrzez('krok „' + krok.tytul + '" ma więcej wpisów kluczowanych niż limit gęstości (' +
                kandydaci.length + ' > ' + LIMIT_MARKEROW + ') — poza trybem gotowania zostają: #' +
                krok.zamiennikiPominiete.map(function (z) { return z.klucz; }).join(', #'));
      }

      // E14: krok bez ramki składników, a treść mówi o składniku z zamiennikiem
      if (!krok.skladniki.length) {
        Object.keys(mapa).forEach(function (k) {
          if (!krokWspominaKlucz(krok.tekst, k)) return;
          ostrzez('krok „' + krok.tytul + '" nie ma ramki składników, a mówi o #' + k +
                  ', dla którego jest wpis kluczowany — zamiennik zostaje tylko na stronie');
        });
      }
    });

    // wpis kluczowany, który nie trafił na żaden wiersz w całym przepisie
    Object.keys(mapa).forEach(function (k) {
      if (!przypiete[k])
        ostrzez('wpis #' + k + ' w polu „co-mozesz-zmienic" nie siada na żadnym wierszu ' +
                'trybu gotowania (żaden krok nie ma go w ramce składników) — zostaje na stronie');
    });

    return mapa;
  }

  function kartaHtml(w) {
    var h = '<h3 class="mp-karta__pytanie">' + escapeHtml(w.pytanie || '') + '</h3>' +
            '<p class="mp-karta__odpowiedz">' + w.odpowiedzHtml + '</p>';
    /* `krótko:` NIE renderuje się w karcie — niesie je tooltip przy wierszu
       składnika (HANDBACK §4: zdegradowane do opcjonalnego, bo tooltip ma pełny
       tekst). Zgłoszenie 12 z v3 („nie wiadomo, gdzie się renderuje") zamykam
       tak: w modelu i w atrybucie karty, nie w jej treści. */
    if (w.link && w.link.adres) {
      h += '<a class="mp-karta__link" href="' + escapeHtml(w.link.adres) + '">' +
           escapeHtml(w.link.etykieta || w.link.adres) + '</a>';
    } else if (w.link && w.link.placeholder) {
      // NIENARYSOWANE: placeholder adresu nie jest linkiem — katalog ukryty (L-17)
      h += '<span class="mp-karta__link mp-karta__link--nierozstrzygniety" data-mp-url="' +
           escapeHtml(w.link.placeholder) + '">' + escapeHtml(w.link.etykieta || '') + '</span>';
    }
    return h;
  }

  /* Przekształca w MIEJSCU kontener pola serwerowego na N kart (wiersz A9).
     Pierwszy wpis PRZEJMUJE element, który przyszedł z serwera — nie kasujemy go
     i nie budujemy kontenera od zera, bo to jest dokładnie ta treść, którą widzi
     crawler bez JS. Kolejne wpisy wchodzą jako rodzeństwo.

     KONTRAKT DOM — ROZSZERZENIE NIEZATWIERDZONE: `[data-mp-pole]` / `[data-mp-surowe]`
     nie są w nagłówku tego pliku (pin, WYMAGANIA §3). Dlatego funkcja jest
     WYWOŁYWANA JAWNIE przez tego, kto zdecyduje o wstrzykiwaniu kart (loader
     stronowy vs szablon — tabela v2 sesji CMS), a nie odpalana z `zaladuj()`. */
  function podzielKarty(el, opcje) {
    opcje = opcje || {};
    if (!el) return null;
    var pole = el.getAttribute('data-mp-pole') || opcje.pole || '';
    var zrodlo = el.querySelector('[data-mp-surowe]');
    var wpisy = opcje.wpisy || parsujWpisyKartowe((zrodlo || el).textContent, pole);

    if (!wpisy.length) { el.hidden = true; el.setAttribute('data-mp-kart', '0'); return []; }

    var poprzedni = null;
    wpisy.forEach(function (w, i) {
      var karta;
      if (i === 0 && zrodlo) {
        karta = zrodlo;                                  // A9: przejęcie, nie budowa
        karta.removeAttribute('data-mp-surowe');
      } else if (i === 0) {
        karta = el.appendChild(document.createElement('article'));
      } else {
        karta = poprzedni.parentNode.insertBefore(document.createElement('article'), poprzedni.nextSibling);
      }
      karta.className = 'mp-karta';
      karta.setAttribute('data-mp-karta', pole);
      if (w.klucz) karta.setAttribute('data-mp-klucz', w.klucz);
      if (w.krotko) karta.setAttribute('data-mp-krotko', w.krotko);
      karta.innerHTML = kartaHtml(w);
      poprzedni = karta;
    });

    el.hidden = false;
    el.setAttribute('data-mp-kart', String(wpisy.length));
    return wpisy;
  }

  function podzielWszystkieKarty(korzen) {
    var wynik = {};
    Array.prototype.forEach.call((korzen || document).querySelectorAll('[data-mp-pole]'), function (el) {
      var nazwa = el.getAttribute('data-mp-pole');
      if (nazwa) wynik[nazwa] = podzielKarty(el);
    });
    return wynik;
  }

  // ---------------------------------------------------------------- DOM: produkty i zdjęcia

  /* `gramatura-produktu` w kolekcji `produkty` to PlainText w formacie "2 x 330 g":
     opakowanie zawiera n sztuk po N g. Design pokazuje sztuki ("2 × 325 g Wołowiny
     Mielonej"), więc liczymy w sztukach, nie w opakowaniach.
     86 z 88 produktów trzyma ten format; wyjątki (szynka, tuszka-z-kurczaka)
     lądują w błędach zamiast psuć wyliczenie. */
  function parsujGramature(s) {
    if (!s) return null;
    /* Separator tysięcy bywa SPACJĄ („1 x 1 000 g", „2 x 1 250 ml”), także twardą
       (U+00A0) albo wąską (U+202F) — Webflow i edytory wstawiają je same.
       Poprzednia klasa `[\d.,]+` urywała się na spacji, więc `1 000 g` cicho
       dawało `null`, czyli brak wielokrotności „n × N g" bez żadnego błędu. */
    var m = String(s).match(/^\s*(\d+)\s*[xX×]\s*(\d[\d\s  .,]*)\s*(g|kg|ml|l)\b/);
    if (!m) return null;
    var waga = parseFloat(m[2].replace(/[\s  ]/g, '').replace(',', '.'));
    if (m[3] === 'kg' || m[3] === 'l') waga *= 1000;
    return { sztuk: parseInt(m[1], 10), gramatura: waga };
  }

  function podepnijProdukty(skladniki) {
    var mapa = Object.create(null);
    Array.prototype.forEach.call(document.querySelectorAll('[data-mp-produkt]'), function (el) {
      var slug = el.getAttribute('data-slug');
      if (!slug) return;
      var g = parsujGramature(el.getAttribute('data-gramatura'));
      mapa[slug] = {
        slug: slug,
        nazwa: el.getAttribute('data-nazwa') || '',
        url: el.getAttribute('data-url') || ('/produkty/' + slug),
        gramaturaRaw: el.getAttribute('data-gramatura') || '',
        gramatura: g ? g.gramatura : null,
        sztukWOpakowaniu: g ? g.sztuk : null
      };
    });
    skladniki.forEach(function (sk) {
      if (!sk.produktSlug) return;
      sk.produkt = mapa[sk.produktSlug] || null;
      if (!sk.produkt) blad('składnik #' + sk.key + ' odsyła do produktu "' + sk.produktSlug + '", którego nie ma w produkty-w-przepisie');
      else if (!sk.produkt.gramatura) blad('produkt "' + sk.produktSlug + '" ma gramaturę "' + sk.produkt.gramaturaRaw + '", której nie umiem odczytać (oczekuję "n x N g") — wielokrotność "n × …" niedostępna');
    });
  }

  function podepnijZdjecia(kroki) {
    var galeria = Array.prototype.map.call(
      document.querySelectorAll('[data-mp-foto-kroku]'),
      function (img) { return img.currentSrc || img.src; }
    );
    kroki.forEach(function (krok) {
      if (!krok.foto) return;
      var trafienie = galeria.filter(function (src) { return src.indexOf(krok.foto) >= 0; })[0];
      if (!trafienie) blad('krok "' + krok.tytul + '" szuka zdjęcia "' + krok.foto + '" — brak w zdjecia-krokow');
      krok.fotoUrl = trafienie || null;
    });
  }

  /* Zdjęcie GŁÓWNE przepisu — D-23.1 (operator, 2026-08-15): pole `zdjecie-glowne`
     (Image, id `93ac881e…`), to samo na ekranie startowym i na zakończeniu.
     Osobne wejście kontraktu DOM, bo `data-mp-foto-kroku` jest galerią MultiImage
     i wiąże się z polem KROKU; zdjęcie przepisu nie ma tam czego szukać. To jest
     zmiana KONTRAKTU — patrz `PAKIET-INTEGRACYJNY.md` §5.

     Pusty `src` traktujemy jak brak: Webflow renderuje `<img src="">` dla pustego
     pola Image, a to jest brak zdjęcia, nie zdjęcie o pustym adresie. Sprawdzamy
     ATRYBUT, nie `img.src` — przeglądarka rozwija pusty `src` do adresu strony,
     więc `img.src` dla pustego pola zwraca URL dokumentu i wygląda na trafienie. */
  function zdjecieGlowne(nadpisanie) {
    if (nadpisanie != null) return String(nadpisanie) || null;
    var img = document.querySelector('[data-mp-foto-glowne]');
    if (!img) return null;
    var atrybut = (img.getAttribute('src') || '').trim();
    if (!atrybut) return null;
    return img.currentSrc || img.src || null;
  }

  // ---------------------------------------------------------------- model + skalowanie

  function zJson(txt) {
    var dane = JSON.parse(txt);
    return {
      skladniki: (dane.skladniki || []).map(function (s) {
        return {
          key: s.key, ilosc: s.ilosc != null ? s.ilosc : null, iloscDo: s.iloscDo || null,
          jednostka: s.jednostka || '', nazwa: s.nazwa || s.tekst || '',
          pin: !!s.pin, tresc: s.tekst || '', produktSlug: s.produkt || null, produkt: null
        };
      }),
      kroki: (dane.kroki || []).map(function (k) {
        return {
          tytul: k.tytul, tekst: k.tekst || '', tekstHtml: bezZakreslen(k.tekst || ''),
          czas: k.czas || null, minutnik: k.minutnik || null,
          kryterium: k.kryterium || null, kryteriumHtml: k.kryterium ? bezZakreslen(k.kryterium) : null,
          foto: k.foto || null, fotoUrl: null, skladniki: k.skladniki || []
        };
      })
    };
  }

  function zaladuj(opcje) {
    opcje = opcje || {};
    bledy = [];
    ostrzezenia = [];

    var korzen = document.getElementById(opcje.korzen || 'mp-tryb-gotowania');
    var txtSkl = (opcje.skladniki != null ? opcje.skladniki : tekstZeSkryptu('mp-skladniki')).trim();
    var txtKrk = (opcje.kroki != null ? opcje.kroki : tekstZeSkryptu('mp-kroki')).trim();

    if (!txtSkl || !txtKrk) { blad('brak pól skladniki lub kroki na stronie'); }

    var model;
    var pierwszy = (txtSkl.charAt(0) || '') + (txtKrk.charAt(0) || '');
    if (txtSkl.charAt(0) === '{' || txtSkl.charAt(0) === '[') {
      try {
        model = zJson(txtSkl.charAt(0) === '{' && txtKrk === '' ? txtSkl : '{"skladniki":' + txtSkl + ',"kroki":' + txtKrk + '}');
      } catch (e) { blad('pole w formacie JSON, ale nieparsowalne: ' + e.message); model = { skladniki: [], kroki: [] }; }
    } else {
      var skl = parsujSkladniki(txtSkl);
      model = { skladniki: skl, kroki: parsujKroki(txtKrk, skl.map(function (s) { return s.key; })) };
    }

    podepnijProdukty(model.skladniki);
    podepnijZdjecia(model.kroki);

    /* `D-39.47` · POLA KARTOWE DOMYŚLNIE WŁĄCZONE — `[data-mp-pole]` WCHODZI DO
       KONTRAKTU DOM. Decyzja operatora 2026-08-17, wprost: „wchodzi do kontraktu".

       Przesłanka: dopóki czytanie było opt-in, `zbudujZamienniki` budowało mapę
       z pustego pola i **żaden marker zamiennika nie pojawiał się nigdy** — także
       przy bezbłędnie wypełnionym `co-mozesz-zmienic`. Cała mechanika zamienników
       (dopasowanie po kluczu, limit dwóch na krok, ostrzeżenia o wpisach, które nie
       siadają na wierszu) była gotowa i nieosiągalna. **Piąte wystąpienie wzorca
       „funkcja gotowa, wyzwalacza brak"** po `D-39.13/14/18/39`.

       Zakres zmiany jest wąski i celowo taki został: włączamy **CZYTANIE** pól do
       modelu. **Wstrzykiwania kart na stronę (`podzielKarty`) NIE ruszamy** — jego
       właściciela rozstrzyga tabela v2 sesji CMS, a WYMAGANIA §3 mówi wprost
       „nie buduj wstrzykiwania bez tego rozstrzygnięcia". Te dwie rzeczy bywają
       mylone, bo dotyczą tego samego pola.

       `opcje.pola === false` wyłącza czytanie jawnie; obiekt nadal podaje surowe
       teksty wprost, z pominięciem DOM-u (używa tego harness). */
    var zrodlaPol = (opcje.pola === undefined || opcje.pola === true) ? true : opcje.pola;
    if (zrodlaPol === true) {
      zrodlaPol = {};
      /* `D-39.51` · CZYTAMY DWIE KONWENCJE: własną i tę, którą wystawia szablon.
         Decyzja operatora 2026-08-17 (wariant B).

         Zmierzone na stagingu `[V]`: szablon **nie używa** `data-mp-pole`. Wystawia
         `div[data-mp-karty="<nazwa pola>"]` jako grupę, a w niej `div[data-mp-zrodlo]`
         z surowym tekstem. Nazwy odpowiadają sobie jeden do jednego:
         `data-mp-pole` ↔ `data-mp-karty`, `data-mp-surowe` ↔ `data-mp-zrodlo`.

         **Dlaczego parser uczy się cudzej nazwy, a nie szablon naszej:** to jedyny
         wariant, który działa bez edycji Webflow i bez uzgodnień z drugim łańcuchem.
         Cena jest nazwana i przyjęta: parser zaczyna zależeć od konwencji, której
         nie ustala. Gdyby ktoś przemianował `data-mp-zrodlo`, zamienniki zgasłyby
         po cichu — dlatego niżej stoi ostrzeżenie, które robi z tego sygnał.
         Ujednolicenie nazw ma sens dopiero przy drugim szablonie; dziś byłoby
         zmianą w Webflow po to, żeby dokument zgadzał się sam ze sobą. */
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-mp-pole],[data-mp-karty]'), function (el) {
          var nazwa = el.getAttribute('data-mp-pole') || el.getAttribute('data-mp-karty');
          if (!nazwa) return;
          var zrodlo = el.querySelector('[data-mp-surowe],[data-mp-zrodlo]') || el;
          zrodlaPol[nazwa] = zrodlo.textContent;
        });

      /* Sygnał na wypadek DRYFU KONWENCJI: surowe źródło, które istnieje, ale nie
         siedzi w nazwanym kontenerze, jest niewidoczne dla parsera i nie ma jak
         tego zauważyć inaczej. Ostrzegamy WYŁĄCZNIE w tym przypadku — przepis bez
         pól kartowych milczy, bo brak kart to nie usterka. */
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-mp-surowe],[data-mp-zrodlo]'), function (el) {
          if (!el.closest || !el.closest('[data-mp-pole],[data-mp-karty]')) {
            ostrzez('znalazłem surowe źródło pola kartowego poza nazwanym kontenerem ' +
                    '(`[data-mp-pole]` albo `[data-mp-karty]`) — parser go NIE przeczyta, ' +
                    'więc zamienniki z tego pola nie zadziałają. Prawdopodobnie zmieniła ' +
                    'się konwencja atrybutów w szablonie.');
          }
        });
    }
    model.pola = {};
    if (zrodlaPol && typeof zrodlaPol === 'object') {
      Object.keys(zrodlaPol).forEach(function (nazwa) {
        model.pola[nazwa] = parsujWpisyKartowe(zrodlaPol[nazwa], nazwa);
      });
      walidujWpisyKartowe(model.pola, model.skladniki.map(function (s) { return s.key; }));
    }

    /* Bezwarunkowo — także bez pól kartowych. Wtedy mapa jest pusta, a każdy krok
       i tak dostaje `zamienniki: []`, więc warstwa widoku nie musi sprawdzać,
       czy pole w ogóle istniało. */
    zbudujZamienniki(model);

    model.tytul =korzen ? (korzen.getAttribute('data-tytul') || document.title) : document.title;
    model.porcjeBazowe = korzen ? (parseInt(korzen.getAttribute('data-porcje-bazowe'), 10) || 1) : 1;
    model.czas = korzen ? korzen.getAttribute('data-czas') : null;
    model.fotoUrl = zdjecieGlowne(opcje.fotoGlowne);
    model.meta = zbudujMeta(model.czas,
      (opcje.wartosciPorcja != null ? opcje.wartosciPorcja : tekstZeSkryptu('mp-wartosci-porcja')));
    /* D-39.53 — kolizja form w tabeli odmian jest defektem KODU, nie treści, ale
       panel jest jedynym miejscem, w którym cokolwiek widać. Lepiej, żeby stała
       w ostrzeżeniach dewelopera niż nigdzie. */
    if (FORMA_DO_BAZY.__kolizje.length) {
      ostrzez('tabela odmian ma kolidujące formy (wygrywa wcześniejsze hasło): ' +
              FORMA_DO_BAZY.__kolizje.join(' · '));
    }
    model.kolizjeOdmian = FORMA_DO_BAZY.__kolizje.slice();
    model.bledy = bledy.slice();
    model.ostrzezenia = ostrzezenia.slice();

    if (/[?&]debug=1/.test(location.search)) pokazPanelBledow(model.bledy, model.ostrzezenia);
    return model;
  }

  /* ---------------------------------------------------------------- pasek meta (ekran startowy)

     Klatka `7263:10715` rysuje TRZY kolumny: czas · kcal · makro. Dwie z nich
     pochodzą z pola `wartosci-porcja` (CR z 2026-08-15, D-15.1 wariant B rozszerzone),
     które jest CZYTANE, nigdy odtwarzane w przeglądarce — mnożenie stringu na 100 g
     przez `waga-porcji/100` dawało 419 kcal tam, gdzie kalkulator liczy 417.

     Reguła pustki jest z CR-u dosłownie: brak pola → pasek znika W CAŁOŚCI, a nie
     pokazuje trzech kolumn z kreskami ani jednej kolumny z czasem. Dlatego funkcja
     zwraca `[]`, a nie kolumnę czasu — kolumna czasu bez dwóch pozostałych nie jest
     „mniej informacji", tylko innym rysunkiem.

     Wartości są NA PORCJĘ i z definicji nie skalują się selektorem porcji: pole
     opisuje jedną porcję, a nie porcję bazową. [I] — wynika z nazwy pola i z metody
     kalkulatora (`naPorcje[k] = sumy[k] / porcje`), nie ze zmierzonego zachowania. */

  var RE_ENERGIA = /energia\s*:[^;]*?(\d+(?:[.,]\d+)?)\s*kcal/i;

  function skladnikOdzywczy(txt, nazwa) {
    var m = txt.match(new RegExp(nazwa + '\\s*:\\s*(\\d+(?:[.,]\\d+)?)\\s*g', 'i'));
    return m ? Math.round(parseFloat(m[1].replace(',', '.'))) : null;
  }

  function zbudujMeta(czas, wartosciPorcja) {
    var txt = String(wartosciPorcja || '').trim();
    if (!txt) return [];

    var e = txt.match(RE_ENERGIA);
    var b = skladnikOdzywczy(txt, 'białko');
    var w = skladnikOdzywczy(txt, 'węglowodany');
    var t = skladnikOdzywczy(txt, 'tłuszcz');

    if (!e || b == null || w == null || t == null) {
      blad('pole „wartosci-porcja" jest, ale nie umiem z niego odczytać ' +
           'kcal/białka/węglowodanów/tłuszczu — pasek meta zostaje ukryty');
      return [];
    }

    /* Glify są NAZWAMI LIGATUR z klatki, nie znakami: `hourglass`, `local_dining`,
       `leaderboard`. Czy istnieją w subsecie, rozstrzyga pomiar (I4/B16), nie ten plik. */
    /* D-39.38 · JEDNOSTKA CZASU NALEŻY DO MODELU, tak samo jak „kcal".
       Zgłoszenie operatora 2026-08-17: ekran startowy pokazywał gołe „30",
       a `7263:10719` rysuje „60 min". Zmierzone `[V]`: pole CMS niesie SAMĄ
       LICZBĘ (`model.czas === "30"`), a jednostkę dokłada szablon strony we
       własnym zakresie — hero tego samego przepisu renderuje „30 min".
       Tryb gotowania tego nie robił, bo dwie pozostałe kolumny budują jednostkę
       w kodzie (`+ ' kcal'`, `'B…W…T…'`), a czas był przepisywany surowo.

       WARUNKOWO, nie bezwarunkowo: pole CMS nie ma walidacji formatu, więc
       wartość może już nieść jednostkę („1 h 20 min") albo cokolwiek innego.
       Doklejamy wyłącznie do samej liczby; wszystko poza `^\d+$` zostaje
       nietknięte. Bezwarunkowe `+ ' min'` dałoby „30 min min" przy pierwszym
       przepisie, w którym ktoś wpisze jednostkę ręcznie. */
    var czasTxt = String(czas == null ? '' : czas).trim();
    if (/^\d+$/.test(czasTxt)) czasTxt += ' min';

    return [
      { glif: 'hourglass',   wartosc: czasTxt },
      { glif: 'local_dining', wartosc: Math.round(parseFloat(e[1].replace(',', '.'))) + ' kcal' },
      { glif: 'leaderboard',  wartosc: 'B' + b + ' W' + w + ' T' + t }
    ];
  }

  /* Zwraca widok modelu przeliczony na `porcje`, z podziałem listy na
     teraz / dalej / zużyte względem każdego kroku (klatka "W · krok 3"). */
  function naPorcje(model, porcje) {
    var mnoznik = porcje / (model.porcjeBazowe || 1);

    var skladniki = model.skladniki.map(function (s) {
      var kopia = Object.assign({}, s);
      if (s.ilosc == null || s.pin) {
        kopia.etykieta = s.tresc;
      } else {
        var dzielna = jednostkaDzielna(s.jednostka);
        var ile = s.ilosc * mnoznik;
        var doIle = s.iloscDo != null ? s.iloscDo * mnoznik : null;
        if (!dzielna) { ile = Math.ceil(ile - 0.001); if (doIle != null) doIle = Math.ceil(doIle - 0.001); }
        /* `D-39.54` · ZAKRES O RÓWNYCH KOŃCACH ZWIJA SIĘ DO JEDNEJ LICZBY.
           Znalezione przez `narzedzia/suchy-bieg-porcji.js` na PIERWSZYM uruchomieniu:
           `2–3 gałązki` przy ćwiartce bazy dawało `1–1 gałązka`, bo oba końce
           zaokrąglają się w górę do 1 (jednostka niedzielna). „1–1" nie jest
           zakresem, tylko artefaktem zaokrąglenia. */
        var txtOd = formatIlosc(ile, s.jednostka);
        var txtDo = doIle != null ? formatIlosc(doIle, s.jednostka) : null;
        var liczba = txtOd + (txtDo != null && txtDo !== txtOd ? '–' + txtDo : '');
        kopia.iloscPrzeliczona = ile;
        // odmiana idzie po górnym końcu zakresu: "2–3 łyżki", "4–6 łyżek"
        kopia.etykieta = (liczba + ' ' + odmien(s.jednostka, doIle != null ? doIle : ile) + ' ' + s.nazwa)
          .replace(/\s+/g, ' ').trim();
      }
      /* `D-39.49` · ETYKIETA PRODUKTOWA ZDJĘTA — ZOSTAJĄ GRAMY. Decyzja operatora
         2026-08-17: „design nie pokazuje sztuk, usunąłem to (…) wskazywanie liczby
         sztuk jest pozbawione sensu, lepiej liczyć w gramach".

         Było: `n × gramatura g nazwa`, gdzie `n` to liczba SZTUK w opakowaniu.
         Dawało to „4 × 335 g" przy ośmiu porcjach — czyli DWA opakowania, czego
         etykieta nie mówiła, i jednocześnie **kasowało całą pracę nad odmianą**,
         bo powstawało od zera z pominięciem `odmien()`.

         Uzasadnienie, które to trzymało („design pokazuje sztuki"), zostało przez
         operatora **wycofane z projektu**, więc przesłanka zniknęła — to nie jest
         cofanie cudzej decyzji, tylko usunięcie kodu po decyzji już odwołanej.

         `s.produkt` NIE znika: wiązanie z produktem dalej żyje w modelu i dalej
         służy do linkowania do sklepu. Zdejmujemy wyłącznie NADPISYWANIE etykiety.
         Pole `kopia.opakowania` usunięte razem z nią — sprawdzone, że nikt go nie
         czytał ani w parserze, ani w runtimie. */
      return kopia;
    });

    var wgKlucza = Object.create(null);
    skladniki.forEach(function (s) { wgKlucza[s.key] = s; });

    // pierwszy krok, w którym składnik się pojawia — porządkuje teraz/dalej/zużyte
    var pierwszeUzycie = Object.create(null);
    model.kroki.forEach(function (krok, i) {
      krok.skladniki.forEach(function (k) {
        if (pierwszeUzycie[k] == null) pierwszeUzycie[k] = i;
      });
    });

    var kroki = model.kroki.map(function (krok, i) {
      var kopia = Object.assign({}, krok);
      kopia.numer = i + 1;
      kopia.zIlu = model.kroki.length;
      kopia.badge = krok.minutnik
        ? formatCzas(krok.minutnik.sekundy)
        : (krok.czas || 'bez minutnika');
      kopia.skladnikiTeraz = krok.skladniki.map(function (k) { return wgKlucza[k]; }).filter(Boolean);
      kopia.skladnikiDalej = skladniki.filter(function (s) { return pierwszeUzycie[s.key] > i; });
      kopia.skladnikiZuzyte = skladniki.filter(function (s) { return pierwszeUzycie[s.key] < i; });
      /* E1 — słownik dla warstwy widoku: wiersz dostaje marker wtedy i tylko wtedy,
         gdy jego klucz jest TUTAJ. Flagi nie da się postawić na samym składniku,
         bo obiekt składnika jest współdzielony przez kroki i marker wyciekłby
         na wiersze kroków, które zamiennika nie mają. */
      kopia.zamiennikiWgKlucza = Object.create(null);
      (krok.zamienniki || []).forEach(function (z) { kopia.zamiennikiWgKlucza[z.klucz] = z; });
      return kopia;
    });

    /* `fotoUrl` przechodzi na poziom WIDOKU (D-23.1). Bez tego przepustu
       `zdjecieEkranu()` pytał o pole, którego widok nie miał, i zwracał `null`
       przy każdym wejściu — usterka B21, żywa od pierwszej wersji runtime'u. */
    return { tytul: model.tytul, czas: model.czas, meta: model.meta || [], porcje: porcje,
             fotoUrl: model.fotoUrl || null,
             skladniki: skladniki, kroki: kroki,
             zamienniki: model.zamienniki || {}, bledy: model.bledy };
  }

  function formatCzas(sek) {
    if (sek % 60 === 0) return (sek / 60) + ' min';
    return Math.floor(sek / 60) + ':' + String(sek % 60).padStart(2, '0');
  }

  // ---------------------------------------------------------------- QR

  /* ---------------------------------------------------------------- zależność QR

     D-13.1 → wariant B (rozstrzygnięcie operatora): biblioteka QR jest DOŁĄCZONA
     do artefaktu parsera, nie ładowana z CDN-u i nie zakładana z `global`. Powód
     jest ten sam co przy wariancie (3) tokenów: nie chcemy zależności, którą ktoś
     musi się opiekować — cudzy host to cudzy uptime, a pin wersji to czyjaś przyszła
     robota. API obrazkowe (`api.qrserver.com` i krewni) wyklucza spec §8 wprost.

     WYBÓR BIBLIOTEKI JEST POMIAREM, NIE PREFERENCJĄ. Pierwszą próbą był `qr-creator`
     — mniejszy (12 kB) i z API pasującym do istniejącego wywołania co do znaku.
     Przemiar w przebiegu 28 pokazał, że rysuje `<canvas>`, a spec §8 wymaga SVG,
     więc wypadł. Nie dowiedziałby się tego nikt czytający kod: stary test-double
     wstawiał do kontenera `<svg>`, czyli asercja „wynik jest SVG" mierzyła podstawkę.
     `qrcode-generator` ma `createSvgTag()` i to on został.

     Biblioteka mieszka w LOKALNEJ zmiennej, nie w `window`. Jej ogon UMD szuka
     `define`/`exports`/`module`; deklarujemy je puste tuż obok, żeby nie znalazł
     niczego i żeby artefakt nie udawał modułu. Warunek pomiaru jest twardy: wiersz
     I3 wymaga, żeby `window` nie dostało NICZEGO, a QR i tak się rysował — gdyby
     biblioteka siedziała w globalu, „dołączona" i „założona" byłyby nierozróżnialne.

     Deklaracja zależności stoi w DANYCH (`MP.przepis.zaleznosci`), nie w komentarzu
     — ta sama nauka co z wariantu (3) w przebiegu 28: komentarz przeżywa tylko taki
     build, w którym ktoś pamiętał o fladze. Pełna nota licencyjna MIT jest osobno,
     w banerze `/*!`, bo licencja wymaga jej dosłownej obecności w kopiach; terser
     zachowuje banery `/*!` domyślnie i jest to zmierzone, nie założone. */

  var ZALEZNOSCI = {
    qr: {
      nazwa: 'qrcode-generator',
      wersja: '2.0.4',
      licencja: 'MIT',
      prawa: '(c) 2009 Kazuhiko Arase, http://www.d-project.com/',
      rysujeDo: 'svg',
      dostarczenie: 'wbudowana w artefakt parsera (D-13.1 wariant B)',
      globalna: false
    }
  };

  /*! qrcode-generator v2.0.4 — https://github.com/kazuhikoarase/qrcode-generator
      QR Code Generator for JavaScript, Copyright (c) 2009 Kazuhiko Arase,
      http://www.d-project.com/ — licencja MIT
      (http://www.opensource.org/licenses/mit-license.php).
      Permission is hereby granted, free of charge, to any person obtaining a copy
      of this software and associated documentation files (the "Software"), to deal
      in the Software without restriction, including without limitation the rights
      to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
      copies of the Software, and to permit persons to whom the Software is
      furnished to do so, subject to the following conditions: The above copyright
      notice and this permission notice shall be included in all copies or
      substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
      WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
      THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
      NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
      FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
      TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
      THE USE OR OTHER DEALINGS IN THE SOFTWARE.
      „QR Code" jest zastrzeżonym znakiem towarowym DENSO WAVE INCORPORATED. */

  var QR = (function () {
    var define, exports, module;   /* UMD-owy ogon biblioteki ma nie znaleźć niczego
                                      do podpięcia — artefakt nie jest modułem i nie
                                      ma prawa udawać, że nim jest. */

    var qrcode = function() {

      //---------------------------------------------------------------------
      // qrcode
      //---------------------------------------------------------------------

      /**
       * qrcode
       * @param typeNumber 1 to 40
       * @param errorCorrectionLevel 'L','M','Q','H'
       */
      var qrcode = function(typeNumber, errorCorrectionLevel) {

        var PAD0 = 0xEC;
        var PAD1 = 0x11;

        var _typeNumber = typeNumber;
        var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
        var _modules = null;
        var _moduleCount = 0;
        var _dataCache = null;
        var _dataList = [];

        var _this = {};

        var makeImpl = function(test, maskPattern) {

          _moduleCount = _typeNumber * 4 + 17;
          _modules = function(moduleCount) {
            var modules = new Array(moduleCount);
            for (var row = 0; row < moduleCount; row += 1) {
              modules[row] = new Array(moduleCount);
              for (var col = 0; col < moduleCount; col += 1) {
                modules[row][col] = null;
              }
            }
            return modules;
          }(_moduleCount);

          setupPositionProbePattern(0, 0);
          setupPositionProbePattern(_moduleCount - 7, 0);
          setupPositionProbePattern(0, _moduleCount - 7);
          setupPositionAdjustPattern();
          setupTimingPattern();
          setupTypeInfo(test, maskPattern);

          if (_typeNumber >= 7) {
            setupTypeNumber(test);
          }

          if (_dataCache == null) {
            _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
          }

          mapData(_dataCache, maskPattern);
        };

        var setupPositionProbePattern = function(row, col) {

          for (var r = -1; r <= 7; r += 1) {

            if (row + r <= -1 || _moduleCount <= row + r) continue;

            for (var c = -1; c <= 7; c += 1) {

              if (col + c <= -1 || _moduleCount <= col + c) continue;

              if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
                  || (0 <= c && c <= 6 && (r == 0 || r == 6) )
                  || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        };

        var getBestMaskPattern = function() {

          var minLostPoint = 0;
          var pattern = 0;

          for (var i = 0; i < 8; i += 1) {

            makeImpl(true, i);

            var lostPoint = QRUtil.getLostPoint(_this);

            if (i == 0 || minLostPoint > lostPoint) {
              minLostPoint = lostPoint;
              pattern = i;
            }
          }

          return pattern;
        };

        var setupTimingPattern = function() {

          for (var r = 8; r < _moduleCount - 8; r += 1) {
            if (_modules[r][6] != null) {
              continue;
            }
            _modules[r][6] = (r % 2 == 0);
          }

          for (var c = 8; c < _moduleCount - 8; c += 1) {
            if (_modules[6][c] != null) {
              continue;
            }
            _modules[6][c] = (c % 2 == 0);
          }
        };

        var setupPositionAdjustPattern = function() {

          var pos = QRUtil.getPatternPosition(_typeNumber);

          for (var i = 0; i < pos.length; i += 1) {

            for (var j = 0; j < pos.length; j += 1) {

              var row = pos[i];
              var col = pos[j];

              if (_modules[row][col] != null) {
                continue;
              }

              for (var r = -2; r <= 2; r += 1) {

                for (var c = -2; c <= 2; c += 1) {

                  if (r == -2 || r == 2 || c == -2 || c == 2
                      || (r == 0 && c == 0) ) {
                    _modules[row + r][col + c] = true;
                  } else {
                    _modules[row + r][col + c] = false;
                  }
                }
              }
            }
          }
        };

        var setupTypeNumber = function(test) {

          var bits = QRUtil.getBCHTypeNumber(_typeNumber);

          for (var i = 0; i < 18; i += 1) {
            var mod = (!test && ( (bits >> i) & 1) == 1);
            _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
          }

          for (var i = 0; i < 18; i += 1) {
            var mod = (!test && ( (bits >> i) & 1) == 1);
            _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
          }
        };

        var setupTypeInfo = function(test, maskPattern) {

          var data = (_errorCorrectionLevel << 3) | maskPattern;
          var bits = QRUtil.getBCHTypeInfo(data);

          // vertical
          for (var i = 0; i < 15; i += 1) {

            var mod = (!test && ( (bits >> i) & 1) == 1);

            if (i < 6) {
              _modules[i][8] = mod;
            } else if (i < 8) {
              _modules[i + 1][8] = mod;
            } else {
              _modules[_moduleCount - 15 + i][8] = mod;
            }
          }

          // horizontal
          for (var i = 0; i < 15; i += 1) {

            var mod = (!test && ( (bits >> i) & 1) == 1);

            if (i < 8) {
              _modules[8][_moduleCount - i - 1] = mod;
            } else if (i < 9) {
              _modules[8][15 - i - 1 + 1] = mod;
            } else {
              _modules[8][15 - i - 1] = mod;
            }
          }

          // fixed module
          _modules[_moduleCount - 8][8] = (!test);
        };

        var mapData = function(data, maskPattern) {

          var inc = -1;
          var row = _moduleCount - 1;
          var bitIndex = 7;
          var byteIndex = 0;
          var maskFunc = QRUtil.getMaskFunction(maskPattern);

          for (var col = _moduleCount - 1; col > 0; col -= 2) {

            if (col == 6) col -= 1;

            while (true) {

              for (var c = 0; c < 2; c += 1) {

                if (_modules[row][col - c] == null) {

                  var dark = false;

                  if (byteIndex < data.length) {
                    dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
                  }

                  var mask = maskFunc(row, col - c);

                  if (mask) {
                    dark = !dark;
                  }

                  _modules[row][col - c] = dark;
                  bitIndex -= 1;

                  if (bitIndex == -1) {
                    byteIndex += 1;
                    bitIndex = 7;
                  }
                }
              }

              row += inc;

              if (row < 0 || _moduleCount <= row) {
                row -= inc;
                inc = -inc;
                break;
              }
            }
          }
        };

        var createBytes = function(buffer, rsBlocks) {

          var offset = 0;

          var maxDcCount = 0;
          var maxEcCount = 0;

          var dcdata = new Array(rsBlocks.length);
          var ecdata = new Array(rsBlocks.length);

          for (var r = 0; r < rsBlocks.length; r += 1) {

            var dcCount = rsBlocks[r].dataCount;
            var ecCount = rsBlocks[r].totalCount - dcCount;

            maxDcCount = Math.max(maxDcCount, dcCount);
            maxEcCount = Math.max(maxEcCount, ecCount);

            dcdata[r] = new Array(dcCount);

            for (var i = 0; i < dcdata[r].length; i += 1) {
              dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
            }
            offset += dcCount;

            var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
            var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

            var modPoly = rawPoly.mod(rsPoly);
            ecdata[r] = new Array(rsPoly.getLength() - 1);
            for (var i = 0; i < ecdata[r].length; i += 1) {
              var modIndex = i + modPoly.getLength() - ecdata[r].length;
              ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
            }
          }

          var totalCodeCount = 0;
          for (var i = 0; i < rsBlocks.length; i += 1) {
            totalCodeCount += rsBlocks[i].totalCount;
          }

          var data = new Array(totalCodeCount);
          var index = 0;

          for (var i = 0; i < maxDcCount; i += 1) {
            for (var r = 0; r < rsBlocks.length; r += 1) {
              if (i < dcdata[r].length) {
                data[index] = dcdata[r][i];
                index += 1;
              }
            }
          }

          for (var i = 0; i < maxEcCount; i += 1) {
            for (var r = 0; r < rsBlocks.length; r += 1) {
              if (i < ecdata[r].length) {
                data[index] = ecdata[r][i];
                index += 1;
              }
            }
          }

          return data;
        };

        var createData = function(typeNumber, errorCorrectionLevel, dataList) {

          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

          var buffer = qrBitBuffer();

          for (var i = 0; i < dataList.length; i += 1) {
            var data = dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          // calc num max data.
          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i += 1) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() > totalDataCount * 8) {
            throw 'code length overflow. ('
              + buffer.getLengthInBits()
              + '>'
              + totalDataCount * 8
              + ')';
          }

          // end code
          if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
            buffer.put(0, 4);
          }

          // padding
          while (buffer.getLengthInBits() % 8 != 0) {
            buffer.putBit(false);
          }

          // padding
          while (true) {

            if (buffer.getLengthInBits() >= totalDataCount * 8) {
              break;
            }
            buffer.put(PAD0, 8);

            if (buffer.getLengthInBits() >= totalDataCount * 8) {
              break;
            }
            buffer.put(PAD1, 8);
          }

          return createBytes(buffer, rsBlocks);
        };

        _this.addData = function(data, mode) {

          mode = mode || 'Byte';

          var newData = null;

          switch(mode) {
          case 'Numeric' :
            newData = qrNumber(data);
            break;
          case 'Alphanumeric' :
            newData = qrAlphaNum(data);
            break;
          case 'Byte' :
            newData = qr8BitByte(data);
            break;
          case 'Kanji' :
            newData = qrKanji(data);
            break;
          default :
            throw 'mode:' + mode;
          }

          _dataList.push(newData);
          _dataCache = null;
        };

        _this.isDark = function(row, col) {
          if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
            throw row + ',' + col;
          }
          return _modules[row][col];
        };

        _this.getModuleCount = function() {
          return _moduleCount;
        };

        _this.make = function() {
          if (_typeNumber < 1) {
            var typeNumber = 1;

            for (; typeNumber < 40; typeNumber++) {
              var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
              var buffer = qrBitBuffer();

              for (var i = 0; i < _dataList.length; i++) {
                var data = _dataList[i];
                buffer.put(data.getMode(), 4);
                buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
                data.write(buffer);
              }

              var totalDataCount = 0;
              for (var i = 0; i < rsBlocks.length; i++) {
                totalDataCount += rsBlocks[i].dataCount;
              }

              if (buffer.getLengthInBits() <= totalDataCount * 8) {
                break;
              }
            }

            _typeNumber = typeNumber;
          }

          makeImpl(false, getBestMaskPattern() );
        };

        _this.createTableTag = function(cellSize, margin) {

          cellSize = cellSize || 2;
          margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

          var qrHtml = '';

          qrHtml += '<table style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
          qrHtml += '">';
          qrHtml += '<tbody>';

          for (var r = 0; r < _this.getModuleCount(); r += 1) {

            qrHtml += '<tr>';

            for (var c = 0; c < _this.getModuleCount(); c += 1) {
              qrHtml += '<td style="';
              qrHtml += ' border-width: 0px; border-style: none;';
              qrHtml += ' border-collapse: collapse;';
              qrHtml += ' padding: 0px; margin: 0px;';
              qrHtml += ' width: ' + cellSize + 'px;';
              qrHtml += ' height: ' + cellSize + 'px;';
              qrHtml += ' background-color: ';
              qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
              qrHtml += ';';
              qrHtml += '"/>';
            }

            qrHtml += '</tr>';
          }

          qrHtml += '</tbody>';
          qrHtml += '</table>';

          return qrHtml;
        };

        _this.createSvgTag = function(cellSize, margin, alt, title) {

          var opts = {};
          if (typeof arguments[0] == 'object') {
            // Called by options.
            opts = arguments[0];
            // overwrite cellSize and margin.
            cellSize = opts.cellSize;
            margin = opts.margin;
            alt = opts.alt;
            title = opts.title;
          }

          cellSize = cellSize || 2;
          margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

          // Compose alt property surrogate
          alt = (typeof alt === 'string') ? {text: alt} : alt || {};
          alt.text = alt.text || null;
          alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

          // Compose title property surrogate
          title = (typeof title === 'string') ? {text: title} : title || {};
          title.text = title.text || null;
          title.id = (title.text) ? title.id || 'qrcode-title' : null;

          var size = _this.getModuleCount() * cellSize + margin * 2;
          var c, mc, r, mr, qrSvg='', rect;

          rect = 'l' + cellSize + ',0 0,' + cellSize +
            ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

          qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
          qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
          qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
          qrSvg += ' preserveAspectRatio="xMinYMin meet"';
          qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
              escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
          qrSvg += '>';
          qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
              escapeXml(title.text) + '</title>' : '';
          qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
              escapeXml(alt.text) + '</description>' : '';
          qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
          qrSvg += '<path d="';

          for (r = 0; r < _this.getModuleCount(); r += 1) {
            mr = r * cellSize + margin;
            for (c = 0; c < _this.getModuleCount(); c += 1) {
              if (_this.isDark(r, c) ) {
                mc = c*cellSize+margin;
                qrSvg += 'M' + mc + ',' + mr + rect;
              }
            }
          }

          qrSvg += '" stroke="transparent" fill="black"/>';
          qrSvg += '</svg>';

          return qrSvg;
        };

        _this.createDataURL = function(cellSize, margin) {

          cellSize = cellSize || 2;
          margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

          var size = _this.getModuleCount() * cellSize + margin * 2;
          var min = margin;
          var max = size - margin;

          return createDataURL(size, size, function(x, y) {
            if (min <= x && x < max && min <= y && y < max) {
              var c = Math.floor( (x - min) / cellSize);
              var r = Math.floor( (y - min) / cellSize);
              return _this.isDark(r, c)? 0 : 1;
            } else {
              return 1;
            }
          } );
        };

        _this.createImgTag = function(cellSize, margin, alt) {

          cellSize = cellSize || 2;
          margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

          var size = _this.getModuleCount() * cellSize + margin * 2;

          var img = '';
          img += '<img';
          img += '\u0020src="';
          img += _this.createDataURL(cellSize, margin);
          img += '"';
          img += '\u0020width="';
          img += size;
          img += '"';
          img += '\u0020height="';
          img += size;
          img += '"';
          if (alt) {
            img += '\u0020alt="';
            img += escapeXml(alt);
            img += '"';
          }
          img += '/>';

          return img;
        };

        var escapeXml = function(s) {
          var escaped = '';
          for (var i = 0; i < s.length; i += 1) {
            var c = s.charAt(i);
            switch(c) {
            case '<': escaped += '&lt;'; break;
            case '>': escaped += '&gt;'; break;
            case '&': escaped += '&amp;'; break;
            case '"': escaped += '&quot;'; break;
            default : escaped += c; break;
            }
          }
          return escaped;
        };

        var _createHalfASCII = function(margin) {
          var cellSize = 1;
          margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

          var size = _this.getModuleCount() * cellSize + margin * 2;
          var min = margin;
          var max = size - margin;

          var y, x, r1, r2, p;

          var blocks = {
            '██': '█',
            '█ ': '▀',
            ' █': '▄',
            '  ': ' '
          };

          var blocksLastLineNoMargin = {
            '██': '▀',
            '█ ': '▀',
            ' █': ' ',
            '  ': ' '
          };

          var ascii = '';
          for (y = 0; y < size; y += 2) {
            r1 = Math.floor((y - min) / cellSize);
            r2 = Math.floor((y + 1 - min) / cellSize);
            for (x = 0; x < size; x += 1) {
              p = '█';

              if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
                p = ' ';
              }

              if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
                p += ' ';
              }
              else {
                p += '█';
              }

              // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
              ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
            }

            ascii += '\n';
          }

          if (size % 2 && margin > 0) {
            return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
          }

          return ascii.substring(0, ascii.length-1);
        };

        _this.createASCII = function(cellSize, margin) {
          cellSize = cellSize || 1;

          if (cellSize < 2) {
            return _createHalfASCII(margin);
          }

          cellSize -= 1;
          margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

          var size = _this.getModuleCount() * cellSize + margin * 2;
          var min = margin;
          var max = size - margin;

          var y, x, r, p;

          var white = Array(cellSize+1).join('██');
          var black = Array(cellSize+1).join('  ');

          var ascii = '';
          var line = '';
          for (y = 0; y < size; y += 1) {
            r = Math.floor( (y - min) / cellSize);
            line = '';
            for (x = 0; x < size; x += 1) {
              p = 1;

              if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
                p = 0;
              }

              // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
              line += p ? white : black;
            }

            for (r = 0; r < cellSize; r += 1) {
              ascii += line + '\n';
            }
          }

          return ascii.substring(0, ascii.length-1);
        };

        _this.renderTo2dContext = function(context, cellSize) {
          cellSize = cellSize || 2;
          var length = _this.getModuleCount();
          for (var row = 0; row < length; row++) {
            for (var col = 0; col < length; col++) {
              context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
              context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
          }
        }

        return _this;
      };

      //---------------------------------------------------------------------
      // qrcode.stringToBytes
      //---------------------------------------------------------------------

      qrcode.stringToBytesFuncs = {
        'default' : function(s) {
          var bytes = [];
          for (var i = 0; i < s.length; i += 1) {
            var c = s.charCodeAt(i);
            bytes.push(c & 0xff);
          }
          return bytes;
        }
      };

      qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

      //---------------------------------------------------------------------
      // qrcode.createStringToBytes
      //---------------------------------------------------------------------

      /**
       * @param unicodeData base64 string of byte array.
       * [16bit Unicode],[16bit Bytes], ...
       * @param numChars
       */
      qrcode.createStringToBytes = function(unicodeData, numChars) {

        // create conversion map.

        var unicodeMap = function() {

          var bin = base64DecodeInputStream(unicodeData);
          var read = function() {
            var b = bin.read();
            if (b == -1) throw 'eof';
            return b;
          };

          var count = 0;
          var unicodeMap = {};
          while (true) {
            var b0 = bin.read();
            if (b0 == -1) break;
            var b1 = read();
            var b2 = read();
            var b3 = read();
            var k = String.fromCharCode( (b0 << 8) | b1);
            var v = (b2 << 8) | b3;
            unicodeMap[k] = v;
            count += 1;
          }
          if (count != numChars) {
            throw count + ' != ' + numChars;
          }

          return unicodeMap;
        }();

        var unknownChar = '?'.charCodeAt(0);

        return function(s) {
          var bytes = [];
          for (var i = 0; i < s.length; i += 1) {
            var c = s.charCodeAt(i);
            if (c < 128) {
              bytes.push(c);
            } else {
              var b = unicodeMap[s.charAt(i)];
              if (typeof b == 'number') {
                if ( (b & 0xff) == b) {
                  // 1byte
                  bytes.push(b);
                } else {
                  // 2bytes
                  bytes.push(b >>> 8);
                  bytes.push(b & 0xff);
                }
              } else {
                bytes.push(unknownChar);
              }
            }
          }
          return bytes;
        };
      };

      //---------------------------------------------------------------------
      // QRMode
      //---------------------------------------------------------------------

      var QRMode = {
        MODE_NUMBER :    1 << 0,
        MODE_ALPHA_NUM : 1 << 1,
        MODE_8BIT_BYTE : 1 << 2,
        MODE_KANJI :     1 << 3
      };

      //---------------------------------------------------------------------
      // QRErrorCorrectionLevel
      //---------------------------------------------------------------------

      var QRErrorCorrectionLevel = {
        L : 1,
        M : 0,
        Q : 3,
        H : 2
      };

      //---------------------------------------------------------------------
      // QRMaskPattern
      //---------------------------------------------------------------------

      var QRMaskPattern = {
        PATTERN000 : 0,
        PATTERN001 : 1,
        PATTERN010 : 2,
        PATTERN011 : 3,
        PATTERN100 : 4,
        PATTERN101 : 5,
        PATTERN110 : 6,
        PATTERN111 : 7
      };

      //---------------------------------------------------------------------
      // QRUtil
      //---------------------------------------------------------------------

      var QRUtil = function() {

        var PATTERN_POSITION_TABLE = [
          [],
          [6, 18],
          [6, 22],
          [6, 26],
          [6, 30],
          [6, 34],
          [6, 22, 38],
          [6, 24, 42],
          [6, 26, 46],
          [6, 28, 50],
          [6, 30, 54],
          [6, 32, 58],
          [6, 34, 62],
          [6, 26, 46, 66],
          [6, 26, 48, 70],
          [6, 26, 50, 74],
          [6, 30, 54, 78],
          [6, 30, 56, 82],
          [6, 30, 58, 86],
          [6, 34, 62, 90],
          [6, 28, 50, 72, 94],
          [6, 26, 50, 74, 98],
          [6, 30, 54, 78, 102],
          [6, 28, 54, 80, 106],
          [6, 32, 58, 84, 110],
          [6, 30, 58, 86, 114],
          [6, 34, 62, 90, 118],
          [6, 26, 50, 74, 98, 122],
          [6, 30, 54, 78, 102, 126],
          [6, 26, 52, 78, 104, 130],
          [6, 30, 56, 82, 108, 134],
          [6, 34, 60, 86, 112, 138],
          [6, 30, 58, 86, 114, 142],
          [6, 34, 62, 90, 118, 146],
          [6, 30, 54, 78, 102, 126, 150],
          [6, 24, 50, 76, 102, 128, 154],
          [6, 28, 54, 80, 106, 132, 158],
          [6, 32, 58, 84, 110, 136, 162],
          [6, 26, 54, 82, 110, 138, 166],
          [6, 30, 58, 86, 114, 142, 170]
        ];
        var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
        var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
        var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

        var _this = {};

        var getBCHDigit = function(data) {
          var digit = 0;
          while (data != 0) {
            digit += 1;
            data >>>= 1;
          }
          return digit;
        };

        _this.getBCHTypeInfo = function(data) {
          var d = data << 10;
          while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
            d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
          }
          return ( (data << 10) | d) ^ G15_MASK;
        };

        _this.getBCHTypeNumber = function(data) {
          var d = data << 12;
          while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
            d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
          }
          return (data << 12) | d;
        };

        _this.getPatternPosition = function(typeNumber) {
          return PATTERN_POSITION_TABLE[typeNumber - 1];
        };

        _this.getMaskFunction = function(maskPattern) {

          switch (maskPattern) {

          case QRMaskPattern.PATTERN000 :
            return function(i, j) { return (i + j) % 2 == 0; };
          case QRMaskPattern.PATTERN001 :
            return function(i, j) { return i % 2 == 0; };
          case QRMaskPattern.PATTERN010 :
            return function(i, j) { return j % 3 == 0; };
          case QRMaskPattern.PATTERN011 :
            return function(i, j) { return (i + j) % 3 == 0; };
          case QRMaskPattern.PATTERN100 :
            return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
          case QRMaskPattern.PATTERN101 :
            return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
          case QRMaskPattern.PATTERN110 :
            return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
          case QRMaskPattern.PATTERN111 :
            return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

          default :
            throw 'bad maskPattern:' + maskPattern;
          }
        };

        _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
          var a = qrPolynomial([1], 0);
          for (var i = 0; i < errorCorrectLength; i += 1) {
            a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
          }
          return a;
        };

        _this.getLengthInBits = function(mode, type) {

          if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER    : return 10;
            case QRMode.MODE_ALPHA_NUM : return 9;
            case QRMode.MODE_8BIT_BYTE : return 8;
            case QRMode.MODE_KANJI     : return 8;
            default :
              throw 'mode:' + mode;
            }

          } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER    : return 12;
            case QRMode.MODE_ALPHA_NUM : return 11;
            case QRMode.MODE_8BIT_BYTE : return 16;
            case QRMode.MODE_KANJI     : return 10;
            default :
              throw 'mode:' + mode;
            }

          } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER    : return 14;
            case QRMode.MODE_ALPHA_NUM : return 13;
            case QRMode.MODE_8BIT_BYTE : return 16;
            case QRMode.MODE_KANJI     : return 12;
            default :
              throw 'mode:' + mode;
            }

          } else {
            throw 'type:' + type;
          }
        };

        _this.getLostPoint = function(qrcode) {

          var moduleCount = qrcode.getModuleCount();

          var lostPoint = 0;

          // LEVEL1

          for (var row = 0; row < moduleCount; row += 1) {
            for (var col = 0; col < moduleCount; col += 1) {

              var sameCount = 0;
              var dark = qrcode.isDark(row, col);

              for (var r = -1; r <= 1; r += 1) {

                if (row + r < 0 || moduleCount <= row + r) {
                  continue;
                }

                for (var c = -1; c <= 1; c += 1) {

                  if (col + c < 0 || moduleCount <= col + c) {
                    continue;
                  }

                  if (r == 0 && c == 0) {
                    continue;
                  }

                  if (dark == qrcode.isDark(row + r, col + c) ) {
                    sameCount += 1;
                  }
                }
              }

              if (sameCount > 5) {
                lostPoint += (3 + sameCount - 5);
              }
            }
          };

          // LEVEL2

          for (var row = 0; row < moduleCount - 1; row += 1) {
            for (var col = 0; col < moduleCount - 1; col += 1) {
              var count = 0;
              if (qrcode.isDark(row, col) ) count += 1;
              if (qrcode.isDark(row + 1, col) ) count += 1;
              if (qrcode.isDark(row, col + 1) ) count += 1;
              if (qrcode.isDark(row + 1, col + 1) ) count += 1;
              if (count == 0 || count == 4) {
                lostPoint += 3;
              }
            }
          }

          // LEVEL3

          for (var row = 0; row < moduleCount; row += 1) {
            for (var col = 0; col < moduleCount - 6; col += 1) {
              if (qrcode.isDark(row, col)
                  && !qrcode.isDark(row, col + 1)
                  &&  qrcode.isDark(row, col + 2)
                  &&  qrcode.isDark(row, col + 3)
                  &&  qrcode.isDark(row, col + 4)
                  && !qrcode.isDark(row, col + 5)
                  &&  qrcode.isDark(row, col + 6) ) {
                lostPoint += 40;
              }
            }
          }

          for (var col = 0; col < moduleCount; col += 1) {
            for (var row = 0; row < moduleCount - 6; row += 1) {
              if (qrcode.isDark(row, col)
                  && !qrcode.isDark(row + 1, col)
                  &&  qrcode.isDark(row + 2, col)
                  &&  qrcode.isDark(row + 3, col)
                  &&  qrcode.isDark(row + 4, col)
                  && !qrcode.isDark(row + 5, col)
                  &&  qrcode.isDark(row + 6, col) ) {
                lostPoint += 40;
              }
            }
          }

          // LEVEL4

          var darkCount = 0;

          for (var col = 0; col < moduleCount; col += 1) {
            for (var row = 0; row < moduleCount; row += 1) {
              if (qrcode.isDark(row, col) ) {
                darkCount += 1;
              }
            }
          }

          var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
          lostPoint += ratio * 10;

          return lostPoint;
        };

        return _this;
      }();

      //---------------------------------------------------------------------
      // QRMath
      //---------------------------------------------------------------------

      var QRMath = function() {

        var EXP_TABLE = new Array(256);
        var LOG_TABLE = new Array(256);

        // initialize tables
        for (var i = 0; i < 8; i += 1) {
          EXP_TABLE[i] = 1 << i;
        }
        for (var i = 8; i < 256; i += 1) {
          EXP_TABLE[i] = EXP_TABLE[i - 4]
            ^ EXP_TABLE[i - 5]
            ^ EXP_TABLE[i - 6]
            ^ EXP_TABLE[i - 8];
        }
        for (var i = 0; i < 255; i += 1) {
          LOG_TABLE[EXP_TABLE[i] ] = i;
        }

        var _this = {};

        _this.glog = function(n) {

          if (n < 1) {
            throw 'glog(' + n + ')';
          }

          return LOG_TABLE[n];
        };

        _this.gexp = function(n) {

          while (n < 0) {
            n += 255;
          }

          while (n >= 256) {
            n -= 255;
          }

          return EXP_TABLE[n];
        };

        return _this;
      }();

      //---------------------------------------------------------------------
      // qrPolynomial
      //---------------------------------------------------------------------

      function qrPolynomial(num, shift) {

        if (typeof num.length == 'undefined') {
          throw num.length + '/' + shift;
        }

        var _num = function() {
          var offset = 0;
          while (offset < num.length && num[offset] == 0) {
            offset += 1;
          }
          var _num = new Array(num.length - offset + shift);
          for (var i = 0; i < num.length - offset; i += 1) {
            _num[i] = num[i + offset];
          }
          return _num;
        }();

        var _this = {};

        _this.getAt = function(index) {
          return _num[index];
        };

        _this.getLength = function() {
          return _num.length;
        };

        _this.multiply = function(e) {

          var num = new Array(_this.getLength() + e.getLength() - 1);

          for (var i = 0; i < _this.getLength(); i += 1) {
            for (var j = 0; j < e.getLength(); j += 1) {
              num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
            }
          }

          return qrPolynomial(num, 0);
        };

        _this.mod = function(e) {

          if (_this.getLength() - e.getLength() < 0) {
            return _this;
          }

          var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

          var num = new Array(_this.getLength() );
          for (var i = 0; i < _this.getLength(); i += 1) {
            num[i] = _this.getAt(i);
          }

          for (var i = 0; i < e.getLength(); i += 1) {
            num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
          }

          // recursive call
          return qrPolynomial(num, 0).mod(e);
        };

        return _this;
      };

      //---------------------------------------------------------------------
      // QRRSBlock
      //---------------------------------------------------------------------

      var QRRSBlock = function() {

        var RS_BLOCK_TABLE = [

          // L
          // M
          // Q
          // H

          // 1
          [1, 26, 19],
          [1, 26, 16],
          [1, 26, 13],
          [1, 26, 9],

          // 2
          [1, 44, 34],
          [1, 44, 28],
          [1, 44, 22],
          [1, 44, 16],

          // 3
          [1, 70, 55],
          [1, 70, 44],
          [2, 35, 17],
          [2, 35, 13],

          // 4
          [1, 100, 80],
          [2, 50, 32],
          [2, 50, 24],
          [4, 25, 9],

          // 5
          [1, 134, 108],
          [2, 67, 43],
          [2, 33, 15, 2, 34, 16],
          [2, 33, 11, 2, 34, 12],

          // 6
          [2, 86, 68],
          [4, 43, 27],
          [4, 43, 19],
          [4, 43, 15],

          // 7
          [2, 98, 78],
          [4, 49, 31],
          [2, 32, 14, 4, 33, 15],
          [4, 39, 13, 1, 40, 14],

          // 8
          [2, 121, 97],
          [2, 60, 38, 2, 61, 39],
          [4, 40, 18, 2, 41, 19],
          [4, 40, 14, 2, 41, 15],

          // 9
          [2, 146, 116],
          [3, 58, 36, 2, 59, 37],
          [4, 36, 16, 4, 37, 17],
          [4, 36, 12, 4, 37, 13],

          // 10
          [2, 86, 68, 2, 87, 69],
          [4, 69, 43, 1, 70, 44],
          [6, 43, 19, 2, 44, 20],
          [6, 43, 15, 2, 44, 16],

          // 11
          [4, 101, 81],
          [1, 80, 50, 4, 81, 51],
          [4, 50, 22, 4, 51, 23],
          [3, 36, 12, 8, 37, 13],

          // 12
          [2, 116, 92, 2, 117, 93],
          [6, 58, 36, 2, 59, 37],
          [4, 46, 20, 6, 47, 21],
          [7, 42, 14, 4, 43, 15],

          // 13
          [4, 133, 107],
          [8, 59, 37, 1, 60, 38],
          [8, 44, 20, 4, 45, 21],
          [12, 33, 11, 4, 34, 12],

          // 14
          [3, 145, 115, 1, 146, 116],
          [4, 64, 40, 5, 65, 41],
          [11, 36, 16, 5, 37, 17],
          [11, 36, 12, 5, 37, 13],

          // 15
          [5, 109, 87, 1, 110, 88],
          [5, 65, 41, 5, 66, 42],
          [5, 54, 24, 7, 55, 25],
          [11, 36, 12, 7, 37, 13],

          // 16
          [5, 122, 98, 1, 123, 99],
          [7, 73, 45, 3, 74, 46],
          [15, 43, 19, 2, 44, 20],
          [3, 45, 15, 13, 46, 16],

          // 17
          [1, 135, 107, 5, 136, 108],
          [10, 74, 46, 1, 75, 47],
          [1, 50, 22, 15, 51, 23],
          [2, 42, 14, 17, 43, 15],

          // 18
          [5, 150, 120, 1, 151, 121],
          [9, 69, 43, 4, 70, 44],
          [17, 50, 22, 1, 51, 23],
          [2, 42, 14, 19, 43, 15],

          // 19
          [3, 141, 113, 4, 142, 114],
          [3, 70, 44, 11, 71, 45],
          [17, 47, 21, 4, 48, 22],
          [9, 39, 13, 16, 40, 14],

          // 20
          [3, 135, 107, 5, 136, 108],
          [3, 67, 41, 13, 68, 42],
          [15, 54, 24, 5, 55, 25],
          [15, 43, 15, 10, 44, 16],

          // 21
          [4, 144, 116, 4, 145, 117],
          [17, 68, 42],
          [17, 50, 22, 6, 51, 23],
          [19, 46, 16, 6, 47, 17],

          // 22
          [2, 139, 111, 7, 140, 112],
          [17, 74, 46],
          [7, 54, 24, 16, 55, 25],
          [34, 37, 13],

          // 23
          [4, 151, 121, 5, 152, 122],
          [4, 75, 47, 14, 76, 48],
          [11, 54, 24, 14, 55, 25],
          [16, 45, 15, 14, 46, 16],

          // 24
          [6, 147, 117, 4, 148, 118],
          [6, 73, 45, 14, 74, 46],
          [11, 54, 24, 16, 55, 25],
          [30, 46, 16, 2, 47, 17],

          // 25
          [8, 132, 106, 4, 133, 107],
          [8, 75, 47, 13, 76, 48],
          [7, 54, 24, 22, 55, 25],
          [22, 45, 15, 13, 46, 16],

          // 26
          [10, 142, 114, 2, 143, 115],
          [19, 74, 46, 4, 75, 47],
          [28, 50, 22, 6, 51, 23],
          [33, 46, 16, 4, 47, 17],

          // 27
          [8, 152, 122, 4, 153, 123],
          [22, 73, 45, 3, 74, 46],
          [8, 53, 23, 26, 54, 24],
          [12, 45, 15, 28, 46, 16],

          // 28
          [3, 147, 117, 10, 148, 118],
          [3, 73, 45, 23, 74, 46],
          [4, 54, 24, 31, 55, 25],
          [11, 45, 15, 31, 46, 16],

          // 29
          [7, 146, 116, 7, 147, 117],
          [21, 73, 45, 7, 74, 46],
          [1, 53, 23, 37, 54, 24],
          [19, 45, 15, 26, 46, 16],

          // 30
          [5, 145, 115, 10, 146, 116],
          [19, 75, 47, 10, 76, 48],
          [15, 54, 24, 25, 55, 25],
          [23, 45, 15, 25, 46, 16],

          // 31
          [13, 145, 115, 3, 146, 116],
          [2, 74, 46, 29, 75, 47],
          [42, 54, 24, 1, 55, 25],
          [23, 45, 15, 28, 46, 16],

          // 32
          [17, 145, 115],
          [10, 74, 46, 23, 75, 47],
          [10, 54, 24, 35, 55, 25],
          [19, 45, 15, 35, 46, 16],

          // 33
          [17, 145, 115, 1, 146, 116],
          [14, 74, 46, 21, 75, 47],
          [29, 54, 24, 19, 55, 25],
          [11, 45, 15, 46, 46, 16],

          // 34
          [13, 145, 115, 6, 146, 116],
          [14, 74, 46, 23, 75, 47],
          [44, 54, 24, 7, 55, 25],
          [59, 46, 16, 1, 47, 17],

          // 35
          [12, 151, 121, 7, 152, 122],
          [12, 75, 47, 26, 76, 48],
          [39, 54, 24, 14, 55, 25],
          [22, 45, 15, 41, 46, 16],

          // 36
          [6, 151, 121, 14, 152, 122],
          [6, 75, 47, 34, 76, 48],
          [46, 54, 24, 10, 55, 25],
          [2, 45, 15, 64, 46, 16],

          // 37
          [17, 152, 122, 4, 153, 123],
          [29, 74, 46, 14, 75, 47],
          [49, 54, 24, 10, 55, 25],
          [24, 45, 15, 46, 46, 16],

          // 38
          [4, 152, 122, 18, 153, 123],
          [13, 74, 46, 32, 75, 47],
          [48, 54, 24, 14, 55, 25],
          [42, 45, 15, 32, 46, 16],

          // 39
          [20, 147, 117, 4, 148, 118],
          [40, 75, 47, 7, 76, 48],
          [43, 54, 24, 22, 55, 25],
          [10, 45, 15, 67, 46, 16],

          // 40
          [19, 148, 118, 6, 149, 119],
          [18, 75, 47, 31, 76, 48],
          [34, 54, 24, 34, 55, 25],
          [20, 45, 15, 61, 46, 16]
        ];

        var qrRSBlock = function(totalCount, dataCount) {
          var _this = {};
          _this.totalCount = totalCount;
          _this.dataCount = dataCount;
          return _this;
        };

        var _this = {};

        var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

          switch(errorCorrectionLevel) {
          case QRErrorCorrectionLevel.L :
            return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
          case QRErrorCorrectionLevel.M :
            return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
          case QRErrorCorrectionLevel.Q :
            return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
          case QRErrorCorrectionLevel.H :
            return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
          default :
            return undefined;
          }
        };

        _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

          var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

          if (typeof rsBlock == 'undefined') {
            throw 'bad rs block @ typeNumber:' + typeNumber +
                '/errorCorrectionLevel:' + errorCorrectionLevel;
          }

          var length = rsBlock.length / 3;

          var list = [];

          for (var i = 0; i < length; i += 1) {

            var count = rsBlock[i * 3 + 0];
            var totalCount = rsBlock[i * 3 + 1];
            var dataCount = rsBlock[i * 3 + 2];

            for (var j = 0; j < count; j += 1) {
              list.push(qrRSBlock(totalCount, dataCount) );
            }
          }

          return list;
        };

        return _this;
      }();

      //---------------------------------------------------------------------
      // qrBitBuffer
      //---------------------------------------------------------------------

      var qrBitBuffer = function() {

        var _buffer = [];
        var _length = 0;

        var _this = {};

        _this.getBuffer = function() {
          return _buffer;
        };

        _this.getAt = function(index) {
          var bufIndex = Math.floor(index / 8);
          return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
        };

        _this.put = function(num, length) {
          for (var i = 0; i < length; i += 1) {
            _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
          }
        };

        _this.getLengthInBits = function() {
          return _length;
        };

        _this.putBit = function(bit) {

          var bufIndex = Math.floor(_length / 8);
          if (_buffer.length <= bufIndex) {
            _buffer.push(0);
          }

          if (bit) {
            _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
          }

          _length += 1;
        };

        return _this;
      };

      //---------------------------------------------------------------------
      // qrNumber
      //---------------------------------------------------------------------

      var qrNumber = function(data) {

        var _mode = QRMode.MODE_NUMBER;
        var _data = data;

        var _this = {};

        _this.getMode = function() {
          return _mode;
        };

        _this.getLength = function(buffer) {
          return _data.length;
        };

        _this.write = function(buffer) {

          var data = _data;

          var i = 0;

          while (i + 2 < data.length) {
            buffer.put(strToNum(data.substring(i, i + 3) ), 10);
            i += 3;
          }

          if (i < data.length) {
            if (data.length - i == 1) {
              buffer.put(strToNum(data.substring(i, i + 1) ), 4);
            } else if (data.length - i == 2) {
              buffer.put(strToNum(data.substring(i, i + 2) ), 7);
            }
          }
        };

        var strToNum = function(s) {
          var num = 0;
          for (var i = 0; i < s.length; i += 1) {
            num = num * 10 + chatToNum(s.charAt(i) );
          }
          return num;
        };

        var chatToNum = function(c) {
          if ('0' <= c && c <= '9') {
            return c.charCodeAt(0) - '0'.charCodeAt(0);
          }
          throw 'illegal char :' + c;
        };

        return _this;
      };

      //---------------------------------------------------------------------
      // qrAlphaNum
      //---------------------------------------------------------------------

      var qrAlphaNum = function(data) {

        var _mode = QRMode.MODE_ALPHA_NUM;
        var _data = data;

        var _this = {};

        _this.getMode = function() {
          return _mode;
        };

        _this.getLength = function(buffer) {
          return _data.length;
        };

        _this.write = function(buffer) {

          var s = _data;

          var i = 0;

          while (i + 1 < s.length) {
            buffer.put(
              getCode(s.charAt(i) ) * 45 +
              getCode(s.charAt(i + 1) ), 11);
            i += 2;
          }

          if (i < s.length) {
            buffer.put(getCode(s.charAt(i) ), 6);
          }
        };

        var getCode = function(c) {

          if ('0' <= c && c <= '9') {
            return c.charCodeAt(0) - '0'.charCodeAt(0);
          } else if ('A' <= c && c <= 'Z') {
            return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
          } else {
            switch (c) {
            case ' ' : return 36;
            case '$' : return 37;
            case '%' : return 38;
            case '*' : return 39;
            case '+' : return 40;
            case '-' : return 41;
            case '.' : return 42;
            case '/' : return 43;
            case ':' : return 44;
            default :
              throw 'illegal char :' + c;
            }
          }
        };

        return _this;
      };

      //---------------------------------------------------------------------
      // qr8BitByte
      //---------------------------------------------------------------------

      var qr8BitByte = function(data) {

        var _mode = QRMode.MODE_8BIT_BYTE;
        var _data = data;
        var _bytes = qrcode.stringToBytes(data);

        var _this = {};

        _this.getMode = function() {
          return _mode;
        };

        _this.getLength = function(buffer) {
          return _bytes.length;
        };

        _this.write = function(buffer) {
          for (var i = 0; i < _bytes.length; i += 1) {
            buffer.put(_bytes[i], 8);
          }
        };

        return _this;
      };

      //---------------------------------------------------------------------
      // qrKanji
      //---------------------------------------------------------------------

      var qrKanji = function(data) {

        var _mode = QRMode.MODE_KANJI;
        var _data = data;

        var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
        if (!stringToBytes) {
          throw 'sjis not supported.';
        }
        !function(c, code) {
          // self test for sjis support.
          var test = stringToBytes(c);
          if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
            throw 'sjis not supported.';
          }
        }('\u53cb', 0x9746);

        var _bytes = stringToBytes(data);

        var _this = {};

        _this.getMode = function() {
          return _mode;
        };

        _this.getLength = function(buffer) {
          return ~~(_bytes.length / 2);
        };

        _this.write = function(buffer) {

          var data = _bytes;

          var i = 0;

          while (i + 1 < data.length) {

            var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

            if (0x8140 <= c && c <= 0x9FFC) {
              c -= 0x8140;
            } else if (0xE040 <= c && c <= 0xEBBF) {
              c -= 0xC140;
            } else {
              throw 'illegal char at ' + (i + 1) + '/' + c;
            }

            c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

            buffer.put(c, 13);

            i += 2;
          }

          if (i < data.length) {
            throw 'illegal char at ' + (i + 1);
          }
        };

        return _this;
      };

      //=====================================================================
      // GIF Support etc.
      //

      //---------------------------------------------------------------------
      // byteArrayOutputStream
      //---------------------------------------------------------------------

      var byteArrayOutputStream = function() {

        var _bytes = [];

        var _this = {};

        _this.writeByte = function(b) {
          _bytes.push(b & 0xff);
        };

        _this.writeShort = function(i) {
          _this.writeByte(i);
          _this.writeByte(i >>> 8);
        };

        _this.writeBytes = function(b, off, len) {
          off = off || 0;
          len = len || b.length;
          for (var i = 0; i < len; i += 1) {
            _this.writeByte(b[i + off]);
          }
        };

        _this.writeString = function(s) {
          for (var i = 0; i < s.length; i += 1) {
            _this.writeByte(s.charCodeAt(i) );
          }
        };

        _this.toByteArray = function() {
          return _bytes;
        };

        _this.toString = function() {
          var s = '';
          s += '[';
          for (var i = 0; i < _bytes.length; i += 1) {
            if (i > 0) {
              s += ',';
            }
            s += _bytes[i];
          }
          s += ']';
          return s;
        };

        return _this;
      };

      //---------------------------------------------------------------------
      // base64EncodeOutputStream
      //---------------------------------------------------------------------

      var base64EncodeOutputStream = function() {

        var _buffer = 0;
        var _buflen = 0;
        var _length = 0;
        var _base64 = '';

        var _this = {};

        var writeEncoded = function(b) {
          _base64 += String.fromCharCode(encode(b & 0x3f) );
        };

        var encode = function(n) {
          if (n < 0) {
            // error.
          } else if (n < 26) {
            return 0x41 + n;
          } else if (n < 52) {
            return 0x61 + (n - 26);
          } else if (n < 62) {
            return 0x30 + (n - 52);
          } else if (n == 62) {
            return 0x2b;
          } else if (n == 63) {
            return 0x2f;
          }
          throw 'n:' + n;
        };

        _this.writeByte = function(n) {

          _buffer = (_buffer << 8) | (n & 0xff);
          _buflen += 8;
          _length += 1;

          while (_buflen >= 6) {
            writeEncoded(_buffer >>> (_buflen - 6) );
            _buflen -= 6;
          }
        };

        _this.flush = function() {

          if (_buflen > 0) {
            writeEncoded(_buffer << (6 - _buflen) );
            _buffer = 0;
            _buflen = 0;
          }

          if (_length % 3 != 0) {
            // padding
            var padlen = 3 - _length % 3;
            for (var i = 0; i < padlen; i += 1) {
              _base64 += '=';
            }
          }
        };

        _this.toString = function() {
          return _base64;
        };

        return _this;
      };

      //---------------------------------------------------------------------
      // base64DecodeInputStream
      //---------------------------------------------------------------------

      var base64DecodeInputStream = function(str) {

        var _str = str;
        var _pos = 0;
        var _buffer = 0;
        var _buflen = 0;

        var _this = {};

        _this.read = function() {

          while (_buflen < 8) {

            if (_pos >= _str.length) {
              if (_buflen == 0) {
                return -1;
              }
              throw 'unexpected end of file./' + _buflen;
            }

            var c = _str.charAt(_pos);
            _pos += 1;

            if (c == '=') {
              _buflen = 0;
              return -1;
            } else if (c.match(/^\s$/) ) {
              // ignore if whitespace.
              continue;
            }

            _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
            _buflen += 6;
          }

          var n = (_buffer >>> (_buflen - 8) ) & 0xff;
          _buflen -= 8;
          return n;
        };

        var decode = function(c) {
          if (0x41 <= c && c <= 0x5a) {
            return c - 0x41;
          } else if (0x61 <= c && c <= 0x7a) {
            return c - 0x61 + 26;
          } else if (0x30 <= c && c <= 0x39) {
            return c - 0x30 + 52;
          } else if (c == 0x2b) {
            return 62;
          } else if (c == 0x2f) {
            return 63;
          } else {
            throw 'c:' + c;
          }
        };

        return _this;
      };

      //---------------------------------------------------------------------
      // gifImage (B/W)
      //---------------------------------------------------------------------

      var gifImage = function(width, height) {

        var _width = width;
        var _height = height;
        var _data = new Array(width * height);

        var _this = {};

        _this.setPixel = function(x, y, pixel) {
          _data[y * _width + x] = pixel;
        };

        _this.write = function(out) {

          //---------------------------------
          // GIF Signature

          out.writeString('GIF87a');

          //---------------------------------
          // Screen Descriptor

          out.writeShort(_width);
          out.writeShort(_height);

          out.writeByte(0x80); // 2bit
          out.writeByte(0);
          out.writeByte(0);

          //---------------------------------
          // Global Color Map

          // black
          out.writeByte(0x00);
          out.writeByte(0x00);
          out.writeByte(0x00);

          // white
          out.writeByte(0xff);
          out.writeByte(0xff);
          out.writeByte(0xff);

          //---------------------------------
          // Image Descriptor

          out.writeString(',');
          out.writeShort(0);
          out.writeShort(0);
          out.writeShort(_width);
          out.writeShort(_height);
          out.writeByte(0);

          //---------------------------------
          // Local Color Map

          //---------------------------------
          // Raster Data

          var lzwMinCodeSize = 2;
          var raster = getLZWRaster(lzwMinCodeSize);

          out.writeByte(lzwMinCodeSize);

          var offset = 0;

          while (raster.length - offset > 255) {
            out.writeByte(255);
            out.writeBytes(raster, offset, 255);
            offset += 255;
          }

          out.writeByte(raster.length - offset);
          out.writeBytes(raster, offset, raster.length - offset);
          out.writeByte(0x00);

          //---------------------------------
          // GIF Terminator
          out.writeString(';');
        };

        var bitOutputStream = function(out) {

          var _out = out;
          var _bitLength = 0;
          var _bitBuffer = 0;

          var _this = {};

          _this.write = function(data, length) {

            if ( (data >>> length) != 0) {
              throw 'length over';
            }

            while (_bitLength + length >= 8) {
              _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
              length -= (8 - _bitLength);
              data >>>= (8 - _bitLength);
              _bitBuffer = 0;
              _bitLength = 0;
            }

            _bitBuffer = (data << _bitLength) | _bitBuffer;
            _bitLength = _bitLength + length;
          };

          _this.flush = function() {
            if (_bitLength > 0) {
              _out.writeByte(_bitBuffer);
            }
          };

          return _this;
        };

        var getLZWRaster = function(lzwMinCodeSize) {

          var clearCode = 1 << lzwMinCodeSize;
          var endCode = (1 << lzwMinCodeSize) + 1;
          var bitLength = lzwMinCodeSize + 1;

          // Setup LZWTable
          var table = lzwTable();

          for (var i = 0; i < clearCode; i += 1) {
            table.add(String.fromCharCode(i) );
          }
          table.add(String.fromCharCode(clearCode) );
          table.add(String.fromCharCode(endCode) );

          var byteOut = byteArrayOutputStream();
          var bitOut = bitOutputStream(byteOut);

          // clear code
          bitOut.write(clearCode, bitLength);

          var dataIndex = 0;

          var s = String.fromCharCode(_data[dataIndex]);
          dataIndex += 1;

          while (dataIndex < _data.length) {

            var c = String.fromCharCode(_data[dataIndex]);
            dataIndex += 1;

            if (table.contains(s + c) ) {

              s = s + c;

            } else {

              bitOut.write(table.indexOf(s), bitLength);

              if (table.size() < 0xfff) {

                if (table.size() == (1 << bitLength) ) {
                  bitLength += 1;
                }

                table.add(s + c);
              }

              s = c;
            }
          }

          bitOut.write(table.indexOf(s), bitLength);

          // end code
          bitOut.write(endCode, bitLength);

          bitOut.flush();

          return byteOut.toByteArray();
        };

        var lzwTable = function() {

          var _map = {};
          var _size = 0;

          var _this = {};

          _this.add = function(key) {
            if (_this.contains(key) ) {
              throw 'dup key:' + key;
            }
            _map[key] = _size;
            _size += 1;
          };

          _this.size = function() {
            return _size;
          };

          _this.indexOf = function(key) {
            return _map[key];
          };

          _this.contains = function(key) {
            return typeof _map[key] != 'undefined';
          };

          return _this;
        };

        return _this;
      };

      var createDataURL = function(width, height, getPixel) {
        var gif = gifImage(width, height);
        for (var y = 0; y < height; y += 1) {
          for (var x = 0; x < width; x += 1) {
            gif.setPixel(x, y, getPixel(x, y) );
          }
        }

        var b = byteArrayOutputStream();
        gif.write(b);

        var base64 = base64EncodeOutputStream();
        var bytes = b.toByteArray();
        for (var i = 0; i < bytes.length; i += 1) {
          base64.writeByte(bytes[i]);
        }
        base64.flush();

        return 'data:image/gif;base64,' + base64;
      };

      //---------------------------------------------------------------------
      // returns qrcode function.

      return qrcode;
    }();

    // multibyte support
    !function() {

      qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
        // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
        function toUTF8Array(str) {
          var utf8 = [];
          for (var i=0; i < str.length; i++) {
            var charcode = str.charCodeAt(i);
            if (charcode < 0x80) utf8.push(charcode);
            else if (charcode < 0x800) {
              utf8.push(0xc0 | (charcode >> 6),
                  0x80 | (charcode & 0x3f));
            }
            else if (charcode < 0xd800 || charcode >= 0xe000) {
              utf8.push(0xe0 | (charcode >> 12),
                  0x80 | ((charcode>>6) & 0x3f),
                  0x80 | (charcode & 0x3f));
            }
            // surrogate pair
            else {
              i++;
              // UTF-16 encodes 0x10000-0x10FFFF by
              // subtracting 0x10000 and splitting the
              // 20 bits of 0x0-0xFFFFF into two halves
              charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                | (str.charCodeAt(i) & 0x3ff));
              utf8.push(0xf0 | (charcode >>18),
                  0x80 | ((charcode>>12) & 0x3f),
                  0x80 | ((charcode>>6) & 0x3f),
                  0x80 | (charcode & 0x3f));
            }
          }
          return utf8;
        }
        return toUTF8Array(s);
      };

    }();

    (function (factory) {
      if (typeof define === 'function' && define.amd) {
          define([], factory);
      } else if (typeof exports === 'object') {
          module.exports = factory();
      }
    }(function () {
        return qrcode;
    }));

    return qrcode;
  })();


  var ORIGIN_PROD = 'https://miesnapaczka.pl';

  /* Zawsze origin produkcyjny — inaczej kody wygenerowane na stagingu
     prowadzą do *.webflow.io i nikt tego nie zauważy. */
  function adresQR() {
    return ORIGIN_PROD + location.pathname.replace(/\/$/, '') + '?tryb=gotowanie';
  }

  /* Rysuje QR do wskazanego kontenera biblioteką WBUDOWANĄ (patrz `QR` wyżej).
     Strażnik `global.QrCreator` i ostrzeżenie „brak QrCreator" zniknęły razem
     z wariantem CDN-owym: gałąź obsługująca brak biblioteki, która nie może już
     zajść, jest martwym kodem udającym obsługę błędu, a taki kod czyta się jak
     zabezpieczenie i nim nie jest.
     Bramka szerokości ZOSTAJE bez zmian (spec §8, wiersz H4): blok QR istnieje
     wyłącznie na desktopie. Przestała za to oszczędzać transfer — kod jedzie
     w pliku niezależnie od szerokości i to jest cena wariantu B. */
  /* `D-39.40` · ROZMIAR KODU 96, NIE 192 — decyzja operatora 2026-08-17, wprost:
     „chcę, żeby parser generował QR w rozmiarze 96×96; problemem nie jest rozmiar
     slotu, a rozmiar generowany przez parser".

     **ODSTĘPSTWO OD SPEC §8**, która podaje 192, i zapisuję to jako odstępstwo,
     a nie jako odczyt. Spec żyje w `git/content/przepisy-hub/spec-tryb-gotowania-v1.md`,
     czyli u drugiego łańcucha — zgłoszenie dopisane do `CR--autostart-qr--2026-08-17.md`,
     dokumentu NIE ruszam.

     Przesłanka zmiany jest zmierzona: slot `.recipe-qr__code` ma **96×96**
     z `overflow:hidden` (`--_dimensions---cards-c--qr-size`), więc SVG o boku 192
     był przycinany do **25 % powierzchni** — widoczny zostawał sam lewy górny
     znacznik pozycjonujący, bez prawego górnego i lewego dolnego. Kod w tym stanie
     jest niemożliwy do zeskanowania. Zrzut potwierdził to wprost `[V]`.

     **Cena, świadomie przyjęta:** przy `viewBox 180` i 41 modułach moduł ma
     96/180 × 4 ≈ **2,1 px CSS**. Na ekranie HiDPI to ~4,3 px fizycznego piksela
     i skanuje się dobrze; na wyświetlaczu 1× jest to wartość graniczna. Gdyby
     kiedyś okazało się to za mało, właściwą naprawą jest POWIĘKSZENIE SLOTU
     i podniesienie tej stałej razem z nim — nie rozjeżdżanie ich ponownie.

     Alternatywa rozważona i odrzucona: `width:100%;height:auto` zamiast pikseli.
     Byłaby odporna na zmianę slotu, ale rozmiar przestałby być wartością
     nazwaną i audytowalną w jednym miejscu, a ten kod trzyma liczby jawnie. */
  var QR_ROZMIAR = 96;
  var QR_KOLOR = '#2b2118';

  /* `D-39.43` · WŁASNY RENDERER SVG — ZAOKRĄGLONE DANE, OSTRE ZNACZNIKI.
     Decyzja operatora 2026-08-17 po przedstawieniu trzech wariantów; wybrany
     najbezpieczniejszy: zaokrąglamy moduły DANYCH, trzy znaczniki pozycjonujące
     zostają ostre.

     **Dlaczego znaczniki muszą zostać ostre:** to po nich dekoder NAJPIERW znajduje
     kod i po nich liczy jego orientację oraz skalę. Rozmycie ich krawędzi kosztuje
     najwięcej przy najmniejszym zysku wizualnym — trzy kwadraty na kilkaset modułów.
     Moduły danych są odczytywane już po znalezieniu siatki, próbkowaniem ŚRODKA
     komórki, więc zaokrąglenie rogu ich nie dotyka.

     `createSvgTag` biblioteki tego nie potrafi (rysuje wszystko jedną ścieżką
     prostokątów), stąd własny generator. Cena: kilkaset elementów `<rect>` zamiast
     jednej ścieżki. To koszt DOM-u, nie transferu — SVG powstaje w przeglądarce.

     `QR_PROMIEN` w jednostkach viewBoxa, gdzie komórka ma `QR_CELA` = 4. Przy 1,2
     zaokrąglenie jest widoczne, a moduł zachowuje płaskie boki i dalej styka się
     z sąsiadem — przy 2 zamieniłby się w koło i zniknęłyby styki, co przy module
     rzędu 2 px na ekranie realnie utrudnia dekodowanie. Wartość jest nazwana
     i jednoliniowa do zmiany, gdyby operator chciał mocniej albo słabiej. */
  var QR_CELA = 4;
  var QR_MARGINES = 8;      /* 2 moduły ciszy — mniej niż zalecane 4, zastane */
  var QR_PROMIEN = 1.2;

  /* Znaczniki pozycjonujące to trzy kwadraty 7×7 w rogach: lewy górny, prawy górny
     i lewy dolny. Prawego dolnego NIE MA i to nie jest przeoczenie — jego brak jest
     tym, co pozwala dekoderowi ustalić obrót kodu. */
  function wZnaczniku(x, y, n) {
    return (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  }

  function svgKodu(kod) {
    var n = kod.getModuleCount();
    var bok = n * QR_CELA + 2 * QR_MARGINES;
    var czesci = [];
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (!kod.isDark(y, x)) continue;
        czesci.push('<rect x="' + (QR_MARGINES + x * QR_CELA) +
                    '" y="' + (QR_MARGINES + y * QR_CELA) +
                    '" width="' + QR_CELA + '" height="' + QR_CELA + '"' +
                    (wZnaczniku(x, y, n) ? '' : ' rx="' + QR_PROMIEN + '"') + '/>');
      }
    }
    /* `fill` na `<svg>`, nie na każdym prostokącie — prostokąty własnego nie mają,
       więc dziedziczą. `shape-rendering:crispEdges` NIE dokładamy: wyłączyłoby
       wygładzanie, czyli dokładnie to, po co są zaokrąglenia. */
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + bok + ' ' + bok +
           '" fill="' + QR_KOLOR + '" role="img">' + czesci.join('') + '</svg>';
  }

  function rysujQR(selektor) {
    var el = document.querySelector(selektor || '[data-mp-qr]');
    if (!el) return;
    if (!global.matchMedia || !global.matchMedia('(min-width: 992px)').matches) return;
    el.innerHTML = '';
    var kod = QR(0, 'M');            /* 0 = wersja dobierana do długości adresu */
    kod.addData(adresQR());
    kod.make();
    el.innerHTML = svgKodu(kod);
    var svg = el.querySelector('svg');
    if (svg) {
      /* Kolor i `viewBox` ustawia już `svgKodu()`; tu zostaje rozmiar i zachowanie
         w pudełku. Uwaga historyczna: dopóki SVG pochodził z `createSvgTag`, kolor
         trzeba było wpisywać w KAŻDĄ ścieżkę osobno, bo `fill` na rodzicu nie
         dziedziczy się do elementu z własnym `fill`. Nasze prostokąty własnego
         `fill` nie mają, więc dziedziczą z `<svg>` i pętla po ścieżkach odpadła. */
      svg.setAttribute('width', QR_ROZMIAR);
      svg.setAttribute('height', QR_ROZMIAR);
      /* `D-39.41` · TRZY DEKLARACJE, KTÓRE ROZSTRZYGAJĄ „KOD NIE JEST WYŚRODKOWANY".
         Zgłoszenie operatora 2026-08-17. Przyczyny są DWIE i obie zmierzone `[V]`:

         (1) Slot ma `border: 1px` przy `box-sizing: border-box`, więc jego
             `offsetWidth` to 96, ale `clientWidth` **94**. SVG o boku 96 nie mieści
             się w pudełku treści i przy `overflow:hidden` traci 2 px z PRAWEJ
             i z DOŁU, zachowując pełne krawędzie z lewej i z góry. Z zewnątrz
             wygląda to dokładnie jak przesunięcie w lewo i w górę.
             `max-width:100%` + `height:auto` znoszą to bez dotykania szablonu:
             kod zjeżdża do 94×94 i nic nie jest ucinane. Nominalne 96 zostaje
             w stałej i dalej rządzi wszędzie tam, gdzie slot nie ma obramowania.

         (2) `display:inline` (domyślne dla SVG) sadza kod na LINII BAZOWEJ tekstu,
             więc pod nim zostaje miejsce na wydłużenia dolne — przy `line-height:20px`
             slotu to kilka pikseli pustki u dołu i kolejne źródło asymetrii.
             `display:block` je usuwa.

         `margin:0 auto` dokłada wyśrodkowanie w poziomie, gdyby slot był kiedyś
         szerszy od kodu — dziś nie zmienia nic, jutro nie pozwoli usiąść do lewej.
         Cofnięcie: usuń te trzy przypisania do `style`. */
      svg.style.display = 'block';
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
      svg.style.margin = '0 auto';
    }
    el.setAttribute('aria-label', 'Kod QR: otwórz tryb gotowania na telefonie');
  }

  // ---------------------------------------------------------------- panel walidacji

  function pokazPanelBledow(lista, listaOstrzezen) {
    listaOstrzezen = listaOstrzezen || [];
    if (!lista.length && !listaOstrzezen.length) return;
    var box = document.createElement('div');
    box.setAttribute('data-mp-panel-bledow', '');
    box.style.cssText = 'position:fixed;inset:0 0 auto 0;z-index:99999;color:#fff;' +
      'font:13px/1.5 system-ui,sans-serif;padding:12px 16px;max-height:45vh;overflow:auto;' +
      'background:' + (lista.length ? '#b3261e' : '#8a6100');
    function ul(t) {
      return '<ul style="margin:8px 0 0;padding-left:18px">' +
        t.map(function (b) { return '<li>' + escapeHtml(b) + '</li>'; }).join('') + '</ul>';
    }
    box.innerHTML =
      '<strong>Przepis — ' + lista.length + ' bł. / ' + listaOstrzezen.length + ' ostrz. w polach przepisu</strong>' +
      (lista.length ? ul(lista) : '') +
      (listaOstrzezen.length ? '<strong style="display:block;margin-top:8px">ostrzeżenia</strong>' + ul(listaOstrzezen) : '');
    document.body.appendChild(box);
  }

  /* ---------------------------------------------------------------- autostart QR

     `D-39.39` · WYWOŁANIE, KTÓREGO NIE BYŁO. Decyzja operatora 2026-08-17.

     Zmierzone na stagingu `[V]`: slot `[data-mp-qr]` istniał, `rysujQR` istniało
     i działało (ręczne wywołanie narysowało kod), bramka 992 przechodziła,
     `adresQR()` zwracał poprawny adres produkcyjny — a **liczba skryptów
     wołających `rysujQR` wynosiła ZERO.** Funkcja gotowa i nieosiągalna.

     **CZWARTE wystąpienie tego wzorca** po `D-39.13` (ekran zakończenia),
     `D-39.14` (minutniki) i `D-39.18` (wznowienie sesji). Dlatego wyzwalacz idzie
     TUTAJ, do pliku w repozytorium, a nie do skryptu w polu Webflow: wywołanie
     wpisane w szablonie jest niewidoczne dla gita, dla matrycy i dla każdego
     pomiaru, więc ginie przy pierwszej nieostrożnej edycji i nikt tego nie zauważy.
     Piąty zgubiony wyzwalacz kosztowałby dokładnie tyle, co cztery poprzednie.

     **Efekt uboczny jest wąski i taki ma być:** bez slotu `[data-mp-qr]` albo przy
     oknie < 992 px nie dzieje się NIC. Na stronie bez kodu QR ten blok jest
     bezczynny. Mimo to formalnie zmienia kontrakt embedu (parser przestaje być
     całkowicie bierny przy wczytaniu strony), a kontrakt opisuje
     `instrukcja-pisania-przepisow.md` §6 — **pin B1, własność drugiego łańcucha.**
     Tego dokumentu NIE ruszam; zgłoszenie idzie osobnym change requestem
     `CR--autostart-qr--2026-08-17.md`, tak jak przy `wartosci-porcja` i `zdjecie-glowne`.

     Nasłuch `change` na bramce jest konieczny, a nie ozdobny: bramka jest
     sprawdzana W CHWILI wywołania, więc wejście na wąskim oknie i późniejsze
     poszerzenie zostawiłoby pusty slot — czyli ten sam brak wyzwalacza w mniejszej
     skali. `rysujQR` samo pilnuje bramki i slotu, więc powtórne wywołanie jest
     bezpieczne i idempotentne (czyści `innerHTML` przed rysowaniem).

     Cofnięcie: usuń ten blok w całości. Publiczne `rysujQR` zostaje bez zmian. */
  function autostartQR() {
    if (!global.document) return;
    if (!document.querySelector('[data-mp-qr]')) return;
    rysujQR();
    if (global.matchMedia) {
      var mq = global.matchMedia('(min-width: 992px)');
      var reaguj = function () { rysujQR(); };
      /* `addEventListener` na `MediaQueryList` nie istnieje w starszych WebKitach,
         a `addListener` jest tam jedyną drogą. Kolejność prób, nie założenie. */
      if (mq.addEventListener) mq.addEventListener('change', reaguj);
      else if (mq.addListener) mq.addListener(reaguj);
    }
  }

  if (global.document) {
    /* `defer` na znaczniku (WYMAGANIA §4) sprawia, że skrypt wykonuje się PO
       sparsowaniu HTML, więc `readyState` bywa już `interactive` i zdarzenie
       `DOMContentLoaded` NIGDY nie przyjdzie. Obie drogi są konieczne — sam
       nasłuch dałby pusty slot przy `defer`, a samo wywołanie wprost dałoby go
       przy znaczniku bez `defer`. */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autostartQR, { once: true });
    } else {
      autostartQR();
    }
  }

  // ---------------------------------------------------------------- eksport

  global.MP = global.MP || {};
  global.MP.przepis = {
    zaladuj: zaladuj,
    naPorcje: naPorcje,
    adresQR: adresQR,
    rysujQR: rysujQR,
    zaleznosci: ZALEZNOSCI,
    formatCzas: formatCzas,
    formatIlosc: formatIlosc,
    odmien: odmien,
    wpisyKartowe: parsujWpisyKartowe,
    podzielKarty: podzielKarty,
    podzielWszystkieKarty: podzielWszystkieKarty,
    kluczLS: KLUCZ_LS,
    kolizjeOdmian: function () { return FORMA_DO_BAZY.__kolizje.slice(); },   // D-39.53
    limitMarkerow: LIMIT_MARKEROW,
    _wewnetrzne: {
      parsujSkladniki: parsujSkladniki, parsujKroki: parsujKroki, rozbijTresc: rozbijTresc,
      parsujGramature: parsujGramature, zbudujZamienniki: zbudujZamienniki
    }
  };
})(typeof window !== 'undefined' ? window : this);
