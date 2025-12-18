import { wordToZhuyin } from "@/lib/word-to-zhuyin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get("word") ?? "";

  const result = await wordToZhuyin(word);

  if (result.ok) return Response.json(result, { status: 200 });

  const status =
    result.error === "BAD_INPUT"
      ? 400
      : result.error === "NOT_FOUND"
      ? 404
      : 502;

  return Response.json(result, { status });
}


