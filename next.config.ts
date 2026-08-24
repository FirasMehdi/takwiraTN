import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ne pas annoncer la stack dans les réponses.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Empêche l'affichage du site dans une iframe (protection contre
          // le clickjacking, notamment sur /connexion).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  // Volontairement absent ici : une Content-Security-Policy complète et
  // Strict-Transport-Security. La CSP a besoin d'un nonce par requête pour
  // ne pas casser l'hydration du App Router — à faire avec soin avant le
  // premier déploiement public, pas ajoutée à l'aveugle ici. HSTS n'a de
  // sens qu'une fois TLS en place devant l'app.
};

export default nextConfig;
