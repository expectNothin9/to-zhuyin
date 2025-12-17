"use client";

import { cn } from "@/lib/utils";

const TONES = new Set(["˙", "ˊ", "ˇ", "ˋ"] as const);
type ToneMark = "˙" | "ˊ" | "ˇ" | "ˋ";

function isToneMark(ch: string): ch is ToneMark {
  return TONES.has(ch as ToneMark);
}

export function parseZhuyinSyllable(raw: string): {
  base: string;
  tone: ToneMark | null;
} {
  const s = raw.trim();
  if (!s) return { base: "", tone: null };
  const last = s.at(-1) ?? "";
  if (isToneMark(last)) return { base: s.slice(0, -1), tone: last };
  return { base: s, tone: null };
}

export function ZhuyinVertical({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const { base, tone } = parseZhuyinSyllable(value);
  const chars = Array.from(base);

  if (!base) return null;

  return (
    <div className={cn("relative", className)}>
      {tone === "˙" ? (
        // Neutral-tone dot: above the topmost symbol (per user preference).
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[0.95em] leading-none"
        >
          ˙
        </span>
      ) : null}

      {tone && tone !== "˙" ? (
        // Tone marks 2/3/4: right side.
        <span
          aria-hidden="true"
          className="absolute top-0 left-full ml-[0.12em] leading-none"
        >
          {tone}
        </span>
      ) : null}

      <span className="inline-flex flex-col items-center leading-none">
        {chars.map((ch, idx) => (
          <span key={`${ch}-${idx}`} className="block">
            {ch}
          </span>
        ))}
      </span>
    </div>
  );
}
