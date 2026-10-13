import { createInterface } from "node:readline";

const mode = process.argv[2];
const values = new Map([[0x60, 15], [0x10, 49]]);
const MAXIMUM = 100;
let handled = 0;

createInterface({ input: process.stdin }).on("line", (line) => {
	handled++;
	if (mode === "silent") {
		return;
	}
	if (mode === "failing") {
		process.stdout.write("error Win32 error 31\n");
		return;
	}
	if (mode === "garbled") {
		process.stdout.write("ok not-a-number\n");
		return;
	}
	const [command, code, value] = line.split(" ");
	if (command === "read") {
		process.stdout.write(`ok ${values.get(Number(code)) ?? 0} ${MAXIMUM}\n`);
	} else if (command === "write") {
		values.set(Number(code), Number(value));
		process.stdout.write("ok\n");
	} else {
		process.stdout.write(`error unknown command '${command}'\n`);
	}
	if (mode === "exit-after-first" && handled === 1) {
		process.stderr.write("host stopped\n");
		process.exit(3);
	}
});
