"use server";

export type PhraseMatch = {
  char: string;
  positions: number[];
};

export type PhraseSuggestion = {
  id: string;
  text: string;
  matches: PhraseMatch[];
};

export type SuggestFourCharPhrasesOk = {
  ok: true;
  keyNoTone: string;
  suggestions: PhraseSuggestion[];
};

export type SuggestFourCharPhrasesErr = {
  ok: false;
  keyNoTone: string;
  error: "BAD_INPUT" | "NO_SUGGESTIONS";
};

export type SuggestFourCharPhrasesResult =
  | SuggestFourCharPhrasesOk
  | SuggestFourCharPhrasesErr;

type Phrase = {
  id: string;
  text: string;
  readings?: string[];
  readingKeySyllables?: string[];
};

type ReadingIndexEntry = {
  phraseId: string;
  matches: PhraseMatch[];
};

type ReadingIndex = Record<string, ReadingIndexEntry[]>;

export async function suggestFourCharPhrases(
  keyNoToneRaw: string
): Promise<SuggestFourCharPhrasesResult> {
  const keyNoTone = keyNoToneRaw.trim();

  // Expect Zhuyin *without* tone marks.
  if (!keyNoTone) return { ok: false, keyNoTone: keyNoToneRaw, error: "BAD_INPUT" };
  if (keyNoTone.length > 64)
    return { ok: false, keyNoTone, error: "BAD_INPUT" };
  if (/[˙ˊˇˋ]/.test(keyNoTone))
    return { ok: false, keyNoTone, error: "BAD_INPUT" };
  if (!/[\u3105-\u3129]/.test(keyNoTone))
    return { ok: false, keyNoTone, error: "BAD_INPUT" };

  const [{ default: phrases }, { default: readingIndex }] = await Promise.all([
    import("@/data/phrases.json"),
    import("@/data/readingIndex.json"),
  ]);

  const phraseList = (phrases as Phrase[]) ?? [];
  const index = (readingIndex as ReadingIndex) ?? {};

  const byId = new Map<string, Phrase>();
  for (const p of phraseList) byId.set(p.id, p);

  const entries = index[keyNoTone] ?? [];
  if (entries.length === 0) {
    return {
      ok: false,
      keyNoTone,
      error: "NO_SUGGESTIONS",
    };
  }

  const suggestions: PhraseSuggestion[] = [];
  for (const entry of entries) {
    const phrase = byId.get(entry.phraseId);
    if (!phrase) continue;
    suggestions.push({
      id: phrase.id,
      text: phrase.text,
      matches: entry.matches ?? [],
    });
  }

  if (suggestions.length === 0) {
    return {
      ok: false,
      keyNoTone,
      error: "NO_SUGGESTIONS",
    };
  }

  return {
    ok: true,
    keyNoTone,
    suggestions,
  };
}


