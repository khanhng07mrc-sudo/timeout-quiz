import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, '..', 'public', 'olympia-audio');
const downloadsDir = path.join(__dirname, '..', 'scratch', 'fandom_downloads');

function getChannelPeaks(filePath) {
  try {
    const res = spawnSync('ffmpeg', [
      '-i', filePath,
      '-af', 'astats',
      '-f', 'null', '-'
    ], { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });

    const stderr = res.stderr || '';
    const m1 = stderr.match(/Channel: 1[\s\S]*?Peak level dB:\s*([-\d.inf]+)/);
    const m2 = stderr.match(/Channel: 2[\s\S]*?Peak level dB:\s*([-\d.inf]+)/);

    const ch1 = m1 ? (m1[1] === '-inf' ? -Infinity : parseFloat(m1[1])) : -Infinity;
    const ch2 = m2 ? (m2[1] === '-inf' ? -Infinity : parseFloat(m2[1])) : -Infinity;
    return { ch1, ch2, isDualMonoHealthy: ch1 > -50 && ch2 > -50 };
  } catch (e) {
    return { ch1: -Infinity, ch2: -Infinity, isDualMonoHealthy: false };
  }
}

/**
 * Convert input file to Dual-Mono output file.
 * channelIndex: 0 for left channel, 1 for right channel.
 */
function exportDualMono(inputFile, outputFile, channelIndex = 0) {
  const panFilter = channelIndex === 1 ? 'pan=stereo|c0=c1|c1=c1' : 'pan=stereo|c0=c0|c1=c0';
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  const res = spawnSync('ffmpeg', [
    '-i', inputFile,
    '-af', panFilter,
    '-b:a', '192k',
    '-y', outputFile
  ], { encoding: 'utf8' });

  if (res.status !== 0) return false;

  const peaks = getChannelPeaks(outputFile);
  if (!peaks.isDualMonoHealthy) {
    // If selected channel was silent in source, fallback to opposite channel
    const fallbackFilter = channelIndex === 1 ? 'pan=stereo|c0=c0|c1=c0' : 'pan=stereo|c0=c1|c1=c1';
    spawnSync('ffmpeg', [
      '-i', inputFile,
      '-af', fallbackFilter,
      '-b:a', '192k',
      '-y', outputFile
    ], { encoding: 'utf8' });
  }

  return true;
}

// Map genuine fandom files for O13-21 and O22
const FANDOM_MAPPING = {
  '1_KhoiDong/start_round': { left: 'KĐ_bắt_đầu_left_O9.mp3', right: 'KĐ_bắt_đầu_right_O9.mp3' },
  '1_KhoiDong/ready': { left: 'KĐ_chuẩn_bị_left_O9.mp3', right: 'KĐ_chuẩn_bị_right_O9.mp3' },
  '1_KhoiDong/open_question': { left: 'KĐ_mở_câu_hỏi_left_O11.mp3', right: 'KĐ_mở_câu_hỏi_right_O11.mp3' },
  '1_KhoiDong/60s': { left: 'KĐ_60s_left_O10.mp3', right: 'KĐ_60s_right_O10.mp3' },
  '1_KhoiDong/correct': { left: 'KĐ_đúng_left_O10.mp3', right: 'KĐ_đúng_right_O10.ogg' },
  '1_KhoiDong/wrong': { left: 'KĐ_sai_left_O11.mp3', right: 'KĐ_sai_right_O11.mp3' },
  '1_KhoiDong/finish_turn': { left: 'KĐ_hoàn_thành_left_O10.mp3', right: 'KĐ_hoàn_thành_right_O10.mp3' },
  '1_KhoiDong/bell_ring': { left: 'KĐ_bắt_đầu_left_O7.mp3', right: 'KĐ_bắt_đầu_right_O7.mp3' },
  '2_VuotChuongNgaiVat/show_row': { left: 'VCNV_mở_ô_chữ_left_O7.mp3', right: 'VCNV_mở_ô_chữ_right_O7.mp3' },
  '2_VuotChuongNgaiVat/choose_row': { left: 'VCNV_chọn_ô_chữ_left_O11.ogg', right: 'VCNV_chọn_ô_chữ_right_O11.mp3' },
  '2_VuotChuongNgaiVat/15s_tick': { left: 'VCNV_15s_left_O11.mp3', right: 'VCNV_15s_right_O11.mp3' },
  '2_VuotChuongNgaiVat/reveal_answers': { left: 'VCNV_mở_đáp_án_left_O11.ogg', right: 'VCNV_mở_đáp_án_right_O11.ogg' },
  '2_VuotChuongNgaiVat/reveal_puzzle_piece': { left: 'VCNV_mở_hình_ảnh_left_O11.ogg', right: 'VCNV_mở_hình_ảnh_right_O11.mp3' },
  '2_VuotChuongNgaiVat/bell_ring': { left: 'VCNV_tín_hiệu_trả_lời_left_O11.mp3', right: 'VCNV_tín_hiệu_trả_lời_right_O11.mp3' },
  '2_VuotChuongNgaiVat/correct': { left: 'KĐ_đúng_left_O10.mp3', right: 'KĐ_đúng_right_O10.ogg' },
  '2_VuotChuongNgaiVat/cnv_correct': { left: 'VCNV_đúng_chướng_ngại_vật_left_O7.mp3', right: 'VCNV_đúng_chướng_ngại_vật_right_O7.mp3' },
  '3_TangToc/start_round': { left: 'KĐ_bắt_đầu_left_O10.mp3', right: 'KĐ_bắt_đầu_right_O10.mp3' },
  '3_TangToc/show_question': { left: 'TT_mở_câu_hỏi_left_O11.mp3', right: 'TT_mở_câu_hỏi_right_O11.mp3' },
  '3_TangToc/tick_10s': { left: 'TT_10s_left_O22.mp3', right: 'TT_10s_right_O22.mp3' },
  '3_TangToc/tick_20s': { left: 'TT_20s_left_O22.mp3', right: 'TT_20s_right_O22.mp3' },
  '3_TangToc/tick_30s': { left: 'TT_30s_left_O22.mp3', right: 'TT_30s_right_O22.mp3' },
  '3_TangToc/tick_40s': { left: 'TT_40s_left_O22.mp3', right: 'TT_40s_right_O22.mp3' },
  '3_TangToc/show_answer': { left: 'TT_mở_đáp_án_left_O11.ogg', right: 'TT_mở_đáp_án_right_O11.mp3' },
  '3_TangToc/correct': { left: 'KĐ_đúng_left_O10.mp3', right: 'KĐ_đúng_right_O10.ogg' },
  '4_VeDich/start_round': { left: 'VĐ_bắt_đầu_left_O9.mp3', right: 'VĐ_bắt_đầu_right_O9.mp3' },
  '4_VeDich/on_stage': { left: 'VĐ_lên_sân_khấu_left_O9.mp3', right: 'VĐ_lên_sân_khấu_right_O9.mp3' },
  '4_VeDich/choose_package': { left: 'VCNV_chọn_ô_chữ_left_O11.ogg', right: 'VCNV_chọn_ô_chữ_right_O11.mp3' },
  '4_VeDich/open_question': { left: 'VĐ_mở_câu_hỏi_left_O11.mp3', right: 'VĐ_mở_câu_hỏi_right_O11.mp3' },
  '4_VeDich/10s_tick': { left: 'VĐ_10s_left_O11.ogg', right: 'VĐ_10s_right_O11.ogg' },
  '4_VeDich/15s_tick': { left: 'VĐ_15s_left_O22.mp3', right: 'VĐ_15s_right_O22.mp3' },
  '4_VeDich/20s_tick': { left: 'VĐ_20s_left_O22.mp3', right: 'VĐ_20s_right_O22.mp3' },
  '4_VeDich/5s_steal': { left: 'VĐ_5s_thí_sinh_còn_lại_left_O10.mp3', right: 'VĐ_5s_thí_sinh_còn_lại_right_O10.mp3' },
  '4_VeDich/bell_ring': { left: 'VĐ_tín_hiệu_trả_lời_left_O8.mp3', right: 'VĐ_tín_hiệu_trả_lời_right_O8.mp3' },
  '4_VeDich/star_of_hope': { left: 'VĐ_ngôi_sao_left_O8.mp3', right: 'VĐ_ngôi_sao_right_O8.mp3' },
  '4_VeDich/correct': { left: 'VĐ_đúng_left_O7.mp3', right: 'VĐ_đúng_right_O7.ogg' },
  '4_VeDich/wrong': { left: 'VĐ_sai_left_O7.ogg', right: 'VĐ_sai_right_O7.ogg' },
  '4_VeDich/finish_turn': { left: 'VĐ_về_vị_trí_left_O8.mp3', right: 'VĐ_về_vị_trí_right_O8.mp3' },
  '6_NhacKhac/show_intro': { left: 'Giới_thiệu_cuộc_thi_left_O9.mp3', right: 'Giới_thiệu_cuộc_thi_right_O9.mp3' },
  '6_NhacKhac/contest_intro': { left: 'Nhạc_hiệu_cuộc_thi_left_O9.mp3', right: 'Nhạc_hiệu_cuộc_thi_right_O9.mp3' },
  '6_NhacKhac/summary': { left: 'Tổng_kết_điểm_left_O9.mp3', right: 'Tổng_kết_điểm_right_O9.mp3' },
  '6_NhacKhac/prize_award': { left: 'Trao_giải_thưởng_left_O9.ogg', right: 'Trao_giải_thưởng_right_O9.mp3' },
};

console.log('=== Step 1: Ingesting Genuine Fandom Tracks into O13-21 and O22 ===');
for (const s of ['O13-21', 'O22']) {
  for (const [id, mapping] of Object.entries(FANDOM_MAPPING)) {
    const leftSrc = path.join(downloadsDir, mapping.left);
    const rightSrc = path.join(downloadsDir, mapping.right);
    const leftDst = path.join(baseDir, s, `${id}_left.mp3`);
    const rightDst = path.join(baseDir, s, `${id}_right.mp3`);
    const baseDst = path.join(baseDir, s, `${id}.mp3`);

    if (fs.existsSync(leftSrc)) {
      exportDualMono(leftSrc, leftDst, 0);
    }
    if (fs.existsSync(rightSrc)) {
      exportDualMono(rightSrc, rightDst, 1);
    }

    const basePeaks = fs.existsSync(baseDst) ? getChannelPeaks(baseDst) : { isDualMonoHealthy: false };
    if (!basePeaks.isDualMonoHealthy) {
      if (fs.existsSync(leftDst) && getChannelPeaks(leftDst).isDualMonoHealthy) {
        fs.copyFileSync(leftDst, baseDst);
      } else if (fs.existsSync(rightDst) && getChannelPeaks(rightDst).isDualMonoHealthy) {
        fs.copyFileSync(rightDst, baseDst);
      }
    }
  }
}

console.log('=== Step 2: Processing All Seasons and Guaranteeing Audible Dual-Mono ===');
const seasons = ['O13-21', 'O22', 'O24-25', 'O26'];
let processed = 0;
let silentBaseFixed = 0;

for (const s of seasons) {
  const sDir = path.join(baseDir, s);
  if (!fs.existsSync(sDir)) continue;

  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile() && ent.name.endsWith('.mp3') && !ent.name.endsWith('_left.mp3') && !ent.name.endsWith('_right.mp3')) {
        const baseFile = full;
        const leftFile = path.join(d, ent.name.replace('.mp3', '_left.mp3'));
        const rightFile = path.join(d, ent.name.replace('.mp3', '_right.mp3'));

        let basePeaks = getChannelPeaks(baseFile);

        // If base file is not healthy, copy from fallback season
        if (!basePeaks.isDualMonoHealthy) {
          const relPath = path.relative(sDir, baseFile);
          for (const fallbackSeason of ['O26', 'O24-25', 'O22', 'O13-21']) {
            const candidate = path.join(baseDir, fallbackSeason, relPath);
            if (fs.existsSync(candidate) && getChannelPeaks(candidate).isDualMonoHealthy) {
              fs.copyFileSync(candidate, baseFile);
              basePeaks = getChannelPeaks(baseFile);
              silentBaseFixed++;
              break;
            }
          }
        }

        // Always ensure leftFile is healthy Dual-Mono (both channels > -50 dB)
        const leftPeaks = fs.existsSync(leftFile) ? getChannelPeaks(leftFile) : { isDualMonoHealthy: false };
        if (!leftPeaks.isDualMonoHealthy && basePeaks.isDualMonoHealthy) {
          exportDualMono(baseFile, leftFile, 0);
          processed++;
        }

        // Always ensure rightFile is healthy Dual-Mono (both channels > -50 dB)
        const rightPeaks = fs.existsSync(rightFile) ? getChannelPeaks(rightFile) : { isDualMonoHealthy: false };
        if (!rightPeaks.isDualMonoHealthy && basePeaks.isDualMonoHealthy) {
          exportDualMono(baseFile, rightFile, 1);
          processed++;
        }
      }
    }
  };
  walk(sDir);
}

console.log(`Finished audio rebuild: processed=${processed}, silentBaseFixed=${silentBaseFixed}`);
