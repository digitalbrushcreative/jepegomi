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
  const result: Record<string, unknown> = {};

  for (const [name, field] of Object.entries(fields)) {
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
