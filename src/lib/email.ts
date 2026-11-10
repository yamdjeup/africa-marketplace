import nodemailer from "nodemailer";
import { renderEmailHtml } from "@/lib/email-layout";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
};

// Interface d'envoi : Gmail (SMTP) par défaut, Resend si RESEND_API_KEY existe.
export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

const SEND_TIMEOUT_MS = 8000;
export const REPLY_TO = "contact@epomta.com";
const FROM_NAME = "E póm ta’";

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), SEND_TIMEOUT_MS))]);
}

function gmailProvider(user: string, pass: string): EmailProvider {
  return {
    name: "gmail",
    async send(msg) {
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: SEND_TIMEOUT_MS,
        greetingTimeout: SEND_TIMEOUT_MS,
        socketTimeout: SEND_TIMEOUT_MS,
      });
      await withTimeout(transport.sendMail({ from: `"${FROM_NAME}" <${user}>`, ...msg }));
    },
  };
}

function resendProvider(key: string, from: string): EmailProvider {
  return {
    name: "resend",
    async send(msg) {
      const res = await withTimeout(
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: from.includes("<") ? from : `${FROM_NAME} <${from}>`, reply_to: REPLY_TO, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html, headers: msg.headers }),
        }),
      );
      if (!res.ok) throw new Error(`resend ${res.status}`);
    },
  };
}

// Null si aucun fournisseur n'est configuré (aucun envoi, aucune erreur).
export function getEmailProvider(): EmailProvider | null {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? process.env.EMAIL_FROM;
  if (resendKey && from) return resendProvider(resendKey, from);
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (user && pass) return gmailProvider(user, pass);
  return null;
}

// Retourne true si l'e-mail est parti ; ne lève jamais.
/** Marqueur du gabarit DA commun (logo en en-tête). */
export const TEMPLATE_MARK = "E PÓM TA";

const looksFrench = (s: string) => /[àâçéèêëîïôûùœ]|\b(votre|vous|nous|bonjour|commande|merci)\b/i.test(s);

/** Tout e-mail sortant passe par le gabarit DA : un message sans le gabarit est habillé à partir de son texte. */
export function ensureTemplate(msg: EmailMessage): EmailMessage {
  const locale: "fr" | "en" = looksFrench(`${msg.subject} ${msg.text}`) ? "fr" : "en";
  const headers = { "Content-Language": locale, ...msg.headers };
  if (msg.html.includes(TEMPLATE_MARK)) return { ...msg, headers };
  const title = msg.subject.replace(/^E p[óo]m ta['\u2019] ?[—-] ?/i, "").trim() || msg.subject;
  const paragraphs = msg.text.split(/\n{1,2}/).map((l) => l.trim()).filter(Boolean);
  return { ...msg, headers, html: renderEmailHtml({ locale, title, paragraphs }) };
}

export async function sendEmail(input: EmailMessage): Promise<boolean> {
  const msg = ensureTemplate(input);
  const provider = getEmailProvider();
  if (!provider) return false;
  try {
    await provider.send(msg);
    return true;
  } catch (e) {
    console.error(`email (${provider.name}) failed:`, e instanceof Error ? e.message : "unknown error");
    return false;
  }
}
