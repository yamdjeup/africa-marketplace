import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { isSocialAccount } from "@/lib/social-providers";

export const RESET_TTL_MIN = 60;
export const RESET_MAX_PER_HOUR = 3;
const HOUR = 3_600_000;

export type ResetMail = { to: string; locale: "fr" | "en"; url: string; social: boolean };
export type ResetSender = (m: ResetMail) => Promise<unknown>;

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Demande de réinitialisation : réponse toujours neutre ; 3 demandes/h par e-mail et par IP (comptées même si le compte n'existe pas). */
export async function requestPasswordReset(db: PrismaClient, input: { email: string; ip: string; locale: "fr" | "en"; baseUrl: string }, send: ResetSender, now = new Date()) {
  const email = input.email.trim().toLowerCase();
  const keys = [`email:${email}`, ...(input.ip ? [`ip:${input.ip}`] : [])];
  const since = new Date(now.getTime() - HOUR);
  for (const key of keys) {
    if ((await db.passwordResetAttempt.count({ where: { key, createdAt: { gt: since } } })) >= RESET_MAX_PER_HOUR) return { limited: true };
  }
  await db.passwordResetAttempt.createMany({ data: keys.map((key) => ({ key, createdAt: now })) });
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { limited: false };
  if (isSocialAccount(user.passwordHash)) {
    await send({ to: user.email, locale: input.locale, url: `${input.baseUrl}/${input.locale}/login`, social: true });
    return { limited: false };
  }
  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + RESET_TTL_MIN * 60_000) } });
  await send({ to: user.email, locale: input.locale, url: `${input.baseUrl}/${input.locale}/reset-password?token=${token}`, social: false });
  return { limited: false };
}

export type ResetResult = "ok" | "invalid" | "password";

export async function tokenIsValid(db: PrismaClient, token: string, now = new Date()) {
  if (!token) return false;
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  return Boolean(row && !row.usedAt && row.expiresAt > now);
}

/** Usage unique : le jeton est consommé atomiquement ; sessionVersion + 1 déconnecte les autres sessions. */
export async function resetPassword(db: PrismaClient, token: string, newPassword: string, now = new Date()): Promise<ResetResult> {
  if (newPassword.length < 8 || newPassword.length > 200) return "password";
  if (!token) return "invalid";
  const hash = hashToken(token);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  return db.$transaction(async (tx) => {
    const used = await tx.passwordResetToken.updateMany({ where: { tokenHash: hash, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
    if (used.count !== 1) return "invalid";
    const row = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hash } });
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
    await tx.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: now } });
    return "ok";
  });
}

export function resetEmail(m: ResetMail) {
  const fr = m.locale === "fr";
  const subject = fr ? "E póm ta’ — réinitialisation de votre mot de passe" : "E póm ta’ — reset your password";
  const text = m.social
    ? fr ? "Votre compte utilise la connexion Google : il n'a pas de mot de passe à réinitialiser. Connectez-vous avec Google depuis la page de connexion." : "Your account uses Google sign-in: there is no password to reset. Sign in with Google from the login page."
    : fr ? `Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable ${RESET_TTL_MIN} minutes (1 h) et ne peut être utilisé qu'une fois. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.` : `You asked to reset your password. This link is valid for ${RESET_TTL_MIN} minutes (1 hour) and can be used once. If you did not request this, ignore this message.`;
  return { subject, text, title: fr ? "Réinitialiser votre mot de passe" : "Reset your password", cta: m.social ? (fr ? "Se connecter" : "Sign in") : fr ? "Choisir un nouveau mot de passe" : "Choose a new password" };
}
