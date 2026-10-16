"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Pause, Play, RotateCcw, RotateCw, SkipBack, SkipForward, Volume2, VolumeX, Radio, Loader2 } from "lucide-react";
import { ART_VIDEOS } from "@/lib/constants";
import type { SerializedParty } from "@/lib/parties";
import { cn, formatDuration } from "@/lib/utils";
import { coverStyle } from "@/components/anime/anime-cover";
import { Button } from "@/components/ui/button";

export type PlaybackControl = { state?: "playing" | "paused"; position?: number; episode?: number };

export function computePosition(party: Pick<SerializedParty, "playbackState" | "playbackPosition" | "playbackUpdatedAt">, serverOffset: number, now: number, max: number) {
  if (party.playbackState !== "playing") return Math.min(party.playbackPosition, max);
  const elapsed = (now + serverOffset - new Date(party.playbackUpdatedAt).getTime()) / 1000;
  return Math.min(max, party.playbackPosition + Math.max(0, elapsed));
}

export function PartyPlayer({
  party,
  serverOffset,
  isHost,
  isMember,
  onControl,
  floating,
  children,
}: {
  party: SerializedParty;
  serverOffset: number;
  isHost: boolean;
  isMember: boolean;
  onControl: (c: PlaybackControl) => void;
  floating: { id: number; emoji: string; x: number }[];
  children?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [clipDuration, setClipDuration] = useState<number | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [scrub, setScrub] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const duration = party.anime.episodeLength * 60;
  const live = party.status === "live";
  const playing = live && party.playbackState === "playing";
  const src = ART_VIDEOS[party.anime.artKey] ?? ART_VIDEOS.fantasy;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const position = useMemo(() => computePosition(party, serverOffset, now, duration), [party, serverOffset, now, duration]);
  const finished = position >= duration - 0.5;

  // Keep the <video> element in lockstep with the shared party clock.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || videoFailed) return;
    const clip = clipDuration ?? (Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null);
    if (clip) {
      const target = position % clip;
      if (Math.abs(v.currentTime - target) > 1.5 && !(clip - target < 1)) v.currentTime = target;
    }
    if (playing && !finished && isMember) {
      if (v.paused) {
        v.play()
          .then(() => setBlocked(false))
          .catch(() => setBlocked(true));
      }
    } else if (!v.paused) {
      v.pause();
    }
  }, [position, playing, finished, clipDuration, videoFailed, isMember]);

  // Host: auto-pause at the end of the episode.
  useEffect(() => {
    if (isHost && playing && finished) onControl({ state: "paused", position: duration });
  }, [isHost, playing, finished, duration, onControl]);

  const bumpControls = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2800);
  };

  const togglePlay = () => {
    if (!isHost || !live) return;
    if (finished) onControl({ state: "playing", position: 0 });
    else onControl({ state: playing ? "paused" : "playing", position });
  };

  const seekTo = (sec: number) => onControl({ position: Math.max(0, Math.min(duration, sec)) });

  // Keyboard shortcuts for the host.
  useEffect(() => {
    if (!isHost || !live) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.code === "Space" || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight" || e.key === "l") seekTo(position + 10);
      else if (e.key === "ArrowLeft" || e.key === "j") seekTo(position - 10);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, live, playing, position, finished]);

  const shown = scrub ?? position;
  const pct = duration > 0 ? (shown / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="group/player relative aspect-video w-full select-none overflow-hidden bg-black lg:rounded-2xl"
      onMouseMove={bumpControls}
      onTouchStart={bumpControls}
      onClick={() => {
        if (isHost) togglePlay();
      }}
    >
      {/* Media layer */}
      {!videoFailed ? (
        <video
          ref={videoRef}
          src={src}
          loop
          muted={muted}
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          onLoadedMetadata={(e) => {
            setClipDuration(e.currentTarget.duration);
            setBuffering(false);
          }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/covers/${party.anime.artKey}.jpg`} alt="" className={cn("h-full w-full object-cover", playing && "animate-[float_14s_ease-in-out_infinite] scale-110")} style={coverStyle(party.anime)} />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}

      {/* Floating reactions */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floating.map((f) => (
          <span key={f.id} className="absolute bottom-16 text-3xl drop-shadow-lg" style={{ left: `${f.x}%`, animation: "float-up 2.6s ease-out forwards" }}>
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Status overlays */}
      {party.status === "scheduled" && (
        <Overlay>
          <Radio className="h-8 w-8 text-amber-300" />
          <p className="text-lg font-semibold">Lobby is open</p>
          <p className="max-w-sm text-sm text-white/70">{isHost ? "Go live when everyone is here. Playback stays in sync for all guests." : "Waiting for the host to start the stream. Say hi in chat while you wait."}</p>
          {children}
        </Overlay>
      )}
      {party.status === "ended" && (
        <Overlay>
          <p className="text-lg font-semibold">This party has ended</p>
          <p className="max-w-sm text-sm text-white/70">Thanks for watching together. The chat log is preserved below.</p>
          {children}
        </Overlay>
      )}
      {live && !isMember && (
        <Overlay>
          <p className="text-lg font-semibold">Join to watch in sync</p>
          <p className="max-w-sm text-sm text-white/70">Take a seat to see the stream, chat, and react with everyone else.</p>
          {children}
        </Overlay>
      )}
      {live && isMember && finished && (
        <Overlay>
          <p className="text-lg font-semibold">Episode {party.episode} finished</p>
          {isHost ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onControl({ state: "playing", position: 0 });
                }}
              >
                <RotateCcw className="h-4 w-4" /> Replay
              </Button>
              {party.episode < party.anime.episodes && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onControl({ episode: party.episode + 1 });
                  }}
                >
                  Next episode <SkipForward className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/70">Waiting for the host to queue the next episode.</p>
          )}
        </Overlay>
      )}
      {live && isMember && !finished && blocked && playing && (
        <Overlay>
          <Button
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              videoRef.current?.play().then(() => setBlocked(false)).catch(() => undefined);
            }}
          >
            <Play className="h-5 w-5" /> Tap to start the stream
          </Button>
        </Overlay>
      )}
      {live && isMember && !playing && !finished && !blocked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/50 backdrop-blur">
            <Pause className="h-8 w-8 text-white" />
          </div>
        </div>
      )}
      {live && isMember && playing && buffering && !videoFailed && !blocked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      {/* Top gradient + meta */}
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity", showControls ? "opacity-100" : "opacity-0")}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{party.anime.title}</p>
            <p className="text-xs text-white/70">
              Episode {party.episode} of {party.anime.episodes}
            </p>
          </div>
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
            </span>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className={cn("absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-3 pt-10 transition-opacity", showControls || !playing ? "opacity-100" : "opacity-0")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mb-2 h-1.5 w-full rounded-full bg-white/20">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand to-brand-2" style={{ width: `${pct}%` }} />
          {isHost && live && (
            <input
              type="range"
              min={0}
              max={duration}
              step={1}
              value={Math.round(shown)}
              onChange={(e) => setScrub(Number(e.target.value))}
              onPointerUp={() => {
                if (scrub != null) seekTo(scrub);
                setScrub(null);
              }}
              onKeyUp={() => {
                if (scrub != null) seekTo(scrub);
                setScrub(null);
              }}
              aria-label="Seek"
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
            />
          )}
        </div>
        <div className="flex items-center gap-2 text-white">
          {isHost && live ? (
            <>
              <IconBtn label="Previous episode" disabled={party.episode <= 1} onClick={() => onControl({ episode: party.episode - 1 })}>
                <SkipBack className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Back 10 seconds" onClick={() => seekTo(position - 10)}>
                <RotateCcw className="h-4 w-4" />
              </IconBtn>
              <button onClick={togglePlay} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:scale-105" aria-label={playing ? "Pause for everyone" : "Play for everyone"}>
                {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
              <IconBtn label="Forward 10 seconds" onClick={() => seekTo(position + 10)}>
                <RotateCw className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Next episode" disabled={party.episode >= party.anime.episodes} onClick={() => onControl({ episode: party.episode + 1 })}>
                <SkipForward className="h-4 w-4" />
              </IconBtn>
            </>
          ) : (
            <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
              {playing ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {live ? "Host controls playback" : party.status === "scheduled" ? "Not started" : "Ended"}
            </span>
          )}
          <span className="ml-1 text-xs tabular-nums text-white/80">
            {formatDuration(shown)} <span className="text-white/40">/ {formatDuration(duration)}</span>
          </span>
          <div className="ml-auto flex items-center gap-1">
            <IconBtn label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </IconBtn>
            <IconBtn
              label="Fullscreen"
              onClick={() => {
                const el = containerRef.current;
                if (!el) return;
                if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
                else el.requestFullscreen?.().catch(() => undefined);
              }}
            >
              <Maximize2 className="h-4 w-4" />
            </IconBtn>
          </div>
        </div>
      </div>

      <style>{`@keyframes float-up { 0% { transform: translateY(0) scale(0.8); opacity: 0; } 15% { opacity: 1; transform: translateY(-20px) scale(1.1);} 100% { transform: translateY(-240px) scale(1); opacity: 0; } }`}</style>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/65 p-6 text-center text-white backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 disabled:opacity-30">
      {children}
    </button>
  );
}
