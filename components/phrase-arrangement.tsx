"use client";

import * as React from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSeededRng } from "@/lib/seeded-rng";

const GRID = 6 as const;

type Block = {
  id: string;
  value: string;
  w: 1 | 2;
  h: 1 | 2;
  x: number;
  y: number;
};

function decodeMaybe(input: string): string {
  // Next.js typically gives decoded searchParams, but users may paste a percent-encoded URL.
  // Decode up to twice to handle accidental double-encoding.
  let out = input;
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9a-fA-F]{2}/.test(out)) break;
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch {
      break;
    }
  }
  return out;
}

function parseCellId(id: string): { x: number; y: number } | null {
  // cell-x-y
  const m = /^cell-(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function removeOneChar(haystack: string, needle: string): string | null {
  const chars = Array.from(haystack);
  const idx = chars.indexOf(needle);
  if (idx === -1) return null;
  chars.splice(idx, 1);
  return chars.join("");
}

function cellsFor(block: Pick<Block, "w" | "h">, x: number, y: number) {
  const out: Array<string> = [];
  for (let dy = 0; dy < block.h; dy++) {
    for (let dx = 0; dx < block.w; dx++) out.push(`${x + dx},${y + dy}`);
  }
  return out;
}

function inBounds(block: Pick<Block, "w" | "h">, x: number, y: number) {
  return x >= 0 && y >= 0 && x + block.w <= GRID && y + block.h <= GRID;
}

function canPlace(blocks: Block[], movingId: string, x: number, y: number) {
  const moving = blocks.find((b) => b.id === movingId);
  if (!moving) return false;
  if (!inBounds(moving, x, y)) return false;

  const occupied = new Set<string>();
  for (const b of blocks) {
    if (b.id === movingId) continue;
    for (const cell of cellsFor(b, b.x, b.y)) occupied.add(cell);
  }
  for (const cell of cellsFor(moving, x, y)) {
    if (occupied.has(cell)) return false;
  }
  return true;
}

function initBlocks(p: string, m: string, seed: string | number): Block[] {
  const rest = removeOneChar(p, m);
  if (rest == null) return [];
  const restChars = Array.from(rest);

  const rng = createSeededRng(seed);

  const blocks: Block[] = [
    { id: "center", value: m, w: 2, h: 2, x: 2, y: 2 },
    ...restChars.map((ch, idx) => ({
      id: `b${idx}`,
      value: ch,
      w: 1 as const,
      h: 1 as const,
      x: 0,
      y: 0,
    })),
  ];

  const occupied = new Set<string>();
  for (const cell of cellsFor(blocks[0], blocks[0].x, blocks[0].y))
    occupied.add(cell);

  const freeCells: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y });
    }
  }

  // Fisher–Yates shuffle using seeded RNG
  for (let i = freeCells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [freeCells[i], freeCells[j]] = [freeCells[j], freeCells[i]];
  }

  for (let i = 1; i < blocks.length; i++) {
    const spot = freeCells[i - 1];
    blocks[i] = { ...blocks[i], x: spot.x, y: spot.y };
  }

  return blocks;
}

function BlockView({
  block,
  cellPx,
  isDragging,
}: {
  block: Block;
  cellPx: number;
  isDragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "select-none rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        "flex items-center justify-center font-semibold",
        isDragging ? "opacity-90" : "hover:bg-muted/40"
      )}
      style={{
        width: block.w * cellPx,
        height: block.h * cellPx,
        fontSize: block.w === 2 ? 28 : 24,
        lineHeight: 1,
      }}
    >
      {block.value}
    </div>
  );
}

function DraggableBlock({
  block,
  cellPx,
  draggingId,
}: {
  block: Block;
  cellPx: number;
  draggingId: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: block.id,
    });

  const baseLeft = block.x * cellPx;
  const baseTop = block.y * cellPx;

  const dx = transform?.x ?? 0;
  const dy = transform?.y ?? 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute touch-none",
        block.id === draggingId ? "z-50" : "z-10"
      )}
      style={{
        left: baseLeft,
        top: baseTop,
        transform: `translate3d(${dx}px, ${dy}px, 0)`,
      }}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
    >
      <BlockView block={block} cellPx={cellPx} isDragging={isDragging} />
    </div>
  );
}

function GridCell({
  x,
  y,
  highlight,
}: {
  x: number;
  y: number;
  highlight?: boolean;
}) {
  const id = `cell-${x}-${y}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md border border-border/60 bg-background",
        highlight ? "ring-2 ring-primary/40" : null,
        isOver ? "ring-2 ring-primary/60" : null
      )}
    />
  );
}

export function PhraseArrangement({ p, m }: { p?: string; m?: string }) {
  const cleanedP = decodeMaybe((p ?? "").trim());
  const cleanedM = decodeMaybe((m ?? "").trim());

  const validation = React.useMemo(() => {
    const pChars = Array.from(cleanedP);
    const mChars = Array.from(cleanedM);
    if (pChars.length !== 4)
      return { ok: false as const, reason: "p must be 4 chars" };
    if (mChars.length !== 1)
      return { ok: false as const, reason: "m must be 1 char" };
    if (!pChars.includes(cleanedM))
      return { ok: false as const, reason: "p must include m" };
    return { ok: true as const };
  }, [cleanedM, cleanedP]);

  const [shuffleNonce, setShuffleNonce] = React.useState(0);

  const initialSeed = React.useMemo(
    () => `${cleanedP}|${cleanedM}`,
    [cleanedM, cleanedP]
  );
  const blocksSeed = React.useMemo(
    () => (shuffleNonce === 0 ? initialSeed : `${initialSeed}|${shuffleNonce}`),
    [initialSeed, shuffleNonce]
  );

  const [blocks, setBlocks] = React.useState<Block[]>(() => {
    if (!validation.ok) return [];
    return initBlocks(cleanedP, cleanedM, initialSeed);
  });

  React.useEffect(() => {
    if (!validation.ok) {
      setBlocks([]);
      return;
    }
    setBlocks(initBlocks(cleanedP, cleanedM, blocksSeed));
  }, [blocksSeed, cleanedM, cleanedP, validation.ok]);

  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cellPx = 64;

  const activeBlock = draggingId
    ? blocks.find((b) => b.id === draggingId)
    : null;

  const onDragStart = React.useCallback((e: DragStartEvent) => {
    setDraggingId(String(e.active.id));
  }, []);

  const onDragEnd = React.useCallback((e: DragEndEvent) => {
    const id = String(e.active.id);
    setDraggingId(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const cell = parseCellId(overId);
    if (!cell) return;

    setBlocks((prev) => {
      if (!canPlace(prev, id, cell.x, cell.y)) return prev;
      return prev.map((b) =>
        b.id === id ? { ...b, x: cell.x, y: cell.y } : b
      );
    });
  }, []);

  if (!validation.ok) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Bad input</CardTitle>
          <CardDescription>
            Use `?p=四字詞語&m=某` (p=4 chars, m=1 char, and p contains m).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {validation.reason}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-[min(90vw,560px)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          p: <span className="font-mono">{cleanedP}</span> · m:{" "}
          <span className="font-mono">{cleanedM}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShuffleNonce((n) => n + 1)}
        >
          Shuffle
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div
          className="relative rounded-2xl border border-border bg-muted/20 p-3"
          style={{ width: GRID * cellPx + 24, height: GRID * cellPx + 24 }}
        >
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${GRID}, ${cellPx}px)`,
              gridTemplateRows: `repeat(${GRID}, ${cellPx}px)`,
            }}
          >
            {Array.from({ length: GRID }).flatMap((_, y) =>
              Array.from({ length: GRID }).map((__, x) => (
                <GridCell key={`${x}-${y}`} x={x} y={y} />
              ))
            )}
          </div>

          <div
            className="absolute left-3 top-3"
            style={{ width: GRID * cellPx, height: GRID * cellPx }}
          >
            {blocks.map((b) => (
              <DraggableBlock
                key={b.id}
                block={b}
                cellPx={cellPx}
                draggingId={draggingId}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeBlock ? (
            <BlockView block={activeBlock} cellPx={cellPx} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
