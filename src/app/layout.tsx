import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { BottomNav } from "@/components/nav/BottomNav";

export const metadata: Metadata = {
  title: "Takwria TN",
  description: "Trouve ton terrain. Forme ton équipe. Joue ton match.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white pb-16 text-anthracite">
        <SessionProvider>
          {children}
          <BottomNav />
        </SessionProvider>
      </body>
    </html>
  );
}
