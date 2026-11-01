import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Rendu dans le layout [locale] ; la langue exacte n'est pas disponible ici, libellés bilingues.
export default function NotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="font-heading text-3xl text-primary">404</h1>
      <p className="text-muted-foreground">Page introuvable · Page not found</p>
      <Link href="/" className={buttonVariants()}>
        Accueil · Home
      </Link>
    </div>
  );
}
