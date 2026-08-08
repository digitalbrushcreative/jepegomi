import { sql } from "./db";

/**
 * What is waiting on somebody.
 *
 * The CMS sidebar carries a count against three of its links, and the dashboard
 * leads with the same three numbers. They are deliberately counts of *work*,
 * not of records: a claim nobody has confirmed, a parent nobody has answered, a
 * partner nobody has vouched for. A number here means open the page; a zero
 * means leave it alone.
 *
 * It is one round trip on purpose — the counts are read on every admin page
 * load, so three separate queries would be three per navigation for numbers
 * that are only ever glanced at.
 */
export type WaitingCounts = {
  /** Claims against a listed need that have not been marked received or declined. */
  claims: number;
  /** Enrolment enquiries nobody has replied to. */
  enquiries: number;
  /** Partners who have given but have not been vouched for. */
  partners: number;
};

const none: WaitingCounts = { claims: 0, enquiries: 0, partners: 0 };

export async function waitingCounts(): Promise<WaitingCounts> {
  /*
    The nav is not worth an error page. If the database is unreachable the
    counts come back as zeros and the links still work — the page behind each
    one says what is wrong far better than a broken sidebar would.
  */
  try {
    const rows = await sql()`
      SELECT
        (SELECT count(*) FROM pledges
          WHERE status IN ('pending', 'promised')) AS claims,
        (SELECT count(*) FROM enrolment_enquiries
          WHERE status = 'new') AS enquiries,
        (SELECT count(*) FROM partners
          WHERE verified_at IS NULL) AS partners
    `;

    const row = rows[0];
    if (!row) return none;

    return {
      claims: Number(row.claims ?? 0),
      enquiries: Number(row.enquiries ?? 0),
      partners: Number(row.partners ?? 0),
    };
  } catch (error) {
    console.error("CMS: could not count what is waiting.", error);
    return none;
  }
}
