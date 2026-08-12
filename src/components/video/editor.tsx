"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { renderFrame, type RenderOptions } from "@/lib/video/render";
import { VIDEO_FORMATS, formatBySlug, type SceneSource } from "@/lib/video/scenes";
import { RATIOS, buildTimeline, sceneAt, type RatioKey } from "@/lib/video/timeline";

const FPS = 30;

export function VideoEditor({ source }: { source: SceneSource }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const [formatSlug, setFormatSlug] = useState(VIDEO_FORMATS[0].slug);
  const [ratio, setRatio] = useState<RatioKey>("9:16");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showMark, setShowMark] = useState(true);
  const [seconds, setSeconds] = useState(VIDEO_FORMATS[0].defaultSeconds);
  const [ms, setMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const format = useMemo(() => formatBySlug(formatSlug), [formatSlug]);
  const scenes = useMemo(() => format.build(source), [format, source]);
  const timeline = useMemo(() => {
    try {
      return buildTimeline(scenes, seconds);
    } catch {
      return buildTimeline(scenes, format.defaultSeconds);
    }
  }, [scenes, seconds, format.defaultSeconds]);

  const totalMs = seconds * 1000;
  const options: RenderOptions = useMemo(
    () => ({ ratio, theme, showMark }),
    [ratio, theme, showMark],
  );

  const paint = useCallback(
    (at: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      renderFrame(ctx, { timeline, ms: at, options });
    },
    [timeline, options],
  );

  useEffect(() => {
    paint(ms);
  }, [paint, ms]);

  useEffect(() => {
    if (!playing) return;

    startedAtRef.current = performance.now() - ms;
    const step = () => {
      const elapsed = performance.now() - startedAtRef.current;
      if (elapsed >= totalMs) {
        setMs(totalMs);
        setPlaying(false);
        return;
      }
      setMs(elapsed);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // ms is deliberately not a dependency: it changes every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, totalMs]);

  const currentScene = sceneAt(timeline, ms);

  async function record() {
    const canvas = canvasRef.current;
    if (!canvas || recording) return;

    if (typeof MediaRecorder === "undefined") {
      setStatus("This browser cannot record a canvas. Chrome and Edge can.");
      return;
    }

    const types = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) {
      setStatus("This browser cannot record webm. Try Chrome.");
      return;
    }

    setRecording(true);
    setPlaying(false);
    setStatus("Recording. Leave this tab in front until it finishes.");

    const stream = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const done = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start();

    const startedAt = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - startedAt;
        if (elapsed >= totalMs) {
          paint(totalMs);
          resolve();
          return;
        }
        paint(elapsed);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    recorder.stop();
    await done;

    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voxclip-${format.slug}-${ratio.replace(":", "x")}.webm`;
    a.click();
    URL.revokeObjectURL(url);

    setRecording(false);
    setMs(0);
    setStatus("Downloaded. It is a webm, which every social platform accepts.");
  }

  const { width, height } = RATIOS[ratio];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div className="rounded-xl border border-line bg-paper p-4">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            aria-label={`Video preview, ${format.name}, ${ratio}`}
            className="mx-auto block h-auto w-full max-w-[320px] rounded-lg shadow-sm"
          />
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (ms >= totalMs) setMs(0);
                setPlaying((p) => !p);
              }}
              disabled={recording}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium disabled:opacity-60"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setMs(0);
              }}
              disabled={recording}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm disabled:opacity-60"
            >
              Restart
            </button>
            <span className="font-[family-name:var(--font-mono)] text-xs text-ink-muted">
              {(ms / 1000).toFixed(1)}s / {seconds.toFixed(1)}s
            </span>
          </div>

          <div>
            <label htmlFor="scrub" className="sr-only">
              Scrub the timeline
            </label>
            <input
              id="scrub"
              type="range"
              min={0}
              max={totalMs}
              step={1000 / FPS}
              value={ms}
              disabled={recording}
              onChange={(e) => {
                setPlaying(false);
                setMs(Number(e.target.value));
              }}
              className="w-full"
            />
          </div>

          <ol className="flex flex-wrap gap-1.5 text-xs">
            {timeline.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setMs(s.startMs);
                  }}
                  className={`rounded-full border px-2.5 py-1 ${
                    currentScene?.id === s.id
                      ? "border-teal-deep bg-teal-wash text-teal-deep"
                      : "border-line bg-surface text-ink-muted"
                  }`}
                >
                  {s.id} · {(s.durationMs / 1000).toFixed(1)}s
                </button>
              </li>
            ))}
          </ol>

          {currentScene?.note ? (
            <p className="rounded-lg bg-amber-wash px-3 py-2 text-xs text-amber">
              {currentScene.note}
            </p>
          ) : null}
        </div>
      </div>

      <aside className="space-y-4">
        <div>
          <label htmlFor="format" className="block text-sm font-medium">
            Format
          </label>
          <select
            id="format"
            value={formatSlug}
            onChange={(e) => {
              const next = formatBySlug(e.target.value);
              setFormatSlug(next.slug);
              setSeconds(next.defaultSeconds);
              setMs(0);
              setPlaying(false);
            }}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            {VIDEO_FORMATS.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-muted">{format.intent}</p>
        </div>

        {format.needsRealCapture ? (
          <p className="rounded-lg bg-amber-wash px-3 py-2 text-xs text-amber">
            This format is not finished without a real screen recording. The text
            frames it; it does not stand in for it. A drawn interface would be a
            picture of an app that does not exist.
          </p>
        ) : null}

        <div>
          <label htmlFor="ratio" className="block text-sm font-medium">
            Shape
          </label>
          <select
            id="ratio"
            value={ratio}
            onChange={(e) => setRatio(e.target.value as RatioKey)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            <option value="9:16">9:16, vertical</option>
            <option value="1:1">1:1, square</option>
            <option value="16:9">16:9, wide</option>
          </select>
        </div>

        <div>
          <label htmlFor="seconds" className="block text-sm font-medium">
            Length: {seconds.toFixed(1)}s
          </label>
          <input
            id="seconds"
            type="range"
            min={4}
            max={30}
            step={0.5}
            value={seconds}
            onChange={(e) => {
              setSeconds(Number(e.target.value));
              setMs(0);
            }}
            className="mt-1 w-full"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Canvas</legend>
          <div className="mt-1 flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                aria-pressed={theme === t}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  theme === t
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface text-ink-muted"
                }`}
              >
                {t === "light" ? "Paper" : "Canvas dark"}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showMark}
            onChange={(e) => setShowMark(e.target.checked)}
          />
          Show the mark
        </label>

        <p className="text-xs text-ink-muted">
          There is no accent picker. Teal is one element per frame and the
          renderer places it. That is the whole colour system.
        </p>

        <div className="border-t border-line pt-4">
          <button
            type="button"
            onClick={record}
            disabled={recording}
            className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {recording ? "Recording" : "Render and download"}
          </button>
          {status ? (
            <p role="status" className="mt-2 text-xs text-ink-muted">
              {status}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
