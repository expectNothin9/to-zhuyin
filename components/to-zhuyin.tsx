"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { toZhuyin, type ToZhuyinResult } from "@/app/actions/toZhuyin";

type ToZhuyinProps = {
  preset?: string;
};

function ToZhuyin({ preset }: ToZhuyinProps) {
  const [value, setValue] = React.useState(() => (preset ?? "").trim());
  const isComposingRef = React.useRef(false);
  const [result, setResult] = React.useState<ToZhuyinResult | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const debounceTimerRef = React.useRef<number | null>(null);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    setValue((preset ?? "").trim());
  }, [preset]);

  const runLookup = React.useCallback(
    (raw: string) => {
      const cleaned = raw.trim();
      if (!cleaned) {
        setResult(null);
        return;
      }

      const requestId = ++requestIdRef.current;
      startTransition(async () => {
        const next = await toZhuyin(cleaned);
        if (requestId !== requestIdRef.current) return;
        setResult(next);
      });
    },
    [startTransition]
  );

  const scheduleLookup = React.useCallback(
    (raw: string) => {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        runLookup(raw);
      }, 250);
    },
    [runLookup]
  );

  return (
    <div className="flex gap-2 p-4">
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
        placeholder="輸入字或詞"
        aria-label="Character"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        inputMode="text"
        className="size-16 rounded-xl p-0 text-center text-4xl leading-none md:text-4xl"
      />

      <div className="min-h-10 text-sm text-muted-foreground">
        {isPending ? (
          <div>Loading…</div>
        ) : result?.ok ? (
          <div className="flex flex-col gap-1">
            <div className="text-2xl text-foreground">{result.bestGuess}</div>
            {result.zhuyin.length > 1 ? (
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {result.zhuyin.map((z) => (
                  <span key={z} className="rounded-md border px-2 py-1 text-xs">
                    {z}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : result ? (
          <div>
            {result.error === "NOT_FOUND"
              ? "Not found"
              : result.error === "BAD_INPUT"
              ? "Bad input"
              : "Upstream error"}
          </div>
        ) : (
          <div> </div>
        )}
      </div>
    </div>
  );
}

export { ToZhuyin };
