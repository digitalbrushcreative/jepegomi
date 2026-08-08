"use client";

import { useActionState, useTransition } from "react";
import type { EnquiryStatus } from "@/lib/enquiries";
import {
  deleteEnquiryAction,
  saveEnquiryNoteAction,
  setEnquiryStatusAction,
} from "./actions";

const quietButton =
  "cursor-pointer rounded border border-black/15 px-4 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-plum disabled:opacity-60";

/**
 * Where an enquiry has got to.
 *
 * Buttons rather than a dropdown, and only the moves that make sense from where
 * it is now: one click to say "I have written back", one to file it away, one to
 * put it back in the queue if the reply bounced. Nothing here emails the parent
 * — replying happens in Simon's mail client, where the school's actual answer
 * gets written.
 */
export function StatusButtons({
  id,
  status,
}: {
  id: string;
  status: EnquiryStatus;
}) {
  const [pending, start] = useTransition();

  const move = (next: EnquiryStatus) => {
    start(() => {
      void setEnquiryStatusAction(id, next);
    });
  };

  return (
    <div className="flex flex-wrap gap-3">
      {status === "new" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => move("answered")}
          className="cursor-pointer rounded bg-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60"
        >
          {pending ? "Saving…" : "I have written back"}
        </button>
      )}

      {status !== "new" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => move("new")}
          className={quietButton}
        >
          Put back in the queue
        </button>
      )}

      {status !== "closed" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => move("closed")}
          className={quietButton}
        >
          Close it
        </button>
      )}
    </div>
  );
}

/**
 * Deleting, behind a confirm that names the family. This is the one control on
 * the page that cannot be undone, and the row it removes is the only copy —
 * whoever clicks it should have read the name first.
 */
export function DeleteButton({ id, parentName }: { id: string; parentName: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Delete ${parentName}'s enquiry? It is removed for good — the email in your inbox is the only copy that will be left.`,
          )
        ) {
          return;
        }
        start(() => {
          void deleteEnquiryAction(id);
        });
      }}
      className="cursor-pointer text-sm font-medium text-smoke underline underline-offset-4 transition-colors hover:text-plum disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete this"}
    </button>
  );
}

export function NoteForm({ id, note }: { id: string; note: string }) {
  const [state, formAction, pending] = useActionState(
    saveEnquiryNoteAction,
    undefined,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />

      <label className="block">
        <span className="eyebrow text-smoke">Your note</span>
        <textarea
          name="note"
          rows={2}
          defaultValue={note}
          placeholder="Visited on the 14th, wants Grade 2 in January."
          className="mt-2 w-full rounded border border-black/15 bg-white px-4 py-3 outline-none focus:border-plum focus:ring-2 focus:ring-plum/20"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={quietButton}>
          {pending ? "Saving…" : "Save note"}
        </button>
        {state?.error && (
          <span role="alert" className="text-sm text-plum">
            {state.error}
          </span>
        )}
        {state?.saved && (
          <span role="status" className="text-sm text-green">
            Saved.
          </span>
        )}
      </div>
    </form>
  );
}
