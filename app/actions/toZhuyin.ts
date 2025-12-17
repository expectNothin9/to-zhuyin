"use server";

export type ToZhuyinOk = {
  ok: true;
  word: string;
  zhuyin: string[];
  bestGuess: string | null;
};

export type ToZhuyinErr = {
  ok: false;
  word: string;
  error: "BAD_INPUT" | "NOT_FOUND" | "UPSTREAM_ERROR";
};

export type ToZhuyinResult = ToZhuyinOk | ToZhuyinErr;

export type PhraseMatch = {
  char: string;
  positions: number[];
};

export type PhraseSuggestion = {
  id: string;
  text: string;
  matches: PhraseMatch[];
};

export type SuggestPhrasesOk = {
  ok: true;
  word: string;
  zhuyin: string[];
  bestGuess: string | null;
  keyNoTone: string | null;
  suggestions: PhraseSuggestion[];
};

export type SuggestPhrasesErr = {
  ok: false;
  word: string;
  error:
    | "BAD_INPUT"
    | "NOT_FOUND"
    | "UPSTREAM_ERROR"
    | "NO_BEST_GUESS"
    | "NO_SUGGESTIONS";
};

export type SuggestPhrasesResult = SuggestPhrasesOk | SuggestPhrasesErr;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function uniqPreserveOrder(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function normalizeMoedictZhuyin(raw: string): string {
  // Moedict sometimes prefixes zhuyin with fullwidth parenthetical annotations like:
  // "（`語音~）ㄨㄛˇ" -> "ㄨㄛˇ"
  let s = raw.trim();
  // Strip one or more leading "（...）" blocks.
  // Note: uses fullwidth parens and fullwidth close-paren "）".
  s = s.replace(/^(?:（[^）]*）\s*)+/g, "");
  return s.trim();
}

function extractZhuyinFromMoedictJson(json: unknown): string[] {
  if (!isRecord(json)) return [];
  const h = json.h;
  if (!Array.isArray(h)) return [];

  const zhuyin: string[] = [];
  for (const entry of h) {
    if (!isRecord(entry)) continue;
    const b = entry.b;
    if (typeof b === "string" && b.trim()) {
      const cleaned = normalizeMoedictZhuyin(b);
      if (cleaned) zhuyin.push(cleaned);
    }
  }
  return uniqPreserveOrder(zhuyin);
}

function stripZhuyinToneMarks(s: string): string {
  // Tone marks used by Zhuyin:
  // ˙ (neutral), ˊ (2), ˇ (3), ˋ (4)
  return s.replace(/[˙ˊˇˋ]/g, "");
}

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

export async function toZhuyin(word: string): Promise<ToZhuyinResult> {
  const cleaned = word.trim();
  if (!cleaned) return { ok: false, word, error: "BAD_INPUT" };
  if (cleaned.length > 64) return { ok: false, word, error: "BAD_INPUT" };

  const url = `https://www.moedict.tw/a/${encodeURIComponent(cleaned)}.json`;

  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate: 60 * 60 },
      headers: { Accept: "application/json" },
    });
  } catch {
    return { ok: false, word: cleaned, error: "UPSTREAM_ERROR" };
  }

  if (res.status === 404)
    return { ok: false, word: cleaned, error: "NOT_FOUND" };
  if (!res.ok) return { ok: false, word: cleaned, error: "UPSTREAM_ERROR" };

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, word: cleaned, error: "UPSTREAM_ERROR" };
  }

  const zhuyin = extractZhuyinFromMoedictJson(json);
  if (zhuyin.length === 0)
    return { ok: false, word: cleaned, error: "NOT_FOUND" };

  return {
    ok: true,
    word: cleaned,
    zhuyin,
    bestGuess: zhuyin[0] ?? null,
  };
}

export async function suggestFourCharPhrases(
  raw: string
): Promise<SuggestPhrasesResult> {
  const cleaned = raw.trim();
  if (!cleaned) return { ok: false, word: raw, error: "BAD_INPUT" };
  if (cleaned.length !== 1)
    return { ok: false, word: cleaned, error: "BAD_INPUT" };

  const zh = await toZhuyin(cleaned);
  if (!zh.ok) return zh;

  const best = zh.bestGuess;
  if (!best) {
    return { ok: false, word: zh.word, error: "NO_BEST_GUESS" };
  }

  const keyNoTone = stripZhuyinToneMarks(best).trim();
  if (!keyNoTone) {
    return { ok: false, word: zh.word, error: "NO_BEST_GUESS" };
  }

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
      word: zh.word,
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
      word: zh.word,
      error: "NO_SUGGESTIONS",
    };
  }

  return {
    ok: true,
    word: zh.word,
    zhuyin: zh.zhuyin,
    bestGuess: zh.bestGuess,
    keyNoTone,
    suggestions,
  };
}
