/**
 * The whole formatting language of a `prose` field: a blank line starts a new
 * paragraph. That is deliberately all of it — anything richer would let an
 * editor paste in styled markup and drift the design away from itself.
 */
export function paragraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}
