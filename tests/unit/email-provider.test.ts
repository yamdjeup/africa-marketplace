import { afterEach, describe, expect, it, vi } from "vitest";
import { getEmailProvider } from "@/lib/email";

const BANNED = /démo|fictif|simulé|provisoire|Farfetch|Offerte|Free shipping|\bdemo\b/i;
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("fournisseur e-mail", () => {
  it("Resend : from, reply_to, sans mention interdite", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "Epomta <contact@epomta.com>");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await getEmailProvider()!.send({ to: "a@b.test", subject: "Commande", text: "Bonjour", html: "<p>Bonjour</p>" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.from).toBe("Epomta <contact@epomta.com>");
    expect(body.reply_to).toBe("contact@epomta.com");
    expect(JSON.stringify(body)).not.toMatch(BANNED);
  });
  it("sans clé : repli Gmail ou aucun fournisseur, sans erreur", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("GMAIL_USER", "x@example.test");
    vi.stubEnv("GMAIL_APP_PASSWORD", "pw");
    expect(getEmailProvider()!.name).toBe("gmail");
    vi.stubEnv("GMAIL_USER", "");
    expect(getEmailProvider()).toBeNull();
  });
});