/**
 * Vijftig korte video's in één vorm.
 *
 * Afgeleid van de vijf die er al waren: veertien seconden, verticaal, donker,
 * en steeds dezelfde vijf beats. Haakje, kennismaking, één reden, de payoff,
 * de afsluiter met de knop.
 *
 * Waarom een tabel en geen vijftig losse startpunten: de vorm is bij alle
 * vijftig hetzelfde en alleen de woorden verschillen. Dat als vijftig keer
 * dezelfde code opschrijven is vragen om er negenenveertig te vergeten zodra
 * de vorm verandert. Nu verander je `build` op één plek en lopen ze allemaal
 * mee.
 *
 * Over de inhoud: elk haakje is een moment dat iemand herkent, niet een
 * eigenschap van het product. "Tien tabbladen open om iets terug te vinden"
 * werkt, "geavanceerde zoekfunctie" niet. En geen enkele belooft iets dat de
 * app niet doet; dat is niet netheid maar zelfbehoud, want de eerste die het
 * downloadt controleert het meteen.
 */

import { newClip, type Project } from "./project";
import type { Starter, StarterSource } from "./starters";

export interface Short {
  slug: string;
  /** De eerste regel. Een moment, geen functie. */
  hook: string;
  /** Wat er onder "Meet VoxClip." staat. */
  meet: string;
  /** Eén reden, met een vinkje ervoor. */
  why: string;
}

/**
 * De vorm. Veertien seconden, vijf clips.
 *
 * De afsluiter is overal woordelijk gelijk. Bij vijftig video's op één account
 * is die herhaling geen luiheid maar het enige dat ze tot één ding maakt.
 */
function buildShort(short: Short, s: StarterSource): Project {
  return {
    ratio: "9:16",
    showMark: true,
    clips: [
      newClip({
        text: short.hook,
        animation: "fade-rise",
        seconds: 3,
        size: "l",
        theme: "ink",
      }),
      newClip({
        text: "Meet VoxClip.",
        secondary: short.meet,
        animation: "wipe-up",
        seconds: 2.5,
        theme: "ink",
      }),
      newClip({
        text: "Why you need it",
        secondary: short.why,
        animation: "stack",
        seconds: 3,
        theme: "ink",
      }),
      newClip({
        text: "One Timeline. Local.",
        secondary: "voxclip.it · Mac & Windows",
        animation: "letter-fade",
        seconds: 3,
        theme: "ink",
      }),
      newClip({
        text: s.ctaLabel,
        secondary: "free · Mac & Windows · voxclip.it",
        animation: "hold",
        seconds: 2.5,
        theme: "ink",
      }),
    ],
  };
}

/**
 * De vijftig.
 *
 * Gegroepeerd op wat ze aanspreken, zodat je ze niet vijf dagen achter elkaar
 * over hetzelfde laat gaan. De groepen staan in de volgorde waarin ik ze zou
 * posten: eerst het verlies dat iedereen kent, dan de snelheid, dan pas
 * privacy en prijs.
 */
export const SHORTS: Short[] = [
  // --- Kwijt (10) -----------------------------------------------------------
  { slug: "lost-01", hook: "You copied it. Then you copied something else.", meet: "Both are still there.", why: "Nothing you copy is gone" },
  { slug: "lost-02", hook: "10 tabs open to find one link.", meet: "One searchable Timeline for both.", why: "One place for copy + voice" },
  { slug: "lost-03", hook: "Where did that address go?", meet: "It is still in your Timeline.", why: "Everything you copy is kept" },
  { slug: "lost-04", hook: "You had it 30 seconds ago.", meet: "You still do.", why: "Nothing falls off the clipboard" },
  { slug: "lost-05", hook: "Scrolling back through a chat to find one number.", meet: "Search instead.", why: "One search across everything" },
  { slug: "lost-06", hook: "That code expired while you looked for it.", meet: "Two keystrokes next time.", why: "Recall without leaving the app" },
  { slug: "lost-07", hook: "You copy over the thing you still needed.", meet: "Not anymore.", why: "The old one stays" },
  { slug: "lost-08", hook: "Reopening a closed tab to copy one line.", meet: "It was already saved.", why: "Copy once, use it later" },
  { slug: "lost-09", hook: "Three windows to move one sentence.", meet: "Zero.", why: "Paste where your cursor is" },
  { slug: "lost-10", hook: "The link you sent yourself and lost.", meet: "It is in the Timeline.", why: "Nothing needs a note to yourself" },

  // --- Herhaling (8) --------------------------------------------------------
  { slug: "again-01", hook: "Typing the same reply for the fifth time today.", meet: "Save it once.", why: "Snippets with variables" },
  { slug: "again-02", hook: "Your signature, again, by hand.", meet: "Two keystrokes.", why: "Templates that fill themselves in" },
  { slug: "again-03", hook: "The same address in every form.", meet: "Once is enough.", why: "Reusable snippets" },
  { slug: "again-04", hook: "You know this email by heart. Still typing it.", meet: "Stop.", why: "Saved replies, one keystroke" },
  { slug: "again-05", hook: "Copy, switch, paste, switch back. Again.", meet: "Paste where you are.", why: "No app switching" },
  { slug: "again-06", hook: "Rewriting the same prompt every morning.", meet: "Keep it.", why: "Templates with {{date}}" },
  { slug: "again-07", hook: "The invoice line you retype every month.", meet: "Save it once.", why: "Snippets, not memory" },
  { slug: "again-08", hook: "Same intro, twelfth time this week.", meet: "One keystroke instead.", why: "Reuse what you already wrote" },

  // --- Stem (6) -------------------------------------------------------------
  { slug: "voice-01", hook: "The thought you had in the shower is gone.", meet: "Say it next time.", why: "Dictation lands in the same list" },
  { slug: "voice-02", hook: "Typing a note is slower than saying it.", meet: "So say it.", why: "Voice and clipboard, one place" },
  { slug: "voice-03", hook: "You talk faster than you type.", meet: "Use that.", why: "Dictate from any app" },
  { slug: "voice-04", hook: "A thought worth keeping, and no app open.", meet: "One keystroke and talk.", why: "No window to open first" },
  { slug: "voice-05", hook: "Your voice notes live in a different app than your clips.", meet: "Not here.", why: "One timeline for both" },
  { slug: "voice-06", hook: "Say it. Find it. Paste it.", meet: "That is the whole loop.", why: "Search what you said" },

  // --- Snelheid (8) ---------------------------------------------------------
  { slug: "fast-01", hook: "From \"where was that\" to pasted.", meet: "Two keystrokes.", why: "Recall anywhere" },
  { slug: "fast-02", hook: "Two keys and it is back.", meet: "That is the whole thing.", why: "No mouse, no menu" },
  { slug: "fast-03", hook: "You spend 20 seconds looking. Ten times a day.", meet: "Do the maths.", why: "Instant recall" },
  { slug: "fast-04", hook: "Faster than reopening the app you copied it from.", meet: "Much faster.", why: "Paste at the cursor" },
  { slug: "fast-05", hook: "No menu. No window. No mouse.", meet: "Just the keys.", why: "Works in any app" },
  { slug: "fast-06", hook: "Type three letters. Press enter. Done.", meet: "That is recall.", why: "Search as you type" },
  { slug: "fast-07", hook: "The fastest way back to something you had.", meet: "By a lot.", why: "One hotkey, everywhere" },
  { slug: "fast-08", hook: "Your clipboard remembers one thing. That is the problem.", meet: "Ours remembers all of them.", why: "Full history, searchable" },

  // --- Privacy (8) ----------------------------------------------------------
  { slug: "priv-01", hook: "An app that keeps everything you copy. Where does it go?", meet: "Nowhere.", why: "It stays on your machine" },
  { slug: "priv-02", hook: "You paste passwords. You should ask where they end up.", meet: "On your device. Nowhere else.", why: "Local by default" },
  { slug: "priv-03", hook: "No account needed to start.", meet: "None at all.", why: "Nothing to sign up for" },
  { slug: "priv-04", hook: "What you dictate never leaves your Mac.", meet: "Not once.", why: "Audio stays on device" },
  { slug: "priv-05", hook: "Some apps you should not trust with your clipboard.", meet: "Fair. Here is ours.", why: "Nothing leaves unless you turn on sync" },
  { slug: "priv-06", hook: "You can tell it to ignore your password manager.", meet: "One setting.", why: "App exclusion list" },
  { slug: "priv-07", hook: "Clear everything in one click.", meet: "Really everything.", why: "One-click clear history" },
  { slug: "priv-08", hook: "Local is not a feature. It is the default.", meet: "And it is free.", why: "Runs on your machine" },

  // --- Prijs (5) ------------------------------------------------------------
  { slug: "price-01", hook: "Does it run on your machine? Then it is free.", meet: "That is the whole rule.", why: "Free where it is local" },
  { slug: "price-02", hook: "Free. Not a trial. Not a teaser.", meet: "The daily part costs nothing.", why: "Clipboard and dictation, free" },
  { slug: "price-03", hook: "Search by meaning, not by exact words.", meet: "And it is in the free tier.", why: "Free, on your device" },
  { slug: "price-04", hook: "You only pay when it needs our servers.", meet: "Sync and the cloud bits.", why: "Honest split, plainly said" },
  { slug: "price-05", hook: "No ads. No upsell popups.", meet: "Just the app.", why: "Free tier is the real product" },

  // --- Situaties (5) --------------------------------------------------------
  { slug: "case-01", hook: "Filling in a form with details from four places.", meet: "All four are in one list.", why: "Everything in one Timeline" },
  { slug: "case-02", hook: "Writing a reply that needs three things you copied earlier.", meet: "All still there.", why: "Nothing gets overwritten" },
  { slug: "case-03", hook: "Moving notes from a call into a document.", meet: "Say it once, paste it once.", why: "Voice and text together" },
  { slug: "case-04", hook: "Booking something with details spread over five emails.", meet: "Copy them all. Use them all.", why: "Full clipboard history" },
  { slug: "case-05", hook: "Mac at work, Windows at home.", meet: "Same app on both.", why: "Mac and Windows" },
];

/** Elke short als startpunt, zodat ze in de editor staan. */
export const SHORT_STARTERS: Starter[] = SHORTS.map((short) => ({
  slug: `short-${short.slug}`,
  name: `Short: ${short.hook}`,
  intent: `Fourteen seconds, vertical, dark. ${short.why}.`,
  build: (s) => buildShort(short, s),
}));
