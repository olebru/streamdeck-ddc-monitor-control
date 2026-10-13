import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const RESPONSE_TIMEOUT_MS = 15_000;
const STDERR_TAIL_LENGTH = 2_000;
const HOST_SCRIPT_PATH = fileURLToPath(new URL("../scripts/ddc-host.ps1", import.meta.url));

export type HostCommand = {
	executable: string;
	args: string[];
};

export const POWERSHELL_HOST_COMMAND: HostCommand = {
	executable: "powershell.exe",
	args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", HOST_SCRIPT_PATH]
};

export type VcpReading = {
	current: number;
	maximum: number;
};

type PendingResponse = {
	command: string;
	resolve: (payload: string) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
};

export class DdcHost {
	private hostProcess: ChildProcessWithoutNullStreams | undefined;
	private readonly pending: PendingResponse[] = [];
	private stderrTail = "";

	constructor(
		private readonly hostCommand: HostCommand = POWERSHELL_HOST_COMMAND,
		private readonly responseTimeoutMs = RESPONSE_TIMEOUT_MS
	) {}

	async readVcp(code: number): Promise<VcpReading> {
		const payload = await this.send(`read ${code}`);
		const [current, maximum] = payload.split(" ").map((part) => Number.parseInt(part, 10));
		if (current === undefined || maximum === undefined || Number.isNaN(current) || Number.isNaN(maximum)) {
			throw new Error(`DDC host returned an unreadable VCP reading for code ${code}: '${payload}'`);
		}
		return { current, maximum };
	}

	async writeVcp(code: number, value: number): Promise<void> {
		await this.send(`write ${code} ${value}`);
	}

	private send(command: string): Promise<string> {
		const hostProcess = this.hostProcess ?? this.start();
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => this.stop(new Error(`DDC host timed out on '${command}'`)), this.responseTimeoutMs);
			this.pending.push({ command, resolve, reject, timer });
			hostProcess.stdin.write(`${command}\n`);
		});
	}

	private start(): ChildProcessWithoutNullStreams {
		const hostProcess = spawn(this.hostCommand.executable, this.hostCommand.args, { windowsHide: true });
		this.hostProcess = hostProcess;
		this.stderrTail = "";

		hostProcess.stderr.setEncoding("utf8");
		hostProcess.stderr.on("data", (chunk: string) => {
			this.stderrTail = (this.stderrTail + chunk).slice(-STDERR_TAIL_LENGTH);
		});
		createInterface({ input: hostProcess.stdout }).on("line", (line) => {
			if (hostProcess === this.hostProcess) {
				this.resolveNext(line);
			}
		});
		hostProcess.stdin.on("error", (error) => this.stop(error, hostProcess));
		hostProcess.on("error", (error) => this.stop(error, hostProcess));
		hostProcess.on("close", (code) => {
			this.stop(new Error(`DDC host exited with code ${code}: ${this.stderrTail.trim()}`), hostProcess);
		});
		return hostProcess;
	}

	private resolveNext(line: string): void {
		const response = this.pending.shift();
		if (!response) {
			return;
		}
		clearTimeout(response.timer);
		if (line.startsWith("ok")) {
			response.resolve(line.slice("ok".length).trim());
		} else {
			response.reject(new Error(`DDC host '${response.command}' failed: ${line.replace(/^error\s*/, "")}`));
		}
	}

	dispose(): void {
		this.stop(new Error("DDC host disposed"));
	}

	private stop(error: Error, hostProcess = this.hostProcess): void {
		if (!hostProcess || hostProcess !== this.hostProcess) {
			return;
		}
		this.hostProcess = undefined;
		hostProcess.kill();
		for (const response of this.pending.splice(0)) {
			clearTimeout(response.timer);
			response.reject(error);
		}
	}
}
