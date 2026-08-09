import { ACCEPTED_MIME, MAX_BYTES, MAX_LABEL } from "@/lib/photo-rules";

/**
 * Reading an uploaded image, and believing only what is in it.
 *
 * Both upload paths on the site — the kitchen gallery in lib/photos.ts and the
 * progress photos in lib/need-photos.ts — used to check `file.type` and write
 * the bytes. `file.type` is the browser reporting what the file was *named*; it
 * is not an inspection of anything. So a file called `nice.jpg` that holds
 * something else entirely passed, and got written into public/ under an
 * extension that decides the Content-Type it is later served with, from this
 * site's own origin.
 *
 * Both paths are behind `requireUser`, and that is the reason this is worth
 * doing rather than the reason to skip it: the check that earns its keep is the
 * one covering an editor's account being used by somebody who is not the editor.
 *
 * The signatures are the first few bytes of each format, which is the same thing
 * `file(1)` looks at. Nothing here parses an image — it establishes that the
 * file claims to be the format it was named as, which is all the extension
 * needs to be honest.
 */

const utf8 = (bytes: Buffer, start: number, length: number) =>
  bytes.subarray(start, start + length).toString("latin1");

/**
 * The format a file actually is, or null.
 *
 * Only the four the site accepts are recognised. Anything else — a GIF, a PDF,
 * a zip with a photo's name on it — comes back null and is refused, which is
 * the right answer even for the harmless ones: a format the site will not serve
 * is a file with no reason to be in the repository.
 */
export function sniffImage(bytes: Buffer): string | null {
  // FF D8 FF — every JPEG, whatever the flavour of the fourth byte.
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // The 8-byte PNG signature, including the CRLF pair that catches a file
  // mangled by an FTP client in text mode.
  if (
    bytes.length >= 8 &&
    utf8(bytes, 0, 8) === "\x89PNG\r\n\x1a\n"
  ) {
    return "image/png";
  }

  /*
    WebP and AVIF are both containers, so the first four bytes say only which
    container. WebP is RIFF with "WEBP" at offset 8; AVIF is ISO-BMFF, whose
    "ftyp" box sits at offset 4 with the brand right behind it.
  */
  if (
    bytes.length >= 12 &&
    utf8(bytes, 0, 4) === "RIFF" &&
    utf8(bytes, 8, 4) === "WEBP"
  ) {
    return "image/webp";
  }

  if (bytes.length >= 12 && utf8(bytes, 4, 4) === "ftyp") {
    /*
      `avif` is one image and `avis` is a sequence; `mif1`/`msf1` are the
      generic HEIF brands AVIF encoders also emit. Anything else with an ftyp
      box is some other ISO-BMFF file — an MP4, most likely — and is refused.
    */
    const brand = utf8(bytes, 8, 4);
    if (["avif", "avis", "mif1", "msf1"].includes(brand)) return "image/avif";
    return null;
  }

  return null;
}

/**
 * Everything both upload paths need to agree on, in one place: the size, the
 * declared type, the real type, and that the two agree.
 *
 * Returns the bytes alongside the verified type, because the caller needs both
 * and reading a `File` twice means holding it in memory twice.
 */
export async function readImageUpload(
  file: File,
): Promise<{ bytes: Buffer; mime: string }> {
  if (!ACCEPTED_MIME.includes(file.type)) {
    throw new Error("That file is not a JPEG, PNG, WebP or AVIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`That image is larger than ${MAX_LABEL}.`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const mime = sniffImage(bytes);
  if (!mime) {
    throw new Error(
      "That file is not an image the site can use. Try a JPEG, PNG, WebP or AVIF.",
    );
  }

  /*
    Named one thing and holding another. Worth its own message rather than the
    one above, because the honest version of this is somebody who renamed a
    .png to .jpg to get it past a form once, and "re-save it" is what fixes it.
  */
  if (mime !== file.type) {
    const said = file.type.slice("image/".length).toUpperCase();
    const is = mime.slice("image/".length).toUpperCase();
    throw new Error(
      `That file is named as ${said} but its contents are ${is}. Re-save it as ${is} and try again.`,
    );
  }

  return { bytes, mime };
}

/** The extension a verified image is written under. */
export function extensionFor(mime: string) {
  return mime === "image/jpeg" ? ".jpg" : `.${mime.slice("image/".length)}`;
}
