import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chordToClassData } from './theory.mjs';
import { renderClass } from './render-class.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const prompt = process.argv.slice(2).join(' ').trim();
if (!prompt) {
  console.error('Uso: npm run prompt -- "clase de Dm con pentagrama circulo fretboard piano"');
  process.exit(1);
}

const data = chordToClassData(prompt);
const jsonPath = path.join(rootDir, 'class-data', `${data.id}.json`);
await fs.mkdir(path.dirname(jsonPath), { recursive: true });
await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf8');
await renderClass({ dataPath: jsonPath, rootDir });
