"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

function firstCodepoint(value: string) {
  return Array.from(value).slice(0, 1).join("");
}

function ToZhuyin() {
  const [value, setValue] = React.useState("");
  const isComposingRef = React.useRef(false);

  return (
    <div className="flex flex-col gap-2 p-4">
      <Input
        value={value}
        onChange={(e) => {
          const next = e.currentTarget.value;
          setValue(isComposingRef.current ? next : firstCodepoint(next));
        }}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          setValue(firstCodepoint(e.currentTarget.value));
        }}
        maxLength={1}
        aria-label="Character"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        inputMode="text"
        className="size-16 rounded-xl p-0 text-center text-4xl leading-none md:text-4xl"
      />
    </div>
  );
}

export { ToZhuyin };
