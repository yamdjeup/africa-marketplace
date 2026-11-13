import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

// Prérequis techniques vérifiables pour la publication sur Google Play / App Store (aucun appel réseau).
const root = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const pngSize = (p: string) => {
  const b = readFileSync(resolve(root, p));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), signature: b.subarray(1, 4).toString("ascii") };
};

describe("T-STORES : prérequis de publication (A-T37)", () => {
  const m = manifest();

  it("manifest PWA : nom, start_url, scope, affichage, couleurs", () => {
    expect(m.name && m.short_name).toBeTruthy();
    expect(m.start_url).toMatch(/^\//);
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(m.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("icônes du manifest : fichiers PNG existants, aux tailles déclarées, dont 512 « maskable »", () => {
    const icons = m.icons ?? [];
    for (const i of icons) {
      const file = `public${i.src}`;
      expect(existsSync(resolve(root, file)), file).toBe(true);
      const { w, h, signature } = pngSize(file);
      expect(signature).toBe("PNG");
      expect(`${w}x${h}`).toBe(i.sizes);
    }
    expect(icons.some((i) => i.sizes === "192x192")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable")).toBe(true);
  });

  it("icône Apple 180×180 présente", () => {
    const { w, h } = pngSize("public/icons/apple-touch-icon.png");
    expect([w, h]).toEqual([180, 180]);
  });

  it("service worker présent et manifest/icônes/sw accessibles sans mur d'accès", () => {
    expect(existsSync(resolve(root, "public/sw.js"))).toBe(true);
    const proxy = read("src/proxy.ts");
    expect(proxy).toContain("manifest\\.webmanifest");
    expect(proxy).toContain("sw\\.js");
  });

  it("identifiant d'application cohérent : Capacitor, Android et iOS", () => {
    const cfg = read("capacitor.config.ts");
    const id = /appId:\s*"([^"]+)"/.exec(cfg)?.[1];
    expect(id).toBe("com.epomta.app");
    expect(read("android/app/build.gradle")).toContain(`applicationId "${id}"`);
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain(`PRODUCT_BUNDLE_IDENTIFIER = ${id};`);
  });

  it("coque native : URL HTTPS (pas de HTTP clair) et page hors ligne présente", () => {
    const cfg = read("capacitor.config.ts");
    expect(/url:\s*"https:\/\//.test(cfg)).toBe(true);
    expect(cfg).toContain("cleartext: false");
    expect(existsSync(resolve(root, "native-www/offline.html"))).toBe(true);
  });

  it("pied de page : liens vers CGV, confidentialité et cookies (exigés par les deux stores)", () => {
    const footer = read("src/components/marketplace/site-footer.tsx");
    for (const s of ["/support/terms", "/support/privacy", "/support/cookies"]) expect(footer).toContain(s);
  });
});
