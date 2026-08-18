import { ReinitialiserMotDePasseForm } from "@/components/forms/ReinitialiserMotDePasseForm";

export default async function ReinitialiserMotDePassePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="px-4 py-6">
      <h1 className="text-center text-xl font-semibold">Nouveau mot de passe</h1>
      <ReinitialiserMotDePasseForm token={token} />
    </main>
  );
}
