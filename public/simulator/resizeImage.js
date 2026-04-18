// Client-side image resizer. Reads a user-selected File, downscales it to
// fit within `maxDim` on the longest edge, and re-encodes as JPEG at the
// given quality. Purpose: avoid uploading a 4 MB phone photo when a
// 15-25 KB thumbnail renders identically in the chat UI (avatars are
// displayed at ~48 CSS px, so 256 px gives headroom for DPR 3 screens).
//
// Exports `resizeImage` on the global `window` since this script is loaded
// as a plain <script> (no ES modules in the simulator UI). Must be loaded
// BEFORE app.js in public/simulator/index.html.
//
// Usage: const blob = await resizeImage(file, { maxDim: 256, quality: 0.82 });

(function () {
  async function resizeImage(file, opts) {
    const { maxDim = 256, quality = 0.82, mimeType = 'image/jpeg' } = opts || {};

    // createImageBitmap handles EXIF orientation correctly (imageOrientation:
    // 'from-image') in modern browsers. Safari < 16 ignores the option but
    // most upload flows are fine without it; the <img> fallback below would
    // be needed for strict EXIF correctness on old Safari.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    // OffscreenCanvas is faster (no DOM attachment) and widely supported
    // (Chrome/Edge/Firefox/Safari 16.4+). Fall back to HTMLCanvasElement
    // for the long tail.
    let blob;
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await canvas.convertToBlob({ type: mimeType, quality });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
          mimeType,
          quality
        );
      });
    }

    // Release the bitmap's decoded pixel data so GC can reclaim it promptly
    // on iOS/Safari where memory pressure triggers aggressive reloads.
    if (bitmap.close) bitmap.close();

    return blob;
  }

  window.resizeImage = resizeImage;
})();
