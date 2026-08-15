import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import {
  AUDIENCES,
  MOST_RECIPIENTS,
  type SentLetter,
  audience,
  listLetters,
} from "@/lib/letters";
import { isMailConfigured } from "@/lib/mail";
import { site } from "@/lib/site";
import { Empty, PageHeader, Panel } from "../ui";
import { LetterForm } from "./letter-form";

/**
 * Writing to the people the ministry already knows.
 *
 * Everything else in this tool changes what the site says to strangers. This is
 * the one screen that speaks to the churches and families on record — which is
 * why it carries its own history underneath it. A letter that has gone cannot
 * be looked at again anywhere else.
 */

/**
 * The messages go out in `after()`, which runs on this route's clock rather
 * than on the browser's — so the clock has to be long enough to finish the list.
 * At roughly a third of a second per provider round trip, a minute covers the
 * cap in lib/letters.ts with room to spare.
 *
 * Set at the page rather than in the action, because that is where a server
 * action's timeout is read from. Sixty seconds is the ceiling on every Vercel
 * plan including the free one; asking for more than the plan allows fails the
 * deployment rather than being quietly reduced.
 */
export const maxDuration = 60;
export default async function EmailPage() {
  const user = await currentUser();
  if (!user) redirect("/app");

  let letters: SentLetter[] = [];
  try {
    letters = await listLetters();
  } catch (error) {
    /*
      An unreachable database must not take the compose form down with it: the
      history is the part that needs the query, and the form's own actions
      report their own failures perfectly well.
    */
    console.error("Letters: could not read what has been sent.", error);
  }

  return (
    <div>
      <PageHeader
        title="Email"
        intro={
          <>
            Write to the churches who have given, or the parents who have asked
            about a place, and it goes out looking like everything else the site
            sends — the mark, the paper, the ministry&rsquo;s address at the
            bottom. Everyone gets their own copy; nobody sees anybody else on the
            list.
          </>
        }
      />

      <LetterForm
        audiences={AUDIENCES}
        defaultSignedBy={site.leaders}
        mailConfigured={isMailConfigured()}
        cap={MOST_RECIPIENTS}
      />

      <h2 className="font-display mt-14 mb-4 text-2xl font-bold">
        What has gone out
      </h2>

      <Panel>
        {letters.length === 0 ? (
          <Empty>Nothing has been sent from here yet.</Empty>
        ) : (
          <ul className="divide-y divide-black/8">
            {letters.map((letter) => (
              <li key={letter.id} className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-medium">{letter.subject}</p>
                  <p className="text-xs text-smoke">
                    {formatDay(letter.createdAt)}
                    {letter.sentByName && ` · ${letter.sentByName}`}
                  </p>
                </div>

                <p className="mt-1 text-sm text-smoke">
                  {audience(letter.audience)?.label ?? letter.audience} ·{" "}
                  <Outcome letter={letter} />
                </p>

                {letter.error && (
                  <p className="mt-1 text-xs text-clay">{letter.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/**
 * What actually happened to it.
 *
 * A row still saying "sending" is not hidden or rounded up to a success. It
 * means the process that was posting the messages went away before it finished,
 * and the only useful thing this screen can do is say so plainly — see the note
 * on the table in lib/db.ts.
 */
function Outcome({ letter }: { letter: SentLetter }) {
  const total = letter.recipients.length;

  if (letter.status === "sending") {
    return (
      <span className="text-clay">
        going out to {total} {total === 1 ? "person" : "people"}…
      </span>
    );
  }

  if (letter.failedCount > 0) {
    return (
      <span className="text-clay">
        {letter.sentCount} of {total} sent, {letter.failedCount} failed
      </span>
    );
  }

  return (
    <span className="text-green">
      sent to {letter.sentCount} {letter.sentCount === 1 ? "person" : "people"}
    </span>
  );
}
