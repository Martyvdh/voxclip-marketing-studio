# VoxClip brand — the source of truth for this repository

This is the working copy the quality gates enforce. It is a faithful extract of the VoxClip brand
book and Visual Brand Bible v0.2. When the brand book changes, update this file and the tests in
`src/lib/quality/` in the same commit.

## The product in one line

Everything you copy or say, captured in one place and recalled the instant you need it, by hotkey
or by voice.

## Canonical entity statement (use byte-identical, never paraphrase)

> VoxClip is a free desktop app for Mac and Windows that captures everything you copy and
> everything you dictate into one searchable Timeline, and pastes it back the instant you need it,
> by hotkey or by voice. Everything free runs entirely on your device; nothing leaves it unless you
> turn on a paid cloud feature, and VoxClip tells you plainly before anything is sent.

## The wedge

VoxClip merges clipboard history and voice dictation into a single searchable Timeline. It is not
another clipboard manager and it is not another dictation app. The unified Timeline is the point.

Core loop: capture (copy or speak) -> it lands in one searchable Timeline -> recall it (hotkey or
voice) -> it is pasted where your cursor is.

Philosophy pillars: **Capture**, **Recall**, **Calm**.

## Audience

Non-technical knowledge workers: writers, product managers, marketers, support, operations,
students. Not developers. Every headline, screenshot, and feature name must pass the 30-second
test with a non-technical colleague.

Never target developer terms (clipboard API, CLI, scripting). Wrong audience, and it feeds
confusion with the unrelated `voxclip.dev` CLI tool by another developer.

## Messaging pillars, in order

1. **One place.** Everything you copy and everything you say, together in one searchable Timeline.
2. **Recall, instantly.** Hotkey or voice, pasted right where your cursor is.
3. **Your stuff stays yours.** Local-first; it lives on your machine; you choose what, if anything, syncs.
4. **Free where it is local, paid where it is cloud.** Local is free forever; the cloud stuff is Plus.

## Voice

- **Plain over clever.** "Saved," not "persisted." "Your stuff," not "your data payload."
- **Calm, not hype.** No exclamation-mark marketing. Banned: game-changing, supercharge,
  revolutionary, seamless, leverage, synergy, unleash, effortless, blazing fast, next-level,
  cutting-edge, disrupt, 10x. Never lead with "AI-powered."
- **Short, like the product.** Recall takes two keystrokes; sentences should move that fast.
- **Respect their stuff.** Never imply we read it.
- **Show the moment, do not sell the feature.** "Paste the address you copied this morning," not
  "leverage semantic retrieval."
- **Say *you*, not "users."** Headlines in sentence case, never all-caps.

## Typography of copy

- **No em dash and no en dash in public-facing copy.** Use a comma, a full stop, or a rewrite.
- Hotkeys use key glyphs, Mac first: `⌘⇧Space`, then `Ctrl+Shift+V`.

## Naming

- "VoxClip": one word, capital V and C, always. Never Voxclip, Vox Clip, VOXCLIP, voxclip in prose.
- Feature names are Title-Case proper nouns: the **Timeline**, the **Quick-picker**, **Snippets**,
  **Templates**, the **app exclusion list**.
- "talk to your stash" stays lowercase and casual, in quotes on first use.

## Reference taglines

- Everything you copy or say, one keystroke away.
- Your clipboard and your voice, in one place.
- Say it. Clip it. Recall it.

## Colour

The 60/30/10 system with a hard teal ceiling.

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#1C2230` | Text, structure, wordmark. Does the work. |
| Paper | `#F7F7F5` | Light canvas. |
| Canvas Dark | `#14181F` | Dark canvas. |
| Signal Teal | `#12B3A6` | The one accent. One small element per view, at most 10% of any screen. Never a background wash, never small text. |
| Teal Deep | `#0B7A6E` | Teal as text or links. Passes AA. |
| Alert Red | `#E5484D` | Destructive only (clear history, delete). Never the listening state. |

The listening state is a gentle teal pulse, never red.

## Type

- **Space Grotesk** for headlines and the wordmark. H1 up to 56/700. Hierarchy from weight and
  size, never colour.
- **Inter** for product UI and body.
- **IBM Plex Mono** for captured content: clip text, `{{variables}}`, hotkeys.

## Imagery

Real product screenshots and screen recordings over stock or generated imagery. Never depict
fictional VoxClip UI as product truth. Never imply surveillance or eavesdropping. Whitespace is a
feature. Icons are flat, single-weight lines, Ink structure plus at most one teal accent. No
mascots, microphone clichés, literal clipboards, gradients, or 3-D.

## The mark

"The chip": a tile (the capture surface) holding a waveform (the voice) with a notched corner (the
clip cue). Teal is exactly one bar, the signal, never the whole mark. Wordmark is "VoxClip" in
Space Grotesk 600. Do not recolour, stretch, add gradients or shadows, or outline the wordmark.

## Prohibited in any public asset

- Fake testimonial, fake statistic, fake review, invented customer identity.
- Unsupported superlative ("the best," "the fastest," "the only") without a cited, dated source.
- Any capability that does not ship today.
- Any privacy or cloud claim that does not match the actual product state.
- Fake urgency, buried cancel, guilt, or any dark pattern at the paywall.
- Shaming the free user. Free is the real product. Plus is "the cloud stuff," never "the good stuff."
