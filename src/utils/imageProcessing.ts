const THUMB_MAX = 300;
const THUMB_QUALITY = 0.7;

export async function generateThumbnail(
  file: File
): Promise<{ thumbnail: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const scale = Math.min(THUMB_MAX / width, THUMB_MAX / height, 1);
  const tw = Math.round(width * scale);
  const th = Math.round(height * scale);

  const canvas = new OffscreenCanvas(tw, th);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, tw, th);
  bitmap.close();

  const thumbnail = await canvas.convertToBlob({ type: 'image/jpeg', quality: THUMB_QUALITY });
  return { thumbnail, width, height };
}
