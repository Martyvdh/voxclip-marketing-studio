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

## D-003 — Hosting: Vercel + Neon Postgres

**Date:** 2026-08-12 · **Status:** accepted

**Decision:** deploy on Vercel, database on Neon. Scheduling uses Vercel Cron in the first
iteration.

**Cost:** Vercel Cron has minute-level granularity and no long-running workers. If publishing
volume ever needs a real queue, that becomes a separate decision.

**Escape hatch:** all database access goes through Prisma and all environment configuration
through `src/lib/env.ts`, so moving to another host is a configuration change, not a rewrite.

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
