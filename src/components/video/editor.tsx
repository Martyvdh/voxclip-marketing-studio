"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ANIMATIONS } from "@/lib/video/animations";
import { ELEMENTS, ELEMENT_GROUPS, elementByKind } from "@/lib/video/elements";
import {
  deleteVideoProject,
  loadVideoProject,
  saveVideoProject,
  type SavedVideo,
} from "@/lib/video/actions";
import { renderFrame, type MediaSource } from "@/lib/video/render";
import {
  addClip,
  addElement,
  clipAt,
  removeElement,
  updateElement,
  duplicateClip,
  moveClip,
  newClip,
  removeClip,
  splitClip,
  timelineOf,
  totalSeconds,
  updateClip,
  type Clip,
  type Project,
} from "@/lib/video/project";
import { RATIOS, type RatioKey } from "@/lib/video/timeline";
import {
  ALL_STARTERS,
  starterBySlug,
  starterMeta,
  type StarterSource,
} from "@/lib/video/starters";
import { StarterBrowser } from "./starter-browser";

const FPS = 30;

export function VideoEditor({
  source,
  slug,
  saved,
}: {
  source: StarterSource;
  slug: string;
  saved: SavedVideo[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const mediaRef = useRef(new Map<string, MediaSource>());

  const [project, setProject] = useState<Project>(() => ALL_STARTERS[0].build(source));
  const [starterSlug, setStarterSlug] = useState(ALL_STARTERS[0].slug);
  const selectedStarter = starterBySlug(starterSlug);
  const [history, setHistory] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [ms, setMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string>("");
  const [saveName, setSaveName] = useState("");
  const [openId, setOpenId] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [paletteGroup, setPaletteGroup] = useState<string>(ELEMENT_GROUPS[0]);
  const [browsing, setBrowsing] = useState(false);

  const timeline = useMemo(() => timelineOf(project), [project]);
  const totalMs = Math.round(totalSeconds(project) * 1000);
  const current = useMemo(() => clipAt(project, ms), [project, ms]);
  const selected =
    project.clips.find((c) => c.id === selectedId) ?? project.clips[0] ?? null;

  /** Every edit goes through here, so undo is one stack and nothing is lost. */
  const edit = useCallback((next: (p: Project) => Project) => {
    setProject((prev) => {
      setHistory((h) => [...h.slice(-29), prev]);
      return next(prev);
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setProject(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);

  const paint = useCallback(
    (at: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const clip = clipAt(project, at);
      const media = clip?.media ? (mediaRef.current.get(clip.id) ?? null) : null;
      renderFrame(ctx, {
        clip,
        ratio: project.ratio,
        showMark: project.showMark,
        media,
        elapsedMs: at,
        totalMs: Math.round(totalSeconds(project) * 1000),
      });
    },
    [project],
  );

  useEffect(() => {
    paint(ms);
  }, [paint, ms]);

  // Keeps a clip's video element lined up with the playhead.
  useEffect(() => {
    const clip = current;
    if (!clip?.media || clip.media.kind !== "video") return;
    const el = mediaRef.current.get(clip.id) as HTMLVideoElement | undefined;
    if (!el) return;

    const into = (clip.progress * clip.durationMs) / 1000;
    if (playing || recording) {
      if (el.paused) void el.play().catch(() => undefined);
      if (Math.abs(el.currentTime - into) > 0.35) el.currentTime = into;
    } else {
      if (!el.paused) el.pause();
      if (Math.abs(el.currentTime - into) > 0.05) el.currentTime = into;
    }
  }, [current, playing, recording]);

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
    // ms changes every frame and must not restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, totalMs]);

  // Keyboard, the way an editor is actually used.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPlaying(false);
        setMs((v) => Math.max(0, v - (e.shiftKey ? 1000 : 1000 / FPS)));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPlaying(false);
        setMs((v) => Math.min(totalMs, v + (e.shiftKey ? 1000 : 1000 / FPS)));
      } else if (e.key === "s" && !e.metaKey && !e.ctrlKey) {
        edit((p) => splitClip(p, ms));
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalMs, ms, edit, undo]);

  function attachMedia(clip: Clip, file: File) {
    const url = URL.createObjectURL(file);
    const kind: "video" | "image" = file.type.startsWith("video") ? "video" : "image";

    if (kind === "video") {
      const el = document.createElement("video");
      el.src = url;
      el.muted = true;
      el.playsInline = true;
      el.preload = "auto";
      el.onloadeddata = () => {
        mediaRef.current.set(clip.id, el as unknown as MediaSource);
        paint(ms);
      };
    } else {
      const el = new Image();
      el.src = url;
      el.onload = () => {
        mediaRef.current.set(clip.id, el as unknown as MediaSource);
        paint(ms);
      };
    }

    edit((p) =>
      updateClip(p, clip.id, {
        media: { kind, url, name: file.name, fit: "cover", dim: 0.45 },
        theme: "media",
      }),
    );
  }

  async function record() {
    const canvas = canvasRef.current;
    if (!canvas || recording) return;

    if (typeof MediaRecorder === "undefined") {
      setStatus("This browser cannot record a canvas. Chrome and Edge can.");
      return;
    }
    const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
      (t) => MediaRecorder.isTypeSupported(t),
    );
    if (!mimeType) {
      setStatus("This browser cannot record webm. Try Chrome.");
      return;
    }

    setRecording(true);
    setPlaying(false);
    setStatus("Recording in real time. Keep this tab in front until it finishes.");

    const stream = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start();
    const began = performance.now();

    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - began;
        setMs(Math.min(elapsed, totalMs));
        paint(Math.min(elapsed, totalMs));
        if (elapsed >= totalMs) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    recorder.stop();
    await stopped;

    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voxclip-${project.ratio.replace(":", "x")}-${Math.round(totalMs / 1000)}s.webm`;
    a.click();
    URL.revokeObjectURL(url);

    setRecording(false);
    setMs(0);
    setStatus("Downloaded as webm. Every platform in the list accepts it.");
  }

  async function save() {
    const data = new FormData();
    data.set("slug", slug);
    data.set("name", saveName.trim() || `Video ${saved.length + 1}`);
    data.set("project", JSON.stringify(project));
    if (openId) data.set("id", openId);

    const result = await saveVideoProject({}, data);
    setSaveStatus(
      result.ok
        ? "Saved. Footage is not stored yet, so reopening asks for the files again."
        : (result.message ?? Object.values(result.errors ?? {})[0] ?? "Could not save."),
    );
  }

  async function open(id: string) {
    const loaded = await loadVideoProject(id);
    if (!loaded) {
      setSaveStatus("That video is gone.");
      return;
    }
    edit(() => loaded);
    setOpenId(id);
    setSaveName(saved.find((v) => v.id === id)?.name ?? "");
    setMs(0);
    setPlaying(false);
    setSaveStatus("Opened. Attach any footage again before rendering.");
  }

  const { width, height } = RATIOS[project.ratio];
  const previewMax = project.ratio === "9:16" ? 300 : project.ratio === "1:1" ? 380 : 520;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* preview */}
        <div>
          <div className="flex min-h-[380px] items-center justify-center rounded-xl border border-line bg-[#101319] p-5">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              aria-label={`Preview, ${project.ratio}`}
              style={{ maxWidth: previewMax }}
              className="h-auto w-full rounded-lg"
            />
          </div>

          {/* transport */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (ms >= totalMs) setMs(0);
                setPlaying((p) => !p);
              }}
              disabled={recording}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setMs(0);
              }}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={() => edit((p) => splitClip(p, ms))}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              title="Split the clip under the playhead (S)"
            >
              Split
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm disabled:opacity-50"
            >
              Undo
            </button>
            <span className="ml-auto font-[family-name:var(--font-mono)] text-xs text-ink-muted">
              {(ms / 1000).toFixed(2)}s / {(totalMs / 1000).toFixed(2)}s
            </span>
          </div>

          <p className="mt-1 text-xs text-ink-faint">
            Space plays. Arrows step a frame, with shift a second. S splits.
          </p>
        </div>

        {/* project settings */}
        <aside className="space-y-4">
          {/*
            A dropdown held twenty-three. It cannot hold a hundred and fifty:
            you only ever find what you already knew was in there. So the aside
            shows the current choice and opens a browser with families, search
            and cards. Applying stays a separate, deliberate click, because a
            starting point throws away what is on the timeline.
          */}
          <div>
            <span className="block text-sm font-medium">Start from</span>

            <button
              type="button"
              onClick={() => setBrowsing(true)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm hover:border-ink"
            >
              <span className="block font-medium">
                {selectedStarter ? selectedStarter.name : "Pick a starting point"}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                {ALL_STARTERS.length} to choose from — browse or search
              </span>
            </button>

            {selectedStarter ? (
              <p className="mt-1.5 text-xs text-ink-muted">
                {selectedStarter.intent}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => {
                if (!selectedStarter) return;
                edit(() => selectedStarter.build(source));
                setMs(0);
                setPlaying(false);
              }}
              className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-ink"
            >
              Use this starting point
            </button>
            <p className="mt-1 text-xs text-ink-faint">
              {selectedStarter
                ? (() => {
                    const meta = starterMeta(selectedStarter, source);
                    return meta.shotsToRecord > 0
                      ? `${meta.shotsToRecord} clip${meta.shotsToRecord === 1 ? "" : "s"} wait for your recording.`
                      : "No footage needed. Export it today.";
                  })()
                : "Replaces the timeline. Undo with ⌘Z."}
            </p>
          </div>

          <div>
            <label htmlFor="ratio" className="block text-sm font-medium">
              Shape
            </label>
            <select
              id="ratio"
              value={project.ratio}
              onChange={(e) =>
                edit((p) => ({ ...p, ratio: e.target.value as RatioKey }))
              }
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="9:16">9:16, vertical</option>
              <option value="1:1">1:1, square</option>
              <option value="16:9">16:9, wide</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={project.showMark}
              onChange={(e) => edit((p) => ({ ...p, showMark: e.target.checked }))}
            />
            Show the mark
          </label>

          <p className="text-xs text-ink-muted">
            There is no colour picker. Teal is one element per frame and the
            renderer places it. That is the whole colour system.
          </p>

          <div className="border-t border-line pt-4">
            <label htmlFor="save-name" className="block text-sm font-medium">
              Save this video
            </label>
            <input
              id="save-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Week 34, one place"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={save}
              className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium"
            >
              {openId ? "Save changes" : "Save"}
            </button>
            {saveStatus ? (
              <p role="status" className="mt-2 text-xs text-ink-muted">
                {saveStatus}
              </p>
            ) : null}

            {saved.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-medium text-ink-muted">Saved videos</p>
                <ul className="mt-1 space-y-1">
                  {saved.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-line px-2 py-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => open(v.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-xs font-medium">
                          {v.name}
                        </span>
                        <span className="block font-[family-name:var(--font-mono)] text-[10px] text-ink-muted">
                          {v.clipCount} clips · {v.totalSeconds}s · {v.ratio}
                          {v.pendingMediaCount > 0
                            ? ` · ${v.pendingMediaCount} need footage`
                            : ""}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const data = new FormData();
                          data.set("id", v.id);
                          data.set("slug", slug);
                          await deleteVideoProject({}, data);
                          setSaveStatus(`Removed ${v.name}. Refresh to update the list.`);
                        }}
                        className="shrink-0 text-xs text-ink-faint hover:text-alert"
                        aria-label={`Remove ${v.name}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

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

      {/* timeline */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Timeline</h3>
          <button
            type="button"
            onClick={() => {
              edit((p) => addClip(p, newClip({ text: "New line" })));
            }}
            className="rounded-lg border border-line px-2.5 py-1 text-xs"
          >
            Add clip
          </button>
        </div>

        <div className="relative mt-3">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {timeline.map((c, i) => {
              const share = Math.max(6, (c.durationMs / Math.max(1, totalMs)) * 100);
              const active = current?.id === c.id;
              return (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) edit((p) => moveClip(p, dragIndex, i));
                    setDragIndex(null);
                  }}
                  style={{ width: `${share}%`, minWidth: 88 }}
                  className={`min-w-0 cursor-grab rounded-lg border p-2 text-left ${
                    active ? "border-teal-deep bg-teal-wash" : "border-line bg-paper"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setPlaying(false);
                      setMs(c.startMs);
                    }}
                    className="w-full text-left"
                  >
                    <span className="block truncate text-xs font-medium">
                      {c.text || "Empty"}
                    </span>
                    <span className="block font-[family-name:var(--font-mono)] text-[10px] text-ink-muted">
                      {c.seconds.toFixed(1)}s
                      {c.media ? ` · ${c.media.kind}` : ""}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 bottom-[-4px] w-0.5 bg-alert"
            style={{ left: `${(ms / Math.max(1, totalMs)) * 100}%` }}
          />
        </div>

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
          className="mt-3 w-full"
        />
      </div>

      {/* inspector */}
      {selected ? (
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">
              Clip {project.clips.findIndex((c) => c.id === selected.id) + 1} of{" "}
              {project.clips.length}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => edit((p) => duplicateClip(p, selected.id))}
                className="rounded-lg border border-line px-2.5 py-1 text-xs"
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => {
                  edit((p) => removeClip(p, selected.id));
                  setMs(0);
                }}
                disabled={project.clips.length <= 1}
                className="rounded-lg border border-line px-2.5 py-1 text-xs text-alert disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label htmlFor="clip-text" className="block text-sm font-medium">
                  Line
                </label>
                <textarea
                  id="clip-text"
                  rows={2}
                  value={selected.text}
                  onChange={(e) =>
                    edit((p) => updateClip(p, selected.id, { text: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="clip-second" className="block text-sm font-medium">
                  Second line
                </label>
                <textarea
                  id="clip-second"
                  rows={2}
                  value={selected.secondary}
                  onChange={(e) =>
                    edit((p) =>
                      updateClip(p, selected.id, { secondary: e.target.value }),
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="clip-anim" className="block text-sm font-medium">
                  Animation
                </label>
                <select
                  id="clip-anim"
                  value={selected.animation}
                  onChange={(e) =>
                    edit((p) =>
                      updateClip(p, selected.id, {
                        animation: e.target.value as Clip["animation"],
                      }),
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                >
                  {ANIMATIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ink-muted">
                  {ANIMATIONS.find((a) => a.id === selected.animation)?.description}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="clip-seconds" className="block text-sm font-medium">
                  Length: {selected.seconds.toFixed(1)}s
                </label>
                <input
                  id="clip-seconds"
                  type="range"
                  min={0.5}
                  max={20}
                  step={0.1}
                  value={selected.seconds}
                  onChange={(e) =>
                    edit((p) =>
                      updateClip(p, selected.id, { seconds: Number(e.target.value) }),
                    )
                  }
                  className="mt-1 w-full"
                />
              </div>

              <fieldset>
                <legend className="text-sm font-medium">Size and alignment</legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(["s", "m", "l"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={selected.size === s}
                      onClick={() => edit((p) => updateClip(p, selected.id, { size: s }))}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        selected.size === s
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface"
                      }`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                  {(["left", "center"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={selected.align === a}
                      onClick={() => edit((p) => updateClip(p, selected.id, { align: a }))}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        selected.align === a
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-medium">Background</legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(["paper", "ink"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selected.theme === t}
                      onClick={() => edit((p) => updateClip(p, selected.id, { theme: t }))}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        selected.theme === t
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface"
                      }`}
                    >
                      {t === "paper" ? "Paper" : "Ink"}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="clip-media" className="block text-sm font-medium">
                  Screen recording or screenshot
                </label>
                <input
                  id="clip-media"
                  type="file"
                  accept="video/*,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) attachMedia(selected, file);
                  }}
                  className="mt-1 w-full text-xs"
                />
                <p className="mt-1 text-xs text-ink-muted">
                  Use a real capture of the shipping app. Nothing here draws a
                  product interface, because a drawn one would be a picture of an
                  app that does not exist.
                </p>

                {selected.media ? (
                  <div className="mt-2 space-y-2">
                    <p className="truncate font-[family-name:var(--font-mono)] text-xs text-ink-muted">
                      {selected.media.name}
                    </p>
                    <label
                      htmlFor="clip-dim"
                      className="block text-xs text-ink-muted"
                    >
                      Dim: {Math.round(selected.media.dim * 100)}%
                    </label>
                    <input
                      id="clip-dim"
                      type="range"
                      min={0}
                      max={0.85}
                      step={0.05}
                      value={selected.media.dim}
                      onChange={(e) =>
                        edit((p) =>
                          updateClip(p, selected.id, {
                            media: {
                              ...selected.media!,
                              dim: Number(e.target.value),
                            },
                          }),
                        )
                      }
                      className="w-full"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        mediaRef.current.delete(selected.id);
                        edit((p) =>
                          updateClip(p, selected.id, {
                            media: undefined,
                            theme: "paper",
                          }),
                        );
                      }}
                      className="rounded-lg border border-line px-2.5 py-1 text-xs"
                    >
                      Remove media
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-medium">Elements on this clip</h4>
              <div className="flex flex-wrap gap-1">
                {ELEMENT_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={paletteGroup === g}
                    onClick={() => setPaletteGroup(g)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      paletteGroup === g
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface text-ink-muted"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {ELEMENTS.filter((e) => e.group === paletteGroup).map((e) => (
                <button
                  key={e.kind}
                  type="button"
                  onClick={() =>
                    edit((p) =>
                      addElement(p, selected.id, {
                        kind: e.kind,
                        x: 0.5,
                        y: 0.72,
                        scale: 1,
                        tone: selected.theme === "paper" ? "ink" : "paper",
                        text: e.defaultText ?? "",
                        delay: 0.15,
                      }),
                    )
                  }
                  className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs hover:border-ink"
                >
                  {e.name}
                </button>
              ))}
            </div>

            {selected.elements.length === 0 ? (
              <p className="mt-3 text-xs text-ink-muted">
                Nothing on this clip yet. Elements sit on top of the text and take
                their own entrance from their delay.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {selected.elements.map((element) => {
                  const def = elementByKind(element.kind);
                  const isOpen = selectedElementId === element.id;
                  return (
                    <li key={element.id} className="rounded-lg border border-line p-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedElementId(isOpen ? "" : element.id)
                          }
                          className="text-left text-xs font-medium"
                        >
                          {def?.name ?? element.kind}
                          <span className="ml-2 font-[family-name:var(--font-mono)] text-[10px] text-ink-muted">
                            {element.tone}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            edit((p) => removeElement(p, selected.id, element.id))
                          }
                          className="text-xs text-ink-faint hover:text-alert"
                        >
                          Remove
                        </button>
                      </div>

                      {isOpen ? (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {def?.hasText ? (
                            <label className="text-xs">
                              Text
                              <input
                                value={element.text}
                                onChange={(ev) =>
                                  edit((p) =>
                                    updateElement(p, selected.id, element.id, {
                                      text: ev.target.value,
                                    }),
                                  )
                                }
                                className="mt-1 w-full rounded border border-line px-2 py-1 text-xs"
                              />
                            </label>
                          ) : null}

                          <label className="text-xs">
                            Tone
                            <select
                              value={element.tone}
                              onChange={(ev) =>
                                edit((p) =>
                                  updateElement(p, selected.id, element.id, {
                                    tone: ev.target.value as "ink" | "paper" | "teal",
                                  }),
                                )
                              }
                              className="mt-1 w-full rounded border border-line px-2 py-1 text-xs"
                            >
                              <option value="ink">Ink</option>
                              <option value="paper">Paper</option>
                              <option value="teal">Teal</option>
                            </select>
                          </label>

                          {(
                            [
                              ["Across", "x", 0, 1, 0.01],
                              ["Down", "y", 0, 1, 0.01],
                              ["Size", "scale", 0.4, 3, 0.05],
                              ["Delay", "delay", 0, 0.9, 0.05],
                            ] as const
                          ).map(([label, key, min, max, step]) => (
                            <label key={key} className="text-xs">
                              {label}: {Number(element[key]).toFixed(2)}
                              <input
                                type="range"
                                min={min}
                                max={max}
                                step={step}
                                value={element[key]}
                                onChange={(ev) =>
                                  edit((p) =>
                                    updateElement(p, selected.id, element.id, {
                                      [key]: Number(ev.target.value),
                                    }),
                                  )
                                }
                                className="mt-1 w-full"
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {selected.elements.filter((e) => e.tone === "teal").length > 1 ? (
              <p className="mt-3 rounded-lg bg-amber-wash px-3 py-2 text-xs text-amber">
                More than one teal element on this clip. Teal is the signal, and a
                frame with two signals has none. Not blocked, in case you mean it.
              </p>
            ) : null}
          </div>

          {selected.note ? (
            <p className="mt-4 rounded-lg bg-amber-wash px-3 py-2 text-xs text-amber">
              {selected.note}
            </p>
          ) : null}
        </div>
      ) : null}

      {browsing ? (
        <StarterBrowser
          source={source}
          selectedSlug={starterSlug}
          onSelect={setStarterSlug}
          onClose={() => setBrowsing(false)}
          onApply={() => {
            const starter = starterBySlug(starterSlug);
            if (!starter) return;
            edit(() => starter.build(source));
            setMs(0);
            setPlaying(false);
            setBrowsing(false);
          }}
        />
      ) : null}
    </div>
  );
}
