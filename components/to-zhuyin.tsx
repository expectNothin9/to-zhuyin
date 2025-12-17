"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  suggestFourCharPhrases,
  type SuggestPhrasesResult,
} from "@/app/actions/toZhuyin";
import { ZhuyinVertical } from "@/components/zhuyin-vertical";

type ToZhuyinProps = {
  preset?: string;
};

function highlightPositions(text: string, positions: number[]) {
  const pos = new Set(positions);
  const chars = Array.from(text);
  return (
    <span className="tracking-wide">
      {chars.map((ch, idx) =>
        pos.has(idx) ? (
          <span key={`${ch}-${idx}`} className="font-semibold underline">
            {ch}
          </span>
        ) : (
          <span key={`${ch}-${idx}`}>{ch}</span>
        )
      )}
    </span>
  );
}

function ToZhuyin({ preset }: ToZhuyinProps) {
  const [value, setValue] = React.useState(() => (preset ?? "").trim());
  const isComposingRef = React.useRef(false);
  const [result, setResult] = React.useState<SuggestPhrasesResult | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const debounceTimerRef = React.useRef<number | null>(null);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    setValue((preset ?? "").trim());
  }, [preset]);

  const runLookup = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) {
      setResult(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    startTransition(async () => {
      const next = await suggestFourCharPhrases(cleaned);
      if (requestId !== requestIdRef.current) return;
      setResult(next);
    });
  };

  const scheduleLookup = (raw: string) => {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      runLookup(raw);
    }, 250);
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          const next = e.currentTarget.value;
          setValue(next);
          if (!isComposingRef.current) scheduleLookup(next);
        }}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          const next = e.currentTarget.value;
          setValue(next);
          runLookup(next);
        }}
        aria-label="Character"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        inputMode="text"
        className="size-16 rounded-xl p-0 text-center text-4xl leading-none md:text-4xl"
      />

      <div className="absolute top-1/2 -translate-y-1/2 left-full translate-x-2 text-sm text-muted-foreground">
        {isPending ? (
          <div>Loading…</div>
        ) : result?.ok ? (
          <div className="text-base text-foreground leading-none">
            {result.bestGuess ? (
              <ZhuyinVertical value={result.bestGuess} />
            ) : null}
          </div>
        ) : result ? (
          <div>
            {result.error === "NOT_FOUND"
              ? "Not found"
              : result.error === "BAD_INPUT"
              ? "Bad input"
              : result.error === "NO_SUGGESTIONS"
              ? "No suggestions"
              : "Upstream error"}
          </div>
        ) : (
          <div> </div>
        )}
      </div>

      {result?.ok ? (
        <div className="mt-4 text-sm">
          <div className="text-muted-foreground">
            key: <span className="font-mono">{result.keyNoTone ?? ""}</span>
          </div>

          {result.suggestions.length ? (
            <ul className="mt-2 space-y-1">
              {result.suggestions.map((sug) => {
                const allPositions = sug.matches.flatMap((m) => m.positions);
                const matchChars = sug.matches.map((m) => m.char).join(" / ");
                return (
                  <li key={sug.id} className="flex items-baseline gap-2">
                    <span className="text-foreground">
                      {highlightPositions(sug.text, allPositions)}
                    </span>
                    <span className="text-muted-foreground">
                      ({matchChars})
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { ToZhuyin };
