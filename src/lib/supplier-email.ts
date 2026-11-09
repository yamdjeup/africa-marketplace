import "server-only";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/alerts-core";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function safeSend(to: string, subject: string, lines: string[], html?: string) {
  try {
    await sendEmail({ to, subject, text: lines.join("\n\n"), html: html ?? lines.map((l) => `<p>${esc(l)}</p>`).join("") });
  } catch (e) {
    console.warn("[supplier-email] envoi impossible :", (e as Error).message);
  }
}

type App = { name: string; email: string; country: string; craftType: string; portfolioUrl: string; about: string; locale: string };

export async function emailAdminNewApplication(app: App) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (admins.length === 0) console.warn("[supplier-email] ADMIN_EMAILS vide : aucune notification admin");
  const base = siteUrl();
  for (const to of admins)
    await safeSend(to, `Nouvelle candidature partenaire : ${app.name}`, [
      `${app.name} (${app.email}) — ${app.country} — ${app.craftType}`,
      `Portfolio : ${app.portfolioUrl || "(aucun lien — fichiers joints, voir l'espace admin)"}`,
      app.about,
      `Traiter : ${base}/fr/admin/candidatures`,
    ]);
}

export async function emailApplicantReceived(app: App) {
  const fr = app.locale !== "en";
  await safeSend(app.email, fr ? "E póm ta’ — candidature reçue" : "E póm ta’ — application received", [
    fr ? `Bonjour ${app.name}, nous avons bien reçu votre candidature. Nous revenons vers vous rapidement.` : `Hello ${app.name}, we received your application. We will get back to you shortly.`,
  ]);
}

export async function emailApplicantDecision(app: App, status: "ACCEPTED" | "REFUSED" | "NEEDS_INFO", note?: string | null) {
  const fr = app.locale !== "en";
  const base = siteUrl();
  const loc = fr ? "fr" : "en";
  const subject = {
    ACCEPTED: fr ? "E póm ta’ — bienvenue, candidature acceptée" : "E póm ta’ — welcome, application accepted",
    REFUSED: fr ? "E póm ta’ — votre candidature" : "E póm ta’ — your application",
    NEEDS_INFO: fr ? "E póm ta’ — informations complémentaires" : "E póm ta’ — more information needed",
  }[status];
  const body = {
    ACCEPTED: fr ? [`Bonjour ${app.name}, votre candidature est acceptée. Votre espace partenaire est ouvert : ${base}/${loc}/fournisseur/tableau-de-bord`] : [`Hello ${app.name}, your application is accepted. Your partner area is open: ${base}/${loc}/fournisseur/tableau-de-bord`],
    REFUSED: fr ? [`Bonjour ${app.name}, après examen, nous ne pouvons pas donner suite pour le moment.`] : [`Hello ${app.name}, after review we cannot proceed at this time.`],
    NEEDS_INFO: fr ? [`Bonjour ${app.name}, il nous manque des informations pour étudier votre candidature.`] : [`Hello ${app.name}, we need more information to review your application.`],
  }[status];
  if (note) body.push(note);
  if (status === "NEEDS_INFO") body.push(fr ? `Vous pouvez soumettre à nouveau : ${base}/${loc}/fournisseur/candidature` : `You can resubmit here: ${base}/${loc}/fournisseur/candidature`);
  await safeSend(app.email, subject, body);
}

type Owner = { email: string; name: string; locale: string };

export async function emailAdminProductSubmitted(partnerName: string, title: string) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const base = siteUrl();
  for (const to of admins)
    await safeSend(to, `Création à modérer : ${title}`, [`${partnerName} a soumis la création « ${title} ».`, `Modérer : ${base}/fr/admin/oeuvres`]);
}

export async function emailPartnerProductDecision(o: Owner, title: string, approved: boolean, reason?: string | null, wasPublished = false) {
  const fr = o.locale !== "en";
  const base = siteUrl();
  const loc = fr ? "fr" : "en";
  const lines = approved
    ? [fr ? `Bonjour ${o.name}, votre création « ${title} » est publiée dans le catalogue.` : `Hello ${o.name}, your creation “${title}” is now published in the catalogue.`]
    : wasPublished
      ? [fr ? `Bonjour ${o.name}, votre création « ${title} » a été retirée du catalogue et n'est plus visible des clients.` : `Hello ${o.name}, your creation “${title}” has been removed from the catalogue and is no longer visible to customers.`]
      : [fr ? `Bonjour ${o.name}, votre création « ${title} » n'a pas été publiée.` : `Hello ${o.name}, your creation “${title}” was not published.`];
  if (reason) lines.push(reason);
  lines.push(`${base}/${loc}/fournisseur/oeuvres`);
  const subject = approved
    ? fr ? "E póm ta’ — création publiée" : "E póm ta’ — creation published"
    : wasPublished
      ? fr ? `Création retirée du catalogue : ${title}` : `Creation removed from the catalogue: ${title}`
      : fr ? `Création à revoir : ${title}` : `Creation needs changes: ${title}`;
  await safeSend(o.email, subject, lines);
}

export async function emailPartnerStatus(o: Owner, action: "SUSPEND" | "REACTIVATE" | "REVOKE", reason: string) {
  const fr = o.locale !== "en";
  const msg = {
    SUSPEND: fr ? `Votre espace partenaire est suspendu. Vos créations sont masquées du catalogue. Motif : ${reason}` : `Your partner area is suspended. Your creations are hidden from the catalogue. Reason: ${reason}`,
    REACTIVATE: fr ? "Votre espace partenaire est réactivé ; vos créations sont de nouveau visibles." : "Your partner area is reactivated; your creations are visible again.",
    REVOKE: fr ? `Votre accès partenaire est définitivement révoqué. Motif : ${reason}` : `Your partner access has been permanently revoked. Reason: ${reason}`,
  }[action];
  await safeSend(o.email, fr ? "E póm ta’ — votre statut partenaire" : "E póm ta’ — your partner status", [fr ? `Bonjour ${o.name},` : `Hello ${o.name},`, msg]);
}

export async function emailPartnerPayout(o: Owner, amountCents: number, reference: string) {
  const fr = o.locale !== "en";
  const amount = new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  await safeSend(o.email, fr ? "E póm ta’ — versement effectué (test)" : "E póm ta’ — payout made (test)", [
    fr ? `Bonjour ${o.name}, un versement de ${amount} a été enregistré (référence ${reference}).` : `Hello ${o.name}, a payout of ${amount} has been recorded (reference ${reference}).`,
    fr ? "Mode test : aucun argent réel n'a été transféré." : "Test mode: no real money was transferred.",
    `${siteUrl()}/${fr ? "fr" : "en"}/fournisseur/paiements`,
  ]);
}

export async function emailLowStock(o: Owner, title: string, availableQty: number, slug: string) {
  const fr = o.locale !== "en";
  const base = siteUrl();
  const loc = fr ? "fr" : "en";
  await safeSend(o.email, fr ? `E póm ta’ — stock bas : ${title}` : `E póm ta’ — low stock: ${title}`, [
    fr ? `Bonjour ${o.name}, il ne reste que ${availableQty} pièce(s) disponible(s) pour « ${title} ».` : `Hello ${o.name}, only ${availableQty} piece(s) left available for “${title}”.`,
    `${base}/${loc}/fournisseur/oeuvres/${slug}`,
  ]);
}

