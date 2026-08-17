import { describe, expect, it } from "vitest";

import type { CampaignStatus } from "@/db/schema";
import { canDeleteCampaign, whatGoesWithIt, WENT_OUT } from "./delete";

const input = (over: Partial<Parameters<typeof canDeleteCampaign>[0]> = {}) => ({
  status: "DRAFT" as CampaignStatus,
  hasPublications: false,
  typedTitle: "Testcampagne",
  title: "Testcampagne",
  ...over,
});

describe("canDeleteCampaign", () => {
  it("laat een proefcampagne weg die nooit iets heeft gepost", () => {
    expect(canDeleteCampaign(input()).allowed).toBe(true);
  });

  it("weigert zodra er ooit iets gepost is", () => {
    const verdict = canDeleteCampaign(input({ hasPublications: true }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/archiveer/i);
  });

  it("weigert ook als de status nog niet gepubliceerd zegt maar er wel een poging ligt", () => {
    // De statuskolom kan achterlopen. De publicatiepogingen zijn het bewijs.
    expect(
      canDeleteCampaign(input({ status: "DRAFT", hasPublications: true })).allowed,
    ).toBe(false);
  });

  it("weigert iets dat ingepland staat", () => {
    const verdict = canDeleteCampaign(input({ status: "SCHEDULED" }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/kalender/i);
  });

  it("weigert alles wat onderweg of gepubliceerd is", () => {
    for (const status of WENT_OUT) {
      expect(canDeleteCampaign(input({ status })).allowed, status).toBe(false);
    }
  });

  it("laat een geannuleerde of gearchiveerde campagne wel weg", () => {
    for (const status of ["CANCELLED", "ARCHIVED", "IDEA"] as CampaignStatus[]) {
      expect(canDeleteCampaign(input({ status })).allowed, status).toBe(true);
    }
  });

  it("eist dat de titel wordt overgetypt", () => {
    const verdict = canDeleteCampaign(input({ typedTitle: "" }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/typ de titel/i);
  });

  it("neemt geen genoegen met bijna goed", () => {
    expect(canDeleteCampaign(input({ typedTitle: "Testcampagn" })).allowed).toBe(
      false,
    );
  });

  it("negeert spaties eromheen, want die typt niemand met opzet", () => {
    expect(
      canDeleteCampaign(input({ typedTitle: "  Testcampagne " })).allowed,
    ).toBe(true);
  });

  it("noemt de publicatie eerder dan de titel, want dat is het echte bezwaar", () => {
    // Iemand die de titel fout typt bij een gepubliceerde campagne moet niet
    // horen dat hij beter moet typen.
    const verdict = canDeleteCampaign(
      input({ hasPublications: true, typedTitle: "fout" }),
    );
    expect(verdict.reason).toMatch(/gepost/i);
  });
});

describe("whatGoesWithIt", () => {
  it("noemt altijd de brief", () => {
    expect(
      whatGoesWithIt({
        variants: 0,
        versions: 0,
        schedules: 0,
        videoProjects: 0,
      }),
    ).toEqual(["de brief"]);
  });

  it("telt op wat er verder aan hangt", () => {
    const lines = whatGoesWithIt({
      variants: 3,
      versions: 5,
      schedules: 1,
      videoProjects: 2,
    });

    expect(lines.join(", ")).toContain("3 teksten");
    expect(lines.join(", ")).toContain("5 opgeslagen versies");
    expect(lines.join(", ")).toContain("1 plek op de kalender");
    expect(lines.join(", ")).toContain("2 videoprojecten");
  });

  it("schrijft enkelvoud als het er één is", () => {
    const lines = whatGoesWithIt({
      variants: 1,
      versions: 1,
      schedules: 0,
      videoProjects: 1,
    });

    expect(lines.join(", ")).toContain("1 tekst,");
    expect(lines.join(", ")).toContain("1 opgeslagen versie");
    expect(lines.join(", ")).toContain("1 videoproject");
  });

  it("laat weg wat er niet is, in plaats van nul te melden", () => {
    const lines = whatGoesWithIt({
      variants: 2,
      versions: 0,
      schedules: 0,
      videoProjects: 0,
    });

    expect(lines).toHaveLength(2);
    expect(lines.join(" ")).not.toContain("0");
  });
});
