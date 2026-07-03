import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Plus, Minus } from "lucide-react";

export function TimerWidget() {
  const [total, setTotal] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="space-y-3 text-center">
      <div className="text-5xl font-bold tabular-nums">{mm}:{ss}</div>
      <div className="flex items-center justify-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => { setTotal((t) => Math.max(10, t - 30)); setRemaining((r) => Math.max(0, r - 30)); }}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="default" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { setRunning(false); setRemaining(total); }}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { setTotal((t) => t + 30); setRemaining((r) => r + 30); }}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function StopwatchWidget() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const start = Date.now() - ms;
    const t = setInterval(() => setMs(Date.now() - start), 50);
    return () => clearInterval(t);
  }, [running, ms]);

  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");

  return (
    <div className="space-y-3 text-center">
      <div className="text-4xl font-bold tabular-nums">
        {mm}:{ss}<span className="text-2xl text-muted-foreground">.{cs}</span>
      </div>
      <div className="flex items-center justify-center gap-1">
        <Button size="icon" variant="default" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { setRunning(false); setMs(0); }}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
export function DiceWidget() {
  const [val, setVal] = useState(3);
  const [rolling, setRolling] = useState(false);
  function roll() {
    setRolling(true);
    let i = 0;
    const tick = setInterval(() => {
      setVal(1 + Math.floor(Math.random() * 6));
      if (++i > 8) {
        clearInterval(tick);
        setRolling(false);
      }
    }, 60);
  }
  return (
    <div className="space-y-3 text-center">
      <div className={`text-7xl leading-none transition-transform ${rolling ? "rotate-12" : ""}`}>
        {DICE_FACES[val - 1]}
      </div>
      <Button onClick={roll} disabled={rolling}>Roll</Button>
    </div>
  );
}

export function ScoreWidget() {
  const [teams, setTeams] = useState([
    { name: "Team A", score: 0 },
    { name: "Team B", score: 0 },
  ]);
  return (
    <div className="space-y-2">
      {teams.map((t, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/60 p-2">
          <input
            className="flex-1 bg-transparent text-sm font-medium outline-none"
            value={t.name}
            onChange={(e) => setTeams(teams.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
          />
          <Button size="icon" variant="ghost" onClick={() => setTeams(teams.map((x, j) => j === i ? { ...x, score: Math.max(0, x.score - 1) } : x))}>
            <Minus className="h-4 w-4" />
          </Button>
          <div className="w-10 text-center text-lg font-bold tabular-nums">{t.score}</div>
          <Button size="icon" variant="ghost" onClick={() => setTeams(teams.map((x, j) => j === i ? { ...x, score: x.score + 1 } : x))}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="ghost"
        className="w-full"
        onClick={() => setTeams([...teams, { name: `Team ${String.fromCharCode(65 + teams.length)}`, score: 0 }])}
      >
        <Plus className="h-4 w-4" /> Add team
      </Button>
    </div>
  );
}

export function CalculatorWidget() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");
  function press(k: string) {
    if (k === "=") {
      try {
        // eslint-disable-next-line no-new-func
        const val = Function(`"use strict"; return (${expr.replace(/×/g, "*").replace(/÷/g, "/")})`)();
        setResult(String(val));
      } catch {
        setResult("Error");
      }
    } else if (k === "C") {
      setExpr("");
      setResult("");
    } else if (k === "⌫") {
      setExpr((e) => e.slice(0, -1));
    } else {
      setExpr((e) => e + k);
    }
  }
  const keys = ["C", "⌫", "(", ")", "7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "=", "+"];
  return (
    <div className="w-56 space-y-2">
      <div className="rounded-lg bg-muted p-2 text-right">
        <div className="text-xs text-muted-foreground truncate">{expr || "0"}</div>
        <div className="text-2xl font-bold tabular-nums">{result || "0"}</div>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {keys.map((k) => (
          <Button
            key={k}
            variant={k === "=" ? "default" : "ghost"}
            className="h-10"
            onClick={() => press(k)}
          >
            {k}
          </Button>
        ))}
      </div>
    </div>
  );
}
