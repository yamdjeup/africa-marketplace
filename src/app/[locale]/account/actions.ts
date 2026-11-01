"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n";

export type AuthState = { error?: "required" | "email" | "password" | "exists" | "invalid" | "current"; saved?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, name: string, max = 200) {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

function localeOf(formData: FormData) {
  const l = String(formData.get("locale") ?? "fr");
  return isLocale(l) ? l : "fr";
}

// Redirection interne uniquement (évite les open redirects).
function safeNext(value: string, fallback: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

async function credentialsSignIn(email: string, password: string, redirectTo: string): Promise<AuthState> {
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (e) {
    if (e instanceof AuthError) return { error: "invalid" };
    throw e;
  }
  return {};
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = localeOf(formData);
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "required" };
  return credentialsSignIn(email, password, safeNext(text(formData, "next"), `/${locale}/account/orders`));
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = localeOf(formData);
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || !password) return { error: "required" };
  if (!EMAIL_RE.test(email)) return { error: "email" };
  if (password.length < 8 || password.length > 200) return { error: "password" };
  if (await db.user.findUnique({ where: { email } })) return { error: "exists" };

  await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  return credentialsSignIn(email, password, safeNext(text(formData, "next"), `/${locale}/account`));
}

export async function updateProfile(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const session = await auth();
  const locale = localeOf(formData);
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const name = text(formData, "name");
  if (!name) return { error: "required" };
  const newPassword = String(formData.get("newPassword") ?? "");
  const data: { name: string; passwordHash?: string } = { name };

  if (newPassword) {
    if (newPassword.length < 8 || newPassword.length > 200) return { error: "password" };
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const current = String(formData.get("currentPassword") ?? "");
    if (!user || !(await bcrypt.compare(current, user.passwordHash))) return { error: "current" };
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await db.user.update({ where: { id: session.user.id }, data });
  revalidatePath(`/${locale}/account`);
  return { saved: true };
}

export async function logout(formData: FormData) {
  await signOut({ redirectTo: `/${localeOf(formData)}` });
}
