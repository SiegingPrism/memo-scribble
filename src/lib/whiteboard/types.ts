export type Point = { x: number; y: number; p?: number };

export type ToolId =
  | "select"
  | "pan"
  | "pen"
  | "highlighter"
  | "rainbow"
  | "dashed"
  | "laser"
  | "shape"
  | "eraser-pixel"
  | "eraser-object"
  | "text";

export type StrokeBase = {
  id: string;
  color: string;
  size: number;
  points: Point[];
};

export type PenStroke = StrokeBase & { kind: "pen" };
export type HighlighterStroke = StrokeBase & { kind: "highlighter" };
export type RainbowStroke = StrokeBase & { kind: "rainbow" };
export type DashedStroke = StrokeBase & { kind: "dashed" };
export type ShapeStroke = {
  id: string;
  kind: "shape";
  shape: "rect" | "circle" | "triangle" | "line";
  color: string;
  size: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
};
export type TextObject = {
  id: string;
  kind: "text";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  fontSize: number;
  bg?: string;
};
export type ImageObject = {
  id: string;
  kind: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
};
export type StickyNoteObject = {
  id: string;
  kind: "sticky";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
};

export type CanvasObject =
  | PenStroke
  | HighlighterStroke
  | RainbowStroke
  | DashedStroke
  | ShapeStroke
  | TextObject
  | ImageObject
  | StickyNoteObject;

export type Page = {
  id: string;
  objects: CanvasObject[];
  background: "white" | "grid" | "dots" | "lined" | "dark";
};

export type WhiteboardState = {
  pages: Page[];
  activePageId: string;
  tool: ToolId;
  color: string;
  size: number;
  history: Page[][]; // snapshots of pages
  historyIndex: number;
  selectedId: string | null;
  camera: { x: number; y: number; zoom: number };
};
