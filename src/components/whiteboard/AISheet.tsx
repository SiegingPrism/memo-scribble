import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Wand2, HelpCircle, BookOpen, Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const QUICK = [
  { label: "Generate Q&A", icon: HelpCircle, prompt: "Generate 5 quiz questions with answers on: " },
  { label: "Explain", icon: BookOpen, prompt: "Explain step-by-step: " },
  { label: "Lesson plan", icon: Wand2, prompt: "Create a short lesson plan for: " },
  { label: "Ideas", icon: Lightbulb, prompt: "Brainstorm classroom activities about: " },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

import { useWhiteboard } from "@/lib/whiteboard/store";

export function AISheet({
  open,
  onOpenChange,
  contextText,
  boardId,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  contextText?: string;
  boardId?: string;
}) {
  const addRecentAI = useWhiteboard((s) => s.addRecentAI);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    const userMsg: Msg = { id: uid(), role: "user", content: clean };
    const assistantMsg: Msg = { id: uid(), role: "assistant", content: "" };
    const next = [...messages, userMsg];
    setMessages([...next, assistantMsg]);
    setInput("");
    setLoading(true);

    try {
      const uiMessages = next.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text", text: m.content }],
      }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: uiMessages,
          system: contextText
            ? `You are a whiteboard classroom AI. The user has selected this content on the board:\n"""${contextText}"""\nUse it as primary context.`
            : undefined,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Chat failed: ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE-style ai-sdk data stream events
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "text-delta" && typeof evt.delta === "string") {
              acc += evt.delta;
            } else if (evt.type === "text" && typeof evt.text === "string") {
              acc += evt.text;
            }
          } catch {
            // ignore non-json lines
          }
        }
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: acc };
          return copy;
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("AI request failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Assistant
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 text-sm font-medium">Ask me anything</p>
              <p className="text-xs text-muted-foreground">
                Generate questions, explain concepts, plan lessons, or brainstorm activities.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q.label}
                    className="flex items-center gap-2 rounded-lg border border-border px-2 py-2 text-left text-xs transition hover:bg-accent"
                    onClick={() => setInput(q.prompt)}
                  >
                    <q.icon className="h-3.5 w-3.5 text-primary" />
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[92%] whitespace-pre-wrap text-sm text-foreground"
                }
              >
                {m.content || (loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />)}
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 border-t p-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            placeholder="Ask me anything…"
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="icon" type="submit" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
