import Link from "next/link";
import { InscriptionForm } from "@/components/forms/InscriptionForm";

export default function InscriptionPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h1 className="px-4 pt-6 text-center text-xl font-semibold text-anthracite">Créer un compte</h1>
        <InscriptionForm />
        <div className="flex flex-col gap-2 px-4 pb-6 text-sm text-anthracite">
          <Link href="/connexion" className="text-primary hover:underline">
            J&apos;ai déjà un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
