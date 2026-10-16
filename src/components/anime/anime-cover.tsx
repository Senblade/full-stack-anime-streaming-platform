import { cn } from "@/lib/utils";

export type CoverSource = {
  title: string;
  artKey: string;
  hueShift: number;
  accentColor?: string;
  titleJapanese?: string;
};

export function coverStyle(source: Pick<CoverSource, "hueShift">) {
  return { filter: `hue-rotate(${source.hueShift}deg) saturate(1.05)` };
}

export function AnimeCover({
  anime,
  className,
  showTitle = true,
  sizes,
  priority,
  rounded = "rounded-2xl",
}: {
  anime: CoverSource;
  className?: string;
  showTitle?: boolean;
  sizes?: string;
  priority?: boolean;
  rounded?: string;
}) {
  return (
    <div className={cn("relative aspect-[2/3] w-full overflow-hidden bg-surface-2", rounded, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/covers/${anime.artKey}.jpg`}
        alt=""
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        style={coverStyle(anime)}
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      {showTitle && (
        <div className="absolute inset-x-0 bottom-0 p-3">
          {anime.titleJapanese && <p className="truncate text-[10px] text-white/60">{anime.titleJapanese}</p>}
          <p className="line-clamp-2 text-sm font-bold leading-tight text-white drop-shadow">{anime.title}</p>
        </div>
      )}
    </div>
  );
}

export function AnimeBackdrop({ anime, className }: { anime: CoverSource; className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/covers/${anime.artKey}.jpg`} alt="" className="h-full w-full object-cover object-center opacity-60" style={coverStyle(anime)} draggable={false} />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-bg/40" />
    </div>
  );
}
