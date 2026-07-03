import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Timer,
  Clock,
  Dices,
  Trophy,
  Calculator,
  StickyNote,
  ImagePlus,
  Ruler,
  Table as TableIcon,
} from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { StickyNoteObject } from "@/lib/whiteboard/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export type WidgetKind = "timer" | "stopwatch" | "dice" | "score" | "calculator";

export function WidgetsSheet({
  open,
  onOpenChange,
  onLaunch,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onLaunch: (kind: WidgetKind) => void;
}) {
  const { addObject, pushHistory } = useWhiteboard();

  function addSticky() {
    const colors = ["#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8", "#fed7aa"];
    const s: StickyNoteObject = {
      id: uid(),
      kind: "sticky",
      x: 200 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      w: 180,
      h: 180,
      text: "New note",
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    addObject(s);
    pushHistory();
    onOpenChange(false);
  }

  const items = [
    { kind: "timer" as const, label: "Timer", icon: Timer, color: "bg-orange-500/10 text-orange-500" },
    { kind: "stopwatch" as const, label: "Stopwatch", icon: Clock, color: "bg-blue-500/10 text-blue-500" },
    { kind: "dice" as const, label: "Dice", icon: Dices, color: "bg-purple-500/10 text-purple-500" },
    { kind: "score" as const, label: "Scoreboard", icon: Trophy, color: "bg-yellow-500/10 text-yellow-500" },
    { kind: "calculator" as const, label: "Calculator", icon: Calculator, color: "bg-emerald-500/10 text-emerald-500" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Widgets</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6 overflow-y-auto pr-2">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Classroom
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.kind}
                    onClick={() => {
                      onLaunch(it.kind);
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition hover:bg-accent"
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-lg ${it.color}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-medium">{it.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Canvas
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={addSticky}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition hover:bg-accent"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-yellow-400/20 text-yellow-500">
                  <StickyNote className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium">Sticky note</span>
              </button>
              <DisabledCard icon={ImagePlus} label="Image search" />
              <DisabledCard icon={Ruler} label="Ruler" />
              <DisabledCard icon={TableIcon} label="Table" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              More tools (ruler, protractor, table, media) coming soon — this build ships with the essential set.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DisabledCard({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-3 text-center opacity-50">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

export function useWidgetLauncher() {
  const [openWidgets, setOpenWidgets] = useState<Array<{ id: string; kind: WidgetKind; x: number; y: number }>>([]);
  function launch(kind: WidgetKind) {
    setOpenWidgets((w) => [
      ...w,
      { id: uid(), kind, x: 120 + w.length * 30, y: 120 + w.length * 30 },
    ]);
  }
  function close(id: string) {
    setOpenWidgets((w) => w.filter((x) => x.id !== id));
  }
  return { openWidgets, launch, close };
}
