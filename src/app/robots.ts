import type { MetadataRoute } from "next";

// Démonstration privée : aucune indexation.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
