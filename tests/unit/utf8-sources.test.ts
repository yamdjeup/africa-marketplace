import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css|json)$/.test(n)) out.push(p);
  }
  return out;
}

describe("encodage des sources", () => {
  it("tous les fichiers src/ et tests/ sont en UTF-8 valide", () => {
    const dec = new TextDecoder("utf-8", { fatal: true });
    const bad: string[] = [];
    for (const f of [...walk("src"), ...walk("tests")]) {
      try {
        dec.decode(readFileSync(f));
      } catch {
        bad.push(f);
      }
    }
    expect(bad).toEqual([]);
  });
});
