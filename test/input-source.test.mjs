import assert from "node:assert/strict";
import { test } from "node:test";

import { KeyState, keyStateFor, nextInputSource, resolveToggleSettings } from "../build/input-source.js";

const defaults = resolveToggleSettings({});

test("empty settings resolve to DisplayPort 1 and the G93SC HDMI 1 value", () => {
	assert.deepEqual(defaults, { inputA: { value: 15, label: "DP 1" }, inputB: { value: 5, label: "HDMI 1" } });
});

test("selected inputs resolve to their value and label", () => {
	assert.deepEqual(resolveToggleSettings({ inputA: "16", inputB: "27" }), {
		inputA: { value: 16, label: "DP 2" },
		inputB: { value: 27, label: "USB-C" }
	});
});

test("a custom input resolves to the entered value", () => {
	assert.deepEqual(resolveToggleSettings({ inputA: "custom", customA: "3" }).inputA, { value: 3, label: "Input 3" });
});

test("a custom input with a known value uses the known label", () => {
	assert.deepEqual(resolveToggleSettings({ inputB: "custom", customB: 18 }).inputB, { value: 18, label: "HDMI 2" });
});

test("a missing, empty or invalid custom value falls back to the default", () => {
	assert.equal(resolveToggleSettings({ inputA: "custom" }).inputA.value, 15);
	assert.equal(resolveToggleSettings({ inputA: "custom", customA: "" }).inputA.value, 15);
	assert.equal(resolveToggleSettings({ inputA: "custom", customA: "1.5" }).inputA.value, 15);
	assert.equal(resolveToggleSettings({ inputB: "custom", customB: "-1" }).inputB.value, 5);
	assert.equal(resolveToggleSettings({ inputB: "custom", customB: "65536" }).inputB.value, 5);
});

test("an unknown selected value falls back to the default", () => {
	assert.equal(resolveToggleSettings({ inputA: "99" }).inputA.value, 15);
});

test("nextInputSource switches from input A to input B", () => {
	assert.equal(nextInputSource(15, defaults).value, 5);
});

test("nextInputSource switches from input B to input A", () => {
	assert.equal(nextInputSource(5, defaults).value, 15);
});

test("nextInputSource selects input B for an input that is neither", () => {
	assert.equal(nextInputSource(1, defaults).value, 5);
});

test("keyStateFor maps input B to the second state and every other input to the first", () => {
	assert.equal(keyStateFor(15, defaults), KeyState.InputA);
	assert.equal(keyStateFor(5, defaults), KeyState.InputB);
	assert.equal(keyStateFor(1, defaults), KeyState.InputA);
});
