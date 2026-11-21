import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, '..', 'public', 'olympia-audio');
const seasons = ['O13-21', 'O20', 'O22', 'O23', 'O24-25', 'O26'];

const PEAK_THRESHOLD_DB = -50;
const RMS_THRESHOLD_DB = -65;
const DOMINANCE_TOLERANCE_DB = 3;

function parseDbValue(raw) {
  if (!raw || raw === '-inf' || raw === 'inf') return -Infinity;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : -Infinity;
}

function analyzeAudioFile(filePath) {
  const res = spawnSync(
    'ffmpeg',
    ['-i', filePath, '-af', 'astats', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );

  const stderr = res.stderr || '';
  const ch1Section = stderr.match(/Channel:\s*1([\s\S]*?)(?=Channel:\s*2|Overall|$)/);
  const ch2Section = stderr.match(/Channel:\s*2([\s\S]*?)(?=Overall|$)/);

  const extractStats = (section) => {
    if (!section) return { peak: -Infinity, rms: -Infinity };
    const text = section[1];
    const peakMatch = text.match(/Peak level dB:\s*([-\d.inf]+)/i);
    const rmsMatch = text.match(/RMS level dB:\s*([-\d.inf]+)/i);
    return {
      peak: parseDbValue(peakMatch?.[1]),
      rms: parseDbValue(rmsMatch?.[1]),
    };
  };

  return {
    l: extractStats(ch1Section),
    r: extractStats(ch2Section),
  };
}

function isChannelActive(ch) {
  return ch.peak > PEAK_THRESHOLD_DB && ch.rms > RMS_THRESHOLD_DB;
}

function walkBaseMp3s(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkBaseMp3s(fullPath, results);
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.mp3') &&
      !entry.name.endsWith('_left.mp3') &&
      !entry.name.endsWith('_right.mp3')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

let totalBases = 0;
let passedBases = 0;
const failures = [];

for (const season of seasons) {
  const seasonDir = path.join(baseDir, season);
  if (!fs.existsSync(seasonDir)) {
    failures.push({ file: season, reason: 'Season directory missing' });
    continue;
  }

  const baseFiles = walkBaseMp3s(seasonDir).sort();
  for (const basePath of baseFiles) {
    totalBases++;
    const relBase = path.relative(baseDir, basePath);
    const leftPath = basePath.replace(/\.mp3$/i, '_left.mp3');
    const rightPath = basePath.replace(/\.mp3$/i, '_right.mp3');
    const relLeft = path.relative(baseDir, leftPath);
    const relRight = path.relative(baseDir, rightPath);

    let ok = true;

    const baseStats = analyzeAudioFile(basePath);
    if (!isChannelActive(baseStats.l) || !isChannelActive(baseStats.r)) {
      ok = false;
      failures.push({
        file: relBase,
        reason: `Base track not balanced stereo (L peak=${baseStats.l.peak}, rms=${baseStats.l.rms}; R peak=${baseStats.r.peak}, rms=${baseStats.r.rms})`,
      });
    }

    if (!fs.existsSync(leftPath)) {
      ok = false;
      failures.push({ file: relLeft, reason: 'Missing _left.mp3 variant' });
    } else {
      const leftStats = analyzeAudioFile(leftPath);
      const lActive = isChannelActive(leftStats.l);
      const lDominant =
        leftStats.l.rms >= leftStats.r.rms - DOMINANCE_TOLERANCE_DB &&
        leftStats.l.peak >= leftStats.r.peak - DOMINANCE_TOLERANCE_DB;
      if (!lActive || !lDominant) {
        ok = false;
        failures.push({
          file: relLeft,
          reason: `_left.mp3 failed check (L peak=${leftStats.l.peak}, rms=${leftStats.l.rms}; R peak=${leftStats.r.peak}, rms=${leftStats.r.rms})`,
        });
      }
    }

    if (!fs.existsSync(rightPath)) {
      ok = false;
      failures.push({ file: relRight, reason: 'Missing _right.mp3 variant' });
    } else {
      const rightStats = analyzeAudioFile(rightPath);
      const rActive = isChannelActive(rightStats.r);
      const rDominant =
        rightStats.r.rms >= rightStats.l.rms - DOMINANCE_TOLERANCE_DB &&
        rightStats.r.peak >= rightStats.l.peak - DOMINANCE_TOLERANCE_DB;
      if (!rActive || !rDominant) {
        ok = false;
        failures.push({
          file: relRight,
          reason: `_right.mp3 failed check (L peak=${rightStats.l.peak}, rms=${rightStats.l.rms}; R peak=${rightStats.r.peak}, rms=${rightStats.r.rms})`,
        });
      }
    }

    if (ok) passedBases++;
  }
}

console.log(`\n=== 3-Channel Audio Verification Summary (All 6 Seasons) ===`);
console.log(`Seasons scanned: ${seasons.join(', ')}`);
console.log(`Total base tracks checked: ${totalBases}`);
console.log(`Tracks passing all 3 channels (base, _left, _right): ${passedBases}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  for (const f of failures) {
    console.error(`[FAIL] ${f.file}: ${f.reason}`);
  }
  process.exit(1);
} else {
  console.log(`SUCCESS: 100% of ${totalBases} base tracks (${totalBases * 3} files) pass 3-channel verification!`);
}
