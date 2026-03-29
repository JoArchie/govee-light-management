import streamDeck from "@elgato/streamdeck";

import { OnOffAction } from "./actions/OnOffAction";
import { BrightnessAction } from "./actions/BrightnessAction";
import { ColorAction } from "./actions/ColorAction";
import { ColorTemperatureAction } from "./actions/ColorTemperatureAction";
import { BrightnessDialAction } from "./actions/BrightnessDialAction";
import { ColorTempDialAction } from "./actions/ColorTempDialAction";
import { ColorHueDialAction } from "./actions/ColorHueDialAction";
import { SegmentColorDialAction } from "./actions/SegmentColorDialAction";

streamDeck.logger.setLevel("info");

// Keypad actions
streamDeck.actions.registerAction(new OnOffAction());
streamDeck.actions.registerAction(new BrightnessAction());
streamDeck.actions.registerAction(new ColorAction());
streamDeck.actions.registerAction(new ColorTemperatureAction());

// Encoder actions (Stream Deck+)
streamDeck.actions.registerAction(new BrightnessDialAction());
streamDeck.actions.registerAction(new ColorTempDialAction());
streamDeck.actions.registerAction(new ColorHueDialAction());
streamDeck.actions.registerAction(new SegmentColorDialAction());

streamDeck.connect();

streamDeck.logger.info(
  "Govee Light Management plugin initialized successfully",
);

export { streamDeck };
