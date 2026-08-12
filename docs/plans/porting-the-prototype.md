# Porting the prototype

The deployed Studio is one file: `legacy/index.html`, 2956 lines, 336 KB, with roughly
2300 lines of JavaScript and 380 lines of CSS inline. This is the inventory of what it does and
how each part moves into the new system.

Read with `docs/architecture.md` (the source map) and `master-plan.md` (the lane order).

## What it actually contains

| Area | In the prototype | Where it goes |
| --- | --- | --- |
| Gate | Shared team code, SHA-256 compared in the browser | Already replaced. See "Security findings" below. |
| Home, Verkoopplan | Static explanation and a step list | Home already exists as an operational inbox. The step list becomes onboarding copy. |
| Dashboard (posts) | Cards per platform, counts from a third-party counter | Lane 6, once metrics have a source and a freshness stamp |
| Mijn week | `renderWeek`, `weekVideo`, `schedStep` — generates a full week in one click | Rebuilt as one campaign theme producing channel variants |
| Generator | `scriptShort`, `scriptLI`, `renderPostCard`, `LIB` hook library, `VID_DEF` per pillar | Becomes master content plus per-channel variants, run through the quality gate |
| Video maker | ~1000 lines of canvas rendering, 150 styles in 12 families, an advanced editor, MediaRecorder export | Reduced to 8 to 12 house formats. See "The 150 styles" below. |
| Opgeslagen | `voxSaved` in localStorage, JSON export | Campaigns, variants, and versions in Postgres |
| Advertenties | `adCard`, `adCPC`, `adToVideo`, ad copy for Google and Meta | A channel with its own variants and its own capability row |
| E-mail | Four templates, copy and paste | Lane 5, with segments, consent, and delivery history |
| Resultaten | `voxResults` in localStorage, manual log, CSV import and export | Lane 6, with the source and window on every number |
| Onderzoek | `RS_PERSONAS`, `RS_COMPETS`, `RS_MONITOR`, free-text notes in `voxResearchNotes` | Lane 7, as sourced signals with dates and expiry |
| Launch-playbook | `LAUNCH_CH`, checklist state in `voxLaunchDone` | A campaign template plus a checklist bound to a campaign |
| Agent | A chat and voice assistant posting to a proxy URL the operator pastes in | Not ported as-is. See "Security findings". |

## Content worth keeping verbatim

These are real work and must survive the port, not be regenerated:

- `LIB` — the hook library, tagged by channel and pillar (short, LinkedIn, blog).
- `BLOGS` — blog angles per pillar.
- `VID_DEF` — the per-pillar defaults: headline, sub, payoff, and the example clips shown on screen.
- `VIDEO_IDEAS` — the concept list.
- `RS_PERSONAS`, `RS_COMPETS`, `RS_MONITOR` — the audience and competitor research.
- `LAUNCH_CH` — the launch channels and their checklists.
- `CTAS_SHORT`, `CTAS_LI` — the approved call-to-action lines.

These become seeded records, not hard-coded arrays, so they can be edited without a deploy.

## The 150 styles

Counted from the source: KFAM 8, SFAM 8, NFAM 8, PROFAM 6, SLFAM 6, CINE 20, MOFAM 20, BRFAM 20,
EXFAM 10, TXFAM 15, DFAM 17, plus 12 standalone. Exactly 150, which matches the audit.

They are not 150 formats. They are about six real jobs (demo, statement, number, comparison,
explanation, brand end card) times a decorative variation: a different wipe, a different colour, a
different font treatment. The variation is where the effort went and it is not where the results
come from.

**What ports:** the canvas rendering engine itself, `d_*` (the real product demonstrations),
`ex_*` (the explainers), `sl_*` (the sales frames), and the compare, before-and-after, and QA
frames. These map onto house formats.

**What does not port:** the decorative families kept as separate choices. `ci_*`, `mo_*`, `br_*`,
`tx_*` become styling options inside a house format, not 75 things to pick between.

**What is lost:** the ability to browse 150 named looks. That is the intended loss. A picker with
150 options is a picker nobody uses twice the same way, which is why nothing in the current output
looks like it came from one brand.

## Security findings in the prototype

Recording these because they explain why parts are not ported as they are.

1. **The team code is not access control.** `voxLogin` hashes the entered code in the browser and
   compares it to a hash in the page source. Every page of the Studio is already in the DOM behind
   an overlay. Deleting one element in the inspector reveals everything, and the hash is offline
   crackable. Anyone with the URL has the content. Already replaced by real accounts.
2. **The agent posts to an operator-supplied URL.** `AGENT.proxy` is read from `localStorage` and
   `agentSend` posts the conversation to it. There is no allowlist and no disclosure of where the
   text goes. Not ported until there is a named provider, a written disclosure, and a record of
   what is sent.
3. **"Live" numbers come from a public counter.** `ctGet` reads `api.counterapi.dev`. Presenting
   that as results from connected accounts is the mock-data-as-live-data problem. Lane 6 shows the
   source on every number instead.
4. **All state is in the browser.** Twelve `localStorage` keys, no backup, gone with a cleared
   cache. That is the migration below.

## Migration of existing work

Twelve keys hold real operator work: `voxSaved`, `voxResults`, `voxResearchNotes`, `voxCampaigns`,
`voxCampaign`, `voxWeek`, `voxPlanDone`, `voxLaunchDone`, `voxDashUrl`, `voxAuth`,
`voxAgentProxy`, `voxAgentVoice`.

Plan:

1. A one-page export in the old Studio that dumps all twelve keys as one JSON file. Runs in the
   browser, needs no deploy of the old app if pasted into the console.
2. An import in the new Studio that maps saved posts to campaigns and variants, results to
   `MetricObservation` rows marked `MANUAL_ENTRY`, and research notes to `ResearchSignal` rows
   marked unsourced, so they cannot be promoted to evidence without a source.
3. Migration tests written against a real exported file, not a made-up one.
4. Nothing generated by the old app is treated as approved Product Truth.

## Order of work

Each step is shippable on its own and leaves the app working.

1. **House formats.** Seed 8 to 12 records with channels, ratios, hook, evidence, shot list,
   subtitles, thumbnail, CTA, and accessibility rules. Nothing renders yet; this is the vocabulary
   everything else uses.
2. **Master content and channel variants.** One concept becomes per-channel drafts carrying one
   campaign identity, each with a version and a quality-gate run. This is the generator, rebuilt.
3. **The hook library and pillar defaults**, seeded from `LIB`, `BLOGS`, `VID_DEF`, `CTAS_*`, so
   drafting starts from real material rather than a blank box.
4. **The week.** One campaign theme laid out across the calm cadence, instead of eleven posts.
5. **The video renderer.** Port the canvas engine, bound to house formats. Largest single piece.
6. **Results and the manual log**, with source and window on every number, plus the localStorage import.
7. **Research and signals**, with dates, confidence, and expiry.
8. **Ads and email** as channels with honest capability rows.
9. **The launch playbook** as a campaign template with a bound checklist.

Steps 1 to 4 make the new Studio genuinely more useful than the prototype for planning. Step 5 is
what makes it replace the prototype outright.
