import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PHOTO_CREDITS } from "@/lib/photo-credits";
import { Wordmark } from "@/components/shared/Brand";

export const metadata: Metadata = { title: "Photo credits" };

/** Public page: CC BY-SA requires crediting each photo's author and licence. */
export default function CreditsPage() {
  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-12">
      <div className="flex items-center justify-between">
        <Wordmark className="text-base" />
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Back
        </Link>
      </div>
      <div>
        <h1 className="font-display text-3xl font-extrabold">Photo credits</h1>
        <p className="mt-1 text-muted-foreground">
          Food photos are from Wikimedia Commons, used under their Creative Commons licences. They were cropped and re-encoded for
          the menu. The 3D dishes are original models made for this app.
        </p>
      </div>
      <ul className="grid gap-2">
        {PHOTO_CREDITS.map((c) => (
          <li key={c.key} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- small static WebP thumbnails */}
            <img src={`/photos/${c.key}.webp`} alt="" className="size-14 shrink-0 rounded-xl object-cover" loading="lazy" />
            <div className="min-w-0 text-sm">
              <p className="font-bold">{c.dish}</p>
              <p className="text-muted-foreground">
                <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  {c.file}
                </a>{" "}
                by {c.author} ·{" "}
                {c.licenseUrl ? (
                  <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer license" className="font-semibold text-leaf underline-offset-4 hover:underline">
                    {c.license}
                  </a>
                ) : (
                  c.license
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
