import type { ShapeStroke, StrokeBase } from "@/lib/whiteboard/types";

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  s: StrokeBase,
  color: string,
  width: number,
  alpha = 1,
) {
  if (s.points.length < 2) return;
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(s.points[0].x, s.points[0].y);
  for (let i = 1; i < s.points.length; i++) {
    const p = s.points[i];
    const prev = s.points[i - 1];
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + p.x) / 2, (prev.y + p.y) / 2);
  }
  ctx.stroke();
}

export function drawRainbow(ctx: CanvasRenderingContext2D, s: StrokeBase) {
  if (s.points.length < 2) return;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < s.points.length; i++) {
    const h = (i * 8) % 360;
    ctx.strokeStyle = `hsl(${h}, 90%, 55%)`;
    ctx.beginPath();
    ctx.moveTo(s.points[i - 1].x, s.points[i - 1].y);
    ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
  }
}

export function drawShape(ctx: CanvasRenderingContext2D, s: ShapeStroke) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.shape === "rect") {
    ctx.strokeRect(s.x, s.y, s.w, s.h);
  } else if (s.shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w / 2), Math.abs(s.h / 2), 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (s.shape === "triangle") {
    ctx.beginPath();
    ctx.moveTo(s.x + s.w / 2, s.y);
    ctx.lineTo(s.x, s.y + s.h);
    ctx.lineTo(s.x + s.w, s.y + s.h);
    ctx.closePath();
    ctx.stroke();
  } else if (s.shape === "line") {
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + s.w, s.y + s.h);
    ctx.stroke();
  }
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur + w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w.trimStart();
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}
