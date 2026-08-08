import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { ensureSchema } from "@/lib/db";
import {
  type EnquiryStatus,
  type StoredEnquiry,
  listEnrolmentEnquiries,
} from "@/lib/enquiries";
import { PageHeader } from "../ui";
import { DeleteButton, NoteForm, StatusButtons } from "./enquiry-forms";

const STATUS_STYLES: Record<EnquiryStatus, { label: string; className: string }> = {
  new: { label: "Waiting", className: "bg-marigold/20 text-clay" },
  answered: { label: "Answered", className: "bg-green/12 text-green" },
  closed: { label: "Closed", className: "bg-sand text-smoke" },
};

/** Everything the parent told the form, minus the parts they left blank. */
function details(enquiry: StoredEnquiry) {
  return [
    ["Child", enquiry.childName],
    ["Age or class", enquiry.childAge],
    ["Hoping to start", enquiry.startingWhen],
    ["Phone", enquiry.phone],
  ].filter(([, value]) => value) as [string, string][];
}

/**
 * The enrolment inbox.
 *
 * The page leads with what is waiting, for the same reason the Needs page leads
 * with unconfirmed claims: a parent who asked about a place and heard nothing is
 * the one thing on this screen that gets worse by being left.
 *
 * Replying is not done from here. The address is a mailto link and the answer
 * gets written in Simon's own mail client — a school's reply to a parent is a
 * letter, not a form field, and building a send box here would only mean a worse
 * one than the one he already has open.
 */
export default async function AdminEnquiriesPage() {
  const user = await currentUser();
  if (!user) redirect("/app");

  await ensureSchema();
  const enquiries = await listEnrolmentEnquiries();

  const waiting = enquiries.filter((enquiry) => enquiry.status === "new");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Enquiries"
        intro={
          <>
            Parents asking about a place, from the form at{" "}
            <span className="font-mono text-sm">/academy</span>. Each one was
            emailed to you as it arrived — this is the list that remembers which
            of them you have answered.
          </>
        }
      />

      {waiting.length > 0 && (
        <p className="rounded border border-marigold/40 bg-marigold/8 px-5 py-4 text-sm leading-relaxed">
          <strong className="font-medium">
            {waiting.length} still waiting on you.
          </strong>{" "}
          <span className="text-smoke">
            Reply from your own email, then mark it here so nobody writes to them
            twice.
          </span>
        </p>
      )}

      {enquiries.length === 0 ? (
        <p className="mt-10 rounded border border-dashed border-smoke/40 bg-sand px-6 py-5 leading-relaxed text-smoke">
          Nothing yet. When a parent fills in the form on the academy page, their
          enquiry appears here and lands in your inbox at the same moment.
        </p>
      ) : (
        <ul className="mt-10 space-y-6">
          {enquiries.map((enquiry) => {
            const status = STATUS_STYLES[enquiry.status];

            return (
              <li
                key={enquiry.id}
                className="rounded border border-black/8 bg-white p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-display text-xl font-bold">
                        {enquiry.parentName}
                      </h2>
                      <span
                        className={`eyebrow rounded-full px-3 py-1 ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <a
                      href={`mailto:${enquiry.email}?subject=${encodeURIComponent("Your enquiry about Jepegomi Academy")}`}
                      className="mt-2 inline-block font-mono text-xs text-plum underline underline-offset-4"
                    >
                      {enquiry.email}
                    </a>
                  </div>

                  <p className="text-sm text-smoke">
                    Asked {formatDay(enquiry.createdAt)}
                    {enquiry.answeredAt && (
                      <>
                        {" · answered "}
                        {formatDay(enquiry.answeredAt)}
                        {enquiry.answeredBy && ` by ${enquiry.answeredBy}`}
                      </>
                    )}
                  </p>
                </div>

                {details(enquiry).length > 0 && (
                  <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
                    {details(enquiry).map(([label, value]) => (
                      <div key={label}>
                        <dt className="eyebrow text-smoke">{label}</dt>
                        <dd className="mt-1 font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {enquiry.message && (
                  <p className="mt-5 border-l-2 border-sand-deep pl-4 text-sm leading-relaxed whitespace-pre-line text-smoke">
                    {enquiry.message}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-black/8 pt-5">
                  <StatusButtons id={enquiry.id} status={enquiry.status} />
                  <DeleteButton id={enquiry.id} parentName={enquiry.parentName} />
                </div>

                <details className="mt-5">
                  <summary className="cursor-pointer text-sm font-medium text-smoke hover:text-plum">
                    Your note
                    {enquiry.note && " — written"}
                  </summary>
                  <div className="mt-5 border-t border-black/8 pt-5">
                    <NoteForm id={enquiry.id} note={enquiry.note} />
                    <p className="mt-3 text-xs leading-relaxed text-smoke">
                      For you only. Never sent to the parent and never shown
                      anywhere else on the site.
                    </p>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-12 max-w-2xl rounded border border-dashed border-smoke/40 bg-sand px-6 py-5 text-sm leading-relaxed text-smoke">
        <strong className="font-medium text-charcoal">
          Delete the ones you are finished with.
        </strong>{" "}
        This is the only place on the site that holds anything about a child, and
        a family who asked about a place and went elsewhere has no reason to stay
        on a list. Closing an enquiry keeps it; deleting removes it for good.
      </p>
    </div>
  );
}
