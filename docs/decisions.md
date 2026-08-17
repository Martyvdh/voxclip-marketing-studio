# Decisions

Append-only. Each entry records what was decided, why, and what it costs. Never silently reverse a
decision; add a new entry that supersedes it.

---

## D-001 — Rebuild the Studio as a real application, not a single HTML file

**Date:** 2026-08-12 · **Status:** accepted

The deployed `marketing.voxclip.it` is a single-page prototype: everything lives in one
`index.html`, state lives in `localStorage`, and access is a shared team code. That is fine for a
notebook and unsafe for a system that will hold OAuth tokens, audience data, drafts, and campaign
history.

**Decision:** rebuild as a Next.js application with a Postgres database, individual accounts, and
server-side authorisation.

**Cost:** the prototype's instant-edit convenience is gone. Every change now goes through a build
and a test suite.

---

## D-002 — Stack: Next.js + TypeScript + Prisma + Postgres

**Date:** 2026-08-12 · **Status:** accepted

**Decision:** Next.js 16 App Router, TypeScript strict, Tailwind 4, Prisma ORM against Postgres,
Vitest for unit and domain tests.

**Why:** server-side auth and authorisation on the same deployment as the UI; one language across
the stack; a real migration story; the ecosystem for OAuth, queues, and scheduled jobs the later
lanes need.

**Cost:** heavier than the prototype. A build step, a database to run locally, and a migration
discipline.

---

## D-002a — Drizzle instead of Prisma (supersedes the ORM half of D-002)

**Date:** 2026-08-12 · **Status:** accepted

Prisma 7 downloads a Rust schema engine from `binaries.prisma.sh` for every CLI
command, including `prisma --version`. That download was blocked in the build environment,
so the schema could not be validated, the client could not be generated, and neither the type
check nor the build could run. A toolchain that cannot be verified is not a toolchain.

**Decision:** use Drizzle ORM with `drizzle-kit`. Pure TypeScript, no binary download, migrations
are plain readable SQL in `drizzle/`, and the whole check suite runs offline.

**Cost:** Drizzle's query API is closer to SQL and less forgiving than Prisma's. Relations are
written out rather than inferred. In exchange the generated SQL is visible and reviewable, which
suits a schema this size.

---

## D-003 — Hosting: Vercel + Neon Postgres

**Date:** 2026-08-12 · **Status:** superseded by D-003a

**Decision:** deploy on Vercel, database on Neon. Scheduling uses Vercel Cron in the first
iteration.

**Cost:** Vercel Cron has minute-level granularity and no long-running workers. If publishing
volume ever needs a real queue, that becomes a separate decision.

**Escape hatch:** all database access goes through Prisma and all environment configuration
through `src/lib/env.ts`, so moving to another host is a configuration change, not a rewrite.

---

## D-003a — Supabase instead of Neon (supersedes D-003)

**Date:** 2026-08-12 · **Status:** accepted

**Decision:** the database is Supabase Postgres, project `voxclip-marketing-studio` in
`eu-central-1` (Frankfurt). Deployment target stays Vercel.

**Why Frankfurt:** closest EU region to the Netherlands, and it keeps campaign and audience data
inside the EU, which matches the GDPR-first posture on the public site.

**The Data API is switched off.** Supabase would otherwise expose an automatic REST API over the
public schema. This database holds audit events, encrypted provider tokens, and unpublished
campaign work; none of that should be one anon key away from the internet. We talk to Postgres
directly through Drizzle, so the Data API buys us nothing and costs us a large attack surface.

**Cost:** `supabase-js` and anything built on it cannot query this database. If a future feature
genuinely needs the Data API, turning it on is a deliberate decision with row level security
designed first, not a checkbox flipped in passing.

---

## D-003b — Supabase Auth and Storage are a later lane, not this one

**Date:** 2026-08-12 · **Status:** accepted

Marty asked for Supabase Auth and Storage alongside Postgres. The identity layer in
`src/lib/auth/` is already written and covered by 30 tests.

**Decision:** get the database live on the current, tested auth first. Replace it with Supabase
Auth as its own lane, with its own plan and its own failing tests written before anything is
removed.

**Why:** swapping a working authentication layer mid-migration means running with neither the old
guarantees nor the new ones. The order costs nothing and removes the window where the system is
unprotected.

**What the lane has to cover:** session handling moves from our cookie to Supabase's, the role
and capability matrix has to survive (Supabase has no concept of our roles, so they stay in the
`users` table and are read after authentication), the audit trail keeps recording sign-ins, and
row level security has to be designed before any table is reachable by a Supabase key.

**Cost of doing it at all:** Supabase Auth adds a dependency and an external failure mode to
signing in, in exchange for password reset, email verification, and social sign-in that we would
otherwise write ourselves. For a team of one to three people that trade is close to even, which is
why it is worth doing deliberately rather than by default.

---

## D-004 — Order of work: foundation before generators

**Date:** 2026-08-12 · **Status:** accepted

**Decision:** build Product Truth, quality gates, identity and roles, the Campaign domain, and the
state machine before porting any generator from the prototype.

**Why:** the prototype's failure was not a lack of output. It was output produced before truth,
approval, and attribution existed. Porting the generators first would recreate the failure on a
nicer stack.

**Cost:** the new Studio does less than the prototype until the foundation lands.

---

## D-005 — Password hashing uses Node's built-in scrypt

**Date:** 2026-08-12 · **Status:** accepted

**Decision:** use `node:crypto` `scrypt` with a per-password random salt rather than adding argon2
or bcrypt.

**Why:** no native module to compile, no dependency to keep patched, and scrypt is a memory-hard
KDF that is appropriate for a small internal team. Parameters live in one place and can be raised.

**Cost:** argon2id is the stronger modern default. If this system ever holds accounts beyond the
internal team, revisit.

---

## D-006 — Product Truth blocks, it does not fix

**Date:** 2026-08-12 · **Status:** accepted

**Decision:** when generated copy contradicts Product Truth, the quality gate fails the asset and
shows the operator exactly which fact it contradicts. The system never rewrites a material claim
silently at publish time.

**Why:** a system that quietly corrects claims teaches the operator to stop reading them.

**Cost:** more friction per asset. That is the intended trade.

---

## D-007 — Hotkeys are blocked until verified

**Date:** 2026-08-12 · **Status:** accepted

The audit found the Quick-picker shortcut stated differently in the Studio, the product defaults,
and the public site. At least one of them is wrong.

**Decision:** the hotkey facts ship as `unverified` in Product Truth. Any asset that states a
hotkey fails its quality gate until someone confirms the shipped default and marks the fact
verified.

**Cost:** no hotkey may appear in a published asset in the meantime. This is deliberate. It is
better to say nothing than to teach a keystroke that does not work.

---

## D-008 — No telemetry is added to the free desktop product for attribution

**Date:** 2026-08-12 · **Status:** accepted

The measurement chain we want is `publication -> landing visit -> installer click -> successful
install -> first capture -> first recall -> week-one retention -> Plus trial -> paid`.

**Decision:** implement the chain up to installer click using campaign IDs and UTMs on the website.
Everything downstream of the installer click is recorded as `not instrumented`, never as zero.
Adding telemetry to the free local core requires a separate, explicit product decision covering
consent, data minimisation, retention, disclosure, and opt-out.

**Cost:** we cannot yet attribute installs, activation, or conversion to a campaign. The honest
gap is visible in the dashboard rather than hidden behind a zero.

---

## D-009 — Fonts load from Google Fonts for now

**Date:** 2026-08-12 · **Status:** accepted, with a named follow-up

`next/font/google` fetches font files at build time. That fetch was blocked in the build
environment, so the production build could not be verified at all.

**Decision:** load Space Grotesk, Inter, and IBM Plex Mono through a stylesheet link for now.

**Cost:** one third-party request per visitor and a small layout-shift risk that `display=swap`
mostly covers. For an internal tool behind a login this is acceptable.

**Follow-up:** put the `.woff2` files in `public/fonts/` and switch to `next/font/local`. That
self-hosts them, removes the third-party request, and keeps the build offline-verifiable. Until
then this stays a known limitation rather than a finished decision.

---

## D-011 — The four moderate npm advisories stay, and here is why

**Date:** 2026-08-12 · **Status:** accepted, with a review trigger

`npm audit` reports four moderate advisories. All four are the same finding
([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)) reaching us through one
chain: `drizzle-kit` depends on `@esbuild-kit/esm-loader`, which depends on `@esbuild-kit/core-utils`,
which pins an old `esbuild`.

The advisory is that **esbuild's development server** accepts requests from any website and returns
the response. We never start that server. `drizzle-kit` uses esbuild only to transpile
`src/db/schema.ts` when generating a migration, on a developer machine or in CI.

**Decision:** do not run `npm audit fix --force`. It would downgrade `drizzle-kit` from 0.31.10 to
0.18.1, which is years of migrations behind and would break the schema tooling. Trading working,
reviewed migration output for a green audit line on an unreachable dev server is a bad trade.

**Review trigger:** re-check on every `drizzle-kit` upgrade. The moment a release drops the
`@esbuild-kit` chain, take it and delete this entry.

**Not accepted:** any advisory that touches code paths we actually run, anything in a runtime
dependency, and anything above moderate. Those get fixed, not documented.

---

## D-012 — npm install scripts are approved individually

**Date:** 2026-08-12 · **Status:** accepted

npm 11 no longer runs a dependency's `postinstall` script without approval. Five packages ask for
one: `esbuild` (three copies), `fsevents`, and `unrs-resolver`. All are build-time tools that
unpack a platform-specific binary.

**Decision:** approve them by name with `npm approve-scripts <package>` rather than blanket
approving everything pending. The blanket flag also approves whatever gets added by a future
transitive dependency, which is precisely the supply-chain risk the gate exists to catch.

**Cost:** a manual step whenever a new build tool enters the tree. That is the point.

---

## D-010 — The board aggregates in TypeScript, not in SQL

**Date:** 2026-08-12 · **Status:** accepted

`loadCampaignBoard` reads six small tables and joins them in memory rather than issuing one
query with several subqueries.

**Why:** at this team's volume the difference is invisible, and the readiness rules stay readable
and type checked instead of hiding in SQL.

**Cost:** it scales with total rows, not with rows shown. Revisit when the campaign table passes
a few thousand rows, not before.

---

## D-013 — An approval binds to a version id, not to a variant

**Date:** 2026-08-16 · **Status:** accepted

`approvals` records `variantId` *and* `versionId`, with a unique index on the pair. Approving
writes the id of the version that was on screen.

**Why:** the failure this prevents is the ordinary one. Somebody approves the copy, the author
tweaks a line afterwards, and the approval silently carries over to words nobody read. The queue
now says so out loud: `approvalIsStale` compares the approved version to the current one, and the
card shows a warning rather than a green tick.

**Cost:** a revision after approval means asking again. That is the intended cost.

---

## D-014 — The page and the server ask the same function

**Date:** 2026-08-16 · **Status:** accepted

`canSendForReview` and `canApprove` in `src/lib/review/rules.ts` are pure functions with no
database access. The server action calls them to decide, and the client component calls them to
decide what to render.

**Why:** the alternative is duplicating the rule in JSX and letting the two drift, which shows up
as a button that always fails. Pure functions also mean the rules are tested without a database.

**Not a security shortcut:** the client copy hides a control, the server copy refuses the action.
Removing the client check changes nothing about what can happen.

**Cost:** the rules live one file away from the action that enforces them.

---

## D-015 — The calendar plans, it does not publish

**Date:** 2026-08-16 · **Status:** accepted

`/calendar` writes rows in `schedules` and shows a week. No worker reads those rows and no
adapter posts anything.

**Why:** no platform account is connected, and AGENTS.md forbids browser-automating around a
platform's API limits. A calendar that pretends to post would be the dishonest version of this
feature. So a slot is a reminder with the finished words attached, and it links to the handoff.

**Already built for later:** `idempotencyKey` covers variant, version, and minute, so when a
worker does take over, a retry cannot double-post.

**Cost:** somebody still has to press the button on the platform.

---

## D-016 — Times are planned in Europe/Amsterdam, stored in UTC

**Date:** 2026-08-16 · **Status:** accepted

`zonedToUtc` converts a date and a time in the planning zone to an instant, using a two-pass
offset lookup through `Intl`. Storage is UTC throughout.

**Why:** "post at nine" means nine where the work happens. A single-pass conversion is wrong for
several hours either side of a clock change, which is exactly when a mistake is hardest to spot.
Both clock changes in 2026 are covered by tests.

**Cost:** one zone is hard-coded. A second country means a per-user setting, not a rewrite.

---

## D-017 — Asset bytes live in Postgres, behind the session

**Date:** 2026-08-16 · **Status:** accepted

`asset_blobs` holds the file in a `bytea` column, capped at 10 MB. `/assets/[id]` serves it only
to a signed-in session, with `Content-Security-Policy: sandbox` and `nosniff`.

**Why:** there is no object store yet, and adding one is a config step with keys. Screenshots and
short clips fit comfortably; the cap is enforced with a message that says to use a file host
instead, rather than failing at the database. Bytes sit in their own table so listing the library
never moves a megabyte.

**Why behind the session:** unapproved captures and work for unpublished campaigns are in there.
A public URL would leak the roadmap to anyone who guesses an id.

**Cost:** the database grows with the library, and Supabase's free tier is 500 MB. Revisit when
it passes a few hundred files, and move `storageKey` to point at an object store.

---

## D-018 — A generated image may never be a screenshot

**Date:** 2026-08-16 · **Status:** accepted

`validateUpload` refuses `origin: GENERATED` combined with `kind: SCREENSHOT` or
`SCREEN_RECORDING`, and `canApproveAsset` refuses it again at approval.

**Why:** this is the one asset rule that is not taste. A picture that looks like the product is a
claim about the product. Designed graphics are fine as long as they are not pretending.

**Cost:** none worth naming.

---

## D-019 — De brief krijgt een voorstel, geen AI

**Datum:** 2026-08-17 · **Status:** accepted

Op een lege brief staat een knop die de velden vult uit `pillar_defaults`, de hookbibliotheek,
`cta_lines` en de geverifieerde claims in Product Truth. Er is geen taalmodel bij betrokken.

**Waarom niet met een model:** dat vraagt een externe API met een sleutel en kosten, en Marty
koos daar bewust tegen. Maar er is een tweede reden die blijft staan als die sleutel er ooit komt.
De brief is de enige plek waar zijn oordeel het systeem binnenkomt. Alles daarna is afgeleid:
teksten uit de brief, controle tegen Product Truth, review op wat er staat. Wordt de brief ook
machinaal geschreven, dan controleert het systeem alleen nog zichzelf.

**Waarom dit wel mag:** het voorstel is zichtbaar in elkaar geknipt en zegt per veld waar het
vandaan komt. Dat nodigt uit tot herschrijven. Een vloeiende gegenereerde brief nodigt uit tot
opslaan.

**Twee regels in de implementatie:** het voorstel is deterministisch, zodat twee keer klikken niet
iets anders geeft en je niet doorklikt tot het goed klinkt. En het bewijsveld pakt alleen een
claim met status VERIFIED; is die er niet, dan blijft het veld leeg en zegt de kaart waarom.

**Kosten:** de zinnen zijn hergebruikt, dus twee campagnes op dezelfde pijler beginnen identiek.
Dat is zichtbaar, en zichtbaar saai werkt hier beter dan onzichtbaar plausibel.
