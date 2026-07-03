import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WhiteboardCanvas } from "@/components/whiteboard/Canvas";
import { Toolbar } from "@/components/whiteboard/Toolbar";
import { TopBar } from "@/components/whiteboard/TopBar";
import { WidgetsSheet, useWidgetLauncher } from "@/components/whiteboard/WidgetsSheet";
import { AISheet } from "@/components/whiteboard/AISheet";
import { FloatingWidget } from "@/components/whiteboard/FloatingWidget";
import {
  CalculatorWidget,
  DiceWidget,
  ScoreWidget,
  StopwatchWidget,
  TimerWidget,
} from "@/components/whiteboard/widgets/BasicWidgets";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { Wand2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Slate — Smart Whiteboard for Classrooms" },
      {
        name: "description",
        content:
          "A fast, tactile whiteboard for mobile and tablet. Smart pens, shape recognition, widgets, AI teaching assistant, and instant sharing.",
      },
      { property: "og:title", content: "Slate — Smart Whiteboard" },
      {
        property: "og:description",
        content: "Draw, teach, and collaborate on any device with smart pens, widgets and AI.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [aiOpen, setAIOpen] = useState(false);
  const { openWidgets, launch, close } = useWidgetLauncher();
  const { selectedId, pages, activePageId } = useWhiteboard();
  const page = pages.find((p) => p.id === activePageId)!;
  const selected = page.objects.find((o) => o.id === selectedId);
  const contextText =
    selected && "text" in selected && typeof selected.text === "string" ? selected.text : undefined;

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-background">
      <WhiteboardCanvas />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2 sm:p-3">
        <TopBar onOpenAI={() => setAIOpen(true)} onOpenWidgets={() => setWidgetsOpen(true)} />
      </div>

      {/* Left toolbar (desktop/tablet) — bottom on mobile */}
      <div className="pointer-events-none absolute left-2 top-1/2 hidden -translate-y-1/2 lg:block">
        <Toolbar />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center lg:hidden">
        <Toolbar />
      </div>

      {/* Selected object context menu */}
      {selectedId && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 lg:bottom-4 lg:left-auto lg:right-4 lg:translate-x-0">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-card px-2 py-1 shadow-lg ring-1 ring-border">
            <button
              onClick={() => setAIOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Ask AI
            </button>
          </div>
        </div>
      )}

      <WidgetsSheet open={widgetsOpen} onOpenChange={setWidgetsOpen} onLaunch={launch} />
      <AISheet open={aiOpen} onOpenChange={setAIOpen} contextText={contextText} />

      {openWidgets.map((w) => (
        <FloatingWidget
          key={w.id}
          title={titleFor(w.kind)}
          initial={{ x: w.x, y: w.y }}
          onClose={() => close(w.id)}
        >
          {w.kind === "timer" && <TimerWidget />}
          {w.kind === "stopwatch" && <StopwatchWidget />}
          {w.kind === "dice" && <DiceWidget />}
          {w.kind === "score" && <ScoreWidget />}
          {w.kind === "calculator" && <CalculatorWidget />}
        </FloatingWidget>
      ))}
    </div>
  );
}

function titleFor(k: string) {
  switch (k) {
    case "timer": return "Timer";
    case "stopwatch": return "Stopwatch";
    case "dice": return "Dice";
    case "score": return "Scoreboard";
    case "calculator": return "Calculator";
    default: return k;
  }
}
