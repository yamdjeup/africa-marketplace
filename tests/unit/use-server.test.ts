import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe("fichiers d'actions serveur", () => {
  it('« use server » est la première instruction', () => {
    const files = walk("src").filter((f) => /actions\.ts$/.test(f));
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      const first = readFileSync(f, "utf8").split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith("//"));
      expect(first, f).toMatch(/^["']use server["'];?$/);
    }
  });
});
