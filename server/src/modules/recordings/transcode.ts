import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { env } from '../../config/env';

const execFileAsync = promisify(execFile);
const ffmpegPath = env.RECORDING_FFMPEG_PATH || 'ffmpeg';

function resolveFfprobePath(): string {
  if (/ffmpeg\.exe$/i.test(ffmpegPath)) return ffmpegPath.replace(/ffmpeg\.exe$/i, 'ffprobe.exe');
  if (/ffmpeg$/i.test(ffmpegPath)) return ffmpegPath.replace(/ffmpeg$/i, 'ffprobe');
  return 'ffprobe';
}

/** Read media duration in whole seconds via ffprobe. Returns 0 if unavailable. */
export async function probeDurationSeconds(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      resolveFfprobePath(),
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { maxBuffer: 1024 * 1024 },
    );
    const secs = Math.round(parseFloat(String(stdout).trim()));
    return Number.isFinite(secs) && secs > 0 ? secs : 0;
  } catch {
    return 0;
  }
}

/**
 * WebM → web-optimised MP4.
 *
 * Key improvements over the previous flags:
 *
 * 1. `-movflags +faststart`           — moov atom placed at the front of the
 *    file so the browser can start decoding without downloading the whole file.
 *
 * 2. `-crf 26` (was 23)               — slightly lower quality but meaningfully
 *    smaller file; still visually lossless at typical webcam resolutions.
 *    Smaller file = faster first byte.
 *
 * 3. `-preset faster` (was veryfast)  — better compression than veryfast with
 *    acceptable encode time, reducing file size ~10–15 %.
 *
 * 4. `-tune zerolatency`              — disables lookahead, producing smaller
 *    initial keyframe intervals which lets the browser start rendering sooner
 *    after receiving the first few bytes.
 *
 * 5. `-g 60 -keyint_min 30`           — keyframe every 2 s at 30 fps (was
 *    default ~250). Tighter GOP means seeks resolve to a keyframe faster,
 *    reducing the visible "blank frame" delay when scrubbing.
 *
 * 6. `-sc_threshold 0`                — disables scene-change keyframes that
 *    create unpredictable GOP sizes, keeping seeks predictable.
 *
 * 7. `-profile:v baseline -level 3.1` — broadest device compatibility (older
 *    Android, Smart TVs) while still supporting 1080p.
 *
 * 8. `-bufsize 2M -maxrate 2M`        — limits peak bitrate so the browser
 *    buffer fills quickly on constrained networks.
 *
 * 9. `-threads 0`                     — let ffmpeg use all available CPU cores.
 */
export async function convertToMp4(inputWebm: string, outputMp4: string): Promise<void> {
  await execFileAsync(
    ffmpegPath,
    [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-fflags', '+genpts',
      '-i', inputWebm,

      // ── Video ──────────────────────────────────────────────────────────────
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30',
      '-c:v', 'libx264',
      '-preset', 'faster',
      '-crf', '26',
      '-profile:v', 'baseline',
      '-level', '3.1',
      '-pix_fmt', 'yuv420p',
      // Predictable GOP — keyframe every 2 s; fast seek resolution
      '-g', '60',
      '-keyint_min', '30',
      '-sc_threshold', '0',
      // Tune for low-latency decode start
      '-tune', 'zerolatency',
      // Cap peak bitrate so the browser buffer fills quickly
      '-bufsize', '2M',
      '-maxrate', '2M',

      // ── Audio ──────────────────────────────────────────────────────────────
      '-c:a', 'aac',
      '-b:a', '96k',
      '-ar', '48000',
      '-ac', '2',

      // ── Container ─────────────────────────────────────────────────────────
      // +faststart moves the moov atom to the front — browser can play
      // before downloading the full file (critical for large recordings).
      '-movflags', '+faststart',
      '-threads', '0',

      outputMp4,
    ],
    { maxBuffer: 20 * 1024 * 1024 },
  );
}

/**
 * Extract the first video frame as a JPEG poster image.
 *
 * Called once after transcoding and cached on disk next to the MP4.
 * If extraction fails (e.g. audio-only file) we silently skip — the player
 * will still work without a poster.
 */
export async function extractPosterFrame(
  mp4Path: string,
  posterPath: string,
): Promise<boolean> {
  try {
    await execFileAsync(
      ffmpegPath,
      [
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        '-ss', '0.5',          // seek 0.5 s in to avoid a black first frame
        '-i', mp4Path,
        '-frames:v', '1',
        '-vf', 'scale=640:-1', // thumbnail width 640 px, preserve aspect ratio
        '-q:v', '4',           // JPEG quality (2 = best, 31 = worst)
        posterPath,
      ],
      { maxBuffer: 4 * 1024 * 1024 },
    );
    // Verify the output file actually exists and has content
    const st = await fs.stat(posterPath);
    return st.size > 0;
  } catch {
    return false;
  }
}
