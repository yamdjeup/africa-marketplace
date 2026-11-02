import { test, expect } from "@playwright/test";
import { buildOrderEmail, sendOrderEmail } from "../src/lib/order-email";

const base = {
  to: "client@example.com",
  number: "AM-TEST1234",
  fullName: "Ada <Test>",
  items: [{ name: "Kwame & co", quantity: 1, unitPriceCents: 120000 }],
  totalCents: 120000,
};

test("e-mail FR : numéro, œuvres, total EUR, mention commande simulée", () => {
  const m = buildOrderEmail({ ...base, locale: "fr" });
  expect(m.subject).toContain("AM-TEST1234");
  expect(m.text).toContain("Commande simulée, aucun paiement");
  expect(m.text).toContain("Kwame & co");
  expect(m.text).toMatch(/1\s?200,00\s€/);
  expect(m.html).toContain("Ada &lt;Test&gt;");
});

test("e-mail EN", () => {
  const m = buildOrderEmail({ ...base, locale: "en" });
  expect(m.text).toContain("Simulated order, no payment has been made.");
  expect(m.text).toContain("€1,200.00");
});

test("sans variables Gmail : aucun envoi, aucune erreur", async () => {
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;
  await expect(sendOrderEmail({ ...base, locale: "fr" })).resolves.toBeUndefined();
});
