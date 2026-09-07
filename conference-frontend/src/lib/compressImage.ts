/** Resize + compress an image file to a data URL suitable for avatar upload. */
export async function compressImageToDataUrl(
  file: File,
  opts: { maxEdge?: number; quality?: number; maxBytes?: number } = {},
): Promise<string> {
  const maxEdge = opts.maxEdge ?? 512;
  const quality = opts.quality ?? 0.82;
  const maxBytes = opts.maxBytes ?? 280_000;

  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > 8_000_000) {
    throw new Error('Image must be under 8 MB.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', q);
  while (dataUrl.length > maxBytes && q > 0.45) {
    q -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', q);
  }
  if (dataUrl.length > maxBytes) {
    throw new Error('Image is still too large after compression.');
  }
  return dataUrl;
}
