import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images servies directement depuis /images (derrière le mur de mot de passe), jamais via /_next/image.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  // Anciennes URL /createurs : redirection permanente (les slugs renommés sont gérés par la page via CreatorSlugAlias).
  async redirects() {
    return [
      { source: "/:locale(fr|en)/createurs", destination: "/:locale/partenaires", permanent: true },
      { source: "/:locale(fr|en)/createurs/:slug", destination: "/:locale/partenaires/:slug", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
