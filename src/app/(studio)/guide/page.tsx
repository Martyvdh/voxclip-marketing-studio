import Link from "next/link";

import { Card } from "@/components/brand";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * De uitleg staat in het Nederlands, de knoppen in het Engels.
 *
 * Dat is met opzet: de namen tussen aanhalingstekens hieronder staan letterlijk
 * zo op het scherm. Ze vertalen zou betekenen dat je een knop zoekt die er niet
 * is, en dat is precies waar een handleiding onbruikbaar wordt.
 */
const STEPS: {
  title: string;
  body: string;
  where: string;
  href: string;
}[] = [
  {
    title: "Campagne aanmaken",
    body: "Geef hem een titel, een doel, een doelgroep en een van de vier pijlers. Alles wat naar buiten gaat hangt aan een campagne, zodat je bij elke post kunt terugvinden waarom hij bestond.",
    where: "Campaigns → New campaign",
    href: "/campaigns/new",
  },
  {
    title: "De brief schrijven",
    body: "Wat je zegt, tegen wie, en wat ze daarna moeten doen. Hieruit worden de teksten geschreven, dus een vage brief levert vage teksten op.",
    where: "Open de campagne → Brief",
    href: "/campaigns",
  },
  {
    title: "Teksten laten schrijven per kanaal",
    body: "Vink de kanalen aan en je krijgt per kanaal een tekst, met de campagnecode en een getagde link er al in. Elke tekst wordt langs de merkregels en Product Truth gehaald voordat hij wordt opgeslagen.",
    where: "Open de campagne → kanalen aanvinken → Draft these",
    href: "/campaigns",
  },
  {
    title: "Oplossen wat geblokkeerd is",
    body: "Een geblokkeerde tekst zegt welke regel en waarom: een streepje dat een komma hoort te zijn, een claim die niet geverifieerd is, een caption over de limiet. Herschrijf hem en hij wordt opnieuw gecontroleerd.",
    where: "Op de campagne, onder elke tekst",
    href: "/campaigns",
  },
  {
    title: "Naar review sturen",
    body: "Kan alleen als de controle slaagt. Iemand laten lezen wat er toch niet uit mag kost hem een half uur en levert niets op.",
    where: "Bij de tekst → Send for review",
    href: "/campaigns",
  },
  {
    title: "Iemand anders keurt goed",
    body: "De goedkeuring hangt aan die exacte versie. Herschrijf je hem daarna, dan zegt de wachtrij dat de goedkeuring niet meer dekt wat er staat. Je eigen campagne kun je niet goedkeuren.",
    where: "Review",
    href: "/review",
  },
  {
    title: "Inplannen op de kalender",
    body: "Kies een dag en een tijd, Amsterdamse tijd. Dit post niets. Het is een herinnering met de afgeronde tekst eraan vast.",
    where: "Calendar → Plan a post",
    href: "/calendar",
  },
  {
    title: "Zelf posten",
    body: "De handoff geeft je de caption, de getagde link en een checklist voor dat platform, elk met een kopieerknop. Plak het in het platform, post het, en vink het hier af zodat de kalender weet dat het gebeurd is.",
    where: "Calendar → klik op de geplande post",
    href: "/calendar",
  },
  {
    title: "De cijfers loggen",
    body: "Een paar dagen later tik je de getallen van elk platform in. Er wordt nog niets automatisch geteld, dus dit is voorlopig de enige manier waarop de Studio iets leert.",
    where: "Results",
    href: "/results",
  },
];

const SECTIONS: { name: string; href: string; body: string }[] = [
  {
    name: "Home",
    href: "/",
    body: "Wat op jou wacht, en verder niets. Geen dashboard vol getallen.",
  },
  {
    name: "Campaigns",
    href: "/campaigns",
    body: "Alles wat loopt, met per campagne de volgende stap erbij.",
  },
  {
    name: "Review",
    href: "/review",
    body: "De wachtrij van dingen die op een mens wachten, langst wachtende bovenaan.",
  },
  {
    name: "Calendar",
    href: "/calendar",
    body: "De week vooruit. Goedgekeurd werk met een dag en een tijd ertegen.",
  },
  {
    name: "Assets",
    href: "/assets",
    body: "Echte screenshots en opnames, elk met de appversie die erop te zien is.",
  },
  {
    name: "Channels",
    href: "/channels",
    body: "Waar het werk naartoe gaat, en wat de Studio daar eerlijk gezegd wel en niet kan.",
  },
  {
    name: "Results",
    href: "/results",
    body: "De cijfers die je hebt ingetikt, per campagne, te exporteren als spreadsheet.",
  },
  {
    name: "Truth",
    href: "/truth",
    body: "De feiten waar elke claim tegenaan wordt gehouden. Verifieer hier een feit en de teksten die erop leunen worden niet langer geblokkeerd.",
  },
];

export default async function GuidePage() {
  await requireUser();

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">Zo werkt het</h1>
      <p className="mt-2 text-ink-muted">
        Eén campagne van begin tot eind. Negen stappen, geen ervan lang.
      </p>

      <Card className="mt-6">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Voor je eerste campagne
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Kijk eerst op{" "}
          <Link href="/truth" className="text-teal-deep hover:underline">
            Truth
          </Link>{" "}
          wat er nog op <em>not verified</em> staat. Elke tekst die op een
          niet-geverifieerd feit leunt wordt geblokkeerd. Dat is met opzet zo,
          maar het is ook precies het moment waarop je op dag één denkt dat er
          iets stuk is. Meestal gaat het om de hotkeys en het versienummer.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          De knoppen in de app zijn Engels. De namen hieronder staan letterlijk
          zo op je scherm.
        </p>
      </Card>

      <ol className="mt-8 space-y-4">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <Card>
              <div className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="shrink-0 font-[family-name:var(--font-mono)] text-sm text-ink-faint"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h2 className="font-[family-name:var(--font-display)] font-semibold">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
                  <p className="mt-2 text-xs">
                    <Link
                      href={step.href}
                      className="text-teal-deep hover:underline"
                    >
                      {step.where}
                    </Link>
                  </p>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Waar de video-editor past
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Een verticaal kanaal heeft iets nodig om naar te kijken. Open een
          campagne en ga naar Video: kies een startpunt, zet je eigen opname in
          een clip, plak er elementen uit het palet bij en exporteer hem. Sla het
          project op en je kunt er later nog aan sleutelen. Zet het geëxporteerde
          bestand daarna in{" "}
          <Link href="/assets" className="text-teal-deep hover:underline">
            Assets
          </Link>
          , dan kan de volgende campagne hem hergebruiken.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          De editor tekent nooit een nagebootste VoxClip-interface. Moet een clip
          de app laten zien, dan is het een opname van de app.
        </p>
      </Card>

      <section className="mt-10" aria-labelledby="sections-heading">
        <h2 id="sections-heading" className="mb-3 text-lg font-semibold">
          Waar elk onderdeel voor is
        </h2>
        <dl className="space-y-2">
          {SECTIONS.map((section) => (
            <div
              key={section.href}
              className="rounded-lg border border-line bg-surface px-4 py-3"
            >
              <dt className="text-sm font-medium">
                <Link href={section.href} className="hover:underline">
                  {section.name}
                </Link>
              </dt>
              <dd className="mt-0.5 text-sm text-ink-muted">{section.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-ink-muted">
          Team en je eigen account staan rechtsboven, naast je naam.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="not-heading">
        <h2 id="not-heading" className="mb-3 text-lg font-semibold">
          Wat het met opzet niet doet
        </h2>
        <Card>
          <ul className="space-y-3 text-sm text-ink-muted">
            <li>
              <span className="font-medium text-ink">Het post niet.</span> Er is
              geen platformaccount gekoppeld, en dat wordt ook niet nagebootst.
              Inplannen en posten zijn hier twee verschillende dingen, en het
              tweede is aan jou.
            </li>
            <li>
              <span className="font-medium text-ink">
                Het telt geen klikken.
              </span>{" "}
              De links zijn getagd en klaar, maar er leest nog niets mee. Daar is
              een klein endpoint op voxclip.it voor nodig.
            </li>
            <li>
              <span className="font-medium text-ink">
                Het verzint geen feiten.
              </span>{" "}
              Staat iets niet in Product Truth, dan blokkeert de controle de
              tekst in plaats van er een geloofwaardig getal in te schrijven.
            </li>
            <li>
              <span className="font-medium text-ink">
                Je keurt je eigen werk niet goed.
              </span>{" "}
              Geen formaliteit. Het is de enige plek waar een tweede paar ogen
              gegarandeerd is.
            </li>
            <li>
              <span className="font-medium text-ink">
                Het verwijdert niets.
              </span>{" "}
              Archiveren haalt iets van het bord en laat het dossier staan.
            </li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
