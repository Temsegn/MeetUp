import { execFile } from 'child_process';
import { promisify } from 'util';
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
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
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

/** WebM → MP4. Even dimensions for libx264; genpts + CFR so the timeline seeks. */
export async function convertToMp4(inputWebm: string, outputMp4: string): Promise<void> {
  await execFileAsync(
    ffmpegPath,
    [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-fflags', '+genpts',
      '-i', inputWebm,
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '48000',
      '-ac', '2',
      '-movflags', '+faststart',
      outputMp4,
    ],
    { maxBuffer: 20 * 1024 * 1024 },
  );
}
