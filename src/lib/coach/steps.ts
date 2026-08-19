/**
 * Welke stap je nu bent.
 *
 * De Guide-pagina noemt de negen stappen. Dit zegt welke van de negen aan de
 * beurt is, op basis van wat er echt in de database staat. Eén regel per stap,
 * eerste die past wint, en de volgorde is de volgorde van het werk.
 *
 * Geen tour met genummerde ballonnen die je één keer doorklikt. Dit leest de
 * stand af, dus het blijft kloppen als je halverwege stopt, morgen terugkomt of
 * met twee campagnes tegelijk bezig bent.
 */

export interface CoachState {
  /** Feiten in Product Truth die nog niet gebruikt kunnen worden. */
  unverifiedFacts: number;
  /** Actieve campagnes, gearchiveerde niet meegerekend. */
  campaignCount: number;
  /** De campagne waar de eerstvolgende handeling ligt. */
  focus:
    | {
        slug: string;
        title: string;
        /**
         * De code erbij, want twee campagnes kunnen dezelfde titel hebben.
         *
         * Zonder dit staat het bandje over campagne A te praten terwijl je
         * campagne B open hebt, en klopt alles wat het zegt behalve waarover.
         */
        campaignCode: string;
        /** Wat de statemachine als volgende stap ziet. */
        actionLabel: string;
        actionDetail: string;
        status: string;
        /**
         * Of de brief af is.
         *
         * Dit en niet de status. De status blijft IDEA tot iemand hem apart
         * doorzet, en dat is boekhouding: teksten schrijven kan al zodra de
         * brief er staat. Op de status kijken liet het bandje "schrijf de brief"
         * blijven zeggen nadat de brief geschreven was.
         */
        briefComplete: boolean;
        variantCount: number;
        variantsFailingGate: number;
        /** Teksten die goedgekeurd, ingepland of gepost zijn. */
        variantsPastReview: number;
      }
    | undefined;
  /** Teksten die op een beslissing wachten. */
  awaitingReview: number;
  /** Goedgekeurd maar nog niet ingepland. */
  approvedNotPlanned: number;
  /** Ingepland, tijd is geweest, nog niet afgevinkt als gepost. */
  duePosts: number;
  /** Welke er als eerste klaarstaat. Zonder naam is de stap een raadsel. */
  dueLabel?: string;
  /** Gepost, maar er staat nog geen enkel cijfer bij. */
  postedWithoutResults: number;
}

export interface Step {
  /** Waar in de negen stappen je zit. */
  number: number;
  total: number;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

export const TOTAL_STEPS = 9;

/**
 * De eerste regel die past.
 *
 * Product Truth staat vooraan omdat een niet-geverifieerd feit elke tekst
 * blokkeert die erop leunt. Dat oplossen na drie geblokkeerde teksten voelt als
 * een bug; het vooraf zeggen voelt als een instructie.
 */
export function nextStep(state: CoachState): Step | null {
  if (state.unverifiedFacts > 0 && state.campaignCount === 0) {
    return {
      number: 0,
      total: TOTAL_STEPS,
      title: `Verifieer eerst ${state.unverifiedFacts} feit${state.unverifiedFacts === 1 ? "" : "en"}`,
      body: "Zolang een feit niet geverifieerd is, blokkeert elke tekst die erop leunt. Meestal gaat het om de sneltoetsen en het versienummer. Open de app, kijk wat er staat, vul het in.",
      href: "/truth",
      linkLabel: "Naar Product Truth",
    };
  }

  if (state.campaignCount === 0) {
    return {
      number: 1,
      total: TOTAL_STEPS,
      title: "Maak je eerste campagne",
      body: "Een titel, wat er anders moet zijn als het werkt, een doelgroep en een pijler. Alles wat naar buiten gaat hangt hieraan.",
      href: "/campaigns/new",
      linkLabel: "Nieuwe campagne",
    };
  }

  if (state.postedWithoutResults > 0) {
    return {
      number: 9,
      total: TOTAL_STEPS,
      title: "Vul de cijfers in",
      body: `Er ${state.postedWithoutResults === 1 ? "staat één post" : `staan ${state.postedWithoutResults} posts`} zonder cijfers. Tik de getallen van het platform in, anders leert het systeem niets van wat je hebt gedaan.`,
      href: "/results",
      linkLabel: "Naar Results",
    };
  }

  if (state.duePosts > 0) {
    return {
      number: 8,
      total: TOTAL_STEPS,
      title: state.dueLabel
        ? `Post ${state.dueLabel}`
        : `Post ${state.duePosts === 1 ? "wat klaarstaat" : `de ${state.duePosts} dingen die klaarstaan`}`,
      body: `De geplande tijd is geweest${state.duePosts > 1 ? ` voor ${state.duePosts} dingen` : ""}. Open de handoff, kopieer de caption en de link, post het op het platform en vink het hier af. Er gaat niets automatisch de deur uit. Klopt dit niet, dan staat er nog een plan van een test op de kalender — haal het daar weg.`,
      href: "/calendar",
      linkLabel: "Naar de kalender",
    };
  }

  if (state.awaitingReview > 0) {
    return {
      number: 6,
      total: TOTAL_STEPS,
      title: `${state.awaitingReview} tekst${state.awaitingReview === 1 ? "" : "en"} wacht${state.awaitingReview === 1 ? "" : "en"} op een beslissing`,
      body: "Iemand anders dan de eigenaar van de campagne moet dit lezen en de exacte versie goedkeuren. Je eigen campagne kun je niet goedkeuren.",
      href: "/review",
      linkLabel: "Naar Review",
    };
  }

  if (state.approvedNotPlanned > 0) {
    return {
      number: 7,
      total: TOTAL_STEPS,
      title: `Zet ${state.approvedNotPlanned === 1 ? "het goedgekeurde stuk" : `${state.approvedNotPlanned} goedgekeurde stukken`} op de kalender`,
      body: "Kies een dag en een tijd. Dat post niets: het is een herinnering met de afgeronde tekst eraan vast.",
      href: "/calendar",
      linkLabel: "Naar de kalender",
    };
  }

  if (state.focus) {
    const focus = state.focus;
    // Titel plus code, zodat je ziet welke campagne bedoeld wordt.
    const naam = `${focus.title} (${focus.campaignCode})`;

    // Een telling die geen getal is telt als nul. Anders valt hij door alle
    // drempels heen en komt er een stap uit die verderop in het werk ligt dan
    // waar je bent.
    const variantCount = Number.isFinite(focus.variantCount)
      ? focus.variantCount
      : 0;

    if (focus.variantsFailingGate > 0) {
      return {
        number: 4,
        total: TOTAL_STEPS,
        title: `Los de blokkades op in ${naam}`,
        body: `${focus.variantsFailingGate} tekst${focus.variantsFailingGate === 1 ? "" : "en"} komt niet door de controle. Er staat per regel bij waarom. Herschrijf en het wordt opnieuw gecontroleerd.`,
        href: `/campaigns/${focus.slug}`,
        linkLabel: "Open de campagne",
      };
    }

    if (!focus.briefComplete) {
      return {
        number: 2,
        total: TOTAL_STEPS,
        title: `Schrijf de brief van ${naam}`,
        body: "Wat je zegt, tegen wie, en wat ze daarna moeten doen. Op een lege brief staat een knop die een voorstel invult uit je eigen pijlerteksten en hooks.",
        href: `/campaigns/${focus.slug}/brief`,
        linkLabel: "Naar de brief",
      };
    }

    if (variantCount === 0) {
      return {
        number: 3,
        total: TOTAL_STEPS,
        title: `Laat de teksten schrijven voor ${naam}`,
        body: "De brief staat. Vink de kanalen aan op de campagnepagina en je krijgt per kanaal een tekst, met de campagnecode en een getagde link er al in.",
        href: `/campaigns/${focus.slug}`,
        linkLabel: "Open de campagne",
      };
    }

    // Alles al voorbij review: dan ligt het werk op de kalender, niet hier.
    if (variantCount > 0 && focus.variantsPastReview >= variantCount) {
      return {
        number: 8,
        total: TOTAL_STEPS,
        title: `${naam} staat klaar op de kalender`,
        body: "Alle teksten zijn goedgekeurd en ingepland. Op de dag zelf open je de handoff, plak je het op het platform en vink je het hier af.",
        href: "/calendar",
        linkLabel: "Naar de kalender",
      };
    }

    if (
      focus.status === "IDEA" ||
      focus.status === "BRIEF" ||
      focus.status === "DRAFT"
    ) {
      return {
        number: 5,
        total: TOTAL_STEPS,
        title: `Stuur ${naam} naar review`,
        body: "Alles komt door de controle. Onderaan de campagnepagina staat de knop om hem door te zetten, en bij elke tekst staat Send for review.",
        href: `/campaigns/${focus.slug}`,
        linkLabel: "Open de campagne",
      };
    }

    return {
      number: 5,
      total: TOTAL_STEPS,
      title: `${focus.actionLabel}: ${naam}`,
      body: focus.actionDetail,
      href: `/campaigns/${focus.slug}`,
      linkLabel: "Open de campagne",
    };
  }

  if (state.unverifiedFacts > 0) {
    return {
      number: 0,
      total: TOTAL_STEPS,
      title: `${state.unverifiedFacts} feit${state.unverifiedFacts === 1 ? "" : "en"} kan nog niet gebruikt worden`,
      body: "Niets wacht op je in de campagnes. Goed moment om deze weg te werken, want ze blokkeren teksten die erop leunen.",
      href: "/truth",
      linkLabel: "Naar Product Truth",
    };
  }

  return null;
}
