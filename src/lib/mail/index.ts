/**
 * The one door into email.
 *
 * Actions import from `@/lib/mail` and nothing deeper, so which provider is in
 * use, and how a message is built, stay behind this file.
 */

export { isMailConfigured, queue, send } from "./send";
export type { Message, SendResult } from "./send";
export { inboxes, publicInbox } from "./inboxes";
export * from "./messages";
