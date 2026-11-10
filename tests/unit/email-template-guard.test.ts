import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEMPLATE_MARK, ensureTemplate } from "@/lib/email";

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

describe("règle DA : tout e-mail passe par le gabarit commun", () => {
  it("un message en texte brut / HTML maison est habillé du gabarit (logo, titre, aide)", () => {
    for (const html of ["", "<p>brut</p>"]) {
      const m = ensureTemplate({ to: "a@b.c", subject: "E póm ta’ — versement effectué", text: "Bonjour,\n\nVotre versement est parti.", html });
      expect(m.html).toContain(TEMPLATE_MARK);
      expect(m.html).toContain("text-transform:uppercase");
      expect(m.html).toContain("Besoin d'aide");
    }
  });
  it("langue : lang= sur <html> et Content-Language selon le contenu", () => {
    const fr = ensureTemplate({ to: "a@b.c", subject: "Votre commande", text: "Bonjour, merci pour votre commande.", html: "" });
    expect(fr.html).toContain('<html lang="fr"');
    expect(fr.headers?.["Content-Language"]).toBe("fr");
    const en = ensureTemplate({ to: "a@b.c", subject: "Your order", text: "Thank you for your order.", html: "" });
    expect(en.html).toContain('<html lang="en"');
    expect(en.headers?.["Content-Language"]).toBe("en");
  });
  it("un message déjà au gabarit n'est pas ré-habillé", () => {
    const html = `<html>${TEMPLATE_MARK}</html>`;
    expect(ensureTemplate({ to: "a@b.c", subject: "x", text: "y", html }).html).toBe(html);
  });
  it("aucun envoi direct hors src/lib/email.ts (nodemailer, API Resend)", () => {
    const offenders = walk("src").filter((f) => /\.(ts|tsx)$/.test(f) && !/lib[\\/]email\.ts$/.test(f) && /from "nodemailer"|api\.resend\.com/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
