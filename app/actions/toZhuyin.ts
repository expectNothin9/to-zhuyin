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

function extractZhuyinFromMoedictJson(json: unknown): string[] {
  if (!isRecord(json)) return [];
  const h = json.h;
  if (!Array.isArray(h)) return [];

  const zhuyin: string[] = [];
  for (const entry of h) {
    if (!isRecord(entry)) continue;
    const b = entry.b;
    if (typeof b === "string" && b.trim()) zhuyin.push(b.trim());
  }
  return uniqPreserveOrder(zhuyin);
}

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
