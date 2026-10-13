import assert from "node:assert/strict";
import { test } from "node:test";

import { LatestValueWriter } from "../build/latest-value-writer.js";

function deferredWrites() {
	const written = [];
	const releases = [];
	const write = (value) =>
		new Promise((resolve) => {
			written.push(value);
			releases.push(resolve);
		});
	return { written, releases, write };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("values submitted during a write collapse into the latest value", async () => {
	const { written, releases, write } = deferredWrites();
	const writer = new LatestValueWriter(write, assert.fail);
	writer.submit(1);
	writer.submit(2);
	writer.submit(3);
	await settle();
	releases.shift()();
	await settle();
	releases.shift()();
	await settle();
	assert.deepEqual(written, [1, 3]);
});

test("a value submitted after the queue drains starts a new write", async () => {
	const written = [];
	const writer = new LatestValueWriter(async (value) => {
		written.push(value);
	}, assert.fail);
	writer.submit(1);
	await settle();
	writer.submit(2);
	await settle();
	assert.deepEqual(written, [1, 2]);
});

test("a failed write reports the error and the next value is still written", async () => {
	const errors = [];
	const written = [];
	const writer = new LatestValueWriter(
		async (value) => {
			if (value === 1) {
				throw new Error("write failed");
			}
			written.push(value);
		},
		(error) => errors.push(error.message)
	);
	writer.submit(1);
	await settle();
	writer.submit(2);
	await settle();
	assert.deepEqual(errors, ["write failed"]);
	assert.deepEqual(written, [2]);
});
