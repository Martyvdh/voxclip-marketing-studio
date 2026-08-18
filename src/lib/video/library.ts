/**
 * De bibliotheek: vijf families startpunten, tabelgestuurd.
 *
 * Waarom tabellen en geen vijfenzeventig losse startpunten: binnen een familie
 * is de vorm overal hetzelfde en verschillen alleen de woorden. Dat vijfenzeventig
 * keer uitschrijven betekent dat je er bij de eerste vormwijziging vierenzeventig
 * vergeet. Nu verander je één `build` en lopen ze allemaal mee.
 *
 * Over de inhoud: elke regel moet waar zijn volgens `docs/product-truth.md`.
 * Niets belooft Linux, mobiel, vergadernotulen, plug-ins, teams of koppelingen —
 * die staan op de niet-doen-lijst. De sneltoets is `⌥Space`; `⌘⇧Space` start
 * dictation en komt hier dus nergens voor.
 *
 * Elementen staan altijd op y 0.78 of lager in beeld. De tekst wordt verticaal
 * gecentreerd en groeit mee met zijn lengte, dus alles daarboven loopt er op een
 * lange regel dwars doorheen. `layout.test.ts` bewaakt dat.
 */

import { beat } from "./beats";
import { closerFor, hashSlug, showsMark } from "./closers";
import { newClip, type Project } from "./project";
import type { Starter, StarterSource } from "./starters";

/**
 * Elke familie heeft een eigen handschrift.
 *
 * Dit ontbrak en dat was te zien: alles was 9:16, alles opende op Ink, alles
 * gebruikte dezelfde vier animaties en had dezelfde drie tellen. Honderdvijftig
 * startpunten die één video zijn.
 *
 * Nu verschilt per familie de vorm, het ritme, de uitlijning en het palet, en
 * binnen een familie wisselt het nog eens per startpunt. Dezelfde stem, andere
 * zin.
 */

const el = (kind: string, x: number, y: number, tone: "ink" | "paper" | "teal", delay = 0.2) => ({
  id: `${kind}-${Math.round(x * 100)}-${Math.round(y * 100)}`,
  kind,
  x,
  y,
  scale: 1,
  tone,
  text: "",
  delay,
});

// ---------------------------------------------------------------------------
// Familie 1 — Demo's. Vragen om jouw opname.
// ---------------------------------------------------------------------------

export interface DemoRow {
  slug: string;
  /** Het verlies of de vraag waar je mee opent. */
  setup: string;
  /** Wat er tijdens de opname te zien is. Kort, staat in beeld. */
  during: string;
  /** Wat je eraan overhoudt. */
  payoff: string;
  /** De opnamenotitie. Staat in de editor, wordt nooit getekend. */
  record: string;
}

export const DEMOS: DemoRow[] = [
  { slug: "recall-basic", setup: "You copied it an hour ago.", during: "Two keys and it is back.", payoff: "Pasted where your cursor was.", record: "Record: cursor in an email, press ⌥Space, type three letters, Enter. One take, no hesitation." },
  { slug: "recall-anywhere", setup: "It works in whatever you are using.", during: "No window to open first.", payoff: "Same two keys, everywhere.", record: "Record: do the same recall in three different apps, cut together. Four seconds total." },
  { slug: "timeline-scroll", setup: "Everything you copied today.", during: "And everything you said.", payoff: "One list, one search.", record: "Record: scroll the Timeline slowly so copies and dictations are visible side by side." },
  { slug: "search-typing", setup: "You only remember a word of it.", during: "That is enough.", payoff: "Three letters and there it is.", record: "Record: type three letters in the search field and watch the list narrow." },
  { slug: "search-by-meaning", setup: "You forgot the exact words.", during: "Search what you meant instead.", payoff: "Free, and it runs on your machine.", record: "Record: type a rough description, not the exact text, and let the right clip come up." },
  { slug: "dictate-note", setup: "Typing the note is slower than saying it.", during: "So say it.", payoff: "It lands in the same Timeline.", record: "Record: dictate one sentence and watch the words appear. Keep it short." },
  { slug: "dictate-anywhere", setup: "A thought worth keeping, no app open.", during: "One keystroke and talk.", payoff: "Nothing to open first.", record: "Record: start dictation from a completely different app." },
  { slug: "snippet-save", setup: "You have typed this reply five times.", during: "Save it once.", payoff: "Now it is two keystrokes.", record: "Record: save a block of text as a Snippet, then recall it." },
  { slug: "template-vars", setup: "Same email, different date, every week.", during: "Let the date fill itself in.", payoff: "Type it once, use it forever.", record: "Record: a Template with {{date}} being inserted and filled." },
  { slug: "quickpicker-filter", setup: "Your history is long.", during: "The picker narrows as you type.", payoff: "You never scroll.", record: "Record: open the Quick-picker and type, showing the list shrink with each letter." },
  { slug: "images-too", setup: "It is not only text.", during: "Images and files as well.", payoff: "Whatever you copied, it kept.", record: "Record: copy an image, then recall and paste it." },
  { slug: "rich-text", setup: "Formatting survives.", during: "Paste it back the way you copied it.", payoff: "No reformatting afterwards.", record: "Record: copy formatted text and paste it with the formatting intact." },
  { slug: "exclusion-list", setup: "Some apps you would rather it ignored.", during: "Tell it which.", payoff: "It never captures those.", record: "Record: Settings → Privacy → add an app to the ignore list." },
  { slug: "clear-history", setup: "You want it gone.", during: "One click.", payoff: "Really gone.", record: "Record: the one-click clear, and the empty Timeline afterwards." },
  { slug: "stays-local", setup: "An app that keeps everything you copy.", during: "Where does it go?", payoff: "Nowhere. It stays on your machine.", record: "Record: the line in Settings that states this. Only if it really says that." },
  { slug: "form-filling", setup: "One form, details from four places.", during: "All four are already in the list.", payoff: "Paste, paste, paste, done.", record: "Record: fill a form using four different items from the Timeline in a row." },
  { slug: "two-monitors", setup: "Copying between two windows.", during: "Skip the window.", payoff: "Paste where your cursor is.", record: "Record: recall something without ever leaving the window you are typing in." },
  { slug: "filter-copied", setup: "Only what you copied.", during: "Or only what you said.", payoff: "One tap to sort it out.", record: "Record: switch between the All, Copied and Spoke filters." },
  { slug: "long-text", setup: "You copied three paragraphs.", during: "Still there, in full.", payoff: "Nothing gets truncated.", record: "Record: recall a long block of text and paste it whole." },
  { slug: "after-restart", setup: "You restarted your Mac.", during: "It is all still there.", payoff: "Your history does not reset.", record: "Record: the Timeline after a restart, with yesterday's items still listed." },
  { slug: "no-account", setup: "No sign-up.", during: "No account. No email.", payoff: "Install it and it works.", record: "Record: first launch straight into a working Timeline." },
  { slug: "settings-tour", setup: "Everything you can change.", during: "It fits on one screen.", payoff: "Nothing to configure to start.", record: "Record: a slow pass through the Settings tabs. Do not stop on any one." },
];

/**
 * Demo's: kort, kort, LANG, kort.
 *
 * De opname is het onderwerp, dus die krijgt de tijd en de rest niet. Links
 * uitgelijnd en op Ink, zodat je meteen ziet dat dit een ander soort video is
 * dan een uitlegger. Drie varianten wisselen elkaar af.
 */
function buildDemo(row: DemoRow, s: StarterSource): Project {
  const slug = `demo-${row.slug}`;
  const variant = hashSlug(slug) % 3;

  const opener =
    variant === 0
      ? newClip({ text: row.setup, animation: "whip", seconds: 1.8, size: "l", align: "left", theme: "ink" })
      : variant === 1
        ? newClip({ text: row.setup, animation: "typeline", seconds: 2.2, theme: "ink" })
        : newClip({ text: row.setup, animation: "zoom-in", seconds: 1.5, size: "l" });

  return {
    ratio: "9:16",
    showMark: showsMark(slug),
    clips: [
      opener,
      beat("demo", { seconds: variant === 2 ? 0.5 : 0.7, theme: variant === 1 ? "paper" : "ink" }),
      newClip({
        text: row.during,
        animation: "hold",
        seconds: 5,
        align: variant === 0 ? "left" : "center",
        note: row.record,
        elements:
          variant === 1 ? [el("frame-window", 0.5, 0.8, "paper", 0.1)] : [el("chips-copied", 0.5, 0.82, "paper")],
      }),
      newClip({
        text: row.payoff,
        animation: variant === 2 ? "punch" : "rise-fast",
        seconds: 2,
        size: "l",
      }),
      closerFor(slug, s),
    ],
  };
}

// ---------------------------------------------------------------------------
// Familie 2 — Uitleggers. Geen opname nodig.
// ---------------------------------------------------------------------------

export interface ExplainRow {
  slug: string;
  question: string;
  answer: string;
  detail: string;
}

export const EXPLAINERS: ExplainRow[] = [
  { slug: "what-is-it", question: "What is VoxClip?", answer: "Everything you copy and everything you say, in one place.", detail: "Recalled by hotkey or by voice." },
  { slug: "why-together", question: "Why put copying and talking together?", answer: "Because they are the same habit.", detail: "It crossed your screen and you will want it back." },
  { slug: "not-clipboard-manager", question: "Isn't this just a clipboard manager?", answer: "A clipboard manager does not hear you.", detail: "One Timeline for both, or it is not the point." },
  { slug: "not-dictation-app", question: "Isn't this just a dictation app?", answer: "A dictation app forgets what you copied.", detail: "Here they sit in the same list." },
  { slug: "what-is-timeline", question: "What is the Timeline?", answer: "One feed of everything you kept.", detail: "Copies and dictations, newest first." },
  { slug: "what-is-quickpicker", question: "What is the Quick-picker?", answer: "Your history, on top of whatever you are doing.", detail: "⌥Space. Type. Enter." },
  { slug: "what-are-snippets", question: "What are Snippets?", answer: "The things you type over and over, saved once.", detail: "Two keystrokes instead of a paragraph." },
  { slug: "what-are-templates", question: "What are Templates?", answer: "Snippets that fill themselves in.", detail: "The date, the last thing you copied." },
  { slug: "how-much", question: "What does it cost?", answer: "Nothing, for everything that runs on your machine.", detail: "€6.99 a month only for the cloud parts." },
  { slug: "what-is-free", question: "What is actually free?", answer: "Clipboard history, dictation, search, Snippets.", detail: "Not a trial. Not a teaser." },
  { slug: "what-is-paid", question: "What do you pay for?", answer: "Sync between machines, and asking your history questions.", detail: "The things that need our servers." },
  { slug: "why-freemium", question: "Why that split?", answer: "If it runs on your machine, it is free.", detail: "If it needs our servers, it is paid." },
  { slug: "where-data", question: "Where does your stuff go?", answer: "Nowhere. It stays on your device.", detail: "Nothing leaves unless you turn on sync." },
  { slug: "dictation-privacy", question: "Does your voice go anywhere?", answer: "No. Not on either plan.", detail: "Dictation runs on your machine." },
  { slug: "sync-encrypted", question: "What if you do turn on sync?", answer: "It is encrypted before it leaves.", detail: "Our servers only ever hold ciphertext." },
  { slug: "recovery-code", question: "And if you lose the recovery code?", answer: "Then the synced data cannot be restored.", detail: "We would rather say that than pretend otherwise." },
  { slug: "which-machines", question: "What does it run on?", answer: "macOS 12 and up. Windows 10 and up.", detail: "No Linux, no phone. On purpose." },
  { slug: "how-to-start", question: "How do you start?", answer: "Download it. Copy something.", detail: "There is no step three." },
];

/**
 * Uitleggers: rustig en op Paper.
 *
 * Dit is de familie die tijd mag nemen — een vraag beantwoorden gaat niet
 * sneller door hem sneller te knippen. Licht in plaats van donker, want dat
 * onderscheidt hem meteen van de demo's.
 */
function buildExplainer(row: ExplainRow, s: StarterSource): Project {
  const slug = `explain-${row.slug}`;
  const variant = hashSlug(slug) % 3;

  return {
    ratio: variant === 2 ? "1:1" : "9:16",
    showMark: showsMark(slug),
    clips: [
      newClip({
        text: row.question,
        animation: variant === 0 ? "typeline" : "fade-rise",
        seconds: 3,
        size: "l",
        align: variant === 1 ? "left" : "center",
      }),
      beat("explain", { seconds: 0.6, theme: variant === 0 ? "paper" : "ink" }),
      newClip({
        text: row.answer,
        animation: variant === 1 ? "drop-in" : "fly-in",
        seconds: 3.5,
        theme: "ink",
        align: variant === 1 ? "left" : "center",
      }),
      newClip({
        text: row.detail,
        animation: "letter-fade",
        seconds: 3,
        elements: variant === 0 ? [el("rule-thin", 0.5, 0.8, "teal", 0.3)] : [],
      }),
      closerFor(slug, s),
    ],
  };
}

// ---------------------------------------------------------------------------
// Familie 3 — Bezwaren. Wat mensen echt terugschrijven.
// ---------------------------------------------------------------------------

export interface ObjectionRow {
  slug: string;
  objection: string;
  reply: string;
  proof: string;
}

export const OBJECTIONS: ObjectionRow[] = [
  { slug: "obj-creepy", objection: "An app that reads everything I copy?", reply: "It keeps it. It does not read it.", proof: "Nothing leaves your device." },
  { slug: "obj-passwords", objection: "I paste passwords sometimes.", reply: "Then tell it to ignore that app.", proof: "One line in Settings and it never looks." },
  { slug: "obj-free-catch", objection: "What is the catch with free?", reply: "There isn't one. Local costs us nothing.", proof: "You pay only when our servers do the work." },
  { slug: "obj-another-app", objection: "I don't need another app running.", reply: "Fair. This one replaces two.", proof: "Your clipboard tool and your dictation tool." },
  { slug: "obj-already-have", objection: "My Mac already has a clipboard.", reply: "It remembers one thing.", proof: "That is the whole problem." },
  { slug: "obj-slow", objection: "Will it slow my machine down?", reply: "It is a list of text on a disk.", proof: "No cloud call, no upload, no wait." },
  { slug: "obj-learning", objection: "I don't want to learn a new tool.", reply: "There is one shortcut to learn.", proof: "⌥Space. That is the tutorial." },
  { slug: "obj-trust-small", objection: "Why trust a small developer?", reply: "Because nothing goes to us by default.", proof: "You do not have to trust us with what you never send." },
  { slug: "obj-unsigned", objection: "My Mac warned me about the installer.", reply: "It says unverified developer, not harmful.", proof: "Code signing is on the way." },
  { slug: "obj-subscription", objection: "Another subscription?", reply: "Only if you want the cloud parts.", proof: "The daily habit stays free forever." },
  { slug: "obj-lock-in", objection: "What if I stop using it?", reply: "Your stuff was always on your machine.", proof: "Nothing to export, nothing held hostage." },
  { slug: "obj-team", objection: "Can my whole team use it?", reply: "Everyone installs their own.", proof: "It is built for one person's memory." },
];

/**
 * Bezwaren: heen en weer slaan tussen donker en licht.
 *
 * De vraag staat op Ink, het antwoord op Paper, het bewijs weer op Ink. Die
 * flikkering is het handschrift van deze familie — je ziet aan het ritme al dat
 * er iemand tegengesproken wordt.
 */
function buildObjection(row: ObjectionRow, s: StarterSource): Project {
  const slug = row.slug;
  const variant = hashSlug(slug) % 2;

  return {
    ratio: "9:16",
    showMark: showsMark(slug),
    clips: [
      newClip({
        text: row.objection,
        animation: variant === 0 ? "stack" : "typeline",
        seconds: 3,
        theme: "ink",
        align: "left",
        elements: [el("quote-open", 0.18, 0.8, "paper", 0.1)],
      }),
      beat("objection", { seconds: 0.5, theme: "paper" }),
      newClip({
        text: row.reply,
        animation: "punch",
        seconds: 2,
        size: "l",
      }),
      newClip({
        text: row.proof,
        animation: "whip",
        seconds: 2.5,
        theme: "ink",
        align: "left",
        elements: variant === 1 ? [el("tick", 0.2, 0.82, "teal", 0.25)] : [],
      }),
      closerFor(slug, s),
    ],
  };
}

// ---------------------------------------------------------------------------
// Familie 4 — Voor wie. Eén beroep, één moment.
// ---------------------------------------------------------------------------

export interface AudienceRow {
  slug: string;
  who: string;
  moment: string;
  why: string;
}

export const AUDIENCES: AudienceRow[] = [
  { slug: "for-writers", who: "If you write for a living", moment: "The line you cut and now want back.", why: "It was never really gone." },
  { slug: "for-support", who: "If you answer the same question all day", moment: "The reply you have typed forty times.", why: "Save it once. Two keys after that." },
  { slug: "for-pms", who: "If your day is other people's tabs", moment: "Four links, three names, one doc.", why: "All of it in one list." },
  { slug: "for-marketers", who: "If you move copy between five tools", moment: "Headline here, caption there.", why: "Copy once, paste everywhere." },
  { slug: "for-students", who: "If you are writing something long", moment: "The quote you found last Tuesday.", why: "Search it by what it meant." },
  { slug: "for-recruiters", who: "If you send the same message daily", moment: "Same intro, different name.", why: "A Template with the name filled in." },
  { slug: "for-devs-no", who: "If you copy things all day", moment: "Codes, addresses, order numbers.", why: "None of them need to be retyped." },
  { slug: "for-admin", who: "If your job is forms", moment: "The same details, over and over.", why: "Snippets, not memory." },
  { slug: "for-freelance", who: "If you invoice every month", moment: "The line items you always retype.", why: "Saved once, reused forever." },
  { slug: "for-translators", who: "If you work in two languages", moment: "The phrase you already solved.", why: "It is still in your Timeline." },
  { slug: "for-researchers", who: "If you collect as you read", moment: "Twelve quotes, one afternoon.", why: "All twelve are kept." },
  { slug: "for-thinkers", who: "If your best ideas arrive walking", moment: "One keystroke and say it.", why: "It lands with everything else." },
];

/**
 * Voor wie: snel en klein.
 *
 * Vijf korte tellen achter elkaar in plaats van drie lange. Deze familie moet
 * aanvoelen als iemand die een lijstje opdreunt en jou eruit pikt, dus de tekst
 * is klein en de knip zit er strak op.
 */
function buildAudience(row: AudienceRow, s: StarterSource): Project {
  const slug = `who-${row.slug}`;
  const variant = hashSlug(slug) % 2;

  return {
    ratio: variant === 0 ? "9:16" : "1:1",
    showMark: showsMark(slug),
    clips: [
      newClip({ text: row.who, animation: "rise-fast", seconds: 1.4, size: "s", align: "left" }),
      newClip({ text: row.moment, animation: "fly-in", seconds: 2.2, align: "left", theme: "ink" }),
      beat("audience", { seconds: 0.6, theme: variant === 0 ? "paper" : "ink" }),
      newClip({
        text: row.why,
        animation: "spotlight",
        seconds: 2.6,
        size: "l",
        elements: variant === 0 ? [el("rule-thick", 0.5, 0.8, "teal", 0.25)] : [],
      }),
      closerFor(slug, s),
    ],
  };
}

// ---------------------------------------------------------------------------
// Familie 5 — Functies, één per video.
// ---------------------------------------------------------------------------

export interface FeatureRow {
  slug: string;
  feature: string;
  what: string;
  why: string;
  /** Vierkant voor de rustige, staand voor de rest. */
  square?: boolean;
}

export const FEATURES: FeatureRow[] = [
  { slug: "feat-timeline", feature: "The Timeline", what: "One feed of everything you kept.", why: "Copies and dictations, together." },
  { slug: "feat-quickpicker", feature: "The Quick-picker", what: "Your history over whatever you are doing.", why: "⌥Space, type, Enter." },
  { slug: "feat-snippets", feature: "Snippets", what: "Text you reuse, saved once.", why: "Two keystrokes instead of a paragraph." },
  { slug: "feat-templates", feature: "Templates", what: "Snippets that fill themselves in.", why: "The date, the last thing you copied.", square: true },
  { slug: "feat-meaning", feature: "Search by meaning", what: "Find it without the exact words.", why: "Free, and on your device." },
  { slug: "feat-dictation", feature: "Dictation", what: "Say it instead of typing it.", why: "The audio never leaves your machine." },
  { slug: "feat-exclusion", feature: "The app exclusion list", what: "Apps it never looks at.", why: "Your password manager, for a start." },
  { slug: "feat-clear", feature: "One-click clear", what: "Everything, gone, now.", why: "No confirmation maze." },
  { slug: "feat-images", feature: "Images and files", what: "Not only text.", why: "Whatever you copied, it kept.", square: true },
  { slug: "feat-sync", feature: "Sync", what: "Mac at work, Windows at home.", why: "Encrypted before it leaves. Plus." },
  { slug: "feat-stash", feature: "Talk to your stash", what: "Ask your own history a question.", why: "Out loud. Plus." },
  { slug: "feat-enhance", feature: "Enhance", what: "A rough spoken note, tidied up.", why: "Paste-ready. Plus." },
];

/**
 * Functies: één woord, groot, en dan stil.
 *
 * De enige familie die ook liggend voorkomt. Een 16:9 tussen vijftig staande
 * video's valt op in je eigen overzicht, en je hebt hem nodig voor je site en
 * je mails.
 */
function buildFeature(row: FeatureRow, s: StarterSource): Project {
  const slug = row.slug;
  const variant = hashSlug(slug) % 3;

  return {
    ratio: row.square ? "1:1" : variant === 0 ? "16:9" : "9:16",
    showMark: showsMark(slug),
    clips: [
      beat("feature", { seconds: 0.5, theme: variant === 2 ? "paper" : "ink" }),
      newClip({
        text: row.feature,
        animation: variant === 1 ? "drop-in" : "punch",
        seconds: 1.6,
        size: "l",
        theme: variant === 2 ? "ink" : "paper",
      }),
      newClip({
        text: row.what,
        animation: variant === 0 ? "slide-left" : "fade-rise",
        seconds: 2.8,
        align: variant === 0 ? "left" : "center",
      }),
      newClip({
        text: row.why,
        animation: "spotlight",
        seconds: 2.6,
        theme: variant === 2 ? "paper" : "ink",
        elements: variant === 1 ? [el("underline", 0.5, 0.8, "teal", 0.3)] : [],
      }),
      closerFor(slug, s),
    ],
  };
}

// ---------------------------------------------------------------------------
// De families als startpunten.
// ---------------------------------------------------------------------------

export const DEMO_LIBRARY: Starter[] = DEMOS.map((row) => ({
  slug: `demo-${row.slug}`,
  name: `Demo: ${row.setup}`,
  intent: `Needs one recording. ${row.record}`,
  build: (s) => buildDemo(row, s),
}));

export const EXPLAINER_LIBRARY: Starter[] = EXPLAINERS.map((row) => ({
  slug: `explain-${row.slug}`,
  name: row.question,
  intent: `No footage needed. ${row.answer}`,
  build: (s) => buildExplainer(row, s),
}));

export const OBJECTION_LIBRARY: Starter[] = OBJECTIONS.map((row) => ({
  slug: row.slug,
  name: row.objection,
  intent: `Answers it before anyone asks. ${row.reply}`,
  build: (s) => buildObjection(row, s),
}));

export const AUDIENCE_LIBRARY: Starter[] = AUDIENCES.map((row) => ({
  slug: `who-${row.slug}`,
  name: row.who,
  intent: `One job, one moment. ${row.why}`,
  build: (s) => buildAudience(row, s),
}));

export const FEATURE_LIBRARY: Starter[] = FEATURES.map((row) => ({
  slug: row.slug,
  name: row.feature,
  intent: `One feature, on its own. ${row.what}`,
  build: (s) => buildFeature(row, s),
}));
