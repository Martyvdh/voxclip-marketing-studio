import { describe, expect, it } from "vitest";

import { CANDIDATES, extensionFor, fileName, pickFormat } from "./export-format";

describe("pickFormat", () => {
  it("kiest mp4 als de browser dat kan", () => {
    // Dit was het probleem: de editor vroeg alleen om webm, ook in browsers die
    // allang mp4 opnemen.
    const format = pickFormat(() => true);
    expect(format?.extension).toBe("mp4");
    expect(format?.mimeType.startsWith("video/mp4")).toBe(true);
  });

  it("valt terug op webm als mp4 niet kan", () => {
    const format = pickFormat((t) => t.startsWith("video/webm"));
    expect(format?.extension).toBe("webm");
  });

  it("zegt het eerlijk als het webm werd", () => {
    const format = pickFormat((t) => t.startsWith("video/webm"));
    expect(format?.note).toContain("webm");
    expect(format?.note).toContain("Safari");
  });

  it("geeft niets terug als de browser niets kan", () => {
    expect(pickFormat(() => false)).toBeNull();
  });

  it("probeert alleen formaten die een speler ook begrijpt", () => {
    for (const type of CANDIDATES) {
      expect(type.startsWith("video/mp4") || type.startsWith("video/webm")).toBe(true);
    }
  });
});

describe("extensionFor", () => {
  it("volgt wat er echt in het bestand zit", () => {
    // Een webm die .mp4 heet is stuk op een manier die je pas merkt bij het
    // uploaden.
    expect(extensionFor("video/mp4;codecs=avc1.42E01E")).toBe("mp4");
    expect(extensionFor("video/webm;codecs=vp9")).toBe("webm");
  });
});

describe("fileName", () => {
  it("zet vorm en lengte in de naam", () => {
    expect(fileName("9:16", 14.2, "mp4")).toBe("voxclip-9x16-14s.mp4");
  });

  it("gebruikt geen dubbele punt, want dat mag niet in een bestandsnaam", () => {
    expect(fileName("16:9", 30, "webm")).not.toContain(":");
  });
});
