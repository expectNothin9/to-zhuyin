"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { toZhuyin, type ToZhuyinResult } from "@/app/actions/toZhuyin";
import { ZhuyinVertical } from "@/components/zhuyin-vertical";

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

  const runLookup = (raw: string) => {
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
