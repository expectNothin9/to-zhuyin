"use client";

import * as React from "react";

import {
  wordToZhuyin,
  type ToZhuyinResult,
} from "@/app/actions/word-to-zhuyin";
import { Input } from "@/components/ui/input";
import { ZhuyinVertical } from "@/components/zhuyin-vertical";
import { Badge } from "@/components/ui/badge";

type WordToZhuyinProps = {
  preset?: string;
  onResult?: (result: ToZhuyinResult | null) => void;
};

function WordToZhuyin({ preset, onResult }: WordToZhuyinProps) {
  const [value, setValue] = React.useState(() => (preset ?? "").trim());
  const isComposingRef = React.useRef(false);

  const [result, setResult] = React.useState<ToZhuyinResult | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const debounceTimerRef = React.useRef<number | null>(null);
  const requestIdRef = React.useRef(0);

  const setAndEmit = React.useCallback(
    (next: ToZhuyinResult | null) => {
      setResult(next);
      onResult?.(next);
    },
    [onResult]
  );

  const runLookup = React.useCallback(
    (raw: string) => {
      const cleaned = raw.trim();
      if (!cleaned) {
        setAndEmit(null);
        return;
      }
      if (cleaned.length !== 1) {
        setAndEmit({ ok: false, word: cleaned, error: "BAD_INPUT" });
        return;
      }

      const requestId = ++requestIdRef.current;
      startTransition(async () => {
        const next = await wordToZhuyin(cleaned);
        if (requestId !== requestIdRef.current) return;
        setAndEmit(next);
      });
    },
    [setAndEmit]
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

  React.useEffect(() => {
    const next = (preset ?? "").trim();
    setValue(next);
    runLookup(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  return (
    <div className="flex flex-col items-center">
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
              {result.bestGuess ? <ZhuyinVertical value={result.bestGuess} /> : null}
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

      {result?.ok ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {result.zhuyin.map((z) => (
            <Badge key={z} variant={z === result.bestGuess ? "default" : "secondary"}>
              {z}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { WordToZhuyin };


