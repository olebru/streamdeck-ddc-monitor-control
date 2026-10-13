export class LatestValueWriter {
	private pendingValue: number | undefined;
	private draining = false;

	constructor(
		private readonly write: (value: number) => Promise<void>,
		private readonly onWriteError: (error: unknown) => void
	) {}

	submit(value: number): void {
		this.pendingValue = value;
		if (!this.draining) {
			this.draining = true;
			void this.drain();
		}
	}

	private async drain(): Promise<void> {
		while (this.pendingValue !== undefined) {
			const value = this.pendingValue;
			this.pendingValue = undefined;
			try {
				await this.write(value);
			} catch (error) {
				this.onWriteError(error);
			}
		}
		this.draining = false;
	}
}
