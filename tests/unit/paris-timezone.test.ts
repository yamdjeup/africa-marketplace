import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(n)) out.push(p);
  }
  return out;
}

describe("fuseau horaire des dates affichees", () => {
  it("23:51 UTC le 16/11 s'affiche 00:51 le 17/11 en Europe/Paris", () => {
    const s = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" }).format(new Date("2026-11-16T23:51:00Z"));
    expect(s).toContain("17 novembre 2026");
    expect(s).toMatch(/00:51/);
  });

  it("aucun formateur de date du site n'oublie timeZone", () => {
    const bad: string[] = [];
    for (const f of walk("src")) {
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/new Intl\.DateTimeFormat\(|\.toLocale(Date|Time)?String\(/.test(l) && !l.includes("timeZone")) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
