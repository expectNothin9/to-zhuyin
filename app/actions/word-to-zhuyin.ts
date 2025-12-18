"use server";

import type { ToZhuyinResult } from "@/lib/word-to-zhuyin";
import { wordToZhuyin as wordToZhuyinImpl } from "@/lib/word-to-zhuyin";

export type { ToZhuyinOk, ToZhuyinErr, ToZhuyinResult } from "@/lib/word-to-zhuyin";

export async function wordToZhuyin(word: string): Promise<ToZhuyinResult> {
  return wordToZhuyinImpl(word);
}


