import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, '..', 'public', 'olympia-audio');
const seasons = ['O13-21', 'O22', 'O24-25', 'O26'];

let totalFilesChecked = 0;
let silentEarCount = 0;
const silentFiles = [];

function checkFile(filePath) {
  try {
    const res = spawnSync('ffmpeg', [
      '-i', filePath,
      '-af', 'astats',
      '-f', 'null', '-'
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

    const stderr = res.stderr || '';
    const ch1PeakMatch = stderr.match(/Channel: 1[\s\S]*?Peak level dB:\s*([-\d.inf]+)/);
    const ch2PeakMatch = stderr.match(/Channel: 2[\s\S]*?Peak level dB:\s*([-\d.inf]+)/);

    const ch1Peak = ch1PeakMatch ? ch1PeakMatch[1] : null;
    const ch2Peak = ch2PeakMatch ? ch2PeakMatch[1] : null;

    const p1 = ch1Peak === '-inf' ? -Infinity : parseFloat(ch1Peak);
    const p2 = ch2Peak === '-inf' ? -Infinity : parseFloat(ch2Peak);

    if (p1 <= -50 || p2 <= -50 || ch1Peak === '-inf' || ch2Peak === '-inf') {
      silentEarCount++;
      silentFiles.push({ file: path.relative(baseDir, filePath), ch1Peak, ch2Peak });
      console.error(`[SILENT/WEAK EAR] ${path.relative(baseDir, filePath)}: ch1=${ch1Peak}, ch2=${ch2Peak}`);
    } else {
      totalFilesChecked++;
    }
  } catch (err) {
    console.error(`Error analyzing ${filePath}:`, err.message);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('_left.mp3') || entry.name.endsWith('_right.mp3'))) {
      checkFile(fullPath);
    }
  }
}

for (const s of seasons) {
  const seasonDir = path.join(baseDir, s);
  if (fs.existsSync(seasonDir)) {
    walkDir(seasonDir);
  }
}

console.log(`\n=== Verification Summary ===`);
console.log(`Total _left/_right files checked: ${totalFilesChecked + silentEarCount}`);
console.log(`Healthy Dual-Mono files (both ears have audio): ${totalFilesChecked}`);
console.log(`Silent ear files (-inf dB in one channel): ${silentEarCount}`);
if (silentFiles.length > 0) {
  console.log(`Files with silent ears:`, silentFiles);
  process.exit(1);
} else {
  console.log(`SUCCESS: 100% of tested files play clearly in BOTH ears!`);
}
