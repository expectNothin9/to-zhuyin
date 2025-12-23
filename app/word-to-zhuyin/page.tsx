import { WordToZhuyin } from "@/components/word-to-zhuyin";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold tracking-tight">Word → Zhuyin</h1>
      <WordToZhuyin />
    </main>
  );
}


