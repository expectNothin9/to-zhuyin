export function stripZhuyinToneMarks(s: string): string {
  // Tone marks used by Zhuyin:
  // ˙ (neutral), ˊ (2), ˇ (3), ˋ (4)
  return s.replace(/[˙ˊˇˋ]/g, "");
}


