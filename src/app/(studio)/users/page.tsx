import { can, requireUser } from "@/lib/auth";
import { listTeam } from "@/lib/auth/user-actions";
import { AddPerson, TeamList } from "./team";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireUser();

  if (!can(user.role, "user:manage")) {
    return (
      <>
        <h1 className="text-3xl font-bold">Team</h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          Only an admin can add people or change what they may do. Your role is{" "}
          {user.role}.
        </p>
      </>
    );
  }

  const team = await listTeam();

  return (
    <>
      <h1 className="text-3xl font-bold">Team</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Everyone gets their own account. That is what makes an approval mean
        something: it is recorded against a person, not against a code that four
        people share.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="team-heading">
          <h2 id="team-heading" className="mb-3 text-lg font-semibold">
            {team.length} {team.length === 1 ? "person" : "people"}
          </h2>
          <TeamList team={team} currentUserId={user.id} />
        </section>

        <AddPerson />
      </div>
    </>
  );
}
