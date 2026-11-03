import type { Metadata } from "next";
import { auth } from "@/auth";
import { CheckoutForm } from "@/components/marketplace/checkout-form";
import { db } from "@/lib/db";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).checkout.title };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const session = await auth();
  const user = session?.user?.id ? await db.user.findUnique({ where: { id: session.user.id } }) : null;
  const addresses = user
    ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] })
    : [];
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl text-primary">{getDict(locale).checkout.title}</h1>
      <CheckoutForm
        locale={locale}
        user={user ? { name: user.name, email: user.email } : null}
        addresses={addresses.map((a) => {
          const [first, ...rest] = a.fullName.split(" ");
          return {
            id: a.id,
            firstName: a.firstName || first,
            lastName: a.lastName || rest.join(" "),
            line1: a.line1,
            houseNumber: a.houseNumber,
            box: a.box ?? "",
            line2: a.line2 ?? "",
            postalCode: a.postalCode,
            city: a.city,
            country: a.country,
            phone: a.phone,
            isDefault: a.isDefault,
          };
        })}
      />
    </div>
  );
}
