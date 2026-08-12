/**
 * Pulls the real content out of legacy/index.html into JSON.
 *
 * The prototype's hook library, blog angles, pillar defaults, calls to action,
 * personas, competitors, and launch checklists are actual work. They are lifted
 * verbatim rather than rewritten, so nothing is quietly reinvented.
 *
 *   npx tsx scripts/extract-legacy.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SOURCE = join(process.cwd(), "legacy", "index.html");
const OUT_DIR = join(process.cwd(), "src", "db", "legacy-content");

/** Reads `const NAME=<literal>` and returns the literal, brace-matched. */
function literalAfter(text: string, name: string): string | null {
  const start = text.indexOf(`const ${name}=`);
  if (start === -1) return null;

  let i = start + `const ${name}=`.length;
  const open = text[i];
  const close = open === "[" ? "]" : open === "{" ? "}" : null;
  if (!close) return null;

  let depth = 0;
  let inString: string | null = null;
  let escaped = false;

  for (; i < text.length; i++) {
    const c = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === inString) inString = null;
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      inString = c;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return text.slice(start + `const ${name}=`.length, i + 1);
    }
  }
  return null;
}

/** These are data literals from our own file, not input from anywhere else. */
function evaluate(literal: string): unknown {
  return Function(`"use strict"; return (${literal});`)();
}

function grab(text: string, name: string): unknown {
  const literal = literalAfter(text, name);
  if (literal === null) {
    console.warn(`  ${name}: not found, skipped`);
    return null;
  }
  try {
    const value = evaluate(literal);
    const count = Array.isArray(value)
      ? value.length
      : Object.keys(value as object).length;
    console.log(`  ${name}: ${count} entries`);
    return value;
  } catch (error) {
    console.warn(`  ${name}: could not be read (${(error as Error).message})`);
    return null;
  }
}

const NAMES = [
  "LIB",
  "BLOGS",
  "VID_DEF",
  "CTAS_SHORT",
  "CTAS_LI",
  "VIDEO_IDEAS",
  "RS_PERSONAS",
  "RS_COMPETS",
  "RS_MONITOR",
  "LAUNCH_CH",
  "TUNES",
];

const html = readFileSync(SOURCE, "utf8");
console.log(`Reading ${SOURCE} (${html.length} bytes)`);

const extracted: Record<string, unknown> = {};
for (const name of NAMES) {
  const value = grab(html, name);
  if (value !== null) extracted[name] = value;
}

// BLOGS entries are appended to LIB in the prototype. Do the same here so the
// hook library is one list, exactly as the operator sees it today.
const lib = extracted.LIB as unknown[] | undefined;
const blogs = extracted.BLOGS as unknown[][] | undefined;
if (lib && blogs) {
  for (const b of blogs) lib.push([b[0], "blog", b[1], b[2]]);
  console.log(`  LIB after adding BLOGS: ${lib.length} entries`);
}

mkdirSync(OUT_DIR, { recursive: true });
const target = join(OUT_DIR, "prototype-content.json");
writeFileSync(target, JSON.stringify(extracted, null, 2) + "\n");
console.log(`\nWrote ${target}`);
