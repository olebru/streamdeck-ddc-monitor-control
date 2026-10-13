import streamDeck, {
	action,
	SingletonAction,
	type DialAction,
	type DialDownEvent,
	type DialRotateEvent,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	type TouchTapEvent,
	type WillAppearEvent
} from "@elgato/streamdeck";

import type { DdcHost, VcpReading } from "../ddc-host.js";
import { LatestValueWriter } from "../latest-value-writer.js";
import { DEFAULT_STEP, resolveSettings, type MonitorSettingSettings, type ResolvedSettings } from "../monitor-setting-settings.js";
import { fromPercent, stepByPercent, toPercent } from "../vcp.js";

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

@action({ UUID: "com.olebru.ddc-monitor-control.setting" })
export class MonitorSetting extends SingletonAction<MonitorSettingSettings> {
	private readonly knownReadings = new Map<number, VcpReading>();
	private readonly writers = new Map<number, LatestValueWriter>();

	constructor(private readonly ddcHost: DdcHost) {
		super();
	}

	override async onWillAppear(ev: WillAppearEvent<MonitorSettingSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.refreshDial(ev.action, resolveSettings(ev.payload.settings));
		}
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MonitorSettingSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.refreshDial(ev.action, resolveSettings(ev.payload.settings));
		}
	}

	override async onKeyDown(ev: KeyDownEvent<MonitorSettingSettings>): Promise<void> {
		const settings = resolveSettings(ev.payload.settings);
		try {
			const reading = await this.read(settings.code);
			const target =
				settings.keyMode === "step"
					? stepByPercent(reading.current, reading.maximum, settings.step)
					: fromPercent(settings.value, reading.maximum);
			await this.write(settings.code, target, reading.maximum);
			await ev.action.showOk();
		} catch (error) {
			streamDeck.logger.error(`${settings.label} key press failed: ${errorMessage(error)}`);
			await ev.action.showAlert();
		}
	}

	override async onDialRotate(ev: DialRotateEvent<MonitorSettingSettings>): Promise<void> {
		const settings = resolveSettings(ev.payload.settings);
		try {
			const reading = this.knownReadings.get(settings.code) ?? (await this.read(settings.code));
			const dialStep = Math.abs(settings.step) || DEFAULT_STEP;
			const target = stepByPercent(reading.current, reading.maximum, ev.payload.ticks * dialStep);
			this.knownReadings.set(settings.code, { current: target, maximum: reading.maximum });
			this.writerFor(settings).submit(target);
			await this.showFeedback(ev.action, settings, { current: target, maximum: reading.maximum });
		} catch (error) {
			streamDeck.logger.error(`${settings.label} dial rotation failed: ${errorMessage(error)}`);
			await ev.action.showAlert();
		}
	}

	override async onDialDown(ev: DialDownEvent<MonitorSettingSettings>): Promise<void> {
		await this.applyPresetValue(ev.action, resolveSettings(ev.payload.settings));
	}

	override async onTouchTap(ev: TouchTapEvent<MonitorSettingSettings>): Promise<void> {
		await this.applyPresetValue(ev.action, resolveSettings(ev.payload.settings));
	}

	private async applyPresetValue(dial: DialAction<MonitorSettingSettings>, settings: ResolvedSettings): Promise<void> {
		try {
			const reading = this.knownReadings.get(settings.code) ?? (await this.read(settings.code));
			const target = fromPercent(settings.value, reading.maximum);
			await this.write(settings.code, target, reading.maximum);
			await this.showFeedback(dial, settings, { current: target, maximum: reading.maximum });
		} catch (error) {
			streamDeck.logger.error(`${settings.label} preset value failed: ${errorMessage(error)}`);
			await dial.showAlert();
		}
	}

	private async refreshDial(dial: DialAction<MonitorSettingSettings>, settings: ResolvedSettings): Promise<void> {
		try {
			await this.showFeedback(dial, settings, await this.read(settings.code));
		} catch (error) {
			streamDeck.logger.error(`${settings.label} read failed: ${errorMessage(error)}`);
			await dial.showAlert();
		}
	}

	private async showFeedback(dial: DialAction<MonitorSettingSettings>, settings: ResolvedSettings, reading: VcpReading): Promise<void> {
		const percent = toPercent(reading.current, reading.maximum);
		await dial.setFeedback({
			title: settings.label,
			value: `${percent}%`,
			indicator: { value: percent }
		});
	}

	private async read(code: number): Promise<VcpReading> {
		const reading = await this.ddcHost.readVcp(code);
		this.knownReadings.set(code, reading);
		return reading;
	}

	private async write(code: number, value: number, maximum: number): Promise<void> {
		await this.ddcHost.writeVcp(code, value);
		this.knownReadings.set(code, { current: value, maximum });
	}

	private writerFor(settings: ResolvedSettings): LatestValueWriter {
		let writer = this.writers.get(settings.code);
		if (!writer) {
			writer = new LatestValueWriter(
				(value) => this.ddcHost.writeVcp(settings.code, value),
				(error) => {
					this.knownReadings.delete(settings.code);
					streamDeck.logger.error(`${settings.label} write failed: ${errorMessage(error)}`);
				}
			);
			this.writers.set(settings.code, writer);
		}
		return writer;
	}
}
