"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { returnOrigin } from "@/lib/origin";
import { connectEnabled, createExpressAccount, createOnboardingLink } from "@/lib/stripe-connect";

import { getPortalContext } from "@/lib/supplier";

// « Configurer mes paiements » : crée le compte Express (une seule fois) puis redirige vers l'onboarding hébergé par Stripe (KYC).
export async function setupPayoutsAction(f: FormData) {
  const locale = String(f.get("locale") ?? "") === "en" ? "en" : "fr";
  const back = `/${locale}/fournisseur/paiements`;
  const ctx = await getPortalContext();
  if (!ctx) redirect(`/${locale}/fournisseur`);
  if (ctx.viewingAs) redirect(`${back}?connect=readonly`);
  if (!connectEnabled()) redirect(`${back}?connect=disabled`);
  const hdr = await headers();
  const origin = returnOrigin(hdr.get("x-forwarded-host") ?? hdr.get("host"), process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "https://epomta.com");
  let url: string;
  try {
    let accountId = ctx.supplier.stripeAccountId;
    if (!accountId) {
      const email = ctx.supplier.contactEmail || undefined;
      const country = /^[A-Za-z]{2}$/.test(ctx.supplier.country) ? ctx.supplier.country.toUpperCase() : undefined;
      accountId = (await createExpressAccount({ supplierId: ctx.supplier.id, email, country })).id;
      await db.supplier.update({ where: { id: ctx.supplier.id }, data: { stripeAccountId: accountId, stripeConnectStatus: "PENDING" } });
    }
    url = (await createOnboardingLink(accountId, { refresh: `${origin}${back}?connect=refresh`, return: `${origin}${back}?connect=return` })).url;
  } catch (e) {
    console.error("[connect]", e instanceof Error ? e.message : e);
    redirect(`${back}?connect=error`);
  }
  redirect(url);
}
