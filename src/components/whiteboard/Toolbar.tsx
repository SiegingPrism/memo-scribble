import { useState } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { getAllTools, type ToolDef } from "@/lib/registry/toolRegistry";
import { Palette, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#111827", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#ffffff",
];

export function Toolbar() {
  const { tool, setTool, color, setColor, size, setSize, clearPage, pushHistory } = useWhiteboard();
  const [swipe, setSwipe] = useState(0);
  const tools: ToolDef[] = getAllTools();

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl bg-card/95 p-2 shadow-lg ring-1 ring-border backdrop-blur">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
        {tools.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.shortcut ? `${t.label} (${t.shortcut})` : t.label}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-lg transition",
                active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent",
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>

      <div className="h-px w-8 bg-border" />

      <Popover>
        <PopoverTrigger asChild>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-accent"
            title="Color & size"
          >
            <span
              className="h-6 w-6 rounded-full ring-2 ring-border"
              style={{ backgroundColor: color }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-64 space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Palette className="h-3.5 w-3.5" /> Colors
            </div>
            <div className="grid grid-cols-5 gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full ring-2 transition",
                    color === c ? "ring-primary" : "ring-border",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-3 h-8 w-full cursor-pointer rounded"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Thickness</span>
              <span>{size}px</span>
            </div>
            <Slider
              value={[size]}
              min={1}
              max={30}
              step={1}
              onValueChange={(v) => setSize(v[0])}
            />
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-accent" title="Clear">
            <Trash2 className="h-5 w-5 text-destructive" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-64 space-y-2">
          <p className="text-sm font-medium">Swipe to clear all</p>
          <p className="text-xs text-muted-foreground">Drag to 100 to wipe this page.</p>
          <Slider
            value={[swipe]}
            min={0}
            max={100}
            onValueChange={(v) => {
              setSwipe(v[0]);
              if (v[0] >= 100) {
                pushHistory();
                clearPage();
                setTimeout(() => setSwipe(0), 200);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
