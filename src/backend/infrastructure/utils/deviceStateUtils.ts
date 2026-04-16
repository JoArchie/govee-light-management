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
    streamDeck.logger?.warn(
      `Ignoring invalid color temperature in state response for ${context}`,
      error,
    );
    return undefined;
  }
}
