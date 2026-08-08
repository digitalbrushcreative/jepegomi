import { randomUUID } from "node:crypto";
import { toIso } from "@/lib/dates";
import { isDatabaseConfigured, sql } from "@/lib/db";
import type { EnrolmentEnquiry } from "@/lib/mail";

/**
 * The enrolment inbox.
 *
 * A parent asks about a place at /academy; the school gets an email, and a row
 * lands here. The email is still the thing that reaches Simon on the day — this
 * is the thing that remembers, a week later, that the parent from Sunday has
 * had no reply.
 *
 * Three states, and no more. A queue that can be sorted six ways is a queue
 * nobody keeps up to date:
 *
 *   new       nobody has written back yet. This is what /app counts.
 *   answered  somebody has replied. The conversation is somebody's.
 *   closed    finished, whether or not the child enrolled.
 *
 * Deleting is offered plainly and does what it says — see the note on the table
 * in lib/db.ts. Nothing here is ever shown on a public page: every function
 * below is called from /app or from the action that writes the row.
 */

export type EnquiryStatus = "new" | "answered" | "closed";

const STATUSES: EnquiryStatus[] = ["new", "answered", "closed"];

export function isEnquiryStatus(value: string): value is EnquiryStatus {
  return (STATUSES as string[]).includes(value);
}

export type StoredEnquiry = EnrolmentEnquiry & {
  id: string;
  status: EnquiryStatus;
  /** Simon's own note. Never sent anywhere, never shown to the parent. */
  note: string;
  createdAt: string;
  answeredAt: string | null;
  /** Who marked it answered, by name — null if they have since been removed. */
  answeredBy: string | null;
};

type Row = Record<string, unknown>;

const str = (value: unknown) => String(value ?? "");

function toEnquiry(row: Row): StoredEnquiry {
  const status = str(row.status);

  return {
    id: str(row.id),
    parentName: str(row.parent_name),
    email: str(row.email),
    phone: str(row.phone),
    childName: str(row.child_name),
    childAge: str(row.child_age),
    startingWhen: str(row.starting_when),
    message: str(row.message),
    status: isEnquiryStatus(status) ? status : "new",
    note: str(row.note),
    createdAt: toIso(row.created_at),
    answeredAt: row.answered_at ? toIso(row.answered_at) : null,
    answeredBy: row.answered_by_name ? str(row.answered_by_name) : null,
  };
}

/**
 * Keeps a copy of what a parent sent.
 *
 * Best-effort by design, and the only function here that swallows its own
 * errors. It is called from a public form action whose real job is to get the
 * enquiry in front of the school; a database that is asleep must not be the
 * reason a parent is told their message did not go. The caller finds out
 * whether it stored, and carries on either way.
 */
export async function recordEnrolmentEnquiry(
  enquiry: EnrolmentEnquiry,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    await sql()`
      INSERT INTO enrolment_enquiries
        (id, parent_name, email, phone, child_name, child_age, starting_when,
         message)
      VALUES
        (${randomUUID()}, ${enquiry.parentName}, ${enquiry.email},
         ${enquiry.phone}, ${enquiry.childName}, ${enquiry.childAge},
         ${enquiry.startingWhen}, ${enquiry.message})
    `;
    return true;
  } catch (error) {
    console.error("Academy: could not record an enrolment enquiry.", error);
    return false;
  }
}

/** Everything in the inbox, the ones still waiting first. */
export async function listEnrolmentEnquiries(): Promise<StoredEnquiry[]> {
  const rows = await sql()`
    SELECT e.*, u.name AS answered_by_name
    FROM enrolment_enquiries e
    LEFT JOIN users u ON u.id = e.answered_by
    ORDER BY e.status = 'new' DESC, e.created_at DESC
  `;

  return rows.map(toEnquiry);
}

/**
 * Moving one along.
 *
 * Answering stamps who and when, and only the first time: the name on a row is
 * the person who actually wrote back, not whoever last clicked something.
 * Reopening clears both, because an enquiry that is waiting again has, as far
 * as the parent is concerned, not been answered.
 */
export async function setEnquiryStatus(
  id: string,
  status: EnquiryStatus,
  userId: string,
) {
  if (status === "new") {
    await sql()`
      UPDATE enrolment_enquiries
      SET status = 'new', answered_at = NULL, answered_by = NULL
      WHERE id = ${id}
    `;
    return;
  }

  await sql()`
    UPDATE enrolment_enquiries
    SET status = ${status},
        answered_at = COALESCE(answered_at, now()),
        answered_by = COALESCE(answered_by, ${userId})
    WHERE id = ${id}
  `;
}

export async function saveEnquiryNote(id: string, note: string) {
  await sql()`
    UPDATE enrolment_enquiries SET note = ${note} WHERE id = ${id}
  `;
}

export async function deleteEnquiry(id: string) {
  await sql()`DELETE FROM enrolment_enquiries WHERE id = ${id}`;
}
