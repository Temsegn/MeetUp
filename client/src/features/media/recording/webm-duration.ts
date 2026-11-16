/**
 * Make MediaRecorder WebM files seekable by writing the missing Duration.
 *
 * Chrome/Edge MediaRecorder streams WebM "live": the Segment has an unknown
 * size and the Info element has no Duration, so players report duration as
 * Infinity, can't show a timeline and seek very slowly. Inserting a Duration
 * element into Info fixes that without re-encoding (same idea as the widely
 * used `fix-webm-duration` package, implemented here with no dependency).
 *
 * Only the first bytes of the file are parsed/rewritten; the media data is
 * reused as-is via Blob slicing, so this is cheap even for multi-GB files.
 * Any unexpected structure returns the original blob unchanged.
 */

const ID_EBML = 0x1a45dfa3;
const ID_SEGMENT = 0x18538067;
const ID_SEEKHEAD = 0x114d9b74;
const ID_INFO = 0x1549a966;
const ID_CLUSTER = 0x1f43b675;
const ID_TIMECODE_SCALE = 0x2ad7b1;
const ID_DURATION = 0x4489;

/** How much of the file to inspect — Info always sits in the first few KB. */
const HEAD_BYTES = 256 * 1024;

type ElementHeader = {
  id: number;
  /** Offset of the first byte of the element (its ID). */
  start: number;
  /** Offset where the size field begins and how many bytes it uses. */
  sizeStart: number;
  sizeLength: number;
  dataStart: number;
  size: number;
  unknownSize: boolean;
};

function vintLength(firstByte: number): number {
  for (let i = 0; i < 8; i++) {
    if (firstByte & (0x80 >> i)) return i + 1;
  }
  return 0;
}

function readHeader(buf: Uint8Array, pos: number): ElementHeader | null {
  if (pos >= buf.length) return null;
  const idLen = vintLength(buf[pos]);
  if (idLen < 1 || idLen > 4 || pos + idLen > buf.length) return null;
  let id = 0;
  for (let i = 0; i < idLen; i++) id = id * 256 + buf[pos + i];

  const sizeStart = pos + idLen;
  if (sizeStart >= buf.length) return null;
  const sizeLength = vintLength(buf[sizeStart]);
  if (sizeLength < 1 || sizeStart + sizeLength > buf.length) return null;
  let size = buf[sizeStart] & (0xff >> sizeLength);
  let allOnes = size === 0xff >> sizeLength;
  for (let i = 1; i < sizeLength; i++) {
    const b = buf[sizeStart + i];
    size = size * 256 + b;
    if (b !== 0xff) allOnes = false;
  }
  return {
    id,
    start: pos,
    sizeStart,
    sizeLength,
    dataStart: sizeStart + sizeLength,
    size,
    unknownSize: allOnes,
  };
}

function readUint(buf: Uint8Array, start: number, length: number): number {
  let v = 0;
  for (let i = 0; i < length; i++) v = v * 256 + buf[start + i];
  return v;
}

/** 8-byte size vint (0x01 marker + 7 bytes) — fits any realistic size. */
function encodeSize8(size: number): Uint8Array {
  const out = new Uint8Array(8);
  out[0] = 0x01;
  let v = size;
  for (let i = 7; i >= 1; i--) {
    out[i] = v % 256;
    v = Math.floor(v / 256);
  }
  return out;
}

/** Re-encode `size` into an existing size field of `length` bytes, if it fits. */
function writeSizeInPlace(buf: Uint8Array, start: number, length: number, size: number): boolean {
  const maxValue = 2 ** (7 * length) - 2; // all-ones is reserved for "unknown"
  if (size > maxValue) return false;
  let v = size;
  for (let i = length - 1; i >= 0; i--) {
    buf[start + i] = v % 256;
    v = Math.floor(v / 256);
  }
  buf[start] |= 0x80 >> (length - 1);
  return true;
}

function float64(value: number): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setFloat64(0, value);
  return out;
}

export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!(durationMs > 0) || blob.size < 64) return blob;
  try {
    const headLen = Math.min(blob.size, HEAD_BYTES);
    const head = new Uint8Array(await blob.slice(0, headLen).arrayBuffer());

    const ebml = readHeader(head, 0);
    if (!ebml || ebml.id !== ID_EBML || ebml.unknownSize) return blob;
    const segment = readHeader(head, ebml.dataStart + ebml.size);
    if (!segment || segment.id !== ID_SEGMENT) return blob;

    // Find Info among the Segment's first children.
    let info: ElementHeader | null = null;
    let pos = segment.dataStart;
    while (pos < head.length) {
      const el = readHeader(head, pos);
      if (!el || el.unknownSize) return blob;
      // A SeekHead stores byte offsets that would shift — leave such files alone.
      if (el.id === ID_SEEKHEAD || el.id === ID_CLUSTER) return blob;
      if (el.id === ID_INFO) {
        info = el;
        break;
      }
      pos = el.dataStart + el.size;
    }
    if (!info) return blob;
    const infoEnd = info.dataStart + info.size;
    if (infoEnd > head.length) return blob;

    // Read TimecodeScale (ns per tick, default 1 ms) and any existing Duration.
    let timecodeScale = 1_000_000;
    let existingDuration: ElementHeader | null = null;
    for (let p = info.dataStart; p < infoEnd; ) {
      const child = readHeader(head, p);
      if (!child || child.unknownSize || child.dataStart + child.size > infoEnd) return blob;
      if (child.id === ID_TIMECODE_SCALE) timecodeScale = readUint(head, child.dataStart, child.size);
      if (child.id === ID_DURATION) existingDuration = child;
      p = child.dataStart + child.size;
    }
    if (!(timecodeScale > 0)) return blob;
    const durationTicks = (durationMs * 1_000_000) / timecodeScale;

    // Duration present (e.g. Firefox) → overwrite in place if it's empty.
    if (existingDuration) {
      const view = new DataView(head.buffer, existingDuration.dataStart, existingDuration.size);
      const current =
        existingDuration.size === 8 ? view.getFloat64(0) : existingDuration.size === 4 ? view.getFloat32(0) : NaN;
      if (Number.isFinite(current) && current > 0) return blob;
      if (existingDuration.size === 8) view.setFloat64(0, durationTicks);
      else if (existingDuration.size === 4) view.setFloat32(0, durationTicks);
      else return blob;
      return new Blob([head, blob.slice(headLen)], { type: blob.type });
    }

    // Insert Duration (ID 0x4489, size 8, float64) at the end of Info.
    const durationEl = new Uint8Array([0x44, 0x89, 0x88, ...float64(durationTicks)]);
    const infoChildren = head.subarray(info.dataStart, infoEnd);
    const newInfoSize = infoChildren.length + durationEl.length;
    const infoId = head.subarray(info.start, info.sizeStart);
    const newInfo = new Uint8Array(infoId.length + 8 + newInfoSize);
    newInfo.set(infoId, 0);
    newInfo.set(encodeSize8(newInfoSize), infoId.length);
    newInfo.set(infoChildren, infoId.length + 8);
    newInfo.set(durationEl, infoId.length + 8 + infoChildren.length);

    const before = head.slice(0, info.start);
    // A known Segment size must grow by the bytes we add (live recordings use "unknown").
    if (!segment.unknownSize) {
      const grownBy = newInfo.length - (infoEnd - info.start);
      if (!writeSizeInPlace(before, segment.sizeStart, segment.sizeLength, segment.size + grownBy)) {
        return blob;
      }
    }

    return new Blob([before, newInfo, blob.slice(infoEnd)], { type: blob.type });
  } catch {
    return blob;
  }
}
