import streamDeck from "@elgato/streamdeck";

import { MonitorSetting } from "./actions/monitor-setting.js";
import { ToggleInput } from "./actions/toggle-input.js";
import { DdcHost } from "./ddc-host.js";

const ddcHost = new DdcHost();

streamDeck.actions.registerAction(new ToggleInput(ddcHost));
streamDeck.actions.registerAction(new MonitorSetting(ddcHost));

streamDeck.connect();
