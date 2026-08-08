import Image from "next/image";

/**
 * The bus the school is raising for.
 *
 * A photograph of a 26-seater of the kind quoted, shown in full colour. It is
 * not a bus the ministry owns — the pages around it carry that in their prose,
 * because the picture no longer carries it itself.
 *
 * `percent` no longer changes the picture; it is here for the label, and
 * because the pages beside it draw their percentage from the same figure.
 */

const SRC = "/photos/transport/bus-nmr85.png";
const WIDTH = 1200;
const HEIGHT = 828;

export function SchoolBus({
  percent,
  className = "",
}: {
  percent: number;
  className?: string;
}) {
  const safe = Math.min(100, Math.max(0, percent));

  return (
    <Image
      src={SRC}
      alt={`The 26-seater bus the school is raising for — ${safe}% raised`}
      width={WIDTH}
      height={HEIGHT}
      sizes="(min-width: 1024px) 24rem, 50vw"
      className={`h-auto w-full ${className}`}
    />
  );
}
