import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findMatchById, assurerConversationMatch } from "@/lib/matchs/queries";
import { findAmis } from "@/lib/amis/queries";
import { libelleFormat } from "@/lib/terrains/format";
import { MatchActions } from "@/components/matchs/MatchActions";
import { InviterAmiButton } from "@/components/matchs/InviterAmiButton";
import { DecisionReservationMatch } from "@/components/matchs/DecisionReservationMatch";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await findMatchById(id);
  if (!match) notFound();

  // Match créé avant la discussion de groupe automatique : on la crée à la
  // première consultation de sa fiche, plutôt que par une migration de masse.
  // On capture l'id renvoyé plutôt que de relire match.conversationId, qui
  // resterait null pour ce rendu — rien ne l'affiche aujourd'hui, mais tout
  // futur lien vers la discussion doit passer par cette variable locale.
  const conversationId = match.conversationId ?? (await assurerConversationMatch(match.id));

  const session = await getServerSession(authOptions);
  const estOrganisateur = session?.user?.id === match.organisateurId;
  const estInscrit =
    !!session?.user && match.participants.some((p) => p.userId === session.user.id);

  // Inviter un ami manquant : réservé aux participants déjà dans le match,
  // pour un match encore ouvert — inutile de proposer d'inviter si c'est déjà
  // complet ou annulé.
  let amisDisponibles: { id: string; prenom: string }[] = [];
  if (session?.user && estInscrit && match.statut === "ouvert") {
    const amis = await findAmis(session.user.id);
    const dejaInscrits = new Set(match.participants.map((p) => p.userId));
    amisDisponibles = amis
      .filter((ami) => !dejaInscrits.has(ami.id))
      .map((ami) => ({ id: ami.id, prenom: ami.prenom }));
  }

  // La décision de réservation ne se pose qu'à l'organisateur, une fois le
  // créneau passé, sur un match non annulé, et tant qu'il n'a pas tranché.
  const decisionAPrendre =
    estOrganisateur && match.estTermine && !match.decisionPrise && match.statut !== "annule";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 pb-6 pt-6">
      <Link href="/matchs" className="text-sm text-primary hover:underline">
        ← Retour aux matchs
      </Link>

      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-anthracite">{match.terrainNom}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {match.terrainVille} · {match.date} · {match.heureDebut} — {match.heureFin}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Organisé par {match.organisateurPrenom}
          {match.format ? ` · ${libelleFormat(match.format)}` : ""}
        </p>

        {match.description && <p className="mt-3 text-sm text-anthracite">{match.description}</p>}

        <p className="mt-3 text-sm font-medium text-anthracite">
          {match.joueursInscrits} / {match.joueursMax} joueurs
        </p>
        {match.statut !== "annule" && match.joueursManquants > 0 && (
          <p className="mt-1 text-sm font-medium text-primary">
            Il manque {match.joueursManquants} joueur{match.joueursManquants > 1 ? "s" : ""}
          </p>
        )}
        {!match.organisateurParticipe && (
          <p className="mt-1 text-sm text-gray-600">
            L&apos;organisateur ne joue pas : il n&apos;occupe aucune place.
          </p>
        )}

        <ul className="mt-2 flex flex-wrap gap-2">
          {match.participants.map((p) => (
            <li key={p.userId} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-anthracite">
              {p.prenom}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2">
          {decisionAPrendre && <DecisionReservationMatch matchId={match.id} />}
          {estOrganisateur && match.reservationId && (
            <p className="text-sm font-medium text-primary">Créneau réservé.</p>
          )}
          <MatchActions
            matchId={match.id}
            statut={match.statut}
            estOrganisateur={estOrganisateur}
            estInscrit={estInscrit}
          />
          {amisDisponibles.length > 0 && (
            <InviterAmiButton
              matchUrl={`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/matchs/${match.id}`}
              amisDisponibles={amisDisponibles}
            />
          )}
        </div>
      </div>
    </main>
  );
}
