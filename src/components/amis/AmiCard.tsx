import Link from "next/link";

export function AmiCard({ ami }: { ami: { id: string; prenom: string; ville: string } }) {
  return (
    <Link
      href={`/amis/${ami.id}`}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div>
        <p className="text-sm font-medium text-anthracite">{ami.prenom}</p>
        <p className="text-xs text-gray-600">{ami.ville}</p>
      </div>
      <span className="text-xs text-primary">Discuter →</span>
    </Link>
  );
}
