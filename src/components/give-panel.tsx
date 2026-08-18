import { type GiveChoice, GiveForm } from "@/components/give-form";
import { figuresRevealed } from "@/lib/reveal";

/**
 * The giving form, with the ledger's figures taken out of it for a stranger.
 *
 * ## Why the form needed its own gate
 *
 * Everywhere else on the site a figure is one thing in one place, and
 * `components/money.tsx` can stand in front of it. The form is different: the
 * amounts are *data it reasons with*. It builds its suggested-amount chips out
 * of a balance, it caps what can be typed against one, and it writes a sentence
 * about how much of an item is left. Blurring the rendered output of all that
 * would leave every one of those numbers sitting in the payload underneath —
 * and a picker listing every open item on the ledger would have become the
 * easiest place on the whole site to read the figures the rest of it now hides.
 *
 * So the gate is moved back a step, to the data. `strip` removes the amounts
 * from the choices before they are ever handed to a client component, and the
 * form's own `revealed` flag arrives already agreeing with them. There is
 * nothing to un-blur because there is nothing there.
 *
 * ## What stays visible, and why that is not a compromise
 *
 * Everything about the gift somebody is making. The box, the amount they type,
 * the running total on the button, the confirmation. Those are the giver's own
 * arithmetic about their own money, and a form that would not tell a person what
 * they had just typed would be a broken form pretending to be a careful one.
 *
 * What goes is the ministry's side of the ledger: what an item costs, what is
 * left on it, and the chips derived from that. A signed-out giver picks an item
 * by its name and gives what they can — which is exactly what /give did before
 * the ledger was itemised, and it worked.
 *
 * ## Why this has no Suspense boundary of its own
 *
 * It had one, briefly, and it broke the form. Both places that render this are
 * already behind a boundary for their own reasons — /give reads `?for=` out of
 * the address bar, /needs/[slug] reads its slug — so a boundary here was a
 * *second* one, nested inside the first and resolving later. The form was
 * painted once when the outer boundary resolved and then thrown away and
 * remounted when this one did, which meant an item picked in that gap came
 * unpicked under the giver's hand. The browser tests caught it doing exactly
 * that.
 *
 * So the read happens inside the boundary that is already there. The form is
 * mounted once, with the right answer, and nothing swaps underneath anybody.
 * Nothing is lost by it: those regions were never in the static shell to begin
 * with, so this costs the page no prerendering it had.
 */

/**
 * The same choices with every amount removed.
 *
 * Deliberately rebuilds each row rather than deleting keys from the originals:
 * these objects come off a cached query and are shared with whatever else is
 * rendering this request, and a strip that mutated them would blank the figures
 * on the page around the form.
 */
function strip(choices: GiveChoice[]): GiveChoice[] {
  return choices.map(({ openCents, costCents, ...rest }) => {
    void openCents;
    void costCents;
    return rest;
  });
}

type PanelProps = Omit<
  Parameters<typeof GiveForm>[0],
  "revealed" | "choices"
> & { choices: GiveChoice[] };

export async function GivePanel(props: PanelProps) {
  const revealed = await figuresRevealed();

  return (
    <GiveForm
      {...props}
      revealed={revealed}
      choices={revealed ? props.choices : strip(props.choices)}
    />
  );
}
