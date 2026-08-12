# Master plan

One plan per shippable subsystem. A lane is not started until its plan names the exact files,
the tests, the commands, and the expected failures. No placeholders.

## Done

### Wave 1a — foundation

- Repository, toolchain, and check suite. `npm run verify` runs lint, type check, tests, build.
- Domain model: 29 tables, one migration in `drizzle/0000_init.sql`.
- Quality gate: 17 deterministic rules, 31 tests.
- Campaign state machine: legal transitions, readiness gates, next action, 25 tests.
- Identity: scrypt passwords, hashed session tokens, httpOnly cookies, a role and capability
  matrix, 30 tests.
- Operator surfaces: sign-in, Home, campaigns, campaign detail, Product Truth, Channels.
- Seed: first admin, two audiences, 18 product claims, three of them deliberately unverified.

## Next, in dependency order

### Wave 1b — close the foundation

1. **Campaign creation.** From a sourced signal and from a blank brief. Server actions that call
   `evaluateTransition` and write a `CampaignTransition` plus an `AuditEvent` for every change.
   Files: `src/app/(studio)/campaigns/new/`, `src/lib/campaign/actions.ts`.
   Tests: creation refuses a campaign without an objective, an audience, or a campaign code;
   a transition that the state machine refuses is refused by the action too.
2. **Integration tests against a real database.** The pure rules are covered; the queries and
   session handling are not. Add a Postgres test harness with a truncate-per-test fixture.
   First test: an unauthenticated request to `/` redirects to `/login` and returns no campaign data.
3. **A gate run stored per version.** `runQualityGate` is written but nothing persists a
   `QualityRun` yet. Wire it into the version-save path so the board's `variantsFailingGate`
   stops depending on data nobody writes.
4. **Password change and admin user management.** The seed prints a password once. There is no
   way to change it in the product yet.

### Lane 8b — Supabase Auth and Storage

Requested explicitly. Deliberately scheduled after the database is live, so a working
authentication layer is never removed before its replacement is proven. See D-003b.

- Write the failing tests first: a Supabase session grants access, a revoked one does not, and a
  user's role still comes from our `users` table rather than from the token.
- Keep the role and capability matrix. Supabase has no concept of AUTHOR, REVIEWER, or PUBLISHER;
  those stay ours and are read after authentication.
- Keep writing `LOGIN_SUCCEEDED`, `LOGIN_FAILED`, and `LOGOUT` audit events.
- Design row level security before any table becomes reachable by a Supabase key. The Data API is
  off today, which is what makes that safe to postpone rather than urgent.
- Storage: buckets for the asset library, private by default, signed URLs only, with the
  origin and approval state still enforced by our own tables.
- Remove `src/lib/auth/password.ts` and its session handling only once every test that covered it
  has an equivalent passing against Supabase.

### Wave 2 — content production

5. **House formats.** 8 to 12 records, seeded, each with channels, ratios, hook, evidence, shot
   list, subtitle, thumbnail, CTA, and accessibility rules.
6. **Master content to channel variants.** One approved concept produces per-channel drafts that
   carry one campaign identity and pass the gate.
7. **Asset intake.** Real screenshots and screen recordings, with origin, the app version shown,
   alt text, and approval. Generated imagery may never depict product UI.
8. **Review and approval UI.** Request changes, revise, approve an exact version, and keep both
   versions visible.

### Wave 3 — distribution and attribution

9. **Channel adapters behind a fake by default.** Capability matrix per connection, dry run,
   manual handoff package, idempotent publish, retry that cannot duplicate, revoke.
10. **Scheduling.** A due queue, one worker, an idempotency key per schedule.
11. **Attribution.** Tagged links through landing visit and installer click. Everything downstream
    is reported as `not instrumented`. See D-008.
12. **Weekly review.** Attributed winners, failures, and the next hypothesis.

## Blocked, with what would unblock each

| Blocked | Needs |
| --- | --- |
| Feature parity with the prototype | The prototype's `index.html`, or a written spec of what to keep |
| The Learn and blog publishing adapter | Access to the `voxclip.it` website source |
| Product Truth synchronisation, and the hotkey and version facts | Access to the desktop repository and `github.com/Arend0/voxclip-releases` |
| Any real channel adapter | Official API access and credentials for that provider |
| Deployment | A Vercel project and a Neon database |
