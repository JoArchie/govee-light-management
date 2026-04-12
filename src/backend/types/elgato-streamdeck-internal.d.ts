/**
 * Type declarations for internal @elgato/streamdeck modules.
 *
 * We import the SDK's internal connection singleton to send
 * sendToPropertyInspector messages to a specific action context,
 * bypassing the global ui.#action tracking which can silently
 * drop messages when #action is undefined or stale.
 */
declare module "@elgato/streamdeck/dist/plugin/connection.js" {
  interface Connection {
    send(payload: {
      event: string;
      context: string;
      payload: Record<string, unknown>;
    }): Promise<void>;
  }

  export const connection: Connection;
}
