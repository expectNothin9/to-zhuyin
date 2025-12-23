import { ZhuyinToFourWordsPhrase } from "@/components/zhuyin-to-four-words-phrase";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold tracking-tight">
        Zhuyin → 4-word phrases
      </h1>
      <ZhuyinToFourWordsPhrase />
    </main>
  );
}


