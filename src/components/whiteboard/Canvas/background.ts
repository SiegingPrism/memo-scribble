import type { Page } from "@/lib/whiteboard/types";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg: Page["background"],
  camera: { x: number; y: number; zoom: number },
) {
  if (bg === "dark") {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);
    return;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  const step = 24 * camera.zoom;
  if (bg === "grid") {
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    const ox = camera.x % step;
    const oy = camera.y % step;
    for (let x = ox; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = oy; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (bg === "dots") {
    ctx.fillStyle = "#cbd5e1";
    const ox = camera.x % step;
    const oy = camera.y % step;
    for (let x = ox; x < w; x += step) {
      for (let y = oy; y < h; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (bg === "lined") {
    ctx.strokeStyle = "#e2e8f0";
    const oy = camera.y % step;
    for (let y = oy; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
}
