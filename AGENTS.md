# AGENTS.md — binding rules for this repository

This file is binding for every human and every agent that writes code here. If a task prompt
conflicts with this file, this file wins and the conflict must be recorded in `docs/decisions.md`.

## What this repository is

VoxClip Marketing Studio: internal operator tooling for the VoxClip marketing team.
It takes one verified campaign idea through creation, approval, channel adaptation, safe
publishing, attribution, and learning.

It is **not** part of the VoxClip desktop product. Integrations built here are internal operator
tooling and never change the product cut list.

Deployed at `marketing.voxclip.it`. The public website is `voxclip.it` (separate source).

## The workflow this system exists to serve

```
Signal -> Brief -> Master concept -> Approved proof asset -> Channel variants
      -> Review -> Schedule or publish -> Attribution -> Learning
```

Everything is organised around one first-class `Campaign`. Not a collection of generators.

## Non-negotiables

1. **Product Truth is a hard dependency.** Every public-facing claim is generated from, and
   validated against, the `ProductTruth` record. A claim that contradicts it fails a quality gate.
   Never silently auto-correct a material claim at publish time; show the operator and require a
   deliberate revision.
2. **No fabrication.** No fake testimonials, invented usage numbers, unsupported superlatives,
   unreleased capabilities presented as shipping, or mock data presented as live data.
3. **Honest capability labelling.** A channel is not "connected" because metrics can be read.
   Every channel exposes an explicit capability matrix. Incomplete adapters are feature-flagged
   and labelled with their true capability.
4. **No accidental publishing.** Tests, previews, migrations, and smoke runs never post publicly
   or send email. Real publishing sits behind a feature flag plus explicit operator confirmation.
5. **Never use browser automation to evade a provider API limit or platform rule.** If official
   access is unavailable, ship a high-quality manual handoff instead.
6. **The desktop product's local data never enters this system.** No Timeline contents, no
   clipboard contents, no dictation audio, no dictation history. Ever.
7. **No shared team code.** Individual accounts, server-side authorisation on every protected
   read and mutation, least-privilege roles, durable audit trail.

## Brand rules that the code enforces

See `docs/brand.md` for the full source of truth. The linter in `src/lib/quality/` enforces:

- no em dash and no en dash in public-facing copy;
- "VoxClip" as one word, capital V and C;
- approved feature names: the Timeline, the Quick-picker, Snippets, Templates;
- teal `#12B3A6` is a rare signal, never a background wash; teal text uses Teal Deep `#0B7A6E`;
- calm and plain language, no hype vocabulary;
- one clear call to action with a tagged destination;
- no duplicate or malformed hashtags.

## Engineering discipline

- **Test-driven.** Write the smallest failing test that proves the behaviour, observe it fail,
  implement the minimum, observe it pass, refactor, rerun. Tests assert user-observable behaviour
  and security invariants, not implementation trivia.
- **Deterministic tests.** Controlled clocks, seeded IDs, fake providers. No arbitrary sleeps.
- **Small, intentional commits.** Conventional commit prefixes (`feat:`, `fix:`, `chore:`,
  `docs:`, `test:`, `refactor:`).
- **Never weaken a check to make CI green.** Diagnose the root cause.
- **Server-side authority.** State transitions, authorisation, and quality gates are enforced on
  the server. Client-side checks are a convenience, never the boundary.
- **Never reuse a provider ID as an internal primary key.**

## Verification before completion

Nothing is "done" until `npm run verify` passes from a clean checkout and the relevant evidence
exists. Never summarise a failed check as "mostly passing." Give the command, the failure, the
impact, and the next action.

```bash
npm run verify   # lint + typecheck + test + build
```

## Layout

```
docs/                     binding documentation (brand, decisions, product truth, architecture)
docs/plans/               implementation plans, one per shippable subsystem
prisma/schema.prisma      the domain model
src/lib/quality/          quality gates and the brand linter
src/lib/campaign/         campaign lifecycle and state machine
src/lib/auth/             identity, sessions, roles, authorisation
src/app/                  Next.js App Router routes
```

## Branch policy

Feature work happens on a branch, never directly on `main`, once `main` carries a deployed
version. Each branch carries its own plan in `docs/plans/`.
