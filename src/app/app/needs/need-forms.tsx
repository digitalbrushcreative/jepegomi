"use client";

import { useActionState, useTransition } from "react";
import { usd } from "@/lib/money";
import { MAX_LABEL } from "@/lib/photo-rules";
import {
  NEED_AREAS,
  NEED_ICONS,
  type NeedWithLedger,
  type PledgeStatus,
  areaOf,
} from "@/lib/giving";
import type { NeedPart, Project } from "@/lib/projects";
import {
  createNeedAction,
  createPartAction,
  createProjectAction,
  deleteNeedAction,
  deletePartAction,
  deleteProjectAction,
  deleteUpdateAction,
  postUpdateAction,
  seedKitchenNeedsAction,
  setPledgeStatusAction,
  updateNeedAction,
  updatePartAction,
  updateProjectAction,
} from "./actions";

const inputClass =
  "mt-2 w-full rounded border border-black/15 bg-white px-4 py-3 outline-none focus:border-plum focus:ring-2 focus:ring-plum/20";

const primaryButton =
  "cursor-pointer rounded bg-green px-7 py-3 font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60";

const quietButton =
  "cursor-pointer rounded border border-black/15 px-4 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-plum disabled:opacity-60";

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="eyebrow text-smoke">{label}</span>
      {children}
      {hint && (
        <span className="mt-2 block text-sm leading-relaxed text-smoke">{hint}</span>
      )}
    </label>
  );
}

function Notice({ error, saved }: { error?: string; saved?: boolean }) {
  if (error) {
    return (
      <p role="alert" className="mt-4 text-sm leading-relaxed text-plum">
        {error}
      </p>
    );
  }
  if (saved) {
    return (
      <p role="status" className="mt-4 text-sm text-green">
        Saved. It is live on the site now.
      </p>
    );
  }
  return null;
}

/**
 * The fields of a need, shared by the "add" form and the "edit" form.
 *
 * One component rather than two because the two forms differ in exactly two
 * ways — which action they post to, and whether they carry an id — and a need
 * whose editor showed a field its creator did not is how a cost ends up saved
 * without the summary that explains it.
 */
function NeedFields({
  need,
  parts,
  projects,
}: {
  need?: NeedWithLedger;
  parts: NeedPart[];
  projects: Project[];
}) {
  return (
    <>
      <Field label="What is needed">
        <input
          name="title"
          required
          defaultValue={need?.title}
          placeholder="Water tank for harvesting water, plus pipes"
          className={inputClass}
        />
      </Field>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <Field
          label="What it costs"
          hint={
            need && need.ledger.receivedCents + need.ledger.promisedCents > 0
              ? `Cannot go below ${usd(need.ledger.receivedCents + need.ledger.promisedCents)} — that much is already claimed.`
              : "In US dollars."
          }
        >
          <input
            name="cost"
            required
            inputMode="decimal"
            defaultValue={need ? String(need.costCents / 100) : ""}
            placeholder="850"
            className={`${inputClass} tabular`}
          />
        </Field>

        {/*
          The two fields that turn a list of items into a set of accounts.

          Both are ordinarily left alone — most items cost what they were going
          to cost and need no explanation. They exist for the ones that did not:
          Pastor Simon's letter reconciles cement estimated at $900 against
          $1,550 actually spent, and until these columns existed that letter had
          to live in a TypeScript file because the ledger had nowhere to put it.

          They show only in a project's accounts, behind the partner door — never
          on a public page. See lib/disclosure.ts.
        */}
        <Field
          label="Estimated, if that was different"
          hint="What it was expected to cost, when the final figure differs. Leave blank for anything that came in at its price — most things do."
        >
          <input
            name="estimated"
            inputMode="decimal"
            defaultValue={
              need?.estimatedCents ? String(need.estimatedCents / 100) : ""
            }
            placeholder="900"
            className={`${inputClass} tabular`}
          />
        </Field>

        <Field
          label="Picture"
          hint="Shown beside the item on the project page. Leave it on the project's own icon unless a different one says something — a tank, a floor, a light."
        >
          <select
            name="icon"
            defaultValue={need?.icon ?? ""}
            className={inputClass}
          >
            <option value="">The project&apos;s own icon</option>
            {NEED_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Why the two differ"
          hint="One line, for the accounts — “price rose, and the job grew”. Shown beside the item to the partners who paid for it."
        >
          <input
            name="note"
            defaultValue={need?.note ?? ""}
            placeholder="More needed for drainage work"
            className={inputClass}
          />
        </Field>

        {/*
          Which raise this cost belongs to, and through it which arm of the
          ministry — the area is read off the project rather than asked for
          twice. Ignored entirely when the item is inside a part, because a part
          already belongs to a project and an item that named a different one
          would sit in a list it is not part of.
        */}
        <Field
          label="Which project"
          hint="Ignored when the item is inside a part — the part decides."
        >
          <select
            name="projectId"
            defaultValue={need?.projectId ?? projects[0]?.id ?? ""}
            className={inputClass}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Order" hint="Lower numbers come first within its part.">
          <input
            name="position"
            type="number"
            defaultValue={need?.position ?? 0}
            className={`${inputClass} tabular`}
          />
        </Field>
      </div>

      {/*
        Which step of the work this cost belongs to — and so, in the end,
        whether anybody is asked for it yet. An item left out of a part is
        offered from the moment it is published, which is right for the things
        that are not steps in anything: a term of a teacher's pay does not wait
        for a wall.
      */}
      <Field
        label="Which part of the work"
        hint={
          parts.length === 0
            ? "No parts yet. Add one further down the page if this project has an order to it — walls before roof, roof before paint."
            : "Items inside a part are only offered once the parts before it are fully claimed."
        }
        className="mt-5"
      >
        <select
          name="partId"
          defaultValue={need?.partId ?? ""}
          className={inputClass}
        >
          <option value="">Not in a part — offer it straight away</option>
          {parts.map((part) => (
            <option key={part.id} value={part.id}>
              {areaOf(part.area).label} · {part.sequence}. {part.title}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="One line about it"
        hint="Shown on the card in the list, under the name."
        className="mt-5"
      >
        <input
          name="summary"
          defaultValue={need?.summary}
          className={inputClass}
        />
      </Field>

      <Field
        label="The full explanation"
        hint="Shown on the item's own page. Leave a blank line between paragraphs."
        className="mt-5"
      >
        <textarea
          name="detail"
          rows={6}
          defaultValue={need?.detail}
          className={inputClass}
        />
      </Field>

      <div className="mt-6 space-y-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={need?.published ?? false}
            className="mt-1 h-4 w-4 accent-green"
          />
          <span className="text-sm leading-relaxed">
            <strong className="font-medium">Show this on the site.</strong>{" "}
            <span className="text-smoke">
              Until this is ticked, nobody outside /app can see it or give to it.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="closed"
            defaultChecked={need?.closed ?? false}
            className="mt-1 h-4 w-4 accent-plum"
          />
          <span className="text-sm leading-relaxed">
            <strong className="font-medium">The work on this is finished.</strong>{" "}
            <span className="text-smoke">
              It stops asking for money but stays on the page, with its ledger,
              as a record of what was done.
            </span>
          </span>
        </label>
      </div>
    </>
  );
}

export function NewNeedForm({
  parts,
  projects,
}: {
  parts: NeedPart[];
  projects: Project[];
}) {
  const [state, formAction, pending] = useActionState(createNeedAction, undefined);

  return (
    <form action={formAction} className="mt-6">
      <NeedFields parts={parts} projects={projects} />
      <Notice error={state?.error} saved={state?.saved} />
      <button type="submit" disabled={pending} className={`${primaryButton} mt-6`}>
        {pending ? "Adding…" : "Add this item"}
      </button>
    </form>
  );
}

export function EditNeedForm({
  need,
  parts,
  projects,
}: {
  need: NeedWithLedger;
  parts: NeedPart[];
  projects: Project[];
}) {
  const [state, formAction, pending] = useActionState(updateNeedAction, undefined);

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="id" value={need.id} />
      <NeedFields need={need} parts={parts} projects={projects} />
      <Notice error={state?.error} saved={state?.saved} />
      <button type="submit" disabled={pending} className={`${primaryButton} mt-6`}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------ whole projects */

/**
 * The fields of a project, shared by the add form and the row editors.
 *
 * The arm of the ministry is the field that matters, and it is the one that
 * cannot be inferred: a raise belongs to the church or the academy or the
 * transport programme, and everything underneath it — its parts, its items —
 * takes that answer from here rather than carrying an opinion of its own.
 * Changing it moves the whole project, which is what `updateProject` is for.
 */
function ProjectFields({ project }: { project?: Project }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem]">
        <Field label="Part of the ministry">
          <select
            name="area"
            defaultValue={project?.area ?? "academy"}
            className={inputClass}
          >
            {NEED_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="What the raise is called">
          <input
            name="title"
            required
            defaultValue={project?.title}
            placeholder="New Classroom Block"
            className={inputClass}
          />
        </Field>

        <Field label="Order" hint="Within its programme.">
          <input
            name="sequence"
            type="number"
            defaultValue={project?.sequence ?? 0}
            className={`${inputClass} tabular`}
          />
        </Field>
      </div>

      <Field
        label="One line about it"
        hint="Shown under the heading on /needs."
        className="mt-4"
      >
        <input
          name="summary"
          defaultValue={project?.summary}
          className={inputClass}
        />
      </Field>

      <div className="mt-4 flex flex-wrap gap-6">
        {/*
          Ticked by default on a new one. A project is a heading and shows up
          where its items do, so publishing it asks for nothing by itself — but
          leaving it unticked would hide items somebody had deliberately
          published, which is a surprise in the wrong direction.
        */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={project ? project.published : true}
          />
          On the site
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="closed"
            defaultChecked={project?.closed ?? false}
          />
          Finished
        </label>
      </div>
    </>
  );
}

export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6">
      <ProjectFields />
      <Notice error={state?.error} saved={state?.saved} />
      <button type="submit" disabled={pending} className={`${primaryButton} mt-6`}>
        {pending ? "Adding…" : "Add this project"}
      </button>
    </form>
  );
}

export function EditProjectForm({
  project,
  itemCount,
}: {
  project: Project;
  itemCount: number;
}) {
  const [state, formAction, pending] = useActionState(
    updateProjectAction.bind(null, project.id),
    undefined,
  );
  const [deleting, startDelete] = useTransition();

  return (
    <form action={formAction} className="p-6">
      <ProjectFields project={project} />

      <Notice error={state?.error} saved={state?.saved} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={quietButton}>
          {pending ? "Saving…" : "Save this project"}
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            /*
              Allowed whatever is claimed against the items, like deleting a
              part and unlike deleting an item, because it destroys nothing:
              both columns pointing at a project are ON DELETE SET NULL, so its
              parts and items come loose and go on being shown under their arm
              of the ministry with their ledgers untouched. The message says the
              number out loud — "delete" beside a list of funded costs should
              never be a leap of faith.
            */
            if (
              !confirm(
                itemCount === 0
                  ? `Delete “${project.title}”?`
                  : `Delete “${project.title}”? Its ${itemCount} ${
                      itemCount === 1 ? "item stays" : "items stay"
                    } on the site, under ${project.area}, with everything claimed against them.`,
              )
            ) {
              return;
            }
            startDelete(() => deleteProjectAction(project.id));
          }}
          className="text-sm font-medium text-clay underline underline-offset-4"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------- parts of a project */

/**
 * The fields of a part, shared by the add form and the row editors, for the
 * same reason NeedFields is shared.
 *
 * The number is the whole feature and so it is the field with the explanation
 * on it. Everything else here is a label.
 */
function PartFields({
  part,
  projects,
}: {
  part?: NeedPart;
  projects: Project[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem]">
      {/*
        A project rather than an arm of the ministry. The part takes its area
        from whichever project it is put in — see `readPartForm` — because two
        fields that have to agree are two fields that will one day disagree.
      */}
      <Field label="Which project">
        <select
          name="projectId"
          defaultValue={part?.projectId ?? projects[0]?.id ?? ""}
          className={inputClass}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </Field>

      <Field label="What this step is">
        <input
          name="title"
          required
          defaultValue={part?.title}
          placeholder="Walls up"
          className={inputClass}
        />
      </Field>

      <Field label="Order">
        <input
          name="sequence"
          type="number"
          defaultValue={part?.sequence ?? 0}
          className={`${inputClass} tabular`}
        />
      </Field>
    </div>
  );
}

/**
 * Adding a step of the work.
 *
 * Nothing about this appears on the site until costs are put inside it, which
 * is deliberate — planning the order of a build is something Simon should be
 * able to do in /app on a Tuesday without publishing a half-thought-through
 * budget to every partner church.
 */
export function NewPartForm({ projects }: { projects: Project[] }) {
  const [state, formAction, pending] = useActionState(createPartAction, undefined);

  return (
    <form action={formAction} className="mt-6">
      <PartFields projects={projects} />

      <Field
        label="One line about it"
        hint="Shown once above the items in this step, on /needs and in the giving form."
        className="mt-4"
      >
        <input
          name="summary"
          placeholder="The block walls, up to roof height."
          className={inputClass}
        />
      </Field>

      <Notice error={state?.error} saved={state?.saved} />
      <button type="submit" disabled={pending} className={`${primaryButton} mt-6`}>
        {pending ? "Adding…" : "Add this part"}
      </button>
    </form>
  );
}

/**
 * One part, editable where it sits.
 *
 * Inline rather than on a page of its own because the thing being edited is
 * almost always the number, and a number that decides an ordering is impossible
 * to set sensibly without the rest of the ordering in front of you.
 */
export function EditPartForm({
  part,
  itemCount,
  projects,
}: {
  part: NeedPart;
  itemCount: number;
  projects: Project[];
}) {
  const [state, formAction, pending] = useActionState(updatePartAction, undefined);
  const [deleting, startDelete] = useTransition();

  return (
    <form action={formAction} className="p-6">
      <input type="hidden" name="id" value={part.id} />
      <PartFields part={part} projects={projects} />

      <Field label="One line about it" className="mt-4">
        <input name="summary" defaultValue={part.summary} className={inputClass} />
      </Field>

      <Notice error={state?.error} saved={state?.saved} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={quietButton}>
          {pending ? "Saving…" : "Save this part"}
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            /*
              Always allowed, whatever is claimed against the items — deleting a
              part deletes a heading and nothing else. The items come loose and
              go on sitting under the project with their ledgers untouched, and
              the message says so, because "delete" next to a list of funded
              costs should never be a leap of faith.
            */
            if (
              !confirm(
                itemCount === 0
                  ? `Delete “${part.title}”? Nothing is in it.`
                  : `Delete “${part.title}”? Its ${itemCount} ${
                      itemCount === 1 ? "item stays" : "items stay"
                    } on the site, with everything given to them, but will no longer wait their turn.`,
              )
            ) {
              return;
            }
            startDelete(() => {
              void deletePartAction(part.id);
            });
          }}
          className={quietButton}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>

        <p className="text-sm text-smoke">
          {itemCount === 0
            ? "Nothing costed in it yet."
            : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
        </p>
      </div>
    </form>
  );
}

export function DeleteNeedButton({
  needId,
  title,
  claimed,
}: {
  needId: string;
  title: string;
  claimed: boolean;
}) {
  const [pending, start] = useTransition();

  /*
    Not offered at all once money is claimed against it. The action refuses too
    — that is where the rule actually lives — but a button that always fails is
    a worse explanation than no button and a sentence.
  */
  if (claimed) {
    return (
      <p className="text-sm leading-relaxed text-smoke">
        This cannot be deleted — money has been claimed against it. Tick
        &ldquo;the work is finished&rdquo; above to close it instead.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete “${title}”? Nothing has been claimed against it.`)) {
          return;
        }
        start(() => {
          void deleteNeedAction(needId);
        });
      }}
      className={quietButton}
    >
      {pending ? "Deleting…" : "Delete this item"}
    </button>
  );
}

/** The buttons that move a claim along: confirm it, bank it, or drop it. */
export function PledgeActions({
  pledgeId,
  status,
}: {
  pledgeId: string;
  status: PledgeStatus;
}) {
  const [pending, start] = useTransition();

  const move = (next: PledgeStatus, confirmation?: string) => {
    if (confirmation && !confirm(confirmation)) return;
    start(() => {
      void setPledgeStatusAction(pledgeId, next);
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "received" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => move("received", "Mark this as received? Only do this once the money is actually in.")}
          className="cursor-pointer rounded bg-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60"
        >
          Money received
        </button>
      )}

      {status === "pending" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => move("promised")}
          className={quietButton}
        >
          Confirm the promise
        </button>
      )}

      {status !== "declined" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            move(
              "declined",
              "Withdraw this claim? The amount goes straight back to being open for somebody else.",
            )
          }
          className={quietButton}
        >
          Withdraw
        </button>
      )}

      {status === "declined" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => move("pending")}
          className={quietButton}
        >
          Put it back
        </button>
      )}
    </div>
  );
}

export function PostUpdateForm({ needId }: { needId: string }) {
  const [state, formAction, pending] = useActionState(postUpdateAction, undefined);

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="needId" value={needId} />

      <Field
        label="What has happened"
        hint="Written to the churches who paid for this. Leave a blank line between paragraphs."
      >
        <textarea name="body" rows={5} required className={inputClass} />
      </Field>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="A photo" hint={`Optional. JPEG, PNG, WebP or AVIF, up to ${MAX_LABEL}.`}>
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="mt-2 w-full text-sm text-smoke file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-sand file:px-4 file:py-2 file:text-sm file:font-medium"
          />
        </Field>

        <Field
          label="What the photo shows"
          hint="Read aloud to people who cannot see it."
        >
          <input name="photoAlt" className={inputClass} />
        </Field>
      </div>

      {/*
        An upload can half-succeed — the words land and the picture does not —
        so this reports both outcomes at once rather than choosing one.
      */}
      {state?.error && (
        <p role="alert" className="mt-4 text-sm leading-relaxed text-plum">
          {state.error}
        </p>
      )}
      {state?.saved && !state?.error && (
        <p role="status" className="mt-4 text-sm text-green">
          Posted. It is on the item&apos;s page and on every partner&apos;s
          dashboard.
        </p>
      )}

      <button type="submit" disabled={pending} className={`${primaryButton} mt-6`}>
        {pending ? "Posting…" : "Post this update"}
      </button>
    </form>
  );
}

export function DeleteUpdateButton({ updateId }: { updateId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this update? The photo goes with it.")) return;
        start(() => {
          void deleteUpdateAction(updateId);
        });
      }}
      className="cursor-pointer text-xs font-medium text-smoke underline underline-offset-4 hover:text-plum disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export function SeedKitchenButton() {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await seedKitchenNeedsAction();
          // A real page load — see the note on the action.
          window.location.assign("/app/needs");
        });
      }}
      className={primaryButton}
    >
      {pending ? "Adding…" : "Add the three kitchen items"}
    </button>
  );
}
