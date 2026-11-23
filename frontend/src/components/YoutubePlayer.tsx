import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { loadYoutubeIframeApi, type YouTubePlayer as YtPlayer } from '../lib/youtubePlayerApi';
import { formatTime } from '../lib/formatTime';

interface YoutubePlayerProps {
  youtubeId: string;
  title: string;
  /** Fired at most once per whole-percent change in real playback position
   * (current/duration from the IFrame API, not a simulated timer) — lets the
   * caller persist actual watch progress instead of a manual "mark as
   * watched" click. */
  onProgress?: (pct: number) => void;
  /** Fired once per video load, the moment playback reaches the same
   * near-the-end point that already triggers our own end-screen cover (see
   * END_SCREEN_BUFFER_SECONDS) — i.e. "finished it", not literally YouTube's
   * own ENDED state, since we deliberately stop just short of that. */
  onCompleted?: () => void;
  /** Fired every poll tick (~250ms) while actually playing, with the real
   * wall-clock seconds elapsed since the previous tick — lets the caller
   * accumulate genuine screen time instead of assuming the video plays at
   * exactly 1x with no pauses/backgrounding. Never fired while paused. */
  onElapsedSeconds?: (deltaSeconds: number) => void;
  /** Start playback at this position instead of 0 — used when the caller
   * jumps in from a saved note timestamp (see AnimationsPage.tsx's
   * jumpToNote). Only consulted when the player is first constructed for a
   * given `youtubeId`; changing it afterward has no effect (use the
   * imperative `seekTo` via ref for that). */
  startAtSeconds?: number;
}

/** Imperative handle so a caller (AnimationsPage's "add note at current
 * time" / "jump to this note" UI) can read the real playback position and
 * command a seek without this component re-rendering on every tick. */
export interface YoutubePlayerHandle {
  getCurrentTime: () => number;
  seekTo: (seconds: number) => void;
}

// YouTube renders its own branded "end screen" (logo + suggested videos)
// inside the iframe during the final stretch of any video. There's no
// embed-API parameter that suppresses this — confirmed both by testing and
// by Google's own player-parameters docs, which state the channel avatar and
// title "will always display ... when playback ends", regardless of
// `controls`. Since that overlay lives inside the same cross-origin surface
// as the video itself, the only way to never show it is to stop before
// YouTube draws it and cover the frame ourselves. This is a heuristic
// (YouTube doesn't expose exactly when it starts), tuned a little past what
// was observed in testing.
const END_SCREEN_BUFFER_SECONDS = 6;

// Symmetric issue at the start: YouTube also paints its own branded title
// card (channel avatar/title, top-left) and a bottom info bar ("More
// videos" / YouTube wordmark / fullscreen) for the first few seconds of any
// playback — confirmed by testing, happens on every fresh play (including a
// replay from 0), fades on its own after a few seconds. It renders on top of
// our semi-transparent control bar regardless of DOM order (only a fully
// opaque cover reliably blocks it, same as the end-screen fix), so we cover
// the whole frame — not just the control strip — until it's done.
const START_SCREEN_BUFFER_SECONDS = 3;

/**
 * Plays a YouTube video with YouTube's own control bar turned off
 * (`controls: 0`) — that bar is where the title/channel overlay, the "More
 * videos" end card, and the YouTube wordmark live, none of which this app
 * wants showing during playback. Removing it means we own play/pause, the
 * seek bar, mute and fullscreen ourselves via the IFrame Player API instead
 * of YouTube's UI — a blank `controls: 0` embed with no replacement controls
 * would otherwise be unusable (no way to pause, no way to replay once it ends).
 */
const YoutubePlayer = forwardRef<YoutubePlayerHandle, YoutubePlayerProps>(function YoutubePlayer(
  { youtubeId, title, onProgress, onCompleted, onElapsedSeconds, startAtSeconds },
  ref,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const pollRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number | null>(null);

  // Latest-value refs so the poll/state-change callbacks below always call
  // the current prop without needing them in effect dependency arrays (the
  // caller passes a fresh function identity every render).
  const onProgressRef = useRef(onProgress);
  const onCompletedRef = useRef(onCompleted);
  const onElapsedSecondsRef = useRef(onElapsedSeconds);
  useEffect(() => {
    onProgressRef.current = onProgress;
    onCompletedRef.current = onCompleted;
    onElapsedSecondsRef.current = onElapsedSeconds;
  }, [onProgress, onCompleted, onElapsedSeconds]);
  const lastReportedPctRef = useRef(-1);
  const completedFiredRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(startAtSeconds ?? 0);
  const [duration, setDuration] = useState(0);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
    seekTo: (seconds: number) => {
      const player = playerRef.current;
      if (!player) return;
      player.seekTo(seconds, true);
      setCurrentTime(seconds);
      setHasEnded(false);
      player.playVideo();
    },
  }), []);

  useEffect(() => {
    let cancelled = false;
    let player: YtPlayer | null = null;
    setIsPlaying(false);
    setHasEnded(false);
    setCurrentTime(startAtSeconds ?? 0);
    setDuration(0);
    lastReportedPctRef.current = -1;
    completedFiredRef.current = false;

    loadYoutubeIframeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      player = new YT.Player(mountRef.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          disablekb: 1,
          ...(startAtSeconds ? { start: Math.floor(startAtSeconds) } : {}),
        },
        events: {
          onReady: (e) => {
            playerRef.current = e.target;
            setDuration(e.target.getDuration());
            setIsMuted(e.target.isMuted());
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setHasEnded(false);
              setDuration(e.target.getDuration());
            } else if (e.data === YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (e.data === YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setHasEnded(true);
              if (!completedFiredRef.current) {
                completedFiredRef.current = true;
                onCompletedRef.current?.();
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      player?.destroy();
      playerRef.current = null;
    };
  }, [youtubeId]);

  useEffect(() => {
    if (!isPlaying) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      lastTickAtRef.current = null;
      return;
    }
    lastTickAtRef.current = Date.now();
    pollRef.current = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const now = Date.now();
      if (lastTickAtRef.current !== null) {
        onElapsedSecondsRef.current?.((now - lastTickAtRef.current) / 1000);
      }
      lastTickAtRef.current = now;
      const current = player.getCurrentTime();
      const total = player.getDuration();
      if (total > 0 && current >= total - END_SCREEN_BUFFER_SECONDS) {
        // Stop here, before YouTube's own end screen has a chance to draw —
        // see END_SCREEN_BUFFER_SECONDS above. This is also "completed" for
        // progress-tracking purposes — a real ENDED state would never fire
        // since we pause just short of it.
        player.pauseVideo();
        setHasEnded(true);
        setCurrentTime(total);
        if (!completedFiredRef.current) {
          completedFiredRef.current = true;
          onCompletedRef.current?.();
        }
        return;
      }
      setCurrentTime(current);
      if (total > 0) {
        const pct = Math.min(100, Math.round((current / total) * 100));
        if (pct !== lastReportedPctRef.current) {
          lastReportedPctRef.current = pct;
          onProgressRef.current?.(pct);
        }
      }
    }, 250);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [isPlaying]);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;
    if (hasEnded) {
      player.seekTo(0, true);
      player.playVideo();
      // Replayed from 0 — YouTube's start-of-playback branding flash fires
      // again, so reset currentTime synchronously instead of waiting for the
      // next poll tick, or showStartCover below would stay false for that
      // first ~250ms (stale currentTime left over from the end of playback).
      setCurrentTime(0);
      return;
    }
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
  }

  function toggleMute() {
    const player = playerRef.current;
    if (!player) return;
    if (isMuted) {
      player.unMute();
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  }

  function seek(seconds: number) {
    playerRef.current?.seekTo(seconds, true);
    setCurrentTime(seconds);
  }

  const showStartCover = isPlaying && currentTime < START_SCREEN_BUFFER_SECONDS;

  return (
    <div
      ref={wrapperRef}
      onClick={togglePlay}
      role="button"
      aria-label={isPlaying ? `${title} videosunu dayandır` : `${title} videosunu oynat`}
      className="relative size-full cursor-pointer bg-black"
    >
      <div className="pointer-events-none absolute inset-0 [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full">
        <div ref={mountRef} className="size-full" />
      </div>

      {hasEnded && (
        // Fully opaque, not a dim overlay — this has to completely hide the
        // iframe underneath (including any YouTube chrome already drawn on
        // it the instant we paused), not just darken it.
        <div className="absolute inset-0 flex items-center justify-center bg-navy-900">
          <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-purple-600 shadow-lg">
            <RotateCcw size={26} />
          </span>
        </div>
      )}

      {showStartCover && (
        // Same technique, mirrored at the start — see START_SCREEN_BUFFER_SECONDS
        // above. Fully opaque for the same reason: a semi-transparent cover
        // (like our own control bar's gradient) still lets YouTube's branding
        // paint through on top of it.
        <div className="absolute inset-0 bg-navy-900" />
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex cursor-default flex-col gap-1.5 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-10"
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Video mövqeyi"
          className="h-1 w-full cursor-pointer accent-purple-500"
        />
        <div className="flex items-center gap-3 text-white">
          <button onClick={togglePlay} aria-label={isPlaying ? 'Dayandır' : 'Oynat'}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button onClick={toggleMute} aria-label={isMuted ? 'Səsi aç' : 'Səsi bağla'}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <span className="text-caption tabular-nums text-white/90">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            onClick={() => wrapperRef.current?.requestFullscreen?.()}
            className="ml-auto"
            aria-label="Tam ekran"
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default YoutubePlayer;
