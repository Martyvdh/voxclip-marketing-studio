import { describe, expect, it } from "vitest";

import { CSV_HEADER, formatCsv, parseCsv } from "./csv";

const rows = [
  {
    date: "2026-08-12",
    channel: "TIKTOK" as const,
    label: "Copy three things",
    views: 1240,
    likes: 88,
    comments: 6,
    downloads: 3,
  },
  {
    date: "2026-08-13",
    channel: "LINKEDIN" as const,
    label: "One place, one search",
    views: 410,
    likes: 22,
    comments: 4,
    downloads: 1,
  },
];

describe("formatCsv", () => {
  it("starts with a header a spreadsheet will recognise", () => {
    expect(formatCsv(rows).split("\n")[0]).toBe(CSV_HEADER);
  });

  it("writes one line per entry", () => {
    expect(formatCsv(rows).trim().split("\n")).toHaveLength(3);
  });

  it("quotes a label that contains a comma, so the columns do not shift", () => {
    const out = formatCsv([{ ...rows[0], label: "Copy, say, find" }]);
    expect(out).toContain('"Copy, say, find"');
  });

  it("escapes a quote inside a label rather than breaking the row", () => {
    const out = formatCsv([{ ...rows[0], label: 'The "stash" post' }]);
    expect(out).toContain('"The ""stash"" post"');
  });

  it("round-trips: what it writes, it can read back", () => {
    expect(parseCsv(formatCsv(rows)).rows).toEqual(rows);
  });
});

describe("parseCsv", () => {
  it("reads a plain file", () => {
    const { rows: parsed, errors } = parseCsv(
      `${CSV_HEADER}\n2026-08-12,TIKTOK,Copy three things,1240,88,6,3`,
    );
    expect(errors).toEqual([]);
    expect(parsed[0].views).toBe(1240);
    expect(parsed[0].channel).toBe("TIKTOK");
  });

  it("accepts a file without a header, because people paste their own", () => {
    const { rows: parsed } = parseCsv("2026-08-12,TIKTOK,A post,10,1,0,0");
    expect(parsed).toHaveLength(1);
  });

  it("ignores blank lines instead of turning them into empty entries", () => {
    const { rows: parsed } = parseCsv(
      `${CSV_HEADER}\n\n2026-08-12,TIKTOK,A post,10,1,0,0\n\n`,
    );
    expect(parsed).toHaveLength(1);
  });

  it("reads a quoted label with commas in it", () => {
    const { rows: parsed } = parseCsv(
      `2026-08-12,TIKTOK,"Copy, say, find",10,1,0,0`,
    );
    expect(parsed[0].label).toBe("Copy, say, find");
  });

  it("accepts a semicolon file, which is what a Dutch Excel exports", () => {
    const { rows: parsed } = parseCsv("2026-08-12;TIKTOK;A post;10;1;0;0");
    expect(parsed[0].views).toBe(10);
    expect(parsed[0].label).toBe("A post");
  });

  it("names the line and the reason when a row cannot be read", () => {
    const { rows: parsed, errors } = parseCsv(
      `${CSV_HEADER}\n2026-08-12,MYSPACE,A post,10,1,0,0\nnot-a-date,TIKTOK,B,1,1,1,1`,
    );
    expect(parsed).toHaveLength(0);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/line 2/i);
    expect(errors[0]).toMatch(/MYSPACE/);
    expect(errors[1]).toMatch(/line 3/i);
    expect(errors[1].toLowerCase()).toMatch(/date/);
  });

  it("keeps the good rows when only some are broken", () => {
    const { rows: parsed, errors } = parseCsv(
      `2026-08-12,TIKTOK,Good,10,1,0,0\nrubbish\n2026-08-13,LINKEDIN,Also good,5,1,0,0`,
    );
    expect(parsed).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });

  it("treats a missing number as zero rather than refusing the row", () => {
    const { rows: parsed } = parseCsv("2026-08-12,TIKTOK,A post,10,,,");
    expect(parsed[0]).toMatchObject({ likes: 0, comments: 0, downloads: 0 });
  });

  it("refuses a negative count, because that is a typo and not a measurement", () => {
    const { errors } = parseCsv("2026-08-12,TIKTOK,A post,-5,1,0,0");
    expect(errors[0].toLowerCase()).toContain("negative");
  });
});
