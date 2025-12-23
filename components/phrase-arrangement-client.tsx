"use client";

import dynamic from "next/dynamic";

const PhraseArrangement = dynamic(
  () =>
    import("@/components/phrase-arrangement").then((m) => m.PhraseArrangement),
  { ssr: false }
);

export function PhraseArrangementClient(props: { p?: string; m?: string }) {
  return <PhraseArrangement {...props} />;
}
