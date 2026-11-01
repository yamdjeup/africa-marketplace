import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-heading text-4xl">Afrique Marketplace</h1>
      <p className="max-w-md text-muted-foreground">
        Socle front du POC. Decouvrez le design system.
      </p>
      <Link href="/design" className={buttonVariants()}>
        Voir /design
      </Link>
    </main>
  );
}
