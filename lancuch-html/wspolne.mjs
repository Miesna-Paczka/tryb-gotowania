/* wspolne.mjs — ścieżki i drobiazgi dzielone przez narzędzia łańcucha HTML. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const KORZEN = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const KATALOG_ZRODEL = path.join(KORZEN, 'przepisy');
export const KATALOG_DANYCH = path.join(KORZEN, 'dane');

/* Kolekcja `przepisy` w site `6983617613052dc9fe624303`. */
export const KOLEKCJA = '6a574b13929618407b161661';
export const SITE = '6983617613052dc9fe624303';

/* Baza adresów GitHub Pages tego repozytorium. Ta sama, z której idą oba
   artefakty embedu (DEPLOY.md) — nie zakładamy drugiego hostingu dla danych,
   bo drugi hosting to drugi tryb awarii i drugi cache do zrozumienia. */
export const BAZA_PAGES = 'https://lukaszwerecik.github.io/tryb-gotowania';

/* Odpowiedź MCP bywa opakowana na kilka sposobów zależnie od tego, czym ją
   zapisano. Rozpakowujemy tolerancyjnie, bo to wejście operatorskie. */
export function wczytajZrzut(sciezka) {
  const j = JSON.parse(fs.readFileSync(sciezka, 'utf8'));
  const kandydaci = [
    j,
    j?.result,
    Array.isArray(j) ? j[0]?.result : null,
    Array.isArray(j) ? j[0] : null
  ];
  for (const k of kandydaci) {
    if (Array.isArray(k?.items)) return k.items;
    if (Array.isArray(k) && k[0]?.fieldData) return k;
  }
  throw new Error(`${sciezka}: nie znalazłem tablicy items w zrzucie`);
}

export const idZrodel = () => fs.existsSync(KATALOG_ZRODEL)
  ? fs.readdirSync(KATALOG_ZRODEL).filter((f) => f.endsWith('.txt')).map((f) => f.slice(0, -4)).sort()
  : [];
