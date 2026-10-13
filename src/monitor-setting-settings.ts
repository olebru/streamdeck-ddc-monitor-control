import { CONTINUOUS_SETTINGS, isContinuousSetting, type ContinuousSetting } from "./vcp.js";

export type MonitorSettingSettings = {
	setting?: string;
	keyMode?: string;
	value?: number | string;
	step?: number | string;
};

export type ResolvedSettings = {
	code: number;
	label: string;
	keyMode: "set" | "step";
	value: number;
	step: number;
};

const DEFAULT_SETTING: ContinuousSetting = "brightness";
const DEFAULT_VALUE = 50;
export const DEFAULT_STEP = 5;

export function resolveSettings(settings: MonitorSettingSettings): ResolvedSettings {
	const setting = isContinuousSetting(settings.setting) ? settings.setting : DEFAULT_SETTING;
	return {
		...CONTINUOUS_SETTINGS[setting],
		keyMode: settings.keyMode === "step" ? "step" : "set",
		value: toNumber(settings.value, DEFAULT_VALUE),
		step: toNumber(settings.step, DEFAULT_STEP)
	};
}

function toNumber(value: number | string | undefined, fallback: number): number {
	const parsed = typeof value === "number" ? value : Number.parseFloat(value ?? "");
	return Number.isFinite(parsed) ? parsed : fallback;
}
