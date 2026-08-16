import Link from "next/link";

import { Card } from "@/components/brand";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STEPS: {
  title: string;
  body: string;
  where: string;
  href: string;
}[] = [
  {
    title: "Start a campaign",
    body: "Give it a title, an objective, an audience, and one of the four pillars. Everything public hangs off a campaign, so a post can always be traced back to why it existed.",
    where: "Campaigns → New campaign",
    href: "/campaigns/new",
  },
  {
    title: "Write the brief",
    body: "What you are saying, to whom, and what you want them to do. The brief is what the drafts are generated from, so a vague brief produces vague copy.",
    where: "Open the campaign → Brief",
    href: "/campaigns",
  },
  {
    title: "Draft the channel variants",
    body: "Tick the channels and the Studio writes one draft each, with the campaign code and a tagged link already in place. Every draft is checked against the brand rules and Product Truth before it is stored.",
    where: "Open the campaign → tick channels → Draft these",
    href: "/campaigns",
  },
  {
    title: "Fix whatever the gate blocked",
    body: "A blocked draft says which rule and why: a dash that should be a comma, a claim that is not verified, a caption over the limit. Rewrite it and it is checked again.",
    where: "On the campaign, under each variant",
    href: "/campaigns",
  },
  {
    title: "Send it for review",
    body: "Only a draft that passes the gate can go. Asking someone to read copy that cannot go out either way wastes their afternoon.",
    where: "On the variant → Send for review",
    href: "/campaigns",
  },
  {
    title: "Someone else approves it",
    body: "The approval binds to that exact version. Rewrite it afterwards and the queue says the approval no longer covers what is there. You cannot approve a campaign you own.",
    where: "Review",
    href: "/review",
  },
  {
    title: "Put it on the calendar",
    body: "Pick a day and a time in Amsterdam time. This does not post anything; it is a reminder with the finished words attached.",
    where: "Calendar → Plan a post",
    href: "/calendar",
  },
  {
    title: "Post it by hand",
    body: "The handoff gives you the caption, the tagged link, and a checklist for that platform, each with a copy button. Paste it into the platform, post it, then log it here so the calendar knows it happened.",
    where: "Calendar → click the planned post",
    href: "/calendar",
  },
  {
    title: "Log what it did",
    body: "A few days later, type in the numbers from each platform. Nothing counts clicks by itself yet, so this is the only way the Studio learns anything.",
    where: "Results",
    href: "/results",
  },
];

const SECTIONS: { name: string; href: string; body: string }[] = [
  {
    name: "Home",
    href: "/",
    body: "What is waiting on you, and nothing else. Not a dashboard of numbers.",
  },
  {
    name: "Campaigns",
    href: "/campaigns",
    body: "Everything that is running, with the next step spelled out for each.",
  },
  {
    name: "Review",
    href: "/review",
    body: "The queue of things waiting on a person, oldest first.",
  },
  {
    name: "Calendar",
    href: "/calendar",
    body: "The week ahead. Approved work with a day and a time against it.",
  },
  {
    name: "Assets",
    href: "/assets",
    body: "Real screenshots and recordings, each carrying which app version it shows.",
  },
  {
    name: "Channels",
    href: "/channels",
    body: "Where the work goes, and what the Studio can honestly do on each one.",
  },
  {
    name: "Results",
    href: "/results",
    body: "The numbers you typed in, per campaign, exportable as a spreadsheet.",
  },
  {
    name: "Truth",
    href: "/truth",
    body: "The facts every claim is checked against. Fix an unverified fact here and copy that relies on it stops being blocked.",
  },
];

export default async function GuidePage() {
  await requireUser();

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">How this works</h1>
      <p className="mt-2 text-ink-muted">
        One campaign, start to finish. Nine steps, and none of them are long.
      </p>

      <Card className="mt-6">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Before your first campaign
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Open{" "}
          <Link href="/truth" className="text-teal-deep hover:underline">
            Truth
          </Link>{" "}
          and check what is still marked as not verified. Any copy that relies on
          an unverified fact is blocked, which is deliberate but will confuse you
          on day one if you do not know it is there. The hotkeys and the app
          version are the usual two.
        </p>
      </Card>

      <ol className="mt-8 space-y-4">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <Card>
              <div className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="shrink-0 font-[family-name:var(--font-mono)] text-sm text-ink-faint"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h2 className="font-[family-name:var(--font-display)] font-semibold">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
                  <p className="mt-2 text-xs">
                    <Link
                      href={step.href}
                      className="text-teal-deep hover:underline"
                    >
                      {step.where}
                    </Link>
                  </p>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Where the video fits
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          A vertical channel needs something to look at. Open a campaign and go
          to Video: pick a starting point, drop your own recording into a clip,
          add elements from the palette, and export it. Save the project and you
          can come back and change it later. Drop the exported file into{" "}
          <Link href="/assets" className="text-teal-deep hover:underline">
            Assets
          </Link>{" "}
          so the next campaign can reuse it.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          The editor never draws a fake VoxClip interface. If a clip should show
          the app, it shows a recording of the app.
        </p>
      </Card>

      <section className="mt-10" aria-labelledby="sections-heading">
        <h2 id="sections-heading" className="mb-3 text-lg font-semibold">
          What each section is for
        </h2>
        <dl className="space-y-2">
          {SECTIONS.map((section) => (
            <div
              key={section.href}
              className="rounded-lg border border-line bg-surface px-4 py-3"
            >
              <dt className="text-sm font-medium">
                <Link href={section.href} className="hover:underline">
                  {section.name}
                </Link>
              </dt>
              <dd className="mt-0.5 text-sm text-ink-muted">{section.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-ink-muted">
          Team and your own account sit top right, next to your name.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="not-heading">
        <h2 id="not-heading" className="mb-3 text-lg font-semibold">
          What it deliberately does not do
        </h2>
        <Card>
          <ul className="space-y-3 text-sm text-ink-muted">
            <li>
              <span className="font-medium text-ink">It does not post.</span> No
              platform account is connected, and none will be faked. Planning and
              posting are two different things here, and the second one is yours.
            </li>
            <li>
              <span className="font-medium text-ink">
                It does not count clicks.
              </span>{" "}
              The links are tagged and ready, but nothing is reading them yet.
              That needs a small endpoint on voxclip.it.
            </li>
            <li>
              <span className="font-medium text-ink">
                It does not invent facts.
              </span>{" "}
              If something is not in Product Truth, the gate blocks the copy
              rather than filling in a plausible number.
            </li>
            <li>
              <span className="font-medium text-ink">
                It does not let you approve your own work.
              </span>{" "}
              Not a formality. It is the only place where a second pair of eyes
              is guaranteed.
            </li>
            <li>
              <span className="font-medium text-ink">It does not delete.</span>{" "}
              Archiving takes something off the board and leaves the record.
            </li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
