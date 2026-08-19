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
    <main className="px-4 py-6">
      <h1 className="text-center text-xl font-semibold">Se connecter</h1>
      {inscriptionReussie && (
        <p role="status" className="mt-4 rounded bg-primary/10 px-3 py-2 text-sm text-primary">
          Votre compte a été créé avec succès. Vous pouvez vous connecter.
        </p>
      )}
      {reinitialisationReussie && (
        <p role="status" className="mt-4 rounded bg-primary/10 px-3 py-2 text-sm text-primary">
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
    </main>
  );
}
