# Architecture and roadmap

## Source and deployment map

Recorded during the source-location gate on 2026-08-12.

| Thing | Where it lives | Status |
| --- | --- | --- |
| Deployed prototype | `marketing.voxclip.it` | Live. Single-page app, shared team code, Dutch UI, English content, state in `localStorage`. |
| Prototype source | Not found in any connected folder or repository | **Unresolved.** No `index.html` was provided. Structure below was reconstructed from the rendered page. |
| This rebuild | `/Users/martijnheijde/Claude/VoxClipStudio nieuw`, git repo, branch `main` | New. No remote yet. |
| Public website | `voxclip.it` | Separate source, not connected. The Learn publishing path is unknown and Lane 4 is blocked on it. |
| Desktop product | VoxClip Mac and Windows app | Separate repository, not connected. Product Truth is currently hand-entered rather than synchronised. |
| Release artefacts | `github.com/Arend0/voxclip-releases` | Not yet read. Needed to verify version and hotkeys. |

### What the prototype contains (reconstructed from the live page)

Navigation: Home, Dashboard (posts), Advertenties, Resultaten, Mijn week, Video maken, Opgeslagen,
E-mail, Verkoopplan, Launch-playbook, Onderzoek.

Capabilities observed: a weekly content generator across TikTok / Instagram / LinkedIn / Blog keyed
on persona and pillar; a video generator with an advanced editor (text, speed, accent colour) and
claims of 60+ styles; saved posts with JSON export; ad-copy generation for Google Search and Meta;
an email generator with four types; a manual results log with CSV import and export; a research
section with competitor links and local notes; a launch playbook checklist.

Everything persists in the browser. Nothing is shared, reviewed, approved, versioned, or
attributed.

## Target architecture

```
Browser (React Server Components + a small amount of client state)
   |
   |  server actions and route handlers, authenticated by session cookie
   v
Next.js server  ──  authorisation policy  ──  quality gates  ──  campaign state machine
   |                                                                  |
   |                                                                  v
   |                                                            audit events
   v
Prisma  ──>  Postgres (Neon)
   |
   +--> provider adapters (feature-flagged, fake by default)
   +--> website publishing adapter (dry-run by default)
```

### Principles

- **The server is the authority.** State transitions, authorisation, and quality gates run server
  side. Client checks are convenience only.
- **One campaign, many variants.** A `ChannelVariant` never exists without a `Campaign`.
- **Nothing is generated without Product Truth.** The generator reads facts; it does not invent them.
- **Adapters are honest.** A `ChannelConnection` declares exactly which of draft, preview,
  schedule, publish, and metrics it supports. Anything else is a manual handoff.
- **Publication is idempotent.** Every attempt carries an idempotency key. A retry after a failure
  never creates a second post.

## Lane roadmap

Lanes are ordered by dependency. Each lane gets a plan in `docs/plans/` before implementation.

| Lane | Scope | Status |
| --- | --- | --- |
| 0 | Orchestration, docs, contracts, integration | **In progress** |
| 1 | Product Truth, brand and fact linting, claim provenance | **In progress** |
| 2 | Campaign domain, state machine, review and approval, audit history | **In progress** |
| 8 | Identity, roles, authorisation, sessions, audit events | **In progress** |
| 9 | Quality engineering, CI, accessibility, release evidence | **In progress** |
| 3 | House formats, master-to-variant flow, asset library | Planned |
| 4 | Blog and Learn article workflow, website adapter | **Blocked** on access to the `voxclip.it` source |
| 5 | Channel adapters, scheduling, publishing, email delivery | Planned. Blocked on provider credentials. |
| 6 | Attribution, reporting, experiments | Planned |
| 7 | Research provenance, signal to brief | Planned |

## Known blockers

1. **The prototype's `index.html` was never provided.** Feature parity work cannot start until it
   is in the repository or its behaviour is respecified.
2. **No access to the `voxclip.it` website source.** Lane 4 cannot build a real publishing adapter
   or a real-design preview without it.
3. **No access to the desktop repository or release feed.** Product Truth is hand-entered and the
   version and hotkey facts are unverified.
4. **No provider credentials.** All channel adapters ship as fakes until official API access exists.
