import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveSettings } from "../build/monitor-setting-settings.js";

test("empty settings resolve to brightness set to 50 with step 5", () => {
	assert.deepEqual(resolveSettings({}), { code: 0x10, label: "Brightness", keyMode: "set", value: 50, step: 5 });
});

test("string values from the property inspector are parsed as numbers", () => {
	const resolved = resolveSettings({ setting: "contrast", keyMode: "step", value: "30", step: "-10" });
	assert.deepEqual(resolved, { code: 0x12, label: "Contrast", keyMode: "step", value: 30, step: -10 });
});

test("a removed or unknown setting falls back to brightness", () => {
	assert.equal(resolveSettings({ setting: "volume" }).code, 0x10);
});

test("an unparseable number falls back to the default", () => {
	assert.equal(resolveSettings({ value: "abc", step: "" }).value, 50);
	assert.equal(resolveSettings({ value: "abc", step: "" }).step, 5);
});
