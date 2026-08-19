import { describe, expect, it } from "vitest";

import {
  MIN_PER_GROUP,
  best,
  compare,
  findings,
  firstLine,
  median,
  nextMove,
  opensWithQuestion,
  words,
  type Post,
} from "./analyse";

const post = (over: Partial<Post> = {}): Post => ({
  variantId: Math.random().toString(36).slice(2),
  channel: "TIKTOK",
  postedAt: new Date("2026-08-18T09:00:00Z"),
  body: "Everything you copy or say, one keystroke away.",
  hasVideo: true,
  views: 1000,
  likes: 20,
  ...over,
});

/** n posts met vaste weergaven. */
const many = (n: number, over: Partial<Post> = {}) =>
  Array.from({ length: n }, () => post(over));

describe("eigenschappen van een bijschrift", () => {
  it("ziet een vraag in de eerste regel", () => {
    expect(opensWithQuestion("Where did I copy that?\nVoxClip keeps it.")).toBe(true);
    expect(opensWithQuestion("It stays on your machine.\nReally?")).toBe(false);
  });

  it("pakt alleen de eerste regel, want dat is wat mensen zien", () => {
    expect(firstLine("Eerste\nTweede")).toBe("Eerste");
  });

  it("telt woorden zonder over lege regels te struikelen", () => {
    expect(words("  twee   woorden  ")).toBe(2);
    expect(words("")).toBe(0);
  });
});

describe("median", () => {
  it("neemt het midden", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("laat zich niet meeslepen door één uitschieter", () => {
    // Dit is de reden dat het de mediaan is en niet het gemiddelde: één video
    // die aanslaat maakt anders alles eromheen onzichtbaar.
    expect(median([100, 100, 100, 100_000])).toBe(100);
  });

  it("valt niet om zonder cijfers", () => {
    expect(median([])).toBe(0);
  });
});

describe("compare", () => {
  it("zegt eerlijk dat het te vroeg is", () => {
    const finding = compare("Vraag?", many(2), many(9), ["A", "B"]);
    expect(finding.confidence).toBe("te vroeg");
    expect(finding.verdict).toContain("nodig");
  });

  it("zegt hoeveel posts er nog nodig zijn", () => {
    const finding = compare("Vraag?", many(1), many(9), ["A", "B"]);
    expect(finding.verdict).toContain(`${MIN_PER_GROUP - 1}`);
  });

  it("noemt een klein verschil geen ontdekking", () => {
    // 1000 tegen 1100 is ruis. Een tool die daar iets van maakt, stuurt je de
    // verkeerde kant op en je merkt het pas na twintig video's.
    const finding = compare(
      "Vraag?",
      many(5, { views: 1000 }),
      many(5, { views: 1100 }),
      ["A", "B"],
    );
    expect(finding.verdict).toContain("weinig uit");
  });

  it("wijst de winnaar aan bij een echt verschil", () => {
    const finding = compare(
      "Vraag?",
      many(6, { views: 3000 }),
      many(6, { views: 1000 }),
      ["Met vraag", "Zonder vraag"],
    );
    expect(finding.verdict).toContain("Met vraag");
    expect(finding.verdict).toContain("3.0×");
    expect(finding.confidence).toBe("duidelijk");
  });

  it("blijft voorzichtig bij weinig posts, ook met een groot verschil", () => {
    const finding = compare(
      "Vraag?",
      many(3, { views: 5000 }),
      many(3, { views: 1000 }),
      ["A", "B"],
    );
    expect(finding.confidence).toBe("aanwijzing");
  });

  it("verzint niets als er geen cijfers zijn", () => {
    const finding = compare(
      "Vraag?",
      many(4, { views: null }),
      many(4, { views: null }),
      ["A", "B"],
    );
    expect(finding.confidence).toBe("te vroeg");
    expect(finding.verdict).toContain("Koppel TikTok");
  });
});

describe("findings", () => {
  it("kijkt naar vier dingen", () => {
    expect(findings(many(20))).toHaveLength(4);
  });

  it("negeert posts zonder cijfers", () => {
    const mixed = [...many(4, { views: null }), ...many(4, { views: 900 })];
    const result = findings(mixed);
    // Alle vier de metingen zaten in dezelfde groep, dus er valt niets te
    // vergelijken — en dat moet hij zeggen in plaats van iets te bedenken.
    expect(result.every((f) => f.confidence === "te vroeg")).toBe(true);
  });
});

describe("best", () => {
  it("zet de best gelopen bovenaan", () => {
    const top = best([
      post({ views: 100 }),
      post({ views: 9000 }),
      post({ views: 500 }),
    ]);
    expect(top[0].views).toBe(9000);
  });

  it("laat ongemeten posts buiten de lijst", () => {
    expect(best([post({ views: null })])).toHaveLength(0);
  });
});

describe("nextMove", () => {
  it("zegt bij nul posts waar je begint", () => {
    expect(nextMove([])).toContain("Nog niets geplaatst");
  });

  it("wijst naar de koppeling als er posts zijn maar geen cijfers", () => {
    expect(nextMove(many(3, { views: null }))).toContain("Koppel TikTok");
  });

  it("telt af tot er genoeg is om iets te zeggen", () => {
    const advice = nextMove(many(4));
    expect(advice).toContain("Nog 2");
    expect(advice).toContain("toeval");
  });

  it("geeft het beste patroon door zodra het duidelijk is", () => {
    const posts = [
      ...many(6, { body: "Where is it?\nHere.", views: 4000 }),
      ...many(6, { body: "It is here.\nAlways.", views: 1000 }),
    ];
    expect(nextMove(posts)).toContain("Maak de volgende drie zo");
  });

  it("noemt geen patroon als er geen is", () => {
    const advice = nextMove(many(12, { views: 1000 }));
    expect(advice).toContain("geen duidelijke verschillen");
  });
});
