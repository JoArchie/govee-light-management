/**
 * Shared utilities for reading Govee device state safely.
 *
 * Govee devices occasionally return malformed values for specific fields
 * (e.g. `0K` color temperature). Those responses fail strict Zod validation
 * inside govee-api-client and bubble up as thrown errors. These helpers
 * defend against such malformed fields without discarding the rest of the
 * state payload.
 */
import type { ColorTemperature } from "@felixgeelhaar/govee-api-client";
import { streamDeck } from "@elgato/streamdeck";

/**
 * Minimal shape of the device-state reader that exposes a color-temperature
 * accessor. We accept both required and optional variants because the
 * govee-api-client `GoveeDeviceState` and `ValidatedDeviceState` classes
 * expose slightly different signatures.
 */
interface ColorTemperatureReader {
  getColorTemperature?(): ColorTemperature | undefined;
}

/**
 * Tracks which contexts have already logged an invalid color-temperature
 * payload. Because this helper is called from the 3-second live-state
 * refresh loop, a device that consistently reports `0K` would otherwise
 * emit a WARN every poll. Logging once per context keeps the condition
 * visible in logs without flooding them.
 */
const loggedContexts = new Set<string>();

/**
 * Test-only helper to reset the per-context log gate between tests.
 */
export function __resetSafeGetColorTemperatureLogGate(): void {
  loggedContexts.clear();
}

/**
 * Read color temperature from a device state, swallowing the validation
 * error that some devices trigger when they advertise `0K`.
 *
 * @param deviceState Device state object with a `getColorTemperature` method.
 * @param context Identifier used in the warning log (usually the light name).
 * @returns The color temperature if available, otherwise `undefined`.
 */
export function safeGetColorTemperature(
  deviceState: ColorTemperatureReader,
  context: string,
): ColorTemperature | undefined {
  try {
    return deviceState.getColorTemperature?.();
  } catch (error) {
    // Rate-limit per context so the periodic refresh loop cannot spam
    // logs on a persistently malformed device. First occurrence is WARN;
    // subsequent occurrences fall to DEBUG so the condition remains
    // traceable during troubleshooting without flooding production logs.
    if (!loggedContexts.has(context)) {
      loggedContexts.add(context);
      streamDeck.logger?.warn(
        `Ignoring invalid color temperature in state response for ${context}`,
        error,
      );
    } else {
      streamDeck.logger?.debug(
        `Invalid color temperature still reported for ${context}`,
        error,
      );
    }
    return undefined;
  }
}
