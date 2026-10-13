import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { DdcHost } from "../build/ddc-host.js";

const FAKE_HOST_PATH = fileURLToPath(new URL("./fake-host.mjs", import.meta.url));
const INPUT_SOURCE = 0x60;
const BRIGHTNESS = 0x10;

function createHost(mode, responseTimeoutMs = 5_000) {
	return new DdcHost({ executable: process.execPath, args: [FAKE_HOST_PATH, mode] }, responseTimeoutMs);
}

async function withHost(mode, run, responseTimeoutMs) {
	const host = createHost(mode, responseTimeoutMs);
	try {
		await run(host);
	} finally {
		host.dispose();
	}
}

test("readVcp returns the current and maximum values from the host", () =>
	withHost("normal", async (host) => {
		assert.deepEqual(await host.readVcp(INPUT_SOURCE), { current: 15, maximum: 100 });
	}));

test("writeVcp changes the value returned by the next read of the same code", () =>
	withHost("normal", async (host) => {
		await host.writeVcp(BRIGHTNESS, 20);
		assert.equal((await host.readVcp(BRIGHTNESS)).current, 20);
		assert.equal((await host.readVcp(INPUT_SOURCE)).current, 15);
	}));

test("concurrent requests resolve in order", () =>
	withHost("normal", async (host) => {
		const [first, , second] = await Promise.all([host.readVcp(INPUT_SOURCE), host.writeVcp(INPUT_SOURCE, 5), host.readVcp(INPUT_SOURCE)]);
		assert.deepEqual([first.current, second.current], [15, 5]);
	}));

test("an error response rejects with the host message", () =>
	withHost("failing", async (host) => {
		await assert.rejects(host.readVcp(INPUT_SOURCE), /DDC host 'read 96' failed: Win32 error 31/);
	}));

test("a non-numeric reading rejects", () =>
	withHost("garbled", async (host) => {
		await assert.rejects(host.readVcp(INPUT_SOURCE), /unreadable VCP reading for code 96/);
	}));

test("a missing response rejects after the timeout", () =>
	withHost(
		"silent",
		async (host) => {
			await assert.rejects(host.readVcp(INPUT_SOURCE), /timed out on 'read 96'/);
		},
		200
	));

test("a host exit rejects pending requests and the next request starts a new host", () =>
	withHost("exit-after-first", async (host) => {
		assert.equal((await host.readVcp(INPUT_SOURCE)).current, 15);
		await assert.rejects(host.readVcp(INPUT_SOURCE), /exited with code 3: host stopped/);
		assert.equal((await host.readVcp(INPUT_SOURCE)).current, 15);
	}));

test("a missing executable rejects the request", async () => {
	const host = new DdcHost({ executable: "missing-ddc-host-executable", args: [] }, 5_000);
	await assert.rejects(host.readVcp(INPUT_SOURCE), /ENOENT/);
});
