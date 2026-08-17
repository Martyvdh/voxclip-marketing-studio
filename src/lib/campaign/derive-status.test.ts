import { describe, expect, it } from "vitest";

import type { CampaignStatus, VariantStatus } from "@/db/schema";
import {
  deriveCampaignStatus,
  needsUpdate,
  NOT_DERIVED,
} from "./derive-status";

const derive = (
  variants: VariantStatus[],
  current: CampaignStatus = "IDEA",
  briefComplete = true,
) => deriveCampaignStatus({ current, variants, briefComplete });

describe("zonder teksten", () => {
  it("is een campagne zonder brief een idee", () => {
    expect(derive([], "IDEA", false)).toBe("IDEA");
  });

  it("is een campagne met een volledige brief een brief", () => {
    expect(derive([], "IDEA", true)).toBe("BRIEF");
  });

  it("valt terug naar brief als de laatste tekst gearchiveerd is", () => {
    expect(derive(["ARCHIVED"], "DRAFT", true)).toBe("BRIEF");
  });
});

describe("met teksten", () => {
  it("is een concept zodra er een tekst is", () => {
    expect(derive(["DRAFT"])).toBe("DRAFT");
  });

  it("telt een tekst die een opname mist als concept", () => {
    expect(derive(["NEEDS_ASSET"])).toBe("DRAFT");
  });

  it("staat in review zodra er één op een beslissing wacht", () => {
    expect(derive(["DRAFT", "IN_REVIEW"])).toBe("IN_REVIEW");
  });

  it("is pas goedgekeurd als alles goedgekeurd is", () => {
    expect(derive(["APPROVED", "APPROVED"])).toBe("APPROVED");
    expect(derive(["APPROVED", "DRAFT"])).toBe("DRAFT");
  });

  it("is ingepland zodra er één in de agenda staat", () => {
    // Ook met een concept ernaast. Er staat dan echt iets gepland.
    expect(derive(["SCHEDULED", "DRAFT"])).toBe("SCHEDULED");
  });

  it("is gepubliceerd zodra er één de deur uit is", () => {
    expect(derive(["PUBLISHED", "SCHEDULED"])).toBe("PUBLISHED");
  });

  it("negeert gearchiveerde teksten bij het samenvatten", () => {
    expect(derive(["ARCHIVED", "DRAFT"])).toBe("DRAFT");
  });
});

describe("wat een mens heeft gezet blijft staan", () => {
  it("laat een geannuleerde campagne met rust", () => {
    // Annuleren betekent juist dat de teksten er niet meer toe doen.
    expect(derive(["APPROVED"], "CANCELLED")).toBe("CANCELLED");
  });

  it("laat een gearchiveerde campagne met rust", () => {
    expect(derive(["DRAFT"], "ARCHIVED")).toBe("ARCHIVED");
  });

  it("komt niet aan een lopende of mislukte publicatie", () => {
    for (const status of ["PUBLISHING", "FAILED", "PUBLISHED"] as CampaignStatus[]) {
      expect(derive(["DRAFT"], status), status).toBe(status);
    }
  });

  it("noemt elke onaanraakbare status expliciet", () => {
    expect(NOT_DERIVED).toContain("CANCELLED");
    expect(NOT_DERIVED).toContain("ARCHIVED");
    expect(NOT_DERIVED).toContain("PUBLISHING");
  });
});

describe("needsUpdate", () => {
  it("geeft niets terug als de samenvatting al klopt", () => {
    expect(
      needsUpdate({
        current: "DRAFT",
        variants: ["DRAFT"],
        briefComplete: true,
      }),
    ).toBeNull();
  });

  it("geeft de nieuwe status als hij achterloopt", () => {
    // Precies het geval waar dit voor gemaakt is: teksten ingepland terwijl de
    // campagne officieel nog een idee was.
    expect(
      needsUpdate({
        current: "IDEA",
        variants: ["SCHEDULED", "SCHEDULED"],
        briefComplete: true,
      }),
    ).toBe("SCHEDULED");
  });

  it("geeft niets terug voor een geannuleerde campagne", () => {
    expect(
      needsUpdate({
        current: "CANCELLED",
        variants: ["APPROVED"],
        briefComplete: true,
      }),
    ).toBeNull();
  });
});
