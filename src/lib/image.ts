// Image post-processing for the snapshot. Brutalist duotone.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Map an image to two colors by luminance. `dark` replaces shadows, `light`
 * replaces highlights, with a linear ramp between. Mutates the canvas in place.
 */
export function duotone(
  canvas: HTMLCanvasElement,
  dark = "#000000",
  light = "#ffcc00",
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const [dr, dg, db] = hexToRgb(dark);
  const [lr, lg, lb] = hexToRgb(light);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // Rec. 601 luma, normalized 0..1
    const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    d[i] = dr + (lr - dr) * l;
    d[i + 1] = dg + (lg - dg) * l;
    d[i + 2] = db + (lb - db) * l;
  }
  ctx.putImageData(img, 0, 0);
}
