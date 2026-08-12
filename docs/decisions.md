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
