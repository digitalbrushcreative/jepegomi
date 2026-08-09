import { type DocumentKey, type Field, documents } from "./schema";

/**
 * Turns a submitted form back into a document.
 *
 * The form is generated from the schema, so it is parsed from the schema too —
 * a field that isn't declared in src/cms/schema.ts is ignored here, which means
 * a hand-crafted POST can't smuggle extra keys into the stored JSON.
 *
 * List rows are named "facts.0.label", "facts.1.label", and so on. Rows are
 * collected by index rather than by counting upward, so a row deleted in the
 * browser leaves no hole. Fully blank rows are dropped.
 */
export function parseDocumentForm(key: DocumentKey, formData: FormData) {
  const fields = documents[key].fields as Record<string, Field>;
  const defaults = documents[key].defaults as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [name, field] of Object.entries(fields)) {
    /*
      A choice is the one field type where the submitted string has to be
      *checked* rather than merely trimmed. Everywhere else the worst a bad POST
      achieves is bad wording on a page; here the value decides who may read a
      project's accounts, and "everyone" is one word away from "partners". A
      value that is not one of the declared options falls back to the schema
      default, which is the closed one.

      The radio group in the editor can only submit a declared option, and no
      part of that sentence is a guarantee: the form is a courtesy to people,
      and the action behind it is reachable by anybody who can spell its id.
    */
    if (field.type === "choice") {
      const submitted = String(formData.get(name) ?? "").trim();
      const allowed = field.options.some((option) => option.value === submitted);
      result[name] = allowed ? submitted : defaults[name];
      continue;
    }

    if (field.type !== "list") {
      result[name] = String(formData.get(name) ?? "").trim();
      continue;
    }

    const subKeys = Object.keys(field.fields);
    const indices = new Set<number>();

    for (const formKey of formData.keys()) {
      const match = formKey.match(/^(.+)\.(\d+)\.(.+)$/);
      if (match && match[1] === name && subKeys.includes(match[3])) {
        indices.add(Number(match[2]));
      }
    }

    const rows = [...indices]
      .sort((a, b) => a - b)
      .map((index) => {
        const row: Record<string, string> = {};
        for (const subKey of subKeys) {
          row[subKey] = String(
            formData.get(`${name}.${index}.${subKey}`) ?? "",
          ).trim();
        }
        return row;
      })
      .filter((row) => Object.values(row).some((value) => value !== ""));

    result[name] = rows;
  }

  return result;
}
