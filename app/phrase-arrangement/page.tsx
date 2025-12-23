import { PhraseArrangement } from "@/components/phrase-arrangement";

type PageProps = {
  // Next.js 15+ makes dynamic APIs async; keep this compatible with both shapes.
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function getOne(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function Page({ searchParams }: PageProps) {
  const sp = await Promise.resolve(searchParams);
  const p = getOne(sp?.p);
  const m = getOne(sp?.m);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold tracking-tight">
        Phrase arrangement
      </h1>
      <PhraseArrangement p={p} m={m} />
    </main>
  );
}
