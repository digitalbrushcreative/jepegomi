import { cache } from "react";
import { currentViewer } from "@/lib/door";

/**
 * Whether the person in front of us may read the figures.
 *
 * One question, asked in one place, so that no two pages can disagree about it.
 * Every price, every total and every budget line on the public site goes through
 * this — see components/money.tsx, which is the only thing that should be
 * calling it.
 *
 * ## What "the figures" means
 *
 * The ledger and the projects: what a costed item costs, what has arrived
 * against it, what has been promised, what is still open, and the line-by-line
 * budgets on the project pages. Not every number on the site — a bus has
 * forty-five seats and the school has its roll and the kitchen is most of the
 * way finished, and none of that is a price. The rule is *money*, and it is
 * money because money is the thing a reader with no interest in this ministry
 * can do arithmetic on: what it can be bought for, what it over-runs on, what a
 * gift to it is worth.
 *
 * ## Why this is not lib/disclosure.ts
 *
 * Because they are two different gates and it took some doing to see that they
 * are. disclosure.ts answers *how far into somebody's books may this person
 * read*, and every input to it is money that arrived — a rule with real teeth,
 * guarding a partner's own giving and a project's reconciliation, and earned by
 * something a stranger cannot assert about themselves.
 *
 * This one answers *may this person see our prices*, and it is a turnstile. It
 * is passed by proving an email address, which anybody can do (see
 * lib/supporters.ts). Nothing behind it is private in the sense disclosure.ts
 * means; what is behind it is public information the ministry would simply
 * rather hand over than broadcast. Keeping the two apart is what stops the weak
 * one being mistaken for the strong one later, on some afternoon when a
 * reconciliation gets moved behind "signed in" because that is where everything
 * else lives.
 *
 * So: the tiers still govern the books. This governs the shop window.
 *
 * ## Why it is memoised
 *
 * Because a page can ask thirty times. Every figure on /needs is its own gate
 * and its own Suspense boundary (again, see components/money.tsx), and without
 * `cache` that would be thirty cookie reads and thirty round trips to Postgres
 * for an answer that cannot change within one render. `cache` scopes to the
 * request, not to the process, so nothing is shared between two visitors.
 */
export const figuresRevealed = cache(async (): Promise<boolean> => {
  /*
    Any signed-in viewer, of either kind. A partner sees the prices because they
    have given; a supporter sees them because they asked. There is deliberately
    no third answer here — how much *more* than the prices a partner reads is
    lib/disclosure.ts's question, and this function must not start having
    opinions about it.
  */
  return (await currentViewer()) !== null;
});
