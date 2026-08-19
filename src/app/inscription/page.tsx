import Link from "next/link";
import { InscriptionForm } from "@/components/forms/InscriptionForm";

export default function InscriptionPage() {
  return (
    <main className="px-4 py-6">
      <h1 className="text-center text-xl font-semibold">Créer un compte</h1>
      <InscriptionForm />
      <div className="flex flex-col gap-2 px-4 pb-6 text-sm text-anthracite">
        <Link href="/connexion" className="text-primary hover:underline">
          J&apos;ai déjà un compte
        </Link>
      </div>
    </main>
  );
}
