import streamDeck, {
	action,
	SingletonAction,
	type DidReceiveSettingsEvent,
	type KeyAction,
	type KeyDownEvent,
	type WillAppearEvent
} from "@elgato/streamdeck";

import type { DdcHost } from "../ddc-host.js";
import { KeyState, keyStateFor, nextInputSource, resolveToggleSettings, type ResolvedToggleSettings, type ToggleInputSettings } from "../input-source.js";
import { VcpCode } from "../vcp.js";

@action({ UUID: "com.olebru.ddc-monitor-control.toggle" })
export class ToggleInput extends SingletonAction<ToggleInputSettings> {
	constructor(private readonly ddcHost: DdcHost) {
		super();
	}

	override async onWillAppear(ev: WillAppearEvent<ToggleInputSettings>): Promise<void> {
		if (ev.action.isKey()) {
			await this.showCurrentInput(ev.action, resolveToggleSettings(ev.payload.settings));
		}
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ToggleInputSettings>): Promise<void> {
		if (ev.action.isKey()) {
			await this.showCurrentInput(ev.action, resolveToggleSettings(ev.payload.settings));
		}
	}

	override async onKeyDown(ev: KeyDownEvent<ToggleInputSettings>): Promise<void> {
		const key = ev.action;
		const settings = resolveToggleSettings(ev.payload.settings);
		await this.runOnKey(key, async () => {
			const target = nextInputSource((await this.ddcHost.readVcp(VcpCode.InputSource)).current, settings);
			await this.ddcHost.writeVcp(VcpCode.InputSource, target.value);
			await key.setState(keyStateFor(target.value, settings));
		});
	}

	private async showCurrentInput(key: KeyAction<ToggleInputSettings>, settings: ResolvedToggleSettings): Promise<void> {
		await key.setTitle(settings.inputA.label, { state: KeyState.InputA });
		await key.setTitle(settings.inputB.label, { state: KeyState.InputB });
		await this.runOnKey(key, async () => {
			await key.setState(keyStateFor((await this.ddcHost.readVcp(VcpCode.InputSource)).current, settings));
		});
	}

	private async runOnKey(key: Pick<KeyAction<ToggleInputSettings>, "showAlert">, operation: () => Promise<void>): Promise<void> {
		try {
			await operation();
		} catch (error) {
			streamDeck.logger.error(error instanceof Error ? error.message : String(error));
			await key.showAlert();
		}
	}
}
