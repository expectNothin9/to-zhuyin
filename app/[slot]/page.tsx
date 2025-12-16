import { ToZhuyin } from "@/components/to-zhuyin";

export default async function Page({
  params,
}: {
  params: Promise<{ slot: string }>;
}) {
  const { slot } = await params;
  let decodedSlot = slot;
  try {
    decodedSlot = decodeURIComponent(slot);
  } catch {
    // If it's already decoded or malformed, fall back to the raw value.
  }
  return <ToZhuyin preset={decodedSlot} />;
}
