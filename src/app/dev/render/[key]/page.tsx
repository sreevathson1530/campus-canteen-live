import { notFound } from "next/navigation";
import { StillRenderer } from "./StillRenderer";

/** Dev-only: renders one dish on a transparent canvas for scripts/render-stills.ts. */
export default async function RenderPage({ params }: { params: Promise<{ key: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { key } = await params;
  return <StillRenderer modelKey={key} />;
}
