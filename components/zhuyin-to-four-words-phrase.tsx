"use client";

import * as React from "react";

import {
  suggestFourCharPhrases,
  type SuggestFourCharPhrasesResult,
} from "@/app/actions/suggestFourCharPhrases";
import { Input } from "@/components/ui/input";
import { stripZhuyinToneMarks } from "@/lib/zhuyin";

type ZhuyinToFourWordsPhraseProps = {
  keyNoTone?: string;
  hideInput?: boolean;
  replacementChar?: string;
};

function renderPhrase({
  text,
  positions,
  replacementChar,
}: {
  text: string;
  positions: number[];
  replacementChar?: string;
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
            className={
              isMatch ? "font-semibold underline underline-offset-4" : undefined
            }
          >
            {isMatch && replacementChar ? replacementChar : ch}
          </span>
        );
      })}
    </div>
  );
}

function ZhuyinToFourWordsPhrase({
  keyNoTone,
  hideInput,
  replacementChar,
}: ZhuyinToFourWordsPhraseProps) {
  const isControlled = keyNoTone != null;
  const [value, setValue] = React.useState(() => "");
  const [result, setResult] = React.useState<SuggestFourCharPhrasesResult | null>(
    null
  );
  const [isPending, startTransition] = React.useTransition();
  const debounceTimerRef = React.useRef<number | null>(null);
  const requestIdRef = React.useRef(0);

  const derivedKeyNoTone = React.useMemo(() => {
    if (isControlled) return (keyNoTone ?? "").trim();
    return stripZhuyinToneMarks(value).trim();
  }, [isControlled, keyNoTone, value]);

  const runLookup = React.useCallback((rawKeyNoTone: string) => {
    const cleaned = rawKeyNoTone.trim();
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
  }, []);

  const scheduleLookup = React.useCallback(
    (rawKeyNoTone: string) => {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        runLookup(rawKeyNoTone);
      }, 250);
    },
    [runLookup]
  );

  React.useEffect(() => {
    if (!isControlled) return;
    runLookup(derivedKeyNoTone);
  }, [derivedKeyNoTone, isControlled, runLookup]);

  return (
    <div className="flex flex-col items-center">
      {!hideInput ? (
        <Input
          value={value}
          onChange={(e) => {
            const next = e.currentTarget.value;
            setValue(next);
            scheduleLookup(stripZhuyinToneMarks(next).trim());
          }}
          aria-label="Zhuyin"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          inputMode="text"
          className="h-12 w-72 rounded-xl text-center text-2xl leading-none"
          placeholder="ㄓㄨˋ ㄧㄣ"
        />
      ) : null}

      <div className="mt-4 text-sm">
        <div className="text-muted-foreground">
          key: <span className="font-mono">{derivedKeyNoTone}</span>
        </div>

        {isPending ? (
          <div className="mt-2 text-muted-foreground">Loading…</div>
        ) : result?.ok ? (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {result.suggestions.map((sug) => {
              const allPositions = sug.matches.flatMap((m) => m.positions);
              return (
                <div
                  key={sug.id}
                  className="border border-border rounded-xl p-6"
                >
                  {renderPhrase({
                    text: sug.text,
                    positions: allPositions,
                    replacementChar,
                  })}
                </div>
              );
            })}
          </div>
        ) : result ? (
          <div className="mt-2 text-muted-foreground">
            {result.error === "NO_SUGGESTIONS" ? "No suggestions" : "Bad input"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { ZhuyinToFourWordsPhrase };


