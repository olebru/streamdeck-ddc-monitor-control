export const VcpCode = {
	Brightness: 0x10,
	Contrast: 0x12,
	RedGain: 0x16,
	GreenGain: 0x18,
	BlueGain: 0x1a,
	InputSource: 0x60
} as const;

export type ContinuousSetting = "brightness" | "contrast" | "red" | "green" | "blue";

export const CONTINUOUS_SETTINGS: Record<ContinuousSetting, { code: number; label: string }> = {
	brightness: { code: VcpCode.Brightness, label: "Brightness" },
	contrast: { code: VcpCode.Contrast, label: "Contrast" },
	red: { code: VcpCode.RedGain, label: "Red" },
	green: { code: VcpCode.GreenGain, label: "Green" },
	blue: { code: VcpCode.BlueGain, label: "Blue" }
};

const PERCENT = 100;

export function isContinuousSetting(value: unknown): value is ContinuousSetting {
	return typeof value === "string" && Object.hasOwn(CONTINUOUS_SETTINGS, value);
}

export function toPercent(raw: number, maximum: number): number {
	return maximum > 0 ? Math.round((raw * PERCENT) / maximum) : 0;
}

export function fromPercent(percent: number, maximum: number): number {
	const clampedPercent = Math.min(Math.max(percent, 0), PERCENT);
	return Math.round((clampedPercent * maximum) / PERCENT);
}

export function stepByPercent(current: number, maximum: number, stepPercent: number): number {
	const target = fromPercent(toPercent(current, maximum) + stepPercent, maximum);
	if (target !== current || stepPercent === 0) {
		return target;
	}
	return Math.min(Math.max(current + Math.sign(stepPercent), 0), maximum);
}
