"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Field, LeafField } from "@/cms/schema";
import { saveContentAction } from "../../actions";

const inputClass =
  "mt-2 w-full rounded border border-black/15 bg-white px-4 py-3 outline-none focus:border-plum focus:ring-2 focus:ring-plum/20";

function Help({ text }: { text?: string }) {
  if (!text) return null;
  return <span className="mt-2 block text-sm leading-relaxed text-smoke">{text}</span>;
}

/** One non-repeating field: a line of text, a block of prose, or an image path. */
function Leaf({
  name,
  field,
  value,
}: {
  name: string;
  field: LeafField;
  value: string;
}) {
  const [current, setCurrent] = useState(value);

  return (
    <label className="block">
      <span className="label-mono text-smoke">{field.label}</span>

      {field.type === "prose" ? (
        <textarea
          name={name}
          rows={6}
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          className={`${inputClass} leading-relaxed`}
        />
      ) : (
        <input
          name={name}
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          className={`${inputClass} ${field.type === "image" ? "font-mono text-sm" : ""}`}
        />
      )}

      {field.type === "image" && current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt=""
          className="mt-3 h-32 w-auto rounded border border-black/8 bg-sand object-contain"
        />
      )}

      <Help text={field.help} />
    </label>
  );
}

type Row = Record<string, string>;

/** A repeating group — the fact cards on About, for instance. */
function ListEditor({
  name,
  field,
  value,
}: {
  name: string;
  field: Extract<Field, { type: "list" }>;
  value: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(value);
  const subKeys = Object.entries(field.fields);

  const blank = () =>
    Object.fromEntries(subKeys.map(([key]) => [key, ""])) as Row;

  return (
    <fieldset>
      <legend className="label-mono text-smoke">{field.label}</legend>
      <Help text={field.help} />

      <div className="mt-3 space-y-3">
        {rows.map((row, index) => (
          // The index is the identity here: rows have no id, and reordering is
          // not offered, so it is stable for as long as the row exists.
          <div
            key={index}
            className="rounded border border-black/10 bg-sand/50 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                {subKeys.map(([subKey, subField]) => (
                  <label key={subKey} className="block">
                    <span className="text-xs font-medium text-smoke">
                      {subField.label}
                    </span>
                    <input
                      name={`${name}.${index}.${subKey}`}
                      value={row[subKey] ?? ""}
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = { ...row, [subKey]: event.target.value };
                        setRows(next);
                      }}
                      className="mt-1 w-full rounded border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-plum"
                    />
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
                aria-label={`Remove this ${field.itemLabel}`}
                className="mt-5 cursor-pointer rounded border border-black/15 bg-white px-3 py-2 text-sm text-smoke transition-colors hover:bg-white hover:text-plum"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setRows([...rows, blank()])}
        className="mt-3 cursor-pointer rounded border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-sand"
      >
        Add another {field.itemLabel}
      </button>
    </fieldset>
  );
}

export function ContentForm({
  documentKey,
  path,
  fields,
  values,
}: {
  documentKey: string;
  path: string | null;
  fields: Record<string, Field>;
  values: Record<string, unknown>;
}) {
  const [state, formAction, pending] = useActionState(
    saveContentAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-10">
      <input type="hidden" name="__key" value={documentKey} />

      <div className="space-y-8">
        {Object.entries(fields).map(([name, field]) =>
          field.type === "list" ? (
            <ListEditor
              key={name}
              name={name}
              field={field}
              value={(values[name] as Row[] | undefined) ?? []}
            />
          ) : (
            <Leaf
              key={name}
              name={name}
              field={field}
              value={String(values[name] ?? "")}
            />
          ),
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-black/8 pt-6">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded bg-green px-7 py-3 font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>

        {path && (
          <Link
            href={path}
            className="text-sm font-medium text-plum underline underline-offset-4 hover:text-plum-light"
          >
            View the page
          </Link>
        )}

        {state?.error && (
          <p role="alert" className="text-sm text-plum">
            {state.error}
          </p>
        )}

        {state?.saved && !pending && (
          <p role="status" className="text-sm text-green">
            Saved. It is live on the site now.
          </p>
        )}
      </div>
    </form>
  );
}
