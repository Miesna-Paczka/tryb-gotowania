/* suchy-bieg-minutnik-bez-kryterium.mjs — czy bramka D-48.1 naprawdę strzela.
 *
 * Bramka mówi: krok z `minutnik:` i bez `kryterium:` jest BŁĘDEM parsera, czyli
 * nie da się go założyć. Reguła, o której nikt nie sprawdził, czy w ogóle strzela,
 * jest gorsza niż jej brak: daje spokój, którego nie kupiła.
 *
 * Ta próba pyta o trzy rzeczy i każda odpowiada na inne pytanie:
 *   1. KONTROLA UJEMNA — krok BEZ kryterium ma podnieść dokładnie ten błąd.
 *      Gdyby nie podnosił, bramka byłaby martwa i wszystko poniżej też.
 *   2. KONTROLA DODATNIA — ten SAM krok z kryterium ma NIE podnosić nic.
 *      Gdyby podnosił, bramka blokowałaby poprawną treść.
 *   3. CAŁY KORPUS — 17 przepisów ma przejść z zerem błędów.
 *      Gdyby któryś padł, bramka łamałaby to, co już opublikowane.
 *
 * Uruchomienie: node narzedzia/suchy-bieg-minutnik-bez-kryterium.mjs
 */
import { parser } from '../odmiana-node.mjs';
import { zrodla } from '../lancuch-html/wspolne.mjs';

const P = parser();
const W = P._wewnetrzne;
const FRAGMENT = 'bez kryterium:';

function bledyDla(txtKrokow, skladniki) {
  W.wyczyscBledy();
  W.parsujKroki(txtKrokow, skladniki || []);
  return W.bledyTeraz();
}

const KROK_BEZ = '== ugotuj kukurydzę\n' +
  'minutnik: 12:00 kukurydza\n' +
  'Zagotuj wodę i wrzuć kolby.\n';
const KROK_Z = '== ugotuj kukurydzę\n' +
  'minutnik: 12:00 kukurydza\n' +
  'kryterium: ziarna ustępują pod naciskiem widelca\n' +
  'Zagotuj wodę i wrzuć kolby.\n';

const wynik = { kroki: [] };
let upadki = 0;

// 1 · KONTROLA UJEMNA
const bezK = bledyDla(KROK_BEZ);
const strzelil = bezK.some((b) => b.indexOf(FRAGMENT) >= 0);
wynik.kontrolaUjemna = { bledow: bezK.length, trafiony: strzelil, tresc: bezK };
if (!strzelil) { upadki++; console.error('UPADEK 1: bramka NIE strzela na kroku bez kryterium'); }

// 2 · KONTROLA DODATNIA
const zK = bledyDla(KROK_Z);
const cisza = !zK.some((b) => b.indexOf(FRAGMENT) >= 0);
wynik.kontrolaDodatnia = { bledow: zK.length, cisza: cisza, tresc: zK };
if (!cisza) { upadki++; console.error('UPADEK 2: bramka strzela na POPRAWNYM kroku'); }

// 3 · CAŁY KORPUS
let minutnikow = 0;
for (const { slug, zrodlo } of zrodla()) {
  const skl = W.parsujSkladniki(zrodlo.pola.skladniki);
  W.wyczyscBledy();
  const kroki = W.parsujKroki(zrodlo.pola.kroki, skl.map((s) => s.key));
  const b = W.bledyTeraz();
  const ile = kroki.filter((k) => k.minutnik).length;
  minutnikow += ile;
  wynik.kroki.push({ slug, krokow: kroki.length, minutnikow: ile, bledow: b.length,
                     bledy: b.length ? b : undefined });
  if (b.length) { upadki++; console.error('UPADEK 3: ' + slug + ' — ' + b.join(' | ')); }
}
wynik.korpus = { przepisow: wynik.kroki.length, minutnikowRazem: minutnikow };

/* Bez tego wiersza „zero błędów w korpusie" mógłby znaczyć „zero przepisów". */
if (!wynik.kroki.length) { upadki++; console.error('UPADEK 4: nie znaleziono ZADNEGO zrodla'); }
if (!minutnikow) { upadki++; console.error('UPADEK 5: w korpusie nie ma ANI JEDNEGO minutnika — nie ma czego bramkowac'); }

console.log(JSON.stringify(wynik, null, 1));
console.log(upadki ? ('UPADKOW: ' + upadki) : 'WSZYSTKIE TRZY KONTROLE PRZESZLY');
process.exit(upadki ? 1 : 0);
