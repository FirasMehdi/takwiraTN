import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/connexion",
  },
});

export const config = {
  matcher: [
    "/profil/:path*",
    "/tableau-de-bord/:path*",
    "/joueurs/:path*",
    "/matchs/creer/:path*",
    "/amis/:path*",
    "/admin/:path*",
  ],
};
