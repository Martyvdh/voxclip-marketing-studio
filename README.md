# VoxClip Marketing Studio

Internal marketing operating system for VoxClip. It takes one verified campaign idea through
creation, approval, channel adaptation, safe publishing, attribution, and learning.

Not part of the VoxClip desktop product. Read `AGENTS.md` before writing any code.

## Requirements

- Node.js 20 or later (developed on 22)
- A Postgres database (Neon in production, Docker or Postgres.app locally)

## Setup

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL and SESSION_SECRET
npm run db:push               # create the schema in your database
npm run db:seed               # load Product Truth, roles, and the first admin account
npm run dev                   # http://localhost:3000
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The seed prints the first admin's email and a generated password once. Change it after first login.

## Checks

```bash
npm run verify      # lint + typecheck + test + build. Everything must pass.
npm run test        # unit and domain tests only
npm run test:watch  # while working
```

## Safety

- No real post is ever published and no email is ever sent by a test, a preview, or a seed.
  Provider adapters are fakes unless `ENABLE_REAL_PUBLISHING=true` **and** the operator confirms
  the exact payload in the UI.
- The desktop product's Timeline, clipboard contents, and dictation audio never enter this system.

## Documentation

| File | What it is |
| --- | --- |
| `AGENTS.md` | Binding rules for anyone writing code here |
| `docs/brand.md` | Voice, colour, type, and the rules the linter enforces |
| `docs/product-truth.md` | The authoritative product facts every claim is checked against |
| `docs/decisions.md` | Append-only decision log |
| `docs/architecture.md` | Source map, target architecture, lane roadmap, blockers |
| `docs/plans/` | One implementation plan per shippable subsystem |
