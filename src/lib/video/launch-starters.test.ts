import { describe, expect, it } from "vitest";

import { LAUNCH_STARTERS } from "./launch-starters";
import { ALL_STARTERS } from "./starters";


const source = {
  hook: "Je zoekt in drie apps naar iets van vijf minuten geleden.",
  problem: "Het stond er net nog.",
  promise: "Alles wat je kopieert of zegt, op één plek.",
  desiredOutcome: "Niets meer kwijt.",
  payoff: "Eén toetsaanslag.",
  ctaLabel: "Download VoxClip",
  headline: "Eén plek voor alles",
  subhead: "Eén tijdlijn, één zoekveld.",
};

describe("de lanceerstartpunten", () => {
  it("levert er twaalf", () => {
    expect(LAUNCH_STARTERS).toHaveLength(12);
  });

  it("zit allemaal in de lijst die de editor toont", () => {
    for (const starter of LAUNCH_STARTERS) {
      expect(ALL_STARTERS.map((s) => s.slug)).toContain(starter.slug);
    }
  });

  it("heeft nergens twee keer dezelfde slug", () => {
    const slugs = ALL_STARTERS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("bouwt overal een project met clips", () => {
    for (const starter of LAUNCH_STARTERS) {
      const project = starter.build(source);
      expect(project.clips.length, starter.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("blijft binnen wat een platform aankan", () => {
    // Boven de zestig seconden knippen TikTok en Reels je video af.
    for (const starter of LAUNCH_STARTERS) {
      const total = starter
        .build(source)
        .clips.reduce((sum, clip) => sum + clip.seconds, 0);
      expect(total, starter.slug).toBeGreaterThan(6);
      expect(total, starter.slug).toBeLessThan(60);
    }
  });

  it("eindigt overal met de call to action uit de campagne", () => {
    for (const starter of LAUNCH_STARTERS) {
      const clips = starter.build(source).clips;
      expect(clips[clips.length - 1].text, starter.slug).toBe(source.ctaLabel);
    }
  });

  it("zet de link nooit in beeld", () => {
    // Die hoort in het bijschrift, getagd, anders is de klik niet te tellen.
    for (const starter of LAUNCH_STARTERS) {
      for (const clip of starter.build(source).clips) {
        expect(clip.text, starter.slug).not.toMatch(/utm_/);
      }
    }
  });

  it("vertelt bij elke lege clip wat je moet opnemen", () => {
    // Een clip zonder tekst en zonder notitie is een zwart gat in de montage.
    for (const starter of LAUNCH_STARTERS) {
      for (const clip of starter.build(source).clips) {
        if (clip.text.trim().length === 0) {
          expect(clip.note, `${starter.slug}: lege clip`).toBeTruthy();
        }
      }
    }
  });

  it("gebruikt een echte verhouding", () => {
    for (const starter of LAUNCH_STARTERS) {
      expect(["9:16", "1:1", "16:9"]).toContain(starter.build(source).ratio);
    }
  });

  it("legt bij elk startpunt uit waar het voor is", () => {
    for (const starter of LAUNCH_STARTERS) {
      expect(starter.intent.length, starter.slug).toBeGreaterThan(30);
      expect(starter.name.length, starter.slug).toBeGreaterThan(10);
    }
  });
});
