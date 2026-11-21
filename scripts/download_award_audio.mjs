import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const baseDir = path.join(projectRoot, 'public', 'olympia-audio');
const downloadsDir = path.join(projectRoot, 'scratch', 'fandom_downloads');
const SEASONS = ['O13-21', 'O20', 'O22', 'O23', 'O24-25', 'O26'];

const FANDOM_API = 'https://duong-len-dinh-olympia.fandom.com/vi/api.php';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

const FANDOM_TRACKS = [
  {
    wikiTitle: 'Tập tin:KĐ hoàn thành O7.mp3',
    localName: 'KD_hoan_thanh_O7.mp3',
    targetName: 'summary_rank_1',
  },
  {
    wikiTitle: 'Tập tin:Tổng kết điểm thí sinh 3.ogg',
    localName: 'Tong_ket_diem_thi_sinh_3.ogg',
    targetName: 'summary_rank_2',
  },
  {
    wikiTitle: 'Tập tin:Tổng kết điểm thí sinh 2.ogg',
    localName: 'Tong_ket_diem_thi_sinh_2.ogg',
    targetName: 'summary_rank_3',
  },
  {
    wikiTitle: 'Tập tin:Tổng kết điểm thí sinh 1.ogg',
    localName: 'Tong_ket_diem_thi_sinh_1.ogg',
    targetName: 'summary_rank_4',
  },
  {
    wikiTitle: 'Tập tin:Trao giải thưởng O9.mp3',
    localName: 'Trao_giai_thuong_O9.mp3',
    targetName: 'prize_award',
  },
];

const PEAK_ACTIVE_DB = -50;
const BASE_RMS_ACTIVE_DB = -60;
const VARIANT_RMS_ACTIVE_DB = -65;
const DOMINANCE_TOLERANCE_DB = 3;

function parseDb(raw) {
  if (!raw || raw === '-inf' || raw === 'inf') return -Infinity;
  const val = Number.parseFloat(raw);
  return Number.isFinite(val) ? val : -Infinity;
}

function probeFormat(filePath) {
  const res = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=channels,sample_rate', '-of', 'csv=p=0', filePath],
    { encoding: 'utf8' }
  );
  if (res.status !== 0) return { sampleRate: 0, channels: 0 };
  const line = (res.stdout || '').trim().split(/\r?\n/)[0] || '';
  const [srRaw, chRaw] = line.split(',');
  return {
    sampleRate: Number.parseInt(srRaw, 10) || 0,
    channels: Number.parseInt(chRaw, 10) || 0,
  };
}

function analyzeAstats(filePath) {
  const res = spawnSync(
    'ffmpeg',
    ['-i', filePath, '-af', 'astats', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
  const stderr = res.stderr || '';
  const ch1Section = stderr.match(/Channel:\s*1([\s\S]*?)(?=Channel:\s*2|Overall|$)/);
  const ch2Section = stderr.match(/Channel:\s*2([\s\S]*?)(?=Overall|$)/);

  const extract = (sec) => {
    if (!sec) return { peak: -Infinity, rms: -Infinity };
    const text = sec[1];
    const peakM = text.match(/Peak level dB:\s*([-\d.inf]+)/i);
    const rmsM = text.match(/RMS level dB:\s*([-\d.inf]+)/i);
    return {
      peak: parseDb(peakM?.[1]),
      rms: parseDb(rmsM?.[1]),
    };
  };

  return {
    l: extract(ch1Section),
    r: extract(ch2Section),
  };
}

function isBaseHealthy(filePath, require44100 = true) {
  if (!fs.existsSync(filePath)) return { healthy: false, channels: 0, sampleRate: 0, stats: null };
  const fmt = probeFormat(filePath);
  const stats = analyzeAstats(filePath);
  const lrBalanced =
    fmt.channels >= 2 &&
    stats.l.peak > PEAK_ACTIVE_DB &&
    stats.r.peak > PEAK_ACTIVE_DB &&
    stats.l.rms > BASE_RMS_ACTIVE_DB &&
    stats.r.rms > BASE_RMS_ACTIVE_DB;
  const srOk = !require44100 || fmt.sampleRate === 44100;
  return {
    healthy: lrBalanced && srOk,
    lrBalanced,
    channels: fmt.channels,
    sampleRate: fmt.sampleRate,
    stats,
  };
}

function isLeftHealthy(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const s = analyzeAstats(filePath);
  return (
    s.l.peak > PEAK_ACTIVE_DB &&
    s.l.rms > VARIANT_RMS_ACTIVE_DB &&
    s.l.rms >= s.r.rms - DOMINANCE_TOLERANCE_DB &&
    s.l.peak >= s.r.peak - DOMINANCE_TOLERANCE_DB
  );
}

function isRightHealthy(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const s = analyzeAstats(filePath);
  return (
    s.r.peak > PEAK_ACTIVE_DB &&
    s.r.rms > VARIANT_RMS_ACTIVE_DB &&
    s.r.rms >= s.l.rms - DOMINANCE_TOLERANCE_DB &&
    s.r.peak >= s.l.peak - DOMINANCE_TOLERANCE_DB
  );
}

function runFfmpeg(args) {
  const res = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (res.status !== 0) {
    throw new Error(`ffmpeg failed (${res.status}): ${res.stderr}`);
  }
}

function encodeBalancedStereo(inputPath, outputPath) {
  const fmt = probeFormat(inputPath);
  const stats = analyzeAstats(inputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const tmpPath = `${outputPath}.tmp.mp3`;

  const lOk = stats.l.peak > PEAK_ACTIVE_DB && stats.l.rms > BASE_RMS_ACTIVE_DB;
  const rOk = stats.r.peak > PEAK_ACTIVE_DB && stats.r.rms > BASE_RMS_ACTIVE_DB;

  let afArgs = [];
  if (fmt.channels >= 2) {
    if (lOk && !rOk) {
      afArgs = ['-af', 'pan=stereo|c0=c0|c1=c0'];
    } else if (!lOk && rOk) {
      afArgs = ['-af', 'pan=stereo|c0=c1|c1=c1'];
    }
  }

  runFfmpeg([
    '-i',
    inputPath,
    ...afArgs,
    '-ac',
    '2',
    '-ar',
    '44100',
    '-b:a',
    '192k',
    '-y',
    tmpPath,
  ]);
  fs.renameSync(tmpPath, outputPath);
}

function encodeSideVariant(basePath, outputPath, side) {
  const fmt = probeFormat(basePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const tmpPath = `${outputPath}.tmp.mp3`;

  let filter;
  if (fmt.channels < 2) {
    filter = side === 'left' ? 'pan=stereo|c0=c0|c1=0*c0' : 'pan=stereo|c0=0*c0|c1=c0';
  } else {
    filter =
      side === 'left'
        ? 'pan=stereo|c0=0.5*c0+0.5*c1|c1=0*c0'
        : 'pan=stereo|c0=0*c0|c1=0.5*c0+0.5*c1';
  }

  runFfmpeg([
    '-i',
    basePath,
    '-af',
    filter,
    '-ar',
    '44100',
    '-b:a',
    '192k',
    '-y',
    tmpPath,
  ]);
  fs.renameSync(tmpPath, outputPath);
}

async function resolveFandomUrl(wikiTitle) {
  const url = new URL(FANDOM_API);
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', wikiTitle);
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url');
  url.searchParams.set('format', 'json');

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Fandom API HTTP ${res.status} for ${wikiTitle}`);
  }
  const data = await res.json();
  const pages = data?.query?.pages || {};
  for (const page of Object.values(pages)) {
    const fileUrl = page?.imageinfo?.[0]?.url;
    if (fileUrl) return fileUrl;
  }
  throw new Error(`No imageinfo URL returned for ${wikiTitle}`);
}

async function downloadFandomTracks(force = false) {
  fs.mkdirSync(downloadsDir, { recursive: true });
  const downloaded = [];

  for (const track of FANDOM_TRACKS) {
    const dest = path.join(downloadsDir, track.localName);
    if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`[Download] Cached: ${track.localName} (${fs.statSync(dest).size} bytes)`);
      downloaded.push({ ...track, srcPath: dest });
      continue;
    }

    const mediaUrl = await resolveFandomUrl(track.wikiTitle);
    console.log(`[Download] Fetching ${track.wikiTitle} -> ${track.localName}`);
    const resp = await fetch(mediaUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!resp.ok) {
      throw new Error(`Failed downloading ${mediaUrl}: HTTP ${resp.status}`);
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.byteLength === 0) {
      throw new Error(`Empty response downloading ${mediaUrl}`);
    }
    fs.writeFileSync(dest, buf);
    console.log(`[Download] Saved ${track.localName} (${buf.byteLength} bytes)`);
    downloaded.push({ ...track, srcPath: dest });
  }

  return downloaded;
}

function deployAwardTracks(tracks) {
  const stagingDir = path.join(downloadsDir, 'normalized_r7');
  fs.mkdirSync(stagingDir, { recursive: true });

  for (const track of tracks) {
    const baseStaged = path.join(stagingDir, `${track.targetName}.mp3`);
    const leftStaged = path.join(stagingDir, `${track.targetName}_left.mp3`);
    const rightStaged = path.join(stagingDir, `${track.targetName}_right.mp3`);

    console.log(`[Normalize] ${track.localName} -> ${track.targetName} (base, _left, _right)`);
    encodeBalancedStereo(track.srcPath, baseStaged);
    encodeSideVariant(baseStaged, leftStaged, 'left');
    encodeSideVariant(baseStaged, rightStaged, 'right');

    for (const season of SEASONS) {
      const targetDir = path.join(baseDir, season, '6_NhacKhac');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(baseStaged, path.join(targetDir, `${track.targetName}.mp3`));
      fs.copyFileSync(leftStaged, path.join(targetDir, `${track.targetName}_left.mp3`));
      fs.copyFileSync(rightStaged, path.join(targetDir, `${track.targetName}_right.mp3`));
    }
  }
  console.log(`[Deploy] Deployed 15 R7 award/summary tracks to all ${SEASONS.length} seasons.`);
}

function walkBaseMp3s(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkBaseMp3s(full, list);
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.mp3') &&
      !entry.name.endsWith('_left.mp3') &&
      !entry.name.endsWith('_right.mp3')
    ) {
      list.push(full);
    }
  }
  return list;
}

function isProtectedBaseTrack(filePath) {
  const name = path.basename(filePath).toLowerCase();
  return name === 'contest_intro.mp3' || name === 'section_intro.mp3';
}

function runThreeChannelSweep() {
  let repairedBases = 0;
  let generatedLeft = 0;
  let generatedRight = 0;
  let preservedBases = 0;

  for (const season of SEASONS) {
    const seasonDir = path.join(baseDir, season);
    if (!fs.existsSync(seasonDir)) continue;

    const baseFiles = walkBaseMp3s(seasonDir).sort();
    for (const baseFile of baseFiles) {
      const rel = path.relative(baseDir, baseFile);
      const protectedTrack = isProtectedBaseTrack(baseFile);

      const health = isBaseHealthy(baseFile, !protectedTrack);
      if (protectedTrack) {
        preservedBases++;
      } else if (!health.healthy) {
        console.log(
          `[Sweep:FixBase] ${rel} (ch=${health.channels}, sr=${health.sampleRate}, balanced=${health.lrBalanced})`
        );
        encodeBalancedStereo(baseFile, baseFile);
        repairedBases++;
      } else {
        preservedBases++;
      }

      const leftFile = baseFile.replace(/\.mp3$/i, '_left.mp3');
      const rightFile = baseFile.replace(/\.mp3$/i, '_right.mp3');

      if (!isLeftHealthy(leftFile)) {
        console.log(`[Sweep:GenLeft] ${path.relative(baseDir, leftFile)}`);
        encodeSideVariant(baseFile, leftFile, 'left');
        generatedLeft++;
      }

      if (!isRightHealthy(rightFile)) {
        console.log(`[Sweep:GenRight] ${path.relative(baseDir, rightFile)}`);
        encodeSideVariant(baseFile, rightFile, 'right');
        generatedRight++;
      }
    }
  }

  console.log(
    `\n[Sweep Complete] preservedBases=${preservedBases}, repairedBases=${repairedBases}, generatedLeft=${generatedLeft}, generatedRight=${generatedRight}`
  );
}

async function main() {
  const force = process.argv.includes('--force');
  const tracks = await downloadFandomTracks(force);
  deployAwardTracks(tracks);
  runThreeChannelSweep();
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
