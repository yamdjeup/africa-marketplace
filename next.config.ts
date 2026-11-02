import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images servies directement depuis /images (derrière le mur de mot de passe), jamais via /_next/image.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
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
