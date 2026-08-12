import type { CampaignStatus } from "@/db/schema";

/**
 * The chip: a tile holding a waveform, with a notched corner.
 * Teal is exactly one bar. See docs/brand.md.
 */
export function VoxClipMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="VoxClip"
    >
      <path
        d="M4 7a3 3 0 0 1 3-3h14l7 7v14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Z"
        stroke="var(--ink)"
        strokeWidth="2"
      />
      <path d="M21 4v4a3 3 0 0 0 3 3h4" stroke="var(--ink)" strokeWidth="2" />
      <rect x="10" y="17" width="2" height="5" rx="1" fill="var(--ink)" />
      <rect x="14" y="14" width="2" height="11" rx="1" fill="var(--ink)" />
      <rect
        x="18"
        y="16"
        width="2"
        height="7"
        rx="1"
        fill="var(--signal-teal)"
      />
      <rect x="22" y="18" width="2" height="3" rx="1" fill="var(--ink)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight text-ink">
      VoxClip <span className="font-medium text-ink-muted">Studio</span>
    </span>
  );
}

/**
 * Status is never carried by colour alone. Each status has a shape prefix and a
 * word, so it reads the same in greyscale and to a screen reader.
 */
const STATUS_STYLE: Record<
  CampaignStatus,
  { label: string; mark: string; className: string }
> = {
  IDEA: { label: "Idea", mark: "○", className: "text-ink-muted bg-paper" },
  BRIEF: { label: "Brief", mark: "○", className: "text-ink-muted bg-paper" },
  DRAFT: { label: "Draft", mark: "◐", className: "text-ink bg-paper" },
  NEEDS_ASSET: {
    label: "Needs asset",
    mark: "▲",
    className: "text-amber bg-amber-wash",
  },
  IN_REVIEW: {
    label: "In review",
    mark: "◑",
    className: "text-ink bg-paper",
  },
  APPROVED: {
    label: "Approved",
    mark: "●",
    className: "text-teal-deep bg-teal-wash",
  },
  SCHEDULED: {
    label: "Scheduled",
    mark: "◧",
    className: "text-teal-deep bg-teal-wash",
  },
  PUBLISHING: {
    label: "Publishing",
    mark: "◨",
    className: "text-teal-deep bg-teal-wash",
  },
  PUBLISHED: {
    label: "Published",
    mark: "■",
    className: "text-teal-deep bg-teal-wash",
  },
  REJECTED: {
    label: "Rejected",
    mark: "▲",
    className: "text-amber bg-amber-wash",
  },
  FAILED: { label: "Failed", mark: "✕", className: "text-alert bg-alert-wash" },
  CANCELLED: {
    label: "Cancelled",
    mark: "✕",
    className: "text-ink-muted bg-paper",
  },
  ARCHIVED: {
    label: "Archived",
    mark: "▢",
    className: "text-ink-faint bg-paper",
  },
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium ${s.className}`}
    >
      <span aria-hidden="true">{s.mark}</span>
      {s.label}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <Card className="text-center">
      <p className="font-[family-name:var(--font-display)] text-base font-semibold">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{detail}</p>
    </Card>
  );
}
