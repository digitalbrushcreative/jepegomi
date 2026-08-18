/**
 * A money figure that has not been earned yet, drawn at roughly its own size.
 *
 * Its own file, apart from the rest of components/money.tsx, for one reason: the
 * giving form is a client component and needs to draw this too. Everything else
 * in money.tsx reaches `figuresRevealed`, which reaches the session, which
 * reaches Postgres — importing any of it from the browser would drag the whole
 * database driver into the client bundle. This has no imports at all, so both
 * sides can use it.
 *
 * Bullets rather than digits, because a blurred `$8,888` is a blurred *number*
 * and somebody will eventually screenshot it, sharpen it, and believe it. There
 * is nothing under this smudge to recover — the real figure was never sent.
 *
 * `aria-hidden` on the smear and a plain sentence beside it, because "hidden" is
 * the actual state and a reader who cannot see a blur is owed the same fact
 * everybody else is being shown.
 */
export function HiddenFigure({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span
        aria-hidden="true"
        className="tabular pointer-events-none blur-[5px] select-none"
      >
        $•,•••
      </span>
      <span className="sr-only">Hidden — sign in to see the figures</span>
    </span>
  );
}
