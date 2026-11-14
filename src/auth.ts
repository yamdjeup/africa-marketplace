import NextAuth, { type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Apple from "next-auth/providers/apple";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { SOCIAL_ENABLED, SOCIAL_HASH_PREFIX } from "@/lib/social-providers";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

// Le secret vient de AUTH_SECRET (.env.local). Valeur de repli uniquement hors production.
const secret = process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "dev-only-insecure-secret");

// Fournisseurs sociaux : actifs seulement si leurs variables AUTH_<FOURNISSEUR>_ID / _SECRET existent.
const socialProviders = [
  SOCIAL_ENABLED.google && Google({ allowDangerousEmailAccountLinking: true }),
  SOCIAL_ENABLED.facebook && Facebook({ allowDangerousEmailAccountLinking: true }),
  SOCIAL_ENABLED.apple && Apple({ allowDangerousEmailAccountLinking: true }),
].filter(Boolean) as Provider[];

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/fr/login" },
  providers: [
    ...socialProviders,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    // Connexion sociale : compte lié par e-mail (créé si absent, avec un mot de passe aléatoire inutilisable).
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;
      const existing = await db.user.findUnique({ where: { email } });
      const row =
        existing ??
        (await db.user.create({
          data: { email, name: user.name?.trim() || email.split("@")[0], passwordHash: SOCIAL_HASH_PREFIX + randomBytes(32).toString("hex") },
        }));
      user.id = row.id;
      return true;
    },
    // sessionVersion : une réinitialisation de mot de passe invalide les autres sessions.
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.sv = (await db.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true } }))?.sessionVersion ?? 0;
        return token;
      }
      if (token.sub) {
        const row = await db.user.findUnique({ where: { id: token.sub }, select: { sessionVersion: true } });
        if (!row || row.sessionVersion !== ((token.sv as number | undefined) ?? 0)) return null;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
