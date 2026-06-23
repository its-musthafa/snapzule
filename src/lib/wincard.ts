// Compose a shareable win card on an offscreen canvas: the solved puzzle image
// in a neo-brutalist frame + grid/moves/time + a "snapzule" tag.

interface WinCardData {
  imageDataUrl: string;
  gridSize: number;
  moves: number;
  seconds: number;
}

const YELLOW = "#ffcc00";
const PURPLE = "#a855f7";
const RED = "#ef4444";
const BLACK = "#000000";
const WHITE = "#ffffff";

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Build the card and return it as a PNG data URL. */
export async function buildWinCard(data: WinCardData): Promise<string> {
  const W = 640;
  const H = 800;
  const PAD = 40;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // Title
  ctx.fillStyle = BLACK;
  ctx.textAlign = "center";
  ctx.font = "900 64px 'Bebas Neue', Impact, sans-serif";
  ctx.fillText("SOLVED!", W / 2, 90);

  // Solved image in a black frame (square)
  const imgSize = W - PAD * 2;
  const imgX = PAD;
  const imgY = 120;
  const img = await loadImage(data.imageDataUrl);
  ctx.fillStyle = BLACK;
  ctx.fillRect(imgX - 8, imgY - 8, imgSize + 16, imgSize + 16);
  ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
  // hard shadow accent
  ctx.fillStyle = BLACK;
  ctx.fillRect(imgX + imgSize - 4, imgY + 12, 16, imgSize);

  // Stats row
  const statsY = imgY + imgSize + 70;
  const cells: { label: string; value: string; color: string }[] = [
    { label: "GRID", value: `${data.gridSize}×${data.gridSize}`, color: PURPLE },
    { label: "MOVES", value: `${data.moves}`, color: RED },
    { label: "TIME", value: fmtTime(data.seconds), color: PURPLE },
  ];
  const cellW = (W - PAD * 2 - 20 * 2) / 3;
  cells.forEach((c, i) => {
    const x = PAD + i * (cellW + 20);
    ctx.fillStyle = WHITE;
    ctx.fillRect(x, statsY, cellW, 90);
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 5;
    ctx.strokeRect(x, statsY, cellW, 90);
    ctx.fillStyle = BLACK;
    ctx.font = "700 16px 'Space Grotesk', Arial, sans-serif";
    ctx.fillText(c.label, x + cellW / 2, statsY + 28);
    ctx.fillStyle = c.color;
    ctx.font = "900 38px 'Bebas Neue', Impact, sans-serif";
    ctx.fillText(c.value, x + cellW / 2, statsY + 72);
  });

  // Footer tag
  ctx.fillStyle = BLACK;
  ctx.fillRect(PAD, H - 90, W - PAD * 2, 50);
  ctx.fillStyle = YELLOW;
  ctx.font = "900 34px 'Bebas Neue', Impact, sans-serif";
  ctx.fillText("SNAPZULE", W / 2, H - 54);

  return canvas.toDataURL("image/png");
}

/** Build the card and trigger a browser download. */
export async function downloadWinCard(data: WinCardData): Promise<void> {
  const url = await buildWinCard(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `snapzule-${data.gridSize}x${data.gridSize}-${data.moves}moves.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
