import { describe, expect, it } from "vitest";

import {
  isFavourite,
  parseFavourites,
  pruneFavourites,
  toggleFavourite,
} from "./favourites";
import { ALL_STARTERS } from "./starters";

describe("parseFavourites", () => {
  it("leest een bewaarde lijst", () => {
    expect(parseFavourites('["a","b"]')).toEqual(["a", "b"]);
  });

  it("begint leeg als er nog niets bewaard is", () => {
    expect(parseFavourites(null)).toEqual([]);
  });

  it("valt niet om over rommel", () => {
    // localStorage is door de gebruiker te bewerken. Een kapotte waarde mag de
    // editor niet meenemen.
    expect(parseFavourites("dit is geen json")).toEqual([]);
    expect(parseFavourites('{"niet":"een lijst"}')).toEqual([]);
    expect(parseFavourites("[1,2,3]")).toEqual([]);
    expect(parseFavourites('["goed",null,7]')).toEqual(["goed"]);
  });

  it("houdt er geen dubbele over", () => {
    expect(parseFavourites('["a","a","b"]')).toEqual(["a", "b"]);
  });
});

describe("toggleFavourite", () => {
  it("zet er een aan", () => {
    expect(toggleFavourite([], "x")).toEqual(["x"]);
  });

  it("haalt er een weg", () => {
    expect(toggleFavourite(["x", "y"], "x")).toEqual(["y"]);
  });

  it("laat de oude lijst heel", () => {
    const before = ["x"];
    toggleFavourite(before, "y");
    expect(before).toEqual(["x"]);
  });
});

describe("pruneFavourites", () => {
  it("gooit weg wat niet meer bestaat", () => {
    // Een startpunt kan hernoemd worden. Zonder dit houd je een favoriet die
    // nergens heen wijst en die je niet weg kunt klikken.
    const known = new Set(["blijft"]);
    expect(pruneFavourites(["blijft", "weg"], known)).toEqual(["blijft"]);
  });

  it("laat echte slugs staan", () => {
    const known = new Set(ALL_STARTERS.map((s) => s.slug));
    const some = ALL_STARTERS.slice(0, 3).map((s) => s.slug);
    expect(pruneFavourites(some, known)).toEqual(some);
  });
});

describe("isFavourite", () => {
  it("zegt of iets erin zit", () => {
    expect(isFavourite(["a"], "a")).toBe(true);
    expect(isFavourite(["a"], "b")).toBe(false);
  });
});
