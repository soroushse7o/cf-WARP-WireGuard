// Bundles src/*.js into a single file without any dependency.
// Outputs:
//   dist/worker.js   -> paste into the Workers dashboard editor
//   dist/_worker.js  -> Cloudflare Pages "advanced mode" (deploy the dist/ folder)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, 'src', f), 'utf8');

const ui = read('ui.js').replace('export const UI_HTML', 'const UI_HTML');
const amnezia = read('amnezia.js').replace('export const AMNEZIA_HTML', 'const AMNEZIA_HTML');

const importUI = "import { UI_HTML } from './ui.js';\n";
const importAmnezia = "import { AMNEZIA_HTML } from './amnezia.js';\n";

let index = read('index.js');
if (!index.includes(importUI) || !index.includes(importAmnezia)) {
  throw new Error('Expected import lines not found in src/index.js');
}
index = index.replace(importUI, `${ui.trimEnd()}\n`).replace(importAmnezia, `${amnezia.trimEnd()}\n`);

mkdirSync(join(root, 'dist'), { recursive: true });
for (const f of ['worker.js', '_worker.js']) writeFileSync(join(root, 'dist', f), index);
console.log(`Built dist/worker.js and dist/_worker.js (${index.length} bytes)`);
