import type { CampaignStatus } from "@/db/schema";

/**
 * The chip.
 *
 * A filled Ink tile is the capture surface, the notched corner is the clip cue,
 * and there are three bars with the middle one teal and tallest. Teal is exactly
 * one bar, which is the whole point of the mark. Do not recolour it, do not
 * stretch it, do not add a gradient or a shadow. See docs/brand.md.
 */
export function VoxClipMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-label="VoxClip"
    >
      <path
        d="M56 0 H184 L256 72 V200 A56 56 0 0 1 200 256 H56 A56 56 0 0 1 0 200 V56 A56 56 0 0 1 56 0 Z"
        fill="#1C2230"
      />
      <rect x="71" y="108" width="26" height="66" rx="13" fill="#F7F7F5" />
      <rect x="115" y="88" width="26" height="106" rx="13" fill="#12B3A6" />
      <rect x="159" y="108" width="26" height="66" rx="13" fill="#F7F7F5" />
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
