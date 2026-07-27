import { cn } from "@/lib/utils";

/** Seamless horizontal marquee band (duplicated track for an infinite loop). */
export function Marquee({
  items,
  className,
  fast = false,
}: {
  items: string[];
  className?: string;
  fast?: boolean;
}) {
  const track = [...items, ...items];
  return (
    <div className={cn("relative flex overflow-hidden", className)}>
      <div className={cn("flex w-max", fast ? "animate-marquee-fast" : "animate-marquee")}>
        {track.map((text, i) => (
          <span key={i} className="flex items-center">
            <span className="px-6 text-sm font-semibold uppercase tracking-[0.22em] text-ink-soft">
              {text}
            </span>
            <span className="text-brand">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
