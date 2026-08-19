/* osobliwosci-przepisow.mjs — co w tym przepisie jest NAPRAWDĘ osobliwe.
 *
 * POWÓD — zgłoszenie operatora 2026-08-19. W leadach pojawiały się zdania w rodzaju
 * „sos gęstnieje sam, bez mąki" w przepisie, w którym mąka nie występuje ani razu
 * i nie występuje też w żadnym sąsiednim. Taka uwaga nie niesie informacji: żeby
 * „bez mąki" cokolwiek znaczyło, czytelnik musi się mąki SPODZIEWAĆ.
 *
 * Zamiast pisać z wyczucia, liczymy to na korpusie szesnastu przepisów:
 *
 *   NIEOBECNY, A SPODZIEWANY — składnik występuje w większości pozostałych
 *   przepisów, a u nas go nie ma. Dopiero wtedy „bez X" jest zdaniem o czymś.
 *
 *   OBECNY, A RZADKI — składnik występuje u nas, a poza nami prawie nigdzie.
 *   To jest ta rzecz, która wyróżnia przepis i którą warto nazwać.
 *
 * Czego to narzędzie NIE robi: nie pisze leadu i nie ocenia, czy osobliwość jest
 * ciekawa. Mówi tylko, o czym wolno napisać „w odróżnieniu od reszty", żeby
 * zdanie miało pokrycie w korpusie.
 *
 * Uruchomienie: node narzedzia/osobliwosci-przepisow.mjs [--prog 0.6]
 */
import { parser } from '../odmiana-node.mjs';
import { zrodla } from '../lancuch-html/wspolne.mjs';

const P = parser();
const argv = process.argv.slice(2);
const PROG = parseFloat(argv[argv.indexOf('--prog') + 1]) || 0.6;

/* Klucz `#…` jest tożsamością składnika w mikroskładni i nie zmienia się
   z odmianą ani z przymiotnikiem, więc liczymy po nim, nie po nazwie. */
const przepisy = zrodla().map((z) => ({
  slug: z.slug,
  nazwa: z.zrodlo.meta.nazwa,
  klucze: new Set(P._wewnetrzne.parsujSkladniki(z.zrodlo.pola.skladniki).map((s) => s.key)),
  nazwyWgKlucza: Object.fromEntries(
    P._wewnetrzne.parsujSkladniki(z.zrodlo.pola.skladniki).map((s) => [s.key, s.nazwa]))
}));

const wIlu = {};
for (const p of przepisy) for (const k of p.klucze) wIlu[k] = (wIlu[k] || 0) + 1;
const N = przepisy.length;

console.log(`korpus: ${N} przepisów · próg pospolitości: ${Math.round(PROG * 100)}%\n`);

for (const p of przepisy) {
  const brakSpodziewanego = Object.entries(wIlu)
    .filter(([k, ile]) => !p.klucze.has(k) && ile / (N - 0) >= PROG)
    .map(([k, ile]) => `${k} (${ile}/${N})`);
  /* „Rzadki" liczymy WŚRÓD POZOSTAŁYCH, nie w całym korpusie — inaczej składnik
     obecny tylko u nas miałby 1/16 i wyglądałby tak samo jak obecny u nas i u kogoś
     jeszcze. Interesuje nas, ilu SĄSIADÓW go ma. */
  const osobliwe = [...p.klucze]
    .map((k) => ({ k, uInnych: wIlu[k] - 1 }))
    .filter((x) => x.uInnych === 0)
    .map((x) => `${x.k} — „${p.nazwyWgKlucza[x.k]}"`);

  console.log(`── ${p.nazwa}`);
  console.log(`   tylko tutaj (${osobliwe.length}): ${osobliwe.length ? osobliwe.join(' · ') : '—'}`);
  console.log(`   brak, a pospolity: ${brakSpodziewanego.length ? brakSpodziewanego.join(' · ') : '—'}`);
}

console.log('\n── składniki pospolite w korpusie (kandydaci na „bez X"):');
Object.entries(wIlu).filter(([, ile]) => ile / N >= PROG).sort((a, b) => b[1] - a[1])
  .forEach(([k, ile]) => console.log(`   ${k}: ${ile}/${N}`));
