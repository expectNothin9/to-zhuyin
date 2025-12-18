"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  wordToZhuyin,
  type ToZhuyinResult,
} from "@/app/actions/word-to-zhuyin";
import {
  suggestFourCharPhrases,
  type SuggestFourCharPhrasesResult,
} from "@/app/actions/suggestFourCharPhrases";
import { ZhuyinVertical } from "@/components/zhuyin-vertical";
import { stripZhuyinToneMarks } from "@/lib/zhuyin";

type ToZhuyinProps = {
  preset?: string;
};

function renderSuggestionPhrase({
  text,
  positions,
  replacementChar,
}: {
  text: string;
  positions: number[];
  replacementChar: string;
}) {
  const pos = new Set(positions);
  const chars = Array.from(text);
  return (
    <div className="tracking-wide inline-flex items-baseline gap-0.5 text-xl leading-none">
      {chars.map((ch, idx) => {
        const isMatch = pos.has(idx);
        return (
          <span
            key={`${ch}-${idx}`}
            className={isMatch ? "font-semibold text-[2em]" : "text-[1em]"}
          >
            {isMatch ? replacementChar : ch}
          </span>
        );
      })}
    </div>
  );
}

function ToZhuyin({ preset }: ToZhuyinProps) {
  const [value, setValue] = React.useState(() => (preset ?? "").trim());
  const isComposingRef = React.useRef(false);
  const [zhuyinResult, setZhuyinResult] = React.useState<ToZhuyinResult | null>(
    null
  );
  const [phrasesResult, setPhrasesResult] =
    React.useState<SuggestFourCharPhrasesResult | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const debounceTimerRef = React.useRef<number | null>(null);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    setValue((preset ?? "").trim());
  }, [preset]);

  const runLookup = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) {
      setZhuyinResult(null);
      setPhrasesResult(null);
      return;
    }
    if (cleaned.length !== 1) {
      setZhuyinResult({ ok: false, word: cleaned, error: "BAD_INPUT" });
      setPhrasesResult(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    startTransition(async () => {
      const zh = await wordToZhuyin(cleaned);
      if (requestId !== requestIdRef.current) return;

      setZhuyinResult(zh);

      if (!zh.ok) {
        setPhrasesResult(null);
        return;
      }

      const best = zh.bestGuess ?? "";
      const keyNoTone = stripZhuyinToneMarks(best).trim();
      if (!keyNoTone) {
        setPhrasesResult(null);
        return;
      }

      const next = await suggestFourCharPhrases(keyNoTone);
      if (requestId !== requestIdRef.current) return;
      setPhrasesResult(next);
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
    <>
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
          ) : zhuyinResult?.ok ? (
            <div className="text-base text-foreground leading-none">
              {zhuyinResult.bestGuess ? (
                <ZhuyinVertical value={zhuyinResult.bestGuess} />
              ) : null}
            </div>
          ) : zhuyinResult ? (
            <div>
              {zhuyinResult.error === "NOT_FOUND"
                ? "Not found"
                : zhuyinResult.error === "BAD_INPUT"
                ? "Bad input"
                : "Upstream error"}
            </div>
          ) : (
            <div> </div>
          )}
        </div>
      </div>

      {zhuyinResult?.ok ? (
        <div className="mt-4 text-sm">
          <div className="text-muted-foreground">
            key:{" "}
            <span className="font-mono">
              {stripZhuyinToneMarks(zhuyinResult.bestGuess ?? "").trim()}
            </span>
          </div>

          {phrasesResult?.ok ? (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {phrasesResult.suggestions.map((sug) => {
                const allPositions = sug.matches.flatMap((m) => m.positions);
                return (
                  <div
                    key={sug.id}
                    className="border border-border rounded-xl p-6"
                  >
                    {renderSuggestionPhrase({
                      text: sug.text,
                      positions: allPositions,
                      replacementChar: zhuyinResult.word,
                    })}
                  </div>
                );
              })}
            </div>
          ) : phrasesResult ? (
            <div className="mt-2 text-muted-foreground">
              {phrasesResult.error === "NO_SUGGESTIONS"
                ? "No suggestions"
                : "Bad input"}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export { ToZhuyin };
