export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/profil/:path*", "/tableau-de-bord/:path*"],
};
