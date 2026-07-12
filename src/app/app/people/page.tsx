import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { InviteForm, RemoveButton } from "./people-forms";

type Person = { id: string; name: string; email: string; created_at: string };

export default async function PeoplePage() {
  const user = await currentUser();
  if (!user) redirect("/app");

  const people = (await sql()`
    SELECT id, name, email, created_at FROM users ORDER BY created_at
  `) as Person[];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold">People</h1>
      <p className="mt-3 leading-relaxed text-smoke">
        Everyone who can sign in and edit the site. Each person gets their own
        password, so an edit is always attributable and one person can be removed
        without disturbing anybody else.
      </p>

      <ul className="mt-10 divide-y divide-black/8 rounded border border-black/8 bg-white">
        {people.map((person) => (
          <li
            key={person.id}
            className="flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div>
              <p className="font-medium">
                {person.name}
                {person.id === user.id && (
                  <span className="ml-2 text-sm font-normal text-smoke">
                    (you)
                  </span>
                )}
              </p>
              <p className="text-sm text-smoke">{person.email}</p>
            </div>

            {person.id !== user.id && (
              <RemoveButton userId={person.id} name={person.name} />
            )}
          </li>
        ))}
      </ul>

      <h2 className="font-display mt-14 text-2xl font-bold">Add someone</h2>
      <p className="mt-2 leading-relaxed text-smoke">
        Choose a password with them and tell them what it is. They can use it to
        sign in at <code className="font-mono text-sm">/app</code>.
      </p>
      <InviteForm />
    </div>
  );
}
