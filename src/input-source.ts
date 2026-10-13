export const INPUT_SOURCES: Record<string, string> = {
	"15": "DP 1",
	"16": "DP 2",
	"17": "HDMI 1",
	"18": "HDMI 2",
	"27": "USB-C",
	"5": "HDMI 1"
};

export const KeyState = {
	InputA: 0,
	InputB: 1
} as const;

export type ToggleInputSettings = {
	inputA?: string;
	inputB?: string;
	customA?: number | string;
	customB?: number | string;
};

export type InputChoice = {
	value: number;
	label: string;
};

export type ResolvedToggleSettings = {
	inputA: InputChoice;
	inputB: InputChoice;
};

const CUSTOM_INPUT = "custom";
const DEFAULT_INPUT_A = 15;
const DEFAULT_INPUT_B = 5;
const MAXIMUM_VCP_VALUE = 0xffff;

export function resolveToggleSettings(settings: ToggleInputSettings): ResolvedToggleSettings {
	return {
		inputA: resolveInput(settings.inputA, settings.customA, DEFAULT_INPUT_A),
		inputB: resolveInput(settings.inputB, settings.customB, DEFAULT_INPUT_B)
	};
}

export function nextInputSource(current: number, settings: ResolvedToggleSettings): InputChoice {
	return current === settings.inputB.value ? settings.inputA : settings.inputB;
}

export function keyStateFor(inputSource: number, settings: ResolvedToggleSettings): 0 | 1 {
	return inputSource === settings.inputB.value ? KeyState.InputB : KeyState.InputA;
}

function resolveInput(selected: string | undefined, custom: number | string | undefined, fallback: number): InputChoice {
	if (selected === CUSTOM_INPUT) {
		const value = toVcpValue(custom);
		return choiceFor(value ?? fallback);
	}
	const value = toVcpValue(selected);
	return value !== undefined && Object.hasOwn(INPUT_SOURCES, String(value)) ? choiceFor(value) : choiceFor(fallback);
}

function choiceFor(value: number): InputChoice {
	return { value, label: INPUT_SOURCES[String(value)] ?? `Input ${value}` };
}

function toVcpValue(value: number | string | undefined): number | undefined {
	if (value === undefined || String(value).trim() === "") {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAXIMUM_VCP_VALUE ? parsed : undefined;
}
