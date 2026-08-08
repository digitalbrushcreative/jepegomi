import { getContent } from "@/cms/content";

/**
 * How many children eat at school each day.
 *
 * This is not a second figure to keep up to date: the school feeds every child
 * it teaches, so the number fed *is* the number enrolled. It is the academy's
 * "Pupils enrolled" field read back, which means changing that one field in the
 * CMS moves every "children fed daily" on the site with it — nobody has to
 * remember the other places it appears.
 *
 * The field is free text, so an editor can write "131" or "131 pupils" without
 * the form arguing with them. Take the digits; if there are none — the field is
 * blank, or says something that isn't a count — return null so the caller can
 * word it without a number rather than print a confident zero.
 */
export async function getChildrenFed(): Promise<number | null> {
  const { pupils } = await getContent("academy");
  const digits = pupils.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}
