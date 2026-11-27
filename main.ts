// main.ts — the entry program for Kestrel Ridge (best-flight-game-20261126-0057).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from
// vendor/makefun-game.ts. Node 22 standard library only, no network.
// Runs twice and writes the same bytes both times.
import { buildDossier } from './vendor/makefun-game.ts';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const REPO_ROOT = new URL('.', import.meta.url).pathname;

function isPlainEntry(path: string): boolean {
  const st = statSync(path);
  return st.isFile() || st.isDirectory();
}

function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src).sort()) {
    const from = join(src, name);
    const to = join(dest, name);
    if (!isPlainEntry(from)) {
      throw new Error(`main.ts: refusing non-plain entry ${from}`);
    }
    if (statSync(from).isDirectory()) {
      copyTree(from, to);
    } else {
      cpSync(from, to);
    }
  }
}

function main(): void {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
    throw new Error('main.ts: game/ is missing from the repository');
  }
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) {
    throw new Error('main.ts: screenshots/ is missing from the repository');
  }

  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyTree(gameDir, join(OUTPUT_DIR, 'game'));
  copyTree(shotsDir, join(OUTPUT_DIR, 'screenshots'));

  const dossier = buildDossier(OUTPUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 48 * 1024 * 1024,
    game_path_max_bytes: 1000
  });
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);

  // Read the manifest back so a silent short write cannot slip through.
  const written = readFileSync(join(OUTPUT_DIR, 'dossier.json'));
  if (written.length !== dossier.length) {
    throw new Error('main.ts: dossier.json short write');
  }
}

main();
