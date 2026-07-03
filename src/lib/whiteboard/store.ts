import { create } from "zustand";
import type { CanvasObject, Page, ToolId, WhiteboardState } from "./types";

const STORAGE_KEY = "whiteboard.v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyPage(): Page {
  return { id: uid(), objects: [], background: "white" };
}

function load(): Pick<WhiteboardState, "pages" | "activePageId"> {
  if (typeof window === "undefined") {
    const p = emptyPage();
    return { pages: [p], activePageId: p.id };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.pages?.length) {
        return { pages: data.pages, activePageId: data.activePageId ?? data.pages[0].id };
      }
    }
  } catch {
    /* ignore */
  }
  const p = emptyPage();
  return { pages: [p], activePageId: p.id };
}

function persist(pages: Page[], activePageId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages, activePageId }));
  } catch {
    /* ignore quota */
  }
}

type Actions = {
  setTool: (tool: ToolId) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setSelected: (id: string | null) => void;
  setCamera: (c: { x: number; y: number; zoom: number }) => void;
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, patch: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => void;
  clearPage: () => void;
  addPage: () => void;
  removePage: (id: string) => void;
  setActivePage: (id: string) => void;
  nextPage: () => void;
  prevPage: () => void;
  setBackground: (bg: Page["background"]) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
};

export const useWhiteboard = create<WhiteboardState & Actions>((set, get) => {
  const initial = load();
  return {
    ...initial,
    tool: "pen",
    color: "#111827",
    size: 3,
    history: [structuredClone(initial.pages)],
    historyIndex: 0,
    selectedId: null,
    camera: { x: 0, y: 0, zoom: 1 },
    setTool: (tool) => set({ tool, selectedId: tool === "select" ? get().selectedId : null }),
    setColor: (color) => set({ color }),
    setSize: (size) => set({ size }),
    setSelected: (id) => set({ selectedId: id }),
    setCamera: (camera) => set({ camera }),
    addObject: (obj) => {
      const s = get();
      const pages = s.pages.map((p) =>
        p.id === s.activePageId ? { ...p, objects: [...p.objects, obj] } : p,
      );
      set({ pages });
      persist(pages, s.activePageId);
    },
    updateObject: (id, patch) => {
      const s = get();
      const pages = s.pages.map((p) =>
        p.id === s.activePageId
          ? {
              ...p,
              objects: p.objects.map((o) => (o.id === id ? ({ ...o, ...patch } as CanvasObject) : o)),
            }
          : p,
      );
      set({ pages });
      persist(pages, s.activePageId);
    },
    deleteObject: (id) => {
      const s = get();
      const pages = s.pages.map((p) =>
        p.id === s.activePageId ? { ...p, objects: p.objects.filter((o) => o.id !== id) } : p,
      );
      set({ pages, selectedId: null });
      persist(pages, s.activePageId);
    },
    clearPage: () => {
      const s = get();
      const pages = s.pages.map((p) => (p.id === s.activePageId ? { ...p, objects: [] } : p));
      set({ pages });
      persist(pages, s.activePageId);
    },
    addPage: () => {
      const s = get();
      const p = emptyPage();
      const pages = [...s.pages, p];
      set({ pages, activePageId: p.id });
      persist(pages, p.id);
    },
    removePage: (id) => {
      const s = get();
      if (s.pages.length === 1) return;
      const pages = s.pages.filter((p) => p.id !== id);
      const activePageId = s.activePageId === id ? pages[0].id : s.activePageId;
      set({ pages, activePageId });
      persist(pages, activePageId);
    },
    setActivePage: (id) => {
      set({ activePageId: id, selectedId: null });
      persist(get().pages, id);
    },
    nextPage: () => {
      const s = get();
      const i = s.pages.findIndex((p) => p.id === s.activePageId);
      const n = s.pages[Math.min(i + 1, s.pages.length - 1)];
      set({ activePageId: n.id, selectedId: null });
      persist(s.pages, n.id);
    },
    prevPage: () => {
      const s = get();
      const i = s.pages.findIndex((p) => p.id === s.activePageId);
      const n = s.pages[Math.max(i - 1, 0)];
      set({ activePageId: n.id, selectedId: null });
      persist(s.pages, n.id);
    },
    setBackground: (bg) => {
      const s = get();
      const pages = s.pages.map((p) => (p.id === s.activePageId ? { ...p, background: bg } : p));
      set({ pages });
      persist(pages, s.activePageId);
    },
    pushHistory: () => {
      const s = get();
      const snap = structuredClone(s.pages);
      const history = [...s.history.slice(0, s.historyIndex + 1), snap].slice(-50);
      set({ history, historyIndex: history.length - 1 });
    },
    undo: () => {
      const s = get();
      if (s.historyIndex <= 0) return;
      const i = s.historyIndex - 1;
      const pages = structuredClone(s.history[i]);
      set({ pages, historyIndex: i });
      persist(pages, s.activePageId);
    },
    redo: () => {
      const s = get();
      if (s.historyIndex >= s.history.length - 1) return;
      const i = s.historyIndex + 1;
      const pages = structuredClone(s.history[i]);
      set({ pages, historyIndex: i });
      persist(pages, s.activePageId);
    },
  };
});
