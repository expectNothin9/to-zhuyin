"use client";

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

export function splitZhuyinSyllables(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function ZhuyinSyllableVertical({
  syllable,
  className,
}: {
  syllable: string;
  className?: string;
}) {
  const { base, tone } = parseZhuyinSyllable(syllable);
  const chars = Array.from(base);

  if (!base) return null;

  return (
    <span
      className={[
        // A little extra right padding so right-side tones don't overlap adjacent columns.
        "relative inline-block",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
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
    </span>
  );
}

export function ZhuyinVertical({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const syllables = splitZhuyinSyllables(value);
  if (syllables.length === 0) return null;

  return syllables.map((syl, idx) => (
    <ZhuyinSyllableVertical
      key={`${syl}-${idx}`}
      syllable={syl}
      className={className}
    />
  ));
}
