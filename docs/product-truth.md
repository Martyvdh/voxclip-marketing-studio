# Product Truth — the one authoritative record

Every public-facing claim this system generates is validated against this record. If a generated
asset contradicts it, the asset fails a quality gate. The gate never auto-corrects a material
claim; it shows the operator and requires a deliberate revision.

The seed in `prisma/seed.ts` loads this file's values into the `ProductTruth` and `ProductClaim`
tables. **This markdown file is documentation; the database row is what the code reads.**

Every fact below carries a source and a review date. A fact past its review date is surfaced as
stale and blocks approval of any asset that depends on it.

## Status of this record

| Field | Value |
| --- | --- |
| Version of this record | `0.1.0` |
| Last verified | 2026-08-12 |
| Next review | 2026-09-12 |
| Owner | Marty |
| Verified against | `voxclip.it` site copy and the VoxClip Marketing project instructions |

> **Open verification gaps.** The items marked `NEEDS VERIFICATION` below were carried over from
> the marketing project instructions and have not yet been checked against the release repository
> (`github.com/Arend0/voxclip-releases`) or the shipped build. They must not be used in a public
> asset until verified. The seed marks them `unverified` and the gate blocks them.

## Product identity

| Fact | Value | Confidence |
| --- | --- | --- |
| Name | VoxClip | verified |
| Category | Desktop app that merges clipboard history and voice dictation into one searchable Timeline | verified |
| Website | `voxclip.it` | verified |
| Downloads | `github.com/Arend0/voxclip-releases` | verified |
| Vendor | Sole proprietor, Netherlands, GDPR-first | verified |
| Launch language | English (hreflang-ready for NL later) | verified |

## Platforms

| Fact | Value | Confidence |
| --- | --- | --- |
| macOS | 12 or later | verified |
| Windows | 10 or later | verified |
| Linux | Not supported, cut from v1 | verified |
| Mobile | Not supported, cut from v1 | verified |

## Release state

| Fact | Value | Confidence |
| --- | --- | --- |
| Current shipping version | `NEEDS VERIFICATION` — read from the latest release tag, never guess | unverified |
| Installer signing | Installers are unsigned. The Gatekeeper and SmartScreen warning means "unverified developer," not "harmful." Code signing is on the roadmap. Keep this honesty on the download page. | verified |
| Dictation model | Real dictation runs a local model enabled in release builds. A default dev build ships a mock. Never imply a state that is not shipping. | verified |

## Hotkeys

| Fact | Value | Confidence |
| --- | --- | --- |
| Quick-picker, macOS | `⌘⇧Space` | `NEEDS VERIFICATION` against the shipped default |
| Quick-picker, Windows | `Ctrl+Shift+V` | `NEEDS VERIFICATION` against the shipped default |

> The audit found shortcut claims conflicting between the Studio, the product defaults, and the
> public site. Until one source is confirmed, no asset may state a hotkey.

## Free tier — runs on your device, no account

- Clipboard history: text, rich text, images, files.
- Local voice dictation. Audio never leaves the device, on either tier.
- One searchable Timeline, including search by meaning.
- Snippets and Templates with variables.
- The Quick-picker.
- Privacy guardrails: app exclusion list, one-click clear.

## VoxClip Plus — needs our servers

| Fact | Value |
| --- | --- |
| Monthly price | €6.99 |
| Yearly price | €59 |
| Trial | 7 days free |

- Encrypted cross-device sync, Mac and Windows. End-to-end encrypted; servers store only ciphertext.
- "talk to your stash": ask your history a question out loud. This is the hero.
- AI transforms on paste: clean up, summarize, translate, reformat.
- Enhance: turn a rough dictated note into a structured, paste-ready prompt.
- Extended retention.

## Privacy claims that are approved verbatim

- The Timeline lives on your device.
- Nothing leaves your device unless you turn on a paid cloud feature, and VoxClip tells you plainly
  before anything is sent.
- Dictation audio never leaves your machine, on either tier.
- Sync is end-to-end encrypted; our servers store only ciphertext.
- If you lose your recovery code, synced data cannot be restored. State this honestly; do not paper
  over it.
- AI features send only the specific approved text, after an in-app disclosure. Never audio, never
  the whole Timeline. Not used to train models.

## The freemium line (most quotable sentence, use verbatim)

> If it runs on your machine, it is free. If it needs our servers, it is paid.

## Cut list — never market or imply

Linux, mobile, meeting transcription or diarization, end-user plugins or automation, developer
power-user surfaces, teams or sharing or collaboration, browser extension, end-user third-party
integrations (Notion, Slack, and similar).

Marketing Studio integrations used by the VoxClip marketing team are internal operator tooling.
They do not change this cut list.

## Disambiguation (required in titles and FAQ)

"voxclip" also matches `voxclip.dev`, an unrelated open-source CLI tool by another developer.
Always pair "VoxClip" with "for Mac and Windows" in titles, and keep the polite FAQ line that names
the difference. Never drift toward developer framing.
