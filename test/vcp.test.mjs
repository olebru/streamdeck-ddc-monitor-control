import assert from "node:assert/strict";
import { test } from "node:test";

import { fromPercent, stepByPercent, toPercent } from "../build/vcp.js";

test("toPercent scales a raw value to its range", () => {
	assert.equal(toPercent(25, 50), 50);
	assert.equal(toPercent(49, 50), 98);
	assert.equal(toPercent(0, 0), 0);
});

test("fromPercent scales and clamps a percentage to the raw range", () => {
	assert.equal(fromPercent(50, 50), 25);
	assert.equal(fromPercent(100, 100), 100);
	assert.equal(fromPercent(150, 50), 50);
	assert.equal(fromPercent(-10, 50), 0);
});

test("stepByPercent moves by the percentage of the range", () => {
	assert.equal(stepByPercent(25, 50, 10), 30);
	assert.equal(stepByPercent(50, 100, -10), 40);
});

test("stepByPercent moves at least one raw unit for a small step", () => {
	assert.equal(stepByPercent(25, 50, -1), 24);
	assert.equal(stepByPercent(25, 50, 1), 26);
});

test("stepByPercent stays within the range", () => {
	assert.equal(stepByPercent(50, 50, 1), 50);
	assert.equal(stepByPercent(0, 50, -1), 0);
	assert.equal(stepByPercent(48, 50, 20), 50);
});

test("stepByPercent with a zero step keeps the rounded value", () => {
	assert.equal(stepByPercent(25, 50, 0), 25);
});
