const SEMITONES = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
};
const SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

function preferFlats(root) {
  return ['F','Bb','Eb','Ab','Db','Gb'].includes(root) || root.includes('b');
}

function noteAt(root, interval) {
  const base = SEMITONES[root];
  if (base === undefined) throw new Error(`Raíz no reconocida: ${root}`);
  const names = preferFlats(root) ? FLAT_NAMES : SHARP_NAMES;
  return names[(base + interval + 120) % 12];
}

function midiFor(root, intervals, octaveBase = 4) {
  const base = SEMITONES[root];
  const rootMidi = 12 * (octaveBase + 1) + base;
  return intervals.map(i => rootMidi + i);
}

export function chordToClassData(input) {
  const raw = String(input || '').trim();
  const m = raw.match(/\b([A-G](?:#|b)?)(maj7|M7|m7|min7|m|min|dim|aug|7|sus2|sus4)?\b/i);
  if (!m) throw new Error(`No pude leer el acorde en: ${raw}`);

  let root = m[1].replace(/^([a-g])/, s => s.toUpperCase());
  let suffix = (m[2] || '').toLowerCase();
  let quality = 'major';
  let symbol = root;
  let intervals = [0,4,7];

  if (suffix === 'm' || suffix === 'min') { quality = 'minor'; symbol = `${root}m`; intervals = [0,3,7]; }
  else if (suffix === 'm7' || suffix === 'min7') { quality = 'minor7'; symbol = `${root}m7`; intervals = [0,3,7,10]; }
  else if (suffix === '7') { quality = 'dominant7'; symbol = `${root}7`; intervals = [0,4,7,10]; }
  else if (suffix === 'maj7' || suffix === 'm7' || suffix === 'M7'.toLowerCase()) { quality = 'major7'; symbol = `${root}maj7`; intervals = [0,4,7,11]; }
  else if (suffix === 'dim') { quality = 'diminished'; symbol = `${root}dim`; intervals = [0,3,6]; }
  else if (suffix === 'aug') { quality = 'augmented'; symbol = `${root}aug`; intervals = [0,4,8]; }
  else if (suffix === 'sus2') { quality = 'sus2'; symbol = `${root}sus2`; intervals = [0,2,7]; }
  else if (suffix === 'sus4') { quality = 'sus4'; symbol = `${root}sus4`; intervals = [0,5,7]; }

  const notes = intervals.map(i => noteAt(root, i));
  return {
    id: symbol.replace('#','sharp').replace('b','flat'),
    title: `${symbol} class`,
    root,
    quality,
    symbol,
    notes,
    midi: midiFor(root, intervals),
    modules: ['staff','circle','fretboard','piano'],
    copy: {
      headline: `Acorde de ${symbol}`,
      summary: `${symbol} = ${notes.join(' - ')}.`
    }
  };
}
