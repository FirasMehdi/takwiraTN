import Link from "next/link";
import { ConnexionForm } from "@/components/forms/ConnexionForm";

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ inscription?: string; reinitialisation?: string }>;
}) {
  const params = await searchParams;
  const inscriptionReussie = params.inscription === "reussie";
  const reinitialisationReussie = params.reinitialisation === "reussie";

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h1 className="px-4 pt-6 text-center text-xl font-semibold text-anthracite">Se connecter</h1>
        {inscriptionReussie && (
          <p role="status" className="mx-4 mt-4 rounded bg-primary/10 px-3 py-2 text-sm text-primary">
            Votre compte a été créé avec succès. Vous pouvez vous connecter.
          </p>
        )}
        {reinitialisationReussie && (
          <p role="status" className="mx-4 mt-4 rounded bg-primary/10 px-3 py-2 text-sm text-primary">
            Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.
          </p>
        )}
        <ConnexionForm />
        <div className="flex flex-col gap-2 px-4 pb-6 text-sm text-anthracite">
          <Link href="/inscription" className="text-primary hover:underline">
            Pas encore de compte ? Créer un compte
          </Link>
          <Link href="/mot-de-passe-oublie" className="text-primary hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
    </main>
  );
}
