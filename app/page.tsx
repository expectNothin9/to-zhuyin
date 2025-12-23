import Link from "next/link";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/word-to-zhuyin"
          className="underline underline-offset-4 text-muted-foreground hover:text-foreground"
        >
          /word-to-zhuyin
        </Link>
        <Link
          href="/zhuyin-to-four-word-phrases"
          className="underline underline-offset-4 text-muted-foreground hover:text-foreground"
        >
          /zhuyin-to-four-word-phrases
        </Link>
      </div>
    </main>
  );
}
