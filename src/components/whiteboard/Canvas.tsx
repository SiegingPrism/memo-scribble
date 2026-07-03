import { useEffect, useRef, useState } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { CanvasObject, Point, ShapeStroke, StrokeBase, TextObject, StickyNoteObject, ImageObject } from "@/lib/whiteboard/types";
import { recognizeShape } from "@/lib/whiteboard/shapeRecognition";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type Handle =
  | { type: "move" }
  | { type: "resize"; corner: "nw" | "ne" | "sw" | "se" };

export function WhiteboardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const {
    pages,
    activePageId,
    tool,
    color,
    size,
    camera,
    selectedId,
    addObject,
    updateObject,
    deleteObject,
    setSelected,
    setCamera,
    pushHistory,
  } = useWhiteboard();

  const page = pages.find((p) => p.id === activePageId)!;
  const [dpr, setDpr] = useState(1);
  const drawingRef = useRef<{
    points: Point[];
    color: string;
    startedAt: number;
  } | null>(null);
  const laserRef = useRef<Point[]>([]);
  const panRef = useRef<{ x: number; y: number; cam: typeof camera } | null>(null);
  const dragRef = useRef<{
    id: string;
    handle: Handle;
    start: Point;
    obj: CanvasObject;
  } | null>(null);
  const [editingText, setEditingText] = useState<{ id: string } | null>(null);

  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
    const onResize = () => setDpr(window.devicePixelRatio || 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Resize canvas
  useEffect(() => {
    const wrap = wrapRef.current;
    const c = canvasRef.current;
    const o = overlayRef.current;
    if (!wrap || !c || !o) return;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      for (const cv of [c, o]) {
        cv.width = w * dpr;
        cv.height = h * dpr;
        cv.style.width = `${w}px`;
        cv.style.height = `${h}px`;
      }
      redraw();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpr]);

  // Redraw when state changes
  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, camera, selectedId, dpr]);

  function toWorld(x: number, y: number): Point {
    return { x: (x - camera.x) / camera.zoom, y: (y - camera.y) / camera.zoom };
  }

  function redraw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.scale(dpr, dpr);
    // Background
    drawBackground(ctx, c.width / dpr, c.height / dpr, page.background);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    for (const obj of page.objects) drawObject(ctx, obj, selectedId === obj.id);
    ctx.restore();
  }

  function drawBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bg: typeof page.background,
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

  function drawObject(ctx: CanvasRenderingContext2D, obj: CanvasObject, selected: boolean) {
    ctx.save();
    if (obj.kind === "pen") {
      drawStroke(ctx, obj, obj.color, obj.size, 1);
    } else if (obj.kind === "highlighter") {
      ctx.globalAlpha = 0.35;
      drawStroke(ctx, obj, obj.color, obj.size * 4, 1);
    } else if (obj.kind === "rainbow") {
      drawRainbow(ctx, obj);
    } else if (obj.kind === "dashed") {
      ctx.setLineDash([obj.size * 3, obj.size * 3]);
      drawStroke(ctx, obj, obj.color, obj.size, 1);
    } else if (obj.kind === "shape") {
      drawShape(ctx, obj);
    } else if (obj.kind === "text") {
      drawText(ctx, obj);
    } else if (obj.kind === "sticky") {
      drawSticky(ctx, obj);
    } else if (obj.kind === "image") {
      drawImage(ctx, obj);
    }
    ctx.restore();
    if (selected) drawSelection(ctx, obj);
  }

  function drawStroke(
    ctx: CanvasRenderingContext2D,
    s: StrokeBase,
    color: string,
    width: number,
    alpha: number,
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

  function drawRainbow(ctx: CanvasRenderingContext2D, s: StrokeBase) {
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

  function drawShape(ctx: CanvasRenderingContext2D, s: ShapeStroke) {
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

  function drawText(ctx: CanvasRenderingContext2D, t: TextObject) {
    if (t.bg) {
      ctx.fillStyle = t.bg;
      ctx.fillRect(t.x, t.y, t.w, t.h);
    }
    ctx.fillStyle = t.color;
    ctx.font = `${t.fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "top";
    const lines = wrapText(ctx, t.text, t.w - 8);
    lines.forEach((line, i) => {
      ctx.fillText(line, t.x + 4, t.y + 4 + i * (t.fontSize * 1.2));
    });
  }

  function drawSticky(ctx: CanvasRenderingContext2D, s: StickyNoteObject) {
    ctx.fillStyle = s.color;
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#1e293b";
    ctx.font = `16px system-ui, sans-serif`;
    ctx.textBaseline = "top";
    const lines = wrapText(ctx, s.text, s.w - 16);
    lines.forEach((line, i) => {
      ctx.fillText(line, s.x + 8, s.y + 8 + i * 20);
    });
  }

  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  function drawImage(ctx: CanvasRenderingContext2D, o: ImageObject) {
    let img = imageCache.current.get(o.src);
    if (!img) {
      img = new Image();
      img.src = o.src;
      img.onload = () => redraw();
      imageCache.current.set(o.src, img);
    }
    if (img.complete) ctx.drawImage(img, o.x, o.y, o.w, o.h);
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
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

  function objectBounds(obj: CanvasObject): { x: number; y: number; w: number; h: number } {
    if ("points" in obj) {
      const xs = obj.points.map((p) => p.x);
      const ys = obj.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return { x: minX - 4, y: minY - 4, w: maxX - minX + 8, h: maxY - minY + 8 };
    }
    return { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
  }

  function drawSelection(ctx: CanvasRenderingContext2D, obj: CanvasObject) {
    const b = objectBounds(obj);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5 / camera.zoom;
    ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    // corner handles
    const handleSize = 8 / camera.zoom;
    ctx.fillStyle = "#ffffff";
    for (const [cx, cy] of [
      [b.x, b.y],
      [b.x + b.w, b.y],
      [b.x, b.y + b.h],
      [b.x + b.w, b.y + b.h],
    ] as const) {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    }
    ctx.restore();
  }

  function hitTest(pt: Point): CanvasObject | null {
    for (let i = page.objects.length - 1; i >= 0; i--) {
      const obj = page.objects[i];
      const b = objectBounds(obj);
      if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
        return obj;
      }
    }
    return null;
  }

  function getHandleAt(pt: Point, obj: CanvasObject): Handle {
    const b = objectBounds(obj);
    const h = 10 / camera.zoom;
    const corners: Array<[number, number, "nw" | "ne" | "sw" | "se"]> = [
      [b.x, b.y, "nw"],
      [b.x + b.w, b.y, "ne"],
      [b.x, b.y + b.h, "sw"],
      [b.x + b.w, b.y + b.h, "se"],
    ];
    for (const [cx, cy, corner] of corners) {
      if (Math.abs(pt.x - cx) < h && Math.abs(pt.y - cy) < h)
        return { type: "resize", corner };
    }
    return { type: "move" };
  }

  // ---- Pointer events ----
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = toWorld(sx, sy);

    // Two-finger / middle button pan
    if (e.button === 1 || tool === "pan") {
      panRef.current = { x: sx, y: sy, cam: { ...camera } };
      return;
    }

    if (tool === "select") {
      const hit = hitTest(w);
      if (hit) {
        const handle = selectedId === hit.id ? getHandleAt(w, hit) : { type: "move" as const };
        setSelected(hit.id);
        dragRef.current = { id: hit.id, handle, start: w, obj: structuredClone(hit) };
      } else {
        setSelected(null);
      }
      return;
    }

    if (tool === "eraser-object") {
      const hit = hitTest(w);
      if (hit) {
        pushHistory();
        deleteObject(hit.id);
      }
      return;
    }

    if (tool === "text") {
      const t: TextObject = {
        id: uid(),
        kind: "text",
        x: w.x,
        y: w.y,
        w: 240,
        h: 60,
        text: "",
        color,
        fontSize: 20,
      };
      addObject(t);
      setSelected(t.id);
      setEditingText({ id: t.id });
      return;
    }

    // Drawing tools
    drawingRef.current = { points: [w], color, startedAt: Date.now() };
    if (tool === "laser") laserRef.current = [w];
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = toWorld(sx, sy);

    if (panRef.current) {
      setCamera({
        x: panRef.current.cam.x + (sx - panRef.current.x),
        y: panRef.current.cam.y + (sy - panRef.current.y),
        zoom: camera.zoom,
      });
      return;
    }

    if (dragRef.current) {
      const d = dragRef.current;
      const dx = w.x - d.start.x;
      const dy = w.y - d.start.y;
      const orig = d.obj;
      if (d.handle.type === "move") {
        if ("points" in orig) {
          updateObject(d.id, {
            points: orig.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
          } as Partial<CanvasObject>);
        } else {
          updateObject(d.id, { x: orig.x + dx, y: orig.y + dy } as Partial<CanvasObject>);
        }
      } else {
        // resize (non-stroke objects)
        if (!("points" in orig)) {
          let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;
          if (d.handle.corner === "se") { nw = orig.w + dx; nh = orig.h + dy; }
          if (d.handle.corner === "ne") { ny = orig.y + dy; nw = orig.w + dx; nh = orig.h - dy; }
          if (d.handle.corner === "sw") { nx = orig.x + dx; nw = orig.w - dx; nh = orig.h + dy; }
          if (d.handle.corner === "nw") { nx = orig.x + dx; ny = orig.y + dy; nw = orig.w - dx; nh = orig.h - dy; }
          updateObject(d.id, { x: nx, y: ny, w: Math.max(20, nw), h: Math.max(20, nh) } as Partial<CanvasObject>);
        }
      }
      return;
    }

    if (drawingRef.current) {
      drawingRef.current.points.push(w);
      if (tool === "eraser-pixel") {
        // erase strokes intersecting
        const eraseR = size * 4;
        for (const obj of page.objects) {
          if ("points" in obj) {
            const hit = obj.points.some((p) => Math.hypot(p.x - w.x, p.y - w.y) < eraseR);
            if (hit) deleteObject(obj.id);
          }
        }
      } else if (tool === "laser") {
        laserRef.current.push(w);
        // trim old points
        const now = Date.now();
        if (drawingRef.current.startedAt) {
          const maxAge = 800;
          const drop = laserRef.current.length - Math.min(laserRef.current.length, Math.floor(maxAge / 8));
          if (drop > 0) laserRef.current.splice(0, drop);
        }
      }
      drawLive();
    }
  }

  function onPointerUp() {
    panRef.current = null;
    if (dragRef.current) {
      pushHistory();
      dragRef.current = null;
      return;
    }
    if (drawingRef.current) {
      const d = drawingRef.current;
      drawingRef.current = null;
      const overlay = overlayRef.current!;
      overlay.getContext("2d")!.clearRect(0, 0, overlay.width, overlay.height);

      if (tool === "eraser-pixel" || tool === "eraser-object") {
        pushHistory();
        return;
      }
      if (tool === "laser") {
        // fade out
        const fadeStart = Date.now();
        const fade = () => {
          const ctx = overlay.getContext("2d")!;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, overlay.width, overlay.height);
          ctx.scale(dpr, dpr);
          ctx.save();
          ctx.translate(camera.x, camera.y);
          ctx.scale(camera.zoom, camera.zoom);
          const elapsed = Date.now() - fadeStart;
          const alpha = Math.max(0, 1 - elapsed / 600);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.beginPath();
          const pts = laserRef.current;
          if (pts.length > 1) {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (const p of pts) ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
          ctx.restore();
          if (alpha > 0) requestAnimationFrame(fade);
          else ctx.clearRect(0, 0, overlay.width, overlay.height);
        };
        fade();
        return;
      }

      if (d.points.length < 2) return;
      const id = uid();
      if (tool === "shape") {
        const rec = recognizeShape(d.points, color, size);
        if (rec) {
          addObject({ id, ...rec });
          pushHistory();
          return;
        }
        addObject({ id, kind: "pen", color, size, points: d.points });
      } else if (tool === "pen") {
        addObject({ id, kind: "pen", color, size, points: d.points });
      } else if (tool === "highlighter") {
        addObject({ id, kind: "highlighter", color, size, points: d.points });
      } else if (tool === "rainbow") {
        addObject({ id, kind: "rainbow", color, size, points: d.points });
      } else if (tool === "dashed") {
        addObject({ id, kind: "dashed", color, size, points: d.points });
      }
      pushHistory();
    }
  }

  function drawLive() {
    const overlay = overlayRef.current!;
    const ctx = overlay.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.scale(dpr, dpr);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    if (!drawingRef.current) return ctx.restore();
    const pts = drawingRef.current.points;
    if (pts.length < 2) return ctx.restore();
    if (tool === "highlighter") {
      ctx.globalAlpha = 0.35;
      drawStroke(ctx, { id: "", color, size, points: pts }, color, size * 4, 1);
    } else if (tool === "rainbow") {
      drawRainbow(ctx, { id: "", color, size, points: pts });
    } else if (tool === "dashed") {
      ctx.setLineDash([size * 3, size * 3]);
      drawStroke(ctx, { id: "", color, size, points: pts }, color, size, 1);
    } else if (tool === "laser") {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else if (tool === "eraser-pixel") {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = size * 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else {
      drawStroke(ctx, { id: "", color, size, points: pts }, color, size, 1);
    }
    ctx.restore();
  }

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    if (!e.ctrlKey && !e.metaKey) {
      setCamera({ x: camera.x - e.deltaX, y: camera.y - e.deltaY, zoom: camera.zoom });
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.002);
    const newZoom = Math.min(4, Math.max(0.2, camera.zoom * factor));
    const wx = (sx - camera.x) / camera.zoom;
    const wy = (sy - camera.y) / camera.zoom;
    setCamera({ x: sx - wx * newZoom, y: sy - wy * newZoom, zoom: newZoom });
  }

  const editing = editingText ? page.objects.find((o) => o.id === editingText.id) as TextObject | undefined : undefined;

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden touch-none select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{ cursor: tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair" }}
      />
      <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />
      {editing && (
        <textarea
          autoFocus
          className="absolute rounded border-2 border-primary bg-white/95 px-1 py-0.5 text-slate-900 outline-none resize-none shadow-lg"
          style={{
            left: editing.x * camera.zoom + camera.x,
            top: editing.y * camera.zoom + camera.y,
            width: editing.w * camera.zoom,
            minHeight: editing.h * camera.zoom,
            fontSize: editing.fontSize * camera.zoom,
          }}
          defaultValue={editing.text}
          onBlur={(e) => {
            updateObject(editing.id, { text: e.target.value } as Partial<CanvasObject>);
            setEditingText(null);
            pushHistory();
          }}
        />
      )}
    </div>
  );
}
