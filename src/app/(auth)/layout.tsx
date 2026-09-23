import { TokenCoin, Wordmark } from "@/components/shared/Brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh bg-leaf text-paper lg:grid-cols-[1.1fr_1fr]">
      {/* Leaf veins */}
      <svg className="pointer-events-none absolute inset-0 size-full opacity-[0.09]" viewBox="0 0 400 800" preserveAspectRatio="none" aria-hidden>
        <path d="M-20 700 C 120 560, 260 420, 440 80" stroke="white" strokeWidth="2" fill="none" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${40 + i * 60} ${650 - i * 90} C ${60 + i * 60} ${700 - i * 80}, ${80 + i * 62} ${760 - i * 60}, ${90 + i * 64} 820`} stroke="white" strokeWidth="1.2" fill="none" />
        ))}
      </svg>

      <section className="relative flex flex-col justify-between px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-8 sm:px-10 lg:py-12">
        <Wordmark className="text-lg text-paper" />
        <div className="py-8 lg:py-0">
          <h1 className="max-w-md font-display text-[2.6rem] leading-[0.95] font-extrabold sm:text-6xl">
            Skip the rush. <span className="text-turmeric">Eat on time.</span>
          </h1>
          <p className="mt-4 max-w-sm text-base text-paper/80">
            Order ahead, confirm with a code, and watch your token go from kitchen to counter live.
          </p>
        </div>
        <TokenCoin className="absolute right-6 bottom-6 hidden size-40 text-[26px] lg:flex" />
      </section>

      <section className="relative flex items-start justify-center rounded-t-[2rem] bg-background px-5 pt-8 pb-[max(env(safe-area-inset-bottom),2rem)] text-foreground lg:items-center lg:rounded-none">
        <div className="w-full max-w-sm animate-rise">{children}</div>
      </section>
    </main>
  );
}
