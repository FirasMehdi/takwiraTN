import { MotDePasseOublieForm } from "@/components/forms/MotDePasseOublieForm";

export default function MotDePasseOubliePage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h1 className="px-4 pt-6 text-center text-xl font-semibold text-anthracite">Mot de passe oublié</h1>
        <MotDePasseOublieForm />
      </div>
    </main>
  );
}
